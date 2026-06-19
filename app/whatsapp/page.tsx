"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiMessageSquare, FiSend, FiUsers, FiCheck, FiClock, FiZap, FiFilter, FiLink, FiCopy } from "react-icons/fi";
import Link from "next/link";
import { api, getUser, type Invoice } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { generateWhatsAppPaymentLink, generateUPILink } from "@/lib/paymentLink";

const TEMPLATES = [
  {
    id: "gentle",
    label: "Gentle Reminder",
    tone: "gentle" as const,
    text: "Namaste {name} ji 🙏\n\nHamare records mein aapka {amount} payment {days} din se pending hai.\n\nKya aap is hafte payment arrange kar sakte hain?\n{upi_link}\nDhanyawad\nStarlane Collections",
  },
  {
    id: "firm",
    label: "Firm Follow-Up",
    tone: "firm" as const,
    text: "Dear {name},\n\nYour payment of {amount} is {days} days overdue.\n\nPlease clear the outstanding amount within 3 working days:\n{upi_link}\nRegards\nCollections Team",
  },
  {
    id: "urgent",
    label: "Urgent Notice",
    tone: "urgent" as const,
    text: "URGENT: {name}\n\nAmount: {amount} | Overdue: {days} days\n\nPay now:\n{upi_link}\n\nImmediate payment required to avoid further action.",
  },
  {
    id: "custom",
    label: "Custom Message",
    tone: "gentle" as const,
    text: "",
  },
];

const TONE_BADGE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  gentle: "success", firm: "warning", urgent: "danger", custom: "muted",
};

interface Customer {
  id: string;
  name: string;
  phone: string;
  amount: number;
  days: number;
  selected: boolean;
}

function fmt(n: number) {
  return n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
}

function buildMessage(
  template: string,
  name: string,
  amount: number,
  days: number,
  upiId?: string,
  bizName?: string,
  includeUPI?: boolean,
) {
  let upiLink = "";
  if (includeUPI && upiId) {
    upiLink = generateUPILink({
      upiId,
      payeeName: bizName || "Business",
      amount,
      note: `Payment from ${name}`,
    });
  }
  return template
    .replace("{name}", name)
    .replace("{amount}", `₹${amount.toLocaleString("en-IN")}`)
    .replace("{days}", String(days))
    .replace("{upi_link}", upiLink ? `\n${upiLink}\n` : "");
}

export default function WhatsAppPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedTemplate, setTemplate] = useState("gentle");
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending]     = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [tab, setTab]             = useState<"compose" | "history">("compose");
  const [includeUPI, setIncludeUPI] = useState(true);
  const [upiId, setUpiId]         = useState("");
  const [bizName, setBizName]     = useState("My Business");
  const [copyToast, setCopyToast] = useState("");

  // Load UPI + business details from stored user
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("vantro_user") || "{}");
      if (u.upi_id)       setUpiId(u.upi_id);
      if (u.business_name) setBizName(u.business_name);
    } catch {}
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) { setLoading(false); return; }
    api.invoices.list(user.id)
      .then(d => {
        const mapped: Customer[] = d.invoices
          .filter(inv => inv.payment_status === "Pending" && inv.days_overdue > 0)
          .map(inv => ({
            id: inv.id,
            name: inv.customer_name,
            phone: inv.customer_phone || "",
            amount: inv.invoice_amount,
            days: inv.days_overdue,
            selected: inv.days_overdue >= 30,
          }));
        setCustomers(mapped);
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  const selected = customers.filter(c => c.selected);
  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;

  const toggleCustomer = (id: string) =>
    setCustomers(c => c.map(x => x.id === id ? { ...x, selected: !x.selected } : x));

  const selectAll = () => setCustomers(c => c.map(x => ({ ...x, selected: true })));
  const filterOverdue = () => setCustomers(c => c.map(x => ({ ...x, selected: x.days >= 30 })));

  const handleSend = () => {
    if (selected.length === 0) return;
    setSending(true);
    const msgTemplate = template.id === "custom" ? customMsg : template.text;
    let opened = 0;
    selected.forEach((c, i) => {
      const phone = c.phone.replace(/\D/g, "");
      if (!phone) return;
      const msg = buildMessage(msgTemplate, c.name, c.amount, c.days, upiId, bizName, includeUPI);
      setTimeout(() => {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        opened++;
        if (opened === selected.filter(x => x.phone).length) {
          setSending(false);
          setSentCount(selected.length);
          posthog.capture("whatsapp_sent", {
            count:    selected.length,
            template: template.id,
            with_upi: includeUPI && !!upiId,
          });
        }
      }, i * 300);
    });
  };

  const handleCopySingleLink = (c: Customer) => {
    if (!upiId) return;
    const link = generateUPILink({ upiId, payeeName: bizName, amount: c.amount, note: `Payment from ${c.name}` });
    navigator.clipboard.writeText(link).then(() => {
      setCopyToast(`UPI link copied for ${c.name}`);
      setTimeout(() => setCopyToast(""), 2500);
    });
  };

  const previewCustomer = selected[0] ?? customers[0];
  const previewText = buildMessage(
    template.id === "custom" ? customMsg : template.text,
    previewCustomer?.name ?? "Customer",
    previewCustomer?.amount ?? 0,
    previewCustomer?.days ?? 0,
    upiId,
    bizName,
    includeUPI,
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">WhatsApp Campaigns</h1>
            <p className="text-sm text-muted mt-0.5">Send bulk collection reminders — opens WhatsApp for each customer</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
            {(["compose", "history"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={["px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                  tab === t ? "bg-white text-black" : "text-muted hover:text-primary",
                ].join(" ")}>{t}</button>
            ))}
          </div>
        </div>

        {tab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Customers + Template */}
            <div className="lg:col-span-2 space-y-5">

              {/* Customer Selection */}
              <div className="card-premium overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiUsers size={14} className="text-muted" />
                    <p className="text-sm font-bold text-primary">Select Customers</p>
                    <Badge variant="accent">{selected.length} selected</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="xs" icon={<FiFilter size={11} />} onClick={filterOverdue}>30d+</Button>
                    <Button variant="secondary" size="xs" onClick={selectAll}>Select All</Button>
                  </div>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-sm text-muted animate-pulse">Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center">
                    <FiUsers size={28} className="mx-auto mb-3 text-muted opacity-40" />
                    <p className="text-sm font-semibold text-secondary mb-1">Koi overdue customer nahi mila</p>
                    <p className="text-xs text-muted mb-4">Pehle Collections page pe invoices add karo — phir yahan customers dikhenge.</p>
                    <Link href="/collections"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors">
                      <FiFilter size={11} /> Go to Collections
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                    {customers.map(c => (
                      <div key={c.id}
                        onClick={() => toggleCustomer(c.id)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2/50 transition-colors">
                        <div className={["w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                          c.selected ? "bg-accent border-accent" : "border-border",
                        ].join(" ")}>
                          {c.selected && <FiCheck size={10} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">{c.name}</p>
                          <p className="text-xs text-muted">{c.phone || "No phone"}</p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <p className="text-sm font-bold text-primary">₹{fmt(c.amount)}</p>
                          <p className="text-2xs text-warning">{c.days}d overdue</p>
                          {includeUPI && upiId && (
                            <button
                              onClick={e => { e.stopPropagation(); handleCopySingleLink(c); }}
                              className="flex items-center gap-0.5 text-2xs text-accent hover:underline"
                              title="Copy UPI link">
                              <FiLink size={9} /> UPI link
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UPI Payment Link Toggle */}
              <div className="card-premium p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-primary">Include UPI Payment Link</p>
                    <p className="text-xs text-muted mt-0.5">Customers can pay directly from the WhatsApp message</p>
                  </div>
                  <button
                    onClick={() => setIncludeUPI(v => !v)}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${includeUPI ? "bg-accent" : "bg-surface-2 border border-border"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${includeUPI ? "left-5.5" : "left-0.5"}`} />
                  </button>
                </div>
                {includeUPI && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Your UPI ID (e.g. sharma@upi)"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="flex-1 bg-surface-2 border border-border rounded-lg text-xs text-primary placeholder-muted px-3 py-2 focus:outline-none focus:border-accent"
                    />
                    {upiId && (
                      <span className="px-2 py-1 text-2xs font-semibold text-success bg-success-dim border border-success/20 rounded-lg self-center">
                        ✓ Set
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div className="card-premium p-5">
                <p className="text-sm font-bold text-primary mb-3">Message Template</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setTemplate(t.id)}
                      className={["text-left p-3 rounded-xl border transition-all",
                        selectedTemplate === t.id
                          ? "border-accent bg-accent-dim"
                          : "border-border bg-surface-2 hover:border-border-2",
                      ].join(" ")}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={["text-xs font-semibold", selectedTemplate === t.id ? "text-accent" : "text-primary"].join(" ")}>
                          {t.label}
                        </p>
                        <Badge variant={TONE_BADGE[t.id]}>{t.id === "custom" ? "custom" : t.tone}</Badge>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedTemplate === "custom" && (
                  <textarea
                    value={customMsg}
                    onChange={e => setCustomMsg(e.target.value)}
                    placeholder="Type your custom message... Use {name}, {amount}, {days} as variables"
                    rows={5}
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3 py-2.5 focus:outline-none focus:border-accent resize-none"
                  />
                )}
              </div>
            </div>

            {/* Right — Preview + Send */}
            <div className="space-y-5">
              {/* WhatsApp Preview — real bubble UI */}
              <div className="rounded-2xl overflow-hidden border border-[#1F2C34]" style={{ background: "#111B21" }}>
                {/* WhatsApp top bar */}
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#1F2C34" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ background: "#25D366" }}>
                    VC
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">Starlane Collections</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                      <p className="text-[10px] text-[#8696A0]">Business Account · Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#8696A0"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#8696A0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                  </div>
                </div>

                {/* Chat wallpaper + bubble */}
                <div className="wa-bubble-bg p-4 min-h-[220px] flex flex-col justify-end gap-2">
                  {/* Date chip */}
                  <div className="flex justify-center mb-1">
                    <span className="text-[10px] text-[#8696A0] px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                      Today
                    </span>
                  </div>

                  {/* Incoming bubble from business */}
                  <div className="max-w-[88%]">
                    <div className="relative rounded-xl rounded-tl-sm px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line"
                      style={{ background: "#1F2C34", color: "#E9EDF0" }}>
                      {/* Tail */}
                      <div className="absolute -left-1.5 top-0 w-0 h-0"
                        style={{ borderRight: "8px solid #1F2C34", borderBottom: "8px solid transparent" }} />
                      {previewText || "Select a template to see the preview..."}
                      <div className="flex items-center justify-end gap-1 mt-1.5">
                        <span className="text-[10px] text-[#8696A0]">
                          {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        {/* Double tick (delivered) */}
                        <svg width="14" height="10" viewBox="0 0 14 10" fill="#8696A0">
                          <path d="M1 5l3 3 9-8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 5l3 3 5-4" strokeWidth="1.5" stroke="#25D366" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: "#1F2C34" }}>
                  <div className="flex-1 rounded-full px-3 py-1.5 text-xs text-[#8696A0]" style={{ background: "#2A3942" }}>
                    Type a message
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Send Summary */}
              <div className="card-premium p-5">
                <p className="text-sm font-bold text-primary mb-3">Campaign Summary</p>
                <div className="space-y-2 mb-4">
                  {[
                    { label: "Recipients",    value: `${selected.length} customers` },
                    { label: "Template",      value: template.label },
                    { label: "Channel",       value: "WhatsApp (wa.me)" },
                    { label: "No phone",      value: `${selected.filter(c => !c.phone).length} skipped` },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between">
                      <p className="text-xs text-muted">{s.label}</p>
                      <p className="text-xs font-semibold text-primary">{s.value}</p>
                    </div>
                  ))}
                </div>

                {sentCount > 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-success-dim rounded-xl border border-success/20">
                    <FiCheck size={14} className="text-success" />
                    <p className="text-sm font-semibold text-success">
                      Opened {sentCount} WhatsApp chats!
                    </p>
                  </div>
                ) : (
                  <Button fullWidth loading={sending} icon={<FiSend size={13} />}
                    onClick={handleSend} disabled={selected.length === 0 || (template.id === "custom" && !customMsg)}>
                    Send to {selected.length} Customers
                  </Button>
                )}

                <div className="flex items-center gap-1.5 mt-3">
                  <FiZap size={11} className="text-accent" />
                  <p className="text-2xs text-muted">Opens WhatsApp with pre-filled message for each customer</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy toast */}
        {copyToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-surface-1 border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-primary shadow-xl flex items-center gap-2 animate-fade-in">
            <FiCopy size={12} className="text-accent" /> {copyToast}
          </div>
        )}

        {tab === "history" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-bold text-primary">Sent Message History</p>
              <p className="text-xs text-muted mt-0.5">Message history tracked when WhatsApp Business API is connected</p>
            </div>
            <div className="p-8 text-center">
              <FiClock size={28} className="mx-auto mb-3 text-muted opacity-40" />
              <p className="text-sm text-secondary">No history yet.</p>
              <p className="text-xs text-muted mt-1">Messages sent via wa.me links are not tracked automatically.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

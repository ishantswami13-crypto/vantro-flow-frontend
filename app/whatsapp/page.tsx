"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiMessageSquare, FiSend, FiUsers, FiCheck, FiClock, FiZap, FiFilter } from "react-icons/fi";
import { api, getUser, type Invoice } from "@/lib/api";

const TEMPLATES = [
  {
    id: "gentle",
    label: "Gentle Reminder",
    tone: "gentle" as const,
    text: "Namaste {name} ji 🙏\n\nHamare records mein aapka ₹{amount} payment {days} din se pending hai.\n\nKya aap is hafte payment arrange kar sakte hain?\n\nDhanyawad\nVantro Collections",
  },
  {
    id: "firm",
    label: "Firm Follow-Up",
    tone: "firm" as const,
    text: "Dear {name},\n\nYour payment of ₹{amount} is {days} days overdue.\n\nPlease clear the outstanding amount within 3 working days.\n\nRegards\nCollections Team",
  },
  {
    id: "urgent",
    label: "Urgent Notice",
    tone: "urgent" as const,
    text: "URGENT: {name}\n\nAmount: ₹{amount} | Overdue: {days} days\n\nImmediate payment required to avoid further action.",
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

function buildMessage(template: string, name: string, amount: number, days: number) {
  return template
    .replace("{name}", name)
    .replace("{amount}", `₹${amount.toLocaleString("en-IN")}`)
    .replace("{days}", String(days));
}

export default function WhatsAppPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedTemplate, setTemplate] = useState("gentle");
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending]     = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [tab, setTab]             = useState<"compose" | "history">("compose");

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
      const msg = buildMessage(msgTemplate, c.name, c.amount, c.days);
      setTimeout(() => {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        opened++;
        if (opened === selected.filter(x => x.phone).length) {
          setSending(false);
          setSentCount(selected.length);
        }
      }, i * 300);
    });
  };

  const previewCustomer = selected[0] ?? customers[0];
  const previewText = (template.id === "custom" ? customMsg : template.text)
    .replace("{name}", previewCustomer?.name ?? "Customer")
    .replace("{amount}", `₹${(previewCustomer?.amount ?? 0).toLocaleString("en-IN")}`)
    .replace("{days}", String(previewCustomer?.days ?? 0));

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
                  tab === t ? "bg-accent text-white" : "text-muted hover:text-primary",
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
                    <p className="text-sm text-secondary">No overdue invoices found.</p>
                    <p className="text-xs text-muted mt-1">Upload invoices from the Collections page first.</p>
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
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">₹{fmt(c.amount)}</p>
                          <p className="text-2xs text-warning">{c.days}d overdue</p>
                        </div>
                      </div>
                    ))}
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
              {/* WhatsApp Preview */}
              <div className="card-premium overflow-hidden">
                <div className="bg-[#1F2C34] px-4 py-3 flex items-center gap-3 border-b border-[#1E2D4A]">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                    <FiMessageSquare size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Vantro Collections</p>
                    <p className="text-2xs text-[#8696A0]">Business · Preview</p>
                  </div>
                </div>
                <div className="bg-[#0B1418] p-4 min-h-[200px]">
                  <div className="bg-[#1E2D4A] rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[85%] text-xs text-[#E9EDF0] whitespace-pre-line leading-relaxed">
                    {previewText || "Select a template to preview..."}
                    <p className="text-2xs text-[#8696A0] text-right mt-2">10:30 AM ✓✓</p>
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

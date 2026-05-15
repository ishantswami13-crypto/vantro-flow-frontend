"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiMessageSquare, FiSend, FiUsers, FiCheck, FiClock, FiZap, FiPlus, FiFilter } from "react-icons/fi";

const CUSTOMERS = [
  { id: 1, name: "Mehta Fabrics Pvt Ltd",  phone: "9876543210", amount: 840000, days: 62, selected: true  },
  { id: 2, name: "Sharma Steel Works",     phone: "9765432109", amount: 520000, days: 45, selected: true  },
  { id: 3, name: "Patel Agro Industries",  phone: "9654321098", amount: 310000, days: 38, selected: false },
  { id: 4, name: "Gupta Construction Co",  phone: "9543210987", amount: 280000, days: 29, selected: false },
  { id: 5, name: "Verma Chemicals Ltd",    phone: "9432109876", amount: 190000, days: 18, selected: false },
  { id: 6, name: "Singh Distributors",     phone: "9321098765", amount: 450000, days: 51, selected: true  },
];

const TEMPLATES = [
  {
    id: "gentle",
    label: "Gentle Reminder",
    tone: "gentle" as const,
    text: "Namaste {name} ji 🙏\n\nHamare records mein aapka ₹{amount} payment {days} din se pending hai.\n\nKya aap is hafte payment arrange kar sakte hain?\n\nPayment link: {link}\n\nDhanyawad\nVantro Collections",
  },
  {
    id: "firm",
    label: "Firm Follow-Up",
    tone: "firm" as const,
    text: "Dear {name},\n\nYour payment of ₹{amount} is {days} days overdue.\n\nPlease clear the outstanding amount within 3 working days.\n\nPay securely here: {link}\n\nRegards\nCollections Team",
  },
  {
    id: "urgent",
    label: "Urgent Notice",
    tone: "urgent" as const,
    text: "URGENT: {name}\n\nAmount: ₹{amount} | Overdue: {days} days\n\nImmediate payment required to avoid further action.\n\nPay now: {link}",
  },
  {
    id: "custom",
    label: "Custom Message",
    tone: "gentle" as const,
    text: "",
  },
];

const TONE_BADGE: Record<string,"success"|"warning"|"danger"|"muted"> = {
  gentle: "success", firm: "warning", urgent: "danger", custom: "muted",
};

const SENT_LOG = [
  { name: "Mehta Fabrics",  time: "Today 10:32 AM", status: "read",      response: "Will pay by Friday" },
  { name: "Sharma Steel",   time: "Today 10:32 AM", status: "delivered", response: null },
  { name: "Singh Dist.",    time: "Yesterday",       status: "read",      response: "Payment done" },
  { name: "Verma Chem",     time: "2 days ago",      status: "read",      response: null },
];

export default function WhatsAppPage() {
  const [customers, setCustomers]     = useState(CUSTOMERS);
  const [selectedTemplate, setTemplate] = useState("gentle");
  const [customMsg, setCustomMsg]     = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [tab, setTab]                 = useState<"compose"|"history">("compose");

  const selected   = customers.filter(c => c.selected);
  const template   = TEMPLATES.find(t => t.id === selectedTemplate)!;

  const toggleCustomer = (id: number) =>
    setCustomers(c => c.map(x => x.id === id ? { ...x, selected: !x.selected } : x));

  const selectAll = () => setCustomers(c => c.map(x => ({ ...x, selected: true })));

  const handleSend = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 2000));
    setSending(false);
    setSent(true);
  };

  const previewText = (template.id === "custom" ? customMsg : template.text)
    .replace("{name}", "Mehta ji")
    .replace("{amount}", "8,40,000")
    .replace("{days}", "62")
    .replace("{link}", "pay.vantro.in/mf8470");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">WhatsApp Campaigns</h1>
            <p className="text-sm text-muted mt-0.5">Send bulk collection reminders with UPI payment links</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
            {(["compose","history"] as const).map(t => (
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
                    <Button variant="ghost" size="xs" icon={<FiFilter size={11}/>}>Overdue 30d+</Button>
                    <Button variant="secondary" size="xs" onClick={selectAll}>Select All</Button>
                  </div>
                </div>
                <div className="divide-y divide-border/50">
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
                        <p className="text-xs text-muted">{c.phone}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">₹{(c.amount/100000).toFixed(1)}L</p>
                        <p className="text-2xs text-warning">{c.days}d overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    placeholder="Type your custom message... Use {name}, {amount}, {days}, {link} as variables"
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
                    { label: "Payment Links", value: "Auto-generated (UPI)" },
                    { label: "Estimated Time","value": `~${Math.ceil(selected.length * 0.5)} min` },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between">
                      <p className="text-xs text-muted">{s.label}</p>
                      <p className="text-xs font-semibold text-primary">{s.value}</p>
                    </div>
                  ))}
                </div>

                {sent ? (
                  <div className="flex items-center gap-2 p-3 bg-success-dim rounded-xl border border-success/20">
                    <FiCheck size={14} className="text-success" />
                    <p className="text-sm font-semibold text-success">
                      {selected.length} messages sent!
                    </p>
                  </div>
                ) : (
                  <Button fullWidth loading={sending} icon={<FiSend size={13}/>}
                    onClick={handleSend} disabled={selected.length === 0}>
                    Send to {selected.length} Customers
                  </Button>
                )}

                <div className="flex items-center gap-1.5 mt-3">
                  <FiZap size={11} className="text-accent" />
                  <p className="text-2xs text-muted">Messages sent via WhatsApp Business API · UPI links included</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-bold text-primary">Sent Message History</p>
            </div>
            <div className="divide-y divide-border/50">
              {SENT_LOG.map((msg, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 flex items-center justify-center shrink-0">
                    <FiMessageSquare size={15} className="text-[#25D366]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">{msg.name}</p>
                    {msg.response && (
                      <p className="text-xs text-success truncate">"{msg.response}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={msg.status === "read" ? "success" : "muted"}>
                      {msg.status === "read" ? "Read ✓✓" : "Delivered ✓"}
                    </Badge>
                    <p className="text-2xs text-muted mt-1 flex items-center gap-1 justify-end">
                      <FiClock size={9}/> {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

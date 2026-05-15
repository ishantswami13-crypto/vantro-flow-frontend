"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiPlus, FiZap, FiToggleLeft, FiToggleRight, FiMessageSquare, FiPhone, FiMail, FiClock, FiEdit2, FiTrash2 } from "react-icons/fi";

type ActionType = "whatsapp" | "call" | "email";
type ToneType = "gentle" | "firm" | "urgent";

interface Rule {
  id: number;
  name: string;
  trigger: number;
  action: ActionType;
  tone: ToneType;
  enabled: boolean;
  sent: number;
  paid: number;
}

const ACTION_ICON: Record<ActionType, React.ReactNode> = {
  whatsapp: <FiMessageSquare size={13} />,
  call:     <FiPhone size={13} />,
  email:    <FiMail size={13} />,
};
const ACTION_COLOR: Record<ActionType, string> = {
  whatsapp: "#25D366",
  call:     "#0066FF",
  email:    "#F5A524",
};
const TONE_BADGE: Record<ToneType, "success"|"warning"|"danger"> = {
  gentle: "success",
  firm:   "warning",
  urgent: "danger",
};

const DEFAULT_RULES: Rule[] = [
  { id: 1, name: "First Gentle Nudge",    trigger: 3,  action: "whatsapp", tone: "gentle", enabled: true,  sent: 142, paid: 38 },
  { id: 2, name: "Week-One Follow-Up",    trigger: 7,  action: "whatsapp", tone: "gentle", enabled: true,  sent: 97,  paid: 21 },
  { id: 3, name: "Firm Reminder",         trigger: 15, action: "whatsapp", tone: "firm",   enabled: true,  sent: 64,  paid: 14 },
  { id: 4, name: "Call + Message Combo",  trigger: 22, action: "call",     tone: "firm",   enabled: true,  sent: 41,  paid: 9  },
  { id: 5, name: "Urgent Final Notice",   trigger: 30, action: "whatsapp", tone: "urgent", enabled: false, sent: 18,  paid: 3  },
  { id: 6, name: "Legal Notice Warning",  trigger: 45, action: "email",    tone: "urgent", enabled: false, sent: 5,   paid: 1  },
];

const TEMPLATE_PREVIEW: Record<ToneType, string> = {
  gentle: "Namaste {name} ji 🙏 Hamare records mein aapka ₹{amount} payment pending hai. Kya aap is hafte arrange kar sakte hain? Koi problem ho toh batayein.",
  firm:   "Dear {name}, Your payment of ₹{amount} is now {days} days overdue. Please arrange payment within 3 days to avoid further action. Payment link: {link}",
  urgent: "URGENT: {name} — ₹{amount} outstanding for {days} days. Immediate payment required. Failure to pay may result in legal proceedings. Pay now: {link}",
};

export default function DunningPage() {
  const [rules, setRules]       = useState<Rule[]>(DEFAULT_RULES);
  const [preview, setPreview]   = useState<ToneType>("gentle");

  const toggle = (id: number) =>
    setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));

  const totalSent   = rules.reduce((s, r) => s + r.sent, 0);
  const totalPaid   = rules.reduce((s, r) => s + r.paid, 0);
  const recoveryPct = Math.round((totalPaid / totalSent) * 100);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Dunning Automation</h1>
            <p className="text-sm text-muted mt-0.5">Auto-send reminders based on days overdue — set it and forget it</p>
          </div>
          <Button icon={<FiPlus size={14}/>} size="sm">New Rule</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Rules",       value: rules.filter(r => r.enabled).length.toString(), color: "#0066FF" },
            { label: "Messages Sent",      value: totalSent.toString(),                            color: "#F5A524" },
            { label: "Payments Triggered", value: totalPaid.toString(),                            color: "#10D98A" },
            { label: "Recovery Rate",      value: `${recoveryPct}%`,                              color: "#10D98A" },
          ].map(k => (
            <div key={k.label} className="card-metric p-5">
              <p className="section-label mb-3">{k.label}</p>
              <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Rules Timeline */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Automation Rules</p>
            <p className="text-xs text-muted">Triggered automatically when invoice becomes overdue</p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-border ml-4 hidden sm:block" />

            <div className="divide-y divide-border/50">
              {rules.map((rule, idx) => (
                <div key={rule.id} className={["flex items-center gap-4 px-4 py-4 transition-all",
                  rule.enabled ? "hover:bg-surface-2/50" : "opacity-50",
                ].join(" ")}>

                  {/* Day bubble */}
                  <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border z-10 relative"
                    style={{
                      background: rule.enabled ? `${ACTION_COLOR[rule.action]}15` : "#1E2D4A",
                      borderColor: rule.enabled ? `${ACTION_COLOR[rule.action]}40` : "#1E2D4A",
                    }}>
                    <p className="text-xs font-black" style={{ color: rule.enabled ? ACTION_COLOR[rule.action] : "#4A6080" }}>
                      D+{rule.trigger}
                    </p>
                    <p className="text-2xs text-muted">days</p>
                  </div>

                  {/* Action icon */}
                  <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${ACTION_COLOR[rule.action]}20`, color: ACTION_COLOR[rule.action] }}>
                    {ACTION_ICON[rule.action]}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-primary">{rule.name}</p>
                      <Badge variant={TONE_BADGE[rule.tone]}>{rule.tone}</Badge>
                      <span className="text-2xs text-muted capitalize">{rule.action}</span>
                    </div>
                    <p className="text-2xs text-muted mt-0.5">
                      {rule.sent} sent · {rule.paid} paid ({Math.round((rule.paid/Math.max(rule.sent,1))*100)}% conversion)
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(rule.id)} className="text-muted hover:text-primary transition-colors">
                      {rule.enabled
                        ? <FiToggleRight size={22} className="text-success" />
                        : <FiToggleLeft size={22} />}
                    </button>
                    <Button variant="ghost" size="xs" icon={<FiEdit2 size={11}/>} />
                    <Button variant="ghost" size="xs" icon={<FiTrash2 size={11}/>} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-primary">Message Template Preview</p>
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
              {(["gentle","firm","urgent"] as ToneType[]).map(t => (
                <button key={t} onClick={() => setPreview(t)}
                  className={["px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                    preview === t ? "bg-accent text-white" : "text-muted hover:text-primary",
                  ].join(" ")}>{t}</button>
              ))}
            </div>
          </div>

          {/* WhatsApp bubble */}
          <div className="bg-[#0B1418] rounded-xl p-4 border border-[#1E2D4A]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center">
                <FiMessageSquare size={12} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Vantro Collections</p>
                <p className="text-2xs text-[#8696A0]">Business Account</p>
              </div>
            </div>
            <div className="bg-[#1E2D4A] rounded-xl rounded-tl-sm px-4 py-3 max-w-sm">
              <p className="text-sm text-[#E9EDF0] leading-relaxed">{TEMPLATE_PREVIEW[preview]}</p>
              <p className="text-2xs text-[#8696A0] text-right mt-2">10:30 AM ✓✓</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <FiZap size={12} className="text-accent" />
            <p className="text-xs text-muted">Variables like <span className="text-accent font-mono">{"{name}"}</span>, <span className="text-accent font-mono">{"{amount}"}</span>, <span className="text-accent font-mono">{"{link}"}</span> are auto-filled for each customer</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

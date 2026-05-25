"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import {
  FiPlus, FiZap, FiToggleLeft, FiToggleRight, FiMessageSquare,
  FiPhone, FiMail, FiX, FiCheck, FiLoader, FiAlertTriangle,
} from "react-icons/fi";
import { api, getUser, type DunningRule } from "@/lib/api";

type ActionType = "whatsapp" | "call" | "email";
type ToneType   = "gentle"   | "firm" | "urgent";

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
const TEMPLATE_PREVIEW: Record<ToneType, string> = {
  gentle: "Namaste {name} ji, hamare records mein aapka ₹{amount} payment pending hai. Kya aap is hafte arrange kar sakte hain? Koi problem ho toh batayein.",
  firm:   "Dear {name}, Your payment of ₹{amount} is now {days} days overdue. Please arrange payment within 3 days to avoid further action. Payment link: {link}",
  urgent: "URGENT: {name} — ₹{amount} outstanding for {days} days. Immediate payment required. Failure to pay may result in legal proceedings. Pay now: {link}",
};

const DEFAULT_RULES: Omit<DunningRule, "id">[] = [
  { name: "First Gentle Nudge",   trigger_day: 3,  action: "whatsapp", tone: "gentle", enabled: true },
  { name: "Week-One Follow-Up",   trigger_day: 7,  action: "whatsapp", tone: "gentle", enabled: true },
  { name: "Firm Reminder",        trigger_day: 15, action: "whatsapp", tone: "firm",   enabled: true },
  { name: "Call + Message Combo", trigger_day: 22, action: "call",     tone: "firm",   enabled: true },
  { name: "Urgent Final Notice",  trigger_day: 30, action: "whatsapp", tone: "urgent", enabled: false },
  { name: "Legal Notice Warning", trigger_day: 45, action: "email",    tone: "urgent", enabled: false },
];

const EMPTY_FORM = { name: "", trigger_day: "7", action: "whatsapp" as ActionType, tone: "gentle" as ToneType };

export default function DunningPage() {
  const [rules, setRules]     = useState<DunningRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ToneType>("gentle");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [seeded, setSeeded]   = useState(false);

  const load = useCallback(async () => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    try {
      const d = await api.dunning.list(user.id);
      const fetched = d.rules || [];
      setRules(fetched);
      // Auto-seed default rules if user has none
      if (fetched.length === 0 && !seeded) {
        setSeeded(true);
        await Promise.allSettled(
          DEFAULT_RULES.map(r => api.dunning.create({ ...r, user_id: user.id }))
        );
        const d2 = await api.dunning.list(user.id);
        setRules(d2.rules || []);
      }
    } catch {}
    setLoading(false);
  }, [seeded]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (rule: DunningRule) => {
    setToggling(rule.id);
    try {
      await api.dunning.update(rule.id, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch {}
    setToggling(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.dunning.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch {}
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    const user = getUser();
    if (!user?.id) return;
    setSaving(true);
    try {
      await api.dunning.create({
        name: form.name,
        trigger_day: parseInt(form.trigger_day) || 7,
        action: form.action,
        tone: form.tone,
        enabled: true,
        user_id: user.id,
      });
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch { setError("Failed to save. Try again."); }
    setSaving(false);
  };

  const totalSent   = rules.reduce((s, r) => s + (r.sent || 0), 0);
  const totalPaid   = rules.reduce((s, r) => s + (r.paid || 0), 0);
  const recoveryPct = totalSent > 0 ? Math.round((totalPaid / totalSent) * 100) : 0;
  const activeRules = rules.filter(r => r.enabled).length;

  const sorted = [...rules].sort((a, b) => a.trigger_day - b.trigger_day);

  return (
    <DashboardLayout pageTitle="Dunning Automation">
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Dunning Automation</h2>
            <p className="text-sm text-secondary mt-0.5">Auto-send reminders based on days overdue — set it and forget it</p>
          </div>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setError(""); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-sm self-start sm:self-auto">
            <FiPlus size={14} /> New Rule
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {[
              { label: "Active Rules",       value: activeRules.toString(),  color: "#0066FF" },
              { label: "Messages Sent",      value: totalSent.toString(),    color: "#F5A524" },
              { label: "Payments Triggered", value: totalPaid.toString(),    color: "#10D98A" },
              { label: "Recovery Rate",      value: totalSent > 0 ? `${recoveryPct}%` : "—", color: "#10D98A" },
            ].map(k => (
              <div key={k.label} className="card-metric p-5">
                <p className="section-label mb-3">{k.label}</p>
                <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Rules Timeline */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Automation Rules</p>
            <p className="text-xs text-muted">Triggered when invoice becomes overdue by N days</p>
          </div>

          {loading ? (
            <div className="divide-y divide-border/50">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                  <div className="w-12 h-12 bg-surface-3 rounded-xl shrink-0" />
                  <div className="w-8 h-8 bg-surface-3 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 w-40 bg-surface-3 rounded mb-2" />
                    <div className="h-2.5 w-28 bg-surface-3 rounded" />
                  </div>
                  <div className="w-10 h-6 bg-surface-3 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border ml-4 hidden sm:block" />
              <div className="divide-y divide-border/50">
                {sorted.map(rule => (
                  <div key={rule.id} className={["flex items-center gap-4 px-4 py-4 transition-all",
                    rule.enabled ? "hover:bg-surface-2/50" : "opacity-50",
                  ].join(" ")}>
                    <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border z-10 relative"
                      style={{
                        background:   rule.enabled ? `${ACTION_COLOR[rule.action as ActionType]}15` : "#1E2D4A",
                        borderColor:  rule.enabled ? `${ACTION_COLOR[rule.action as ActionType]}40` : "#1E2D4A",
                      }}>
                      <p className="text-xs font-black" style={{ color: rule.enabled ? ACTION_COLOR[rule.action as ActionType] : "#4A6080" }}>
                        D+{rule.trigger_day}
                      </p>
                      <p className="text-2xs text-muted">days</p>
                    </div>

                    <div className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${ACTION_COLOR[rule.action as ActionType]}20`, color: ACTION_COLOR[rule.action as ActionType] }}>
                      {ACTION_ICON[rule.action as ActionType]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-primary">{rule.name}</p>
                        <Badge variant={TONE_BADGE[rule.tone as ToneType]}>{rule.tone}</Badge>
                        <span className="text-2xs text-muted capitalize">{rule.action}</span>
                      </div>
                      {(rule.sent || rule.paid) ? (
                        <p className="text-2xs text-muted mt-0.5">
                          {rule.sent} sent · {rule.paid} paid ({Math.round(((rule.paid || 0)/Math.max(rule.sent || 1, 1))*100)}% conversion)
                        </p>
                      ) : (
                        <p className="text-2xs text-muted mt-0.5">No messages sent yet</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggle(rule)} disabled={toggling === rule.id}
                        className="text-muted hover:text-primary transition-colors disabled:opacity-60">
                        {toggling === rule.id
                          ? <FiLoader size={20} className="animate-spin text-accent" />
                          : rule.enabled
                            ? <FiToggleRight size={22} className="text-success" />
                            : <FiToggleLeft size={22} />
                        }
                      </button>
                      <button onClick={() => handleDelete(rule.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-dim transition-all">
                        <FiX size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {sorted.length === 0 && (
                  <div className="flex flex-col items-center py-12 text-center">
                    <p className="text-sm text-muted">No rules yet</p>
                    <p className="text-xs text-muted mt-1">Add your first rule to start automating follow-ups</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Preview */}
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-primary">Message Template Preview</p>
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
              {(["gentle","firm","urgent"] as ToneType[]).map(t => (
                <button key={t} onClick={() => setPreview(t)}
                  className={["px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all",
                    preview === t ? "bg-white text-black" : "text-muted hover:text-primary",
                  ].join(" ")}>{t}</button>
              ))}
            </div>
          </div>
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
              <p className="text-2xs text-[#8696A0] text-right mt-2">10:30 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <FiZap size={12} className="text-accent" />
            <p className="text-xs text-muted">Variables like <span className="text-accent font-mono">{"{name}"}</span>, <span className="text-accent font-mono">{"{amount}"}</span>, <span className="text-accent font-mono">{"{link}"}</span> are auto-filled for each customer</p>
          </div>
        </div>

        {/* Add Rule Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-sm card-premium p-6 shadow-card-hover z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-primary">New Automation Rule</p>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-primary"><FiX size={18} /></button>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger-dim border border-danger/20 text-danger text-xs mb-3">
                  <FiAlertTriangle size={13} /> {error}
                </div>
              )}
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="section-label block mb-1.5">Rule Name *</label>
                  <input type="text" required placeholder="e.g. Two-Week Follow-Up"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1.5">Trigger Day (D+)</label>
                    <input type="number" min="1" max="365" placeholder="7"
                      value={form.trigger_day} onChange={e => setForm(f => ({ ...f, trigger_day: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Action</label>
                    <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value as ActionType }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent">
                      <option value="whatsapp">WhatsApp</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="section-label block mb-1.5">Tone</label>
                  <div className="flex gap-2">
                    {(["gentle","firm","urgent"] as ToneType[]).map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tone: t }))}
                        className={["flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition-all",
                          form.tone === t ? "bg-white text-black border-white/20" : "text-muted border-border hover:text-primary",
                        ].join(" ")}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted bg-surface-2 border border-border hover:text-primary transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2">
                    {saving ? <><FiLoader size={13} className="animate-spin" /> Saving…</> : <><FiCheck size={13} /> Create Rule</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

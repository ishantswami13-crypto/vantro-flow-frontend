"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface Dispute {
  id: string;
  customer_name: string;
  customer_phone?: string;
  disputed_amount: number;
  reason: string;
  notes?: string;
  status: "open" | "under_review" | "resolved";
  resolution?: string;
  resolved_amount?: number;
  created_at: string;
}

const REASON_OPTIONS = [
  "Invoice amount incorrect",
  "Goods not received / Short delivery",
  "Quality issue / Damage",
  "Already paid — reconciliation needed",
  "Service not completed",
  "Price difference",
  "Other",
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", disputed_amount: "", reason: REASON_OPTIONS[0], notes: "" });
  const [resolution, setResolution] = useState({ status: "resolved", resolution: "", resolved_amount: "" });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;

  async function fetchDisputes() {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/disputes`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setDisputes(d.disputes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchDisputes(); }, []);

  async function createDispute() {
    if (!form.customer_name || !form.disputed_amount) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/disputes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, disputed_amount: parseFloat(form.disputed_amount) }),
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({ customer_name: "", customer_phone: "", disputed_amount: "", reason: REASON_OPTIONS[0], notes: "" }); fetchDisputes(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function resolveDispute() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/disputes/${selected.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolution.status, resolution: resolution.resolution, resolved_amount: resolution.resolved_amount ? parseFloat(resolution.resolved_amount) : undefined }),
      });
      const d = await r.json();
      if (d.success) { setSelected(null); fetchDisputes(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function deleteDispute(id: string) {
    if (!confirm("Delete this dispute?")) return;
    await fetch(`${BASE}/api/disputes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchDisputes();
  }

  const openCount = disputes.filter(d => d.status === "open").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;
  const totalDisputedAmt = disputes.filter(d => d.status !== "resolved").reduce((s, d) => s + d.disputed_amount, 0);

  // Three real states, three fixed semantic roles - not a fourth "stuck
  // amount" orange invented on top: disputed/stuck money is the same
  // "needs attention" tier as under_review.
  const statusColor: Record<string, string> = {
    open: "bg-danger-dim text-danger",
    under_review: "bg-warning/10 text-warning",
    resolved: "bg-success-dim text-success",
  };

  return (
    <DashboardLayout pageTitle="Disputes">
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Dispute Management</h1>
            <p className="text-sm text-secondary">Customer raised an issue? Track it here. Auto-pauses WhatsApp follow-up.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors">
            + New Dispute
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Open", value: openCount, color: "text-danger" },
            { label: "Resolved", value: resolvedCount, color: "text-success" },
            { label: "Stuck Amount", value: `₹${totalDisputedAmt.toLocaleString("en-IN")}`, color: "text-warning" },
          ].map(s => (
            <div key={s.label} className="card-metric p-4 text-center">
              <div className={`text-2xl font-bold metric-value ${s.color}`}>{s.value}</div>
              <div className="text-2xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card-premium p-5 space-y-4">
            <h2 className="text-primary font-semibold">Log New Dispute</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted block mb-1">Customer Name *</label>
                <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="input-base" placeholder="Ramesh Traders" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Phone</label>
                <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="input-base" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Disputed Amount (₹) *</label>
                <input value={form.disputed_amount} onChange={e => setForm(f => ({ ...f, disputed_amount: e.target.value }))} type="number" className="input-base" placeholder="25000" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Reason *</label>
                <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="input-base">
                  {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-2xs text-muted block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" rows={2} placeholder="Details of what happened..." />
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
              <p className="text-warning text-2xs">WhatsApp follow-up for this invoice will be paused automatically until dispute is resolved.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={createDispute} disabled={saving} className="flex-1 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Log Dispute"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-secondary text-sm rounded-xl hover:bg-surface-2 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Resolve modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="card-premium p-5 w-full max-w-md space-y-4">
              <h2 className="text-primary font-semibold">Resolve: {selected.customer_name}</h2>
              <div>
                <label className="text-2xs text-muted block mb-1">Resolution</label>
                <textarea value={resolution.resolution} onChange={e => setResolution(r => ({ ...r, resolution: e.target.value }))} className="input-base" rows={3} placeholder="How was it resolved? Credit note issued, amount adjusted..." />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Settled Amount (₹)</label>
                <input value={resolution.resolved_amount} onChange={e => setResolution(r => ({ ...r, resolved_amount: e.target.value }))} type="number" className="input-base" placeholder={String(selected.disputed_amount)} />
              </div>
              <div className="flex gap-3">
                <button onClick={resolveDispute} disabled={saving} className="flex-1 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors">
                  {saving ? "Saving..." : "Mark Resolved"}
                </button>
                <button onClick={() => setSelected(null)} className="px-4 py-2 border border-border text-secondary text-sm rounded-xl hover:bg-surface-2 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-center text-secondary py-10 text-sm">Loading...</div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-secondary text-sm">No disputes logged. When a customer raises an issue, track it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="card-premium p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-primary font-medium text-sm">{d.customer_name}</h3>
                      <span className={`text-2xs px-2 py-0.5 rounded-full ${statusColor[d.status] || ""}`}>{d.status.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm text-warning font-medium metric-value">₹{d.disputed_amount.toLocaleString("en-IN")}</p>
                    <p className="text-2xs text-muted mt-1">{d.reason}</p>
                    {d.notes && <p className="text-2xs text-muted mt-1">{d.notes}</p>}
                    {d.resolution && <p className="text-2xs text-success mt-1">Resolution: {d.resolution}</p>}
                  </div>
                  <div className="flex gap-2 ml-3">
                    {d.status !== "resolved" && (
                      <button onClick={() => { setSelected(d); setResolution({ status: "resolved", resolution: "", resolved_amount: String(d.disputed_amount) }); }}
                        className="text-2xs px-3 py-1.5 bg-success-dim text-success rounded-lg hover:bg-success/20 transition-colors">
                        Resolve
                      </button>
                    )}
                    <button onClick={() => deleteDispute(d.id)} className="text-2xs px-2 py-1.5 text-muted hover:text-danger transition-colors">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

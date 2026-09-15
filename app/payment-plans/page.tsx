"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUser } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface Installment {
  amount: number;
  due_date: string;
  paid?: boolean;
  paid_at?: string;
}

interface Plan {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  installments: Installment[];
  status: "active" | "completed";
  notes?: string;
  created_at: string;
}

export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", total_amount: "",
    num_installments: "3", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;

  async function fetchPlans() {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/payment-plans`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (d.success) setPlans(d.plans || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  function buildInstallments(): Installment[] {
    const total = parseFloat(form.total_amount) || 0;
    const n = parseInt(form.num_installments) || 3;
    const perInstall = Math.round(total / n);
    const today = new Date();
    return Array.from({ length: n }, (_, i) => {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      return { amount: perInstall, due_date: dueDate.toISOString().split("T")[0] };
    });
  }

  async function createPlan() {
    if (!form.customer_name || !form.total_amount) { setError("Customer name and amount required"); return; }
    setSaving(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/payment-plans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, total_amount: parseFloat(form.total_amount), installments: buildInstallments() }),
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({ customer_name: "", customer_phone: "", total_amount: "", num_installments: "3", notes: "" }); fetchPlans(); }
      else setError(d.error || "Failed");
    } catch { setError("Network error"); }
    setSaving(false);
  }

  async function markInstallmentPaid(planId: string, idx: number) {
    if (!token) return;
    await fetch(`${BASE}/api/payment-plans/${planId}/installment`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ installment_index: idx }),
    });
    fetchPlans();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`${BASE}/api/payment-plans/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchPlans();
  }

  const paidCount = plans.filter(p => p.status === "completed").length;
  const activeCount = plans.filter(p => p.status === "active").length;
  const totalPending = plans.filter(p => p.status === "active").reduce((s, p) => {
    const unpaid = p.installments.filter(i => !i.paid).reduce((a, i) => a + i.amount, 0);
    return s + unpaid;
  }, 0);

  return (
    <DashboardLayout pageTitle="Payment Plans">
      <div className="max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Payment Plans</h1>
            <p className="text-sm text-secondary">EMI splits for customers who can&apos;t pay full amount</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors">
            + New Plan
          </button>
        </div>

        {/* Stats — open typographic row, not three colored cards for three
            related counts. */}
        <div className="flex divide-x divide-border">
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-primary">{activeCount}</p>
            <p className="text-2xs text-muted mt-1">Active plans</p>
          </div>
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-success">{paidCount}</p>
            <p className="text-2xs text-muted mt-1">Completed</p>
          </div>
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-warning">₹{totalPending.toLocaleString("en-IN")}</p>
            <p className="text-2xs text-muted mt-1">Pending EMIs</p>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="card-premium p-5 space-y-4">
            <h2 className="text-primary font-semibold">New Payment Plan</h2>
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted block mb-1">Customer Name *</label>
                <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="input-base" placeholder="Ramesh Traders" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Phone (for WhatsApp)</label>
                <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="input-base" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Total Amount (₹) *</label>
                <input value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} type="number" className="input-base" placeholder="50000" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Number of Installments</label>
                <select value={form.num_installments} onChange={e => setForm(f => ({ ...f, num_installments: e.target.value }))} className="input-base">
                  {[2, 3, 4, 6].map(n => <option key={n} value={n}>{n} installments</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-2xs text-muted block mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-base" placeholder="Agreed in call on..." />
            </div>
            {form.total_amount && (
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-2xs text-muted mb-2">Preview installments:</p>
                <div className="space-y-1">
                  {buildInstallments().map((ins, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-secondary">Installment {i + 1} — {ins.due_date}</span>
                      <span className="text-primary font-medium metric-value">₹{ins.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={createPlan} disabled={saving} className="flex-1 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? "Creating..." : "Create Plan & Notify Customer"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-secondary text-sm rounded-xl hover:bg-surface-2 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plans list */}
        {loading ? (
          <div className="text-center text-secondary py-10 text-sm">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-secondary text-sm">No payment plans yet. Create one for a customer who can&apos;t pay full amount.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const paid = plan.installments.filter(i => i.paid).length;
              const total = plan.installments.length;
              const pct = Math.round((paid / total) * 100);
              const pendingAmt = plan.installments.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0);
              return (
                <div key={plan.id} className="card-premium p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-primary font-medium text-sm">{plan.customer_name}</h3>
                      <p className="text-2xs text-muted">{plan.customer_phone} • ₹{plan.total_amount.toLocaleString("en-IN")} total</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={["text-2xs px-2 py-0.5 rounded-full", plan.status === "completed" ? "bg-success-dim text-success" : "bg-surface-2 text-secondary"].join(" ")}>
                        {plan.status === "completed" ? "Completed" : "Active"}
                      </span>
                      <button onClick={() => deletePlan(plan.id)} className="text-muted hover:text-danger text-xs transition-colors">✕</button>
                    </div>
                  </div>
                  <div className="progress-bar mb-3">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                  </div>
                  <p className="text-2xs text-muted mb-3">{paid}/{total} installments paid · ₹{pendingAmt.toLocaleString("en-IN")} remaining</p>
                  <div className="space-y-2">
                    {plan.installments.map((ins, i) => (
                      <div key={i} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm text-primary">Installment {i + 1}</span>
                          <span className="text-2xs text-muted ml-2">Due: {ins.due_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary metric-value">₹{ins.amount.toLocaleString("en-IN")}</span>
                          {ins.paid ? (
                            <span className="text-2xs text-success">✓ Paid</span>
                          ) : (
                            <button onClick={() => markInstallmentPaid(plan.id, i)} className="text-2xs px-2 py-1 bg-success-dim text-success rounded hover:bg-success/20 transition-colors">
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

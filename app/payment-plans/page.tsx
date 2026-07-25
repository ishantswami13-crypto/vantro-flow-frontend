"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUser, authHeaders, isLoggedIn } from "@/lib/api";

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


  async function fetchPlans() {
    if (!isLoggedIn()) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/payment-plans`, { headers: { ...authHeaders() }, credentials: "include" });
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
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...form, total_amount: parseFloat(form.total_amount), installments: buildInstallments() }),
      });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({ customer_name: "", customer_phone: "", total_amount: "", num_installments: "3", notes: "" }); fetchPlans(); }
      else setError(d.error || "Failed");
    } catch { setError("Network error"); }
    setSaving(false);
  }

  async function markInstallmentPaid(planId: string, idx: number) {
    if (!isLoggedIn()) return;
    await fetch(`${BASE}/api/payment-plans/${planId}/installment`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ installment_index: idx }),
    });
    fetchPlans();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`${BASE}/api/payment-plans/${id}`, { method: "DELETE", headers: { ...authHeaders() }, credentials: "include" });
    fetchPlans();
  }

  const paidCount = plans.filter(p => p.status === "completed").length;
  const activeCount = plans.filter(p => p.status === "active").length;
  const totalPending = plans.filter(p => p.status === "active").reduce((s, p) => {
    const unpaid = p.installments.filter(i => !i.paid).reduce((a, i) => a + i.amount, 0);
    return s + unpaid;
  }, 0);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Payment Plans</h1>
            <p className="text-sm text-gray-400">EMI splits for customers who can&apos;t pay full amount</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + New Plan
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active Plans", value: activeCount, color: "text-blue-400" },
            { label: "Completed", value: paidCount, color: "text-green-400" },
            { label: "Pending EMIs", value: `₹${totalPending.toLocaleString("en-IN")}`, color: "text-orange-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-5 space-y-4">
            <h2 className="text-white font-semibold">New Payment Plan</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Customer Name *</label>
                <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="Ramesh Traders" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Phone (for WhatsApp)</label>
                <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Total Amount (₹) *</label>
                <input value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} type="number" className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="50000" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Number of Installments</label>
                <select value={form.num_installments} onChange={e => setForm(f => ({ ...f, num_installments: e.target.value }))} className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                  {[2, 3, 4, 6].map(n => <option key={n} value={n}>{n} installments</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="Agreed in call on..." />
            </div>
            {form.total_amount && (
              <div className="bg-[#0f0f23] rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Preview installments:</p>
                <div className="space-y-1">
                  {buildInstallments().map((ins, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-300">Installment {i + 1} — {ins.due_date}</span>
                      <span className="text-white font-medium">₹{ins.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={createPlan} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                {saving ? "Creating..." : "Create Plan & Notify Customer"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-white/10 text-gray-400 text-sm rounded-lg hover:bg-white/5">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Plans list */}
        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-400 text-sm">No payment plans yet. Create one for a customer who can&apos;t pay full amount.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const paid = plan.installments.filter(i => i.paid).length;
              const total = plan.installments.length;
              const pct = Math.round((paid / total) * 100);
              const pendingAmt = plan.installments.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0);
              return (
                <div key={plan.id} className="bg-[#1a1a2e] border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-medium">{plan.customer_name}</h3>
                      <p className="text-xs text-gray-400">{plan.customer_phone} • ₹{plan.total_amount.toLocaleString("en-IN")} total</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${plan.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {plan.status === "completed" ? "Completed" : "Active"}
                      </span>
                      <button onClick={() => deletePlan(plan.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{paid}/{total} installments paid · ₹{pendingAmt.toLocaleString("en-IN")} remaining</p>
                  <div className="space-y-2">
                    {plan.installments.map((ins, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#0f0f23] rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm text-white">Installment {i + 1}</span>
                          <span className="text-xs text-gray-400 ml-2">Due: {ins.due_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">₹{ins.amount.toLocaleString("en-IN")}</span>
                          {ins.paid ? (
                            <span className="text-xs text-green-400">✓ Paid</span>
                          ) : (
                            <button onClick={() => markInstallmentPaid(plan.id, i)} className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition">
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

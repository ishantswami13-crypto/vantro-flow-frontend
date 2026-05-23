"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiRefreshCw, FiTrendingUp, FiTrendingDown,
  FiShoppingBag, FiFileText, FiPhone, FiCheckCircle, FiAlertCircle,
  FiDollarSign, FiPackage, FiChevronDown, FiChevronUp, FiEdit2,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const EXP_CATS = ["transport","fuel","salary","material","rent","electricity","maintenance","marketing","misc"];
const CAT_EMOJI: Record<string,string> = {
  transport:"🚚", fuel:"⛽", salary:"👷", material:"📦", rent:"🏠",
  electricity:"💡", maintenance:"🔧", marketing:"📣", misc:"💸",
};

function fmtINR(n: number, short = false) {
  if (short && n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
  if (short && n >= 1000) return "₹" + (n/1000).toFixed(1) + "K";
  return "₹" + Number(n).toLocaleString("en-IN");
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
}
function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long" });
}

const STATUS_COLORS: Record<string,string> = {
  new:"text-brand-primary bg-brand-primary/10", confirmed:"text-warning bg-warning/10",
  dispatched:"text-info bg-info/10", delivered:"text-success bg-success/10",
  cancelled:"text-danger bg-danger/10",
};

export default function TodayPage() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"sales"|"expenses">("overview");
  const [showExpForm, setShowExpForm] = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [expForm, setExpForm] = useState({ description:"", amount:"", category:"misc" });
  const [saleForm, setSaleForm] = useState({ customer_name:"", amount:"", description:"", payment_mode:"cash" });
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);

  const token = () => localStorage.getItem("vantro_token") || "";

  const load = useCallback(async (d = date) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/today/summary?date=${d}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.success) setSummary(data);
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, []);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`${API}/api/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(expForm),
      });
      setExpForm({ description:"", amount:"", category:"misc" });
      setShowExpForm(false);
      load(date);
    } finally { setSubmitting(false); }
  };

  const addSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Add as an order with total_amount set
      await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          customer_name: saleForm.customer_name,
          total_amount: parseFloat(saleForm.amount),
          special_instructions: saleForm.description,
          items: [{ name: saleForm.description || "Sale", quantity: 1, unit: "unit" }],
          status: "delivered",
          source: "manual",
        }),
      });
      setSaleForm({ customer_name:"", amount:"", description:"", payment_mode:"cash" });
      setShowSaleForm(false);
      load(date);
    } finally { setSubmitting(false); }
  };

  const deleteExpense = async (id: string) => {
    await fetch(`${API}/api/expenses/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    load(date);
  };

  const s = summary?.summary;
  const income = s?.income?.total || 0;
  const expenses = s?.expenses?.total || 0;
  const net = s?.net_profit || 0;
  const isProfit = net >= 0;

  return (
    <DashboardLayout pageTitle="Aaj ka Hisaab">
      {/* Date selector */}
      <div className="flex items-center gap-3 mb-5">
        <div>
          <p className="text-xs text-muted">{date === today() ? "Today" : fmtDate(date)}</p>
          <input type="date" value={date}
            onChange={e => { setDate(e.target.value); load(e.target.value); }}
            className="input-base text-sm px-3 py-1" />
        </div>
        <button onClick={() => load(date)} className="p-2 rounded-xl hover:bg-surface-2 text-muted hover:text-primary">
          <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowSaleForm(true)}
            className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
            <FiPlus size={13} /> Sale
          </button>
          <button onClick={() => setShowExpForm(true)}
            className="bg-danger/10 text-danger border border-danger/20 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 hover:bg-danger/20 transition-colors">
            <FiPlus size={13} /> Expense
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex items-center justify-center h-48 text-muted">
          <FiRefreshCw className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : (
        <>
          {/* BIG P&L HERO CARD */}
          <div className={`rounded-2xl p-5 mb-5 relative overflow-hidden ${isProfit ? "bg-gradient-to-br from-success/20 to-success/5 border border-success/25" : "bg-gradient-to-br from-danger/20 to-danger/5 border border-danger/25"}`}>
            <div className="absolute top-3 right-3">
              {isProfit ? <FiTrendingUp size={40} className="text-success/20" /> : <FiTrendingDown size={40} className="text-danger/20" />}
            </div>
            <p className="text-xs text-muted mb-1">Net {isProfit ? "Profit" : "Loss"} Today</p>
            <p className={`text-4xl font-bold ${isProfit ? "text-success" : "text-danger"}`}>
              {isProfit ? "+" : ""}{fmtINR(net)}
            </p>
            <div className="flex gap-5 mt-3">
              <div>
                <p className="text-2xs text-muted">Income</p>
                <p className="text-lg font-bold text-success">+{fmtINR(income, true)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xs text-muted">Expenses</p>
                <p className="text-lg font-bold text-danger">-{fmtINR(expenses, true)}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-2xs text-muted">Orders</p>
                <p className="text-lg font-bold text-primary">{s?.order_count || 0}</p>
              </div>
              <div>
                <p className="text-2xs text-muted">Collected</p>
                <p className="text-lg font-bold text-primary">{s?.invoices_collected || 0}</p>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label:"Delivered", value: s?.orders_by_status?.delivered || 0, color:"text-success" },
              { label:"Pending",   value: (s?.orders_by_status?.new||0)+(s?.orders_by_status?.confirmed||0)+(s?.orders_by_status?.dispatched||0), color:"text-warning" },
              { label:"Calls",     value: s?.calls_made || 0, color:"text-brand-primary" },
              { label:"Cancelled", value: s?.orders_by_status?.cancelled || 0, color:"text-danger" },
            ].map(stat => (
              <div key={stat.label} className="card-base p-3 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-2xs text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 mb-4">
            {(["overview","sales","expenses"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab===t ? "bg-surface-2 text-primary shadow-sm" : "text-muted hover:text-secondary"}`}>
                {t === "sales" ? `💰 Sales (${(summary?.orders||[]).length})` : t === "expenses" ? `💸 Expenses (${(summary?.expenses||[]).length})` : "📊 Overview"}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Income breakdown */}
              <div className="card-base p-4">
                <p className="text-xs text-muted font-semibold uppercase mb-3">Income Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary flex items-center gap-2"><FiShoppingBag size={13} className="text-brand-primary" /> Orders Income</span>
                    <span className="font-semibold text-success">+{fmtINR(s?.income?.orders || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary flex items-center gap-2"><FiFileText size={13} className="text-accent" /> Invoices Collected</span>
                    <span className="font-semibold text-success">+{fmtINR(s?.income?.invoices || 0)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-primary">Total Income</span>
                    <span className="text-success">+{fmtINR(income)}</span>
                  </div>
                </div>
              </div>

              {/* Expense breakdown */}
              {expenses > 0 && s?.expenses?.by_category && (
                <div className="card-base p-4">
                  <p className="text-xs text-muted font-semibold uppercase mb-3">Expense Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(s.expenses.by_category as Record<string,number>).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-secondary">{CAT_EMOJI[cat] || "💸"} {cat.charAt(0).toUpperCase()+cat.slice(1)}</span>
                        <span className="font-semibold text-danger">-{fmtINR(amt)}</span>
                      </div>
                    ))}
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-primary">Total Expenses</span>
                      <span className="text-danger">-{fmtINR(expenses)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top selling items */}
              {s?.top_items?.length > 0 && (
                <div className="card-base p-4">
                  <p className="text-xs text-muted font-semibold uppercase mb-3">Top Selling Today</p>
                  <div className="space-y-2">
                    {s.top_items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-2xs text-muted w-4 font-bold">{i+1}</span>
                        <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full"
                            style={{ width: `${Math.min(100, (item.qty / (s.top_items[0]?.qty || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-primary font-medium w-20 truncate text-right">{item.name}</span>
                        <span className="text-xs text-muted w-12 text-right">{item.qty} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid invoices today */}
              {(summary?.paid_invoices||[]).length > 0 && (
                <div className="card-base p-4">
                  <p className="text-xs text-muted font-semibold uppercase mb-3">Invoices Collected Today 🎉</p>
                  <div className="space-y-2">
                    {summary.paid_invoices.map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiCheckCircle size={14} className="text-success" />
                          <span className="text-sm text-primary">{inv.customer_name}</span>
                        </div>
                        <span className="text-sm font-bold text-success">+{fmtINR(Number(inv.invoice_amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {income === 0 && expenses === 0 && (
                <div className="card-base p-10 text-center">
                  <FiDollarSign size={40} className="text-muted mx-auto mb-3" />
                  <p className="font-semibold text-primary mb-1">Aaj ka data khaali hai</p>
                  <p className="text-sm text-muted">Sale ya expense add karo upar se</p>
                </div>
              )}
            </div>
          )}

          {/* SALES TAB */}
          {tab === "sales" && (
            <div className="space-y-2">
              {(summary?.orders || []).length === 0 ? (
                <div className="card-base p-8 text-center">
                  <FiShoppingBag size={36} className="text-muted mx-auto mb-3" />
                  <p className="font-semibold text-primary mb-1">Koi sale nahi aaj</p>
                  <button onClick={() => setShowSaleForm(true)} className="btn-primary text-sm px-4 py-2 mt-2 flex items-center gap-1.5 mx-auto">
                    <FiPlus size={13} /> Add Sale
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-muted px-1 mb-1">
                    <span>{(summary?.orders||[]).length} entries</span>
                    <span>Total: <span className="text-success font-bold">{fmtINR(income)}</span></span>
                  </div>
                  {(summary?.orders || []).map((order: any) => {
                    const open = expanded === order.id;
                    return (
                      <div key={order.id} className="card-base overflow-hidden">
                        <div className="p-3.5 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
                            <FiShoppingBag size={14} className="text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-primary text-sm">{order.customer_name}</p>
                              <p className="font-bold text-success text-sm">{order.total_amount ? fmtINR(Number(order.total_amount)) : "—"}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || "text-muted bg-surface-2"}`}>{order.status}</span>
                              <span className="text-2xs text-muted">{fmtTime(order.created_at)}</span>
                              {order.source === "ai_call" && <span className="text-2xs text-brand-primary bg-brand-primary/10 px-1.5 rounded-full">📞 Call</span>}
                            </div>
                            {(order.items||[]).length > 0 && (
                              <p className="text-xs text-muted mt-1 truncate">
                                {order.items.slice(0,3).map((i:any) => `${i.quantity} ${i.unit} ${i.local_name||i.name}`).join(" · ")}
                              </p>
                            )}
                          </div>
                          <button onClick={() => setExpanded(open ? null : order.id)} className="text-muted p-1">
                            {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                          </button>
                        </div>
                        {open && (order.delivery_time || order.special_instructions) && (
                          <div className="border-t border-border px-4 py-2 bg-surface/30 text-xs text-muted space-y-1">
                            {order.delivery_time && <p>⏰ Delivery: {order.delivery_time}</p>}
                            {order.special_instructions && <p>📝 {order.special_instructions}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* EXPENSES TAB */}
          {tab === "expenses" && (
            <div className="space-y-2">
              {(summary?.expenses || []).length === 0 ? (
                <div className="card-base p-8 text-center">
                  <FiTrendingDown size={36} className="text-muted mx-auto mb-3" />
                  <p className="font-semibold text-primary mb-1">Koi expense nahi aaj</p>
                  <button onClick={() => setShowExpForm(true)} className="bg-danger/10 text-danger border border-danger/20 text-sm px-4 py-2 rounded-xl font-semibold mt-2 flex items-center gap-1.5 mx-auto">
                    <FiPlus size={13} /> Add Expense
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-muted px-1 mb-1">
                    <span>{(summary?.expenses||[]).length} entries</span>
                    <span>Total: <span className="text-danger font-bold">{fmtINR(expenses)}</span></span>
                  </div>
                  {(summary?.expenses || []).map((exp: any) => (
                    <div key={exp.id} className="card-base p-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center shrink-0 text-base">
                        {CAT_EMOJI[exp.category] || "💸"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary text-sm">{exp.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xs text-muted capitalize bg-surface-2 px-1.5 py-0.5 rounded-full">{exp.category}</span>
                          <span className="text-2xs text-muted">{fmtTime(exp.created_at)}</span>
                        </div>
                      </div>
                      <p className="font-bold text-danger text-sm shrink-0">-{fmtINR(Number(exp.amount))}</p>
                      <button onClick={() => deleteExpense(exp.id)} className="text-danger/40 hover:text-danger p-1">
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm card-base p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary">💸 Add Expense</h3>
              <button onClick={() => setShowExpForm(false)} className="text-muted hover:text-primary">✕</button>
            </div>
            <form onSubmit={addExpense} className="space-y-3">
              <div>
                <label className="text-2xs text-muted block mb-1">What was it for? *</label>
                <input required value={expForm.description} onChange={e => setExpForm(f=>({...f, description:e.target.value}))}
                  className="input-base text-sm w-full" placeholder="Petrol, driver salary, material…" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-muted block mb-1">Amount (₹) *</label>
                  <input required type="number" value={expForm.amount} onChange={e => setExpForm(f=>({...f, amount:e.target.value}))}
                    className="input-base text-sm w-full" placeholder="500" min="0" />
                </div>
                <div>
                  <label className="text-2xs text-muted block mb-1">Category</label>
                  <select value={expForm.category} onChange={e => setExpForm(f=>({...f, category:e.target.value}))}
                    className="input-base text-sm w-full">
                    {EXP_CATS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-danger/10 text-danger border border-danger/20 py-2.5 rounded-xl font-bold text-sm hover:bg-danger/20 transition-colors flex items-center justify-center gap-2">
                {submitting ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlus size={14} />}
                Add Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD SALE MODAL */}
      {showSaleForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm card-base p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary">💰 Add Sale</h3>
              <button onClick={() => setShowSaleForm(false)} className="text-muted hover:text-primary">✕</button>
            </div>
            <form onSubmit={addSale} className="space-y-3">
              <div>
                <label className="text-2xs text-muted block mb-1">Customer Name *</label>
                <input required value={saleForm.customer_name} onChange={e => setSaleForm(f=>({...f, customer_name:e.target.value}))}
                  className="input-base text-sm w-full" placeholder="Ramesh ji" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">Amount (₹) *</label>
                <input required type="number" value={saleForm.amount} onChange={e => setSaleForm(f=>({...f, amount:e.target.value}))}
                  className="input-base text-sm w-full" placeholder="15000" min="0" />
              </div>
              <div>
                <label className="text-2xs text-muted block mb-1">What sold</label>
                <input value={saleForm.description} onChange={e => setSaleForm(f=>({...f, description:e.target.value}))}
                  className="input-base text-sm w-full" placeholder="5 truck bajri, 2 bag cement…" />
              </div>
              <button type="submit" disabled={submitting}
                className="btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2">
                {submitting ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlus size={14} />}
                Add Sale
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

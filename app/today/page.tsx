"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiRefreshCw, FiTrendingUp, FiTrendingDown,
  FiShoppingBag, FiFileText, FiCheckCircle, FiDollarSign,
  FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
  FiCalendar, FiZap,
} from "react-icons/fi";
import { isDemoMode } from "@/lib/demo";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const EXP_CATS = ["transport","fuel","salary","material","rent","electricity","maintenance","marketing","misc"];
const CAT_EMOJI: Record<string,string> = {
  transport:"🚚", fuel:"⛽", salary:"👷", material:"📦", rent:"🏠",
  electricity:"💡", maintenance:"🔧", marketing:"📣", misc:"💸",
};

function fmtINR(n: number, short = false) {
  if (short && n >= 100000) return "₹" + (n/100000).toFixed(1) + "L";
  if (short && n >= 1000)   return "₹" + (n/1000).toFixed(0) + "K";
  return "₹" + Number(n).toLocaleString("en-IN");
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtDateFull(d: string) {
  const dt = new Date(d + "T00:00:00");
  const isToday   = d === todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const isYday    = d === yesterday.toISOString().split("T")[0];
  const label     = isToday ? "Aaj" : isYday ? "Kal" : "";
  const weekday   = dt.toLocaleDateString("en-IN", { weekday: "long" });
  const dayMonth  = dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return { label, weekday, dayMonth };
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
}
function addDays(d: string, n: number) {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

// ── Demo data ──────────────────────────────────────────────────────────────
const DEMO_SUMMARY = {
  summary: {
    income: { total: 87500, orders: 62500, invoices: 25000 },
    expenses: { total: 18200, by_category: { fuel: 3200, salary: 8000, material: 5000, misc: 2000 } },
    net_profit: 69300,
    order_count: 7,
    invoices_collected: 3,
    calls_made: 5,
    orders_by_status: { delivered: 5, new: 1, confirmed: 1, dispatched: 0, cancelled: 0 },
  },
  orders: [
    { id:"d1", customer_name:"Mehta Fabrics",      total_amount: 24000, status:"delivered", created_at: new Date().toISOString(), items:[{quantity:8,unit:"roll",name:"Grey Cloth"}] },
    { id:"d2", customer_name:"Sharma Steel Works", total_amount: 18500, status:"delivered", created_at: new Date().toISOString(), items:[{quantity:3,unit:"ton",name:"TMT Rod 12mm"}] },
    { id:"d3", customer_name:"Patel Agro",         total_amount: 12000, status:"dispatched", created_at: new Date().toISOString(), items:[{quantity:20,unit:"bag",name:"Urea Fertilizer"}] },
    { id:"d4", customer_name:"Gupta Construction", total_amount:  8000, status:"confirmed",  created_at: new Date().toISOString(), items:[{quantity:50,unit:"bag",name:"Cement PPC 53"}] },
  ],
  expenses: [
    { id:"e1", description:"Truck fuel — delivery run", amount:3200, category:"fuel",     created_at: new Date().toISOString() },
    { id:"e2", description:"Driver salary — Ramesh",    amount:8000, category:"salary",   created_at: new Date().toISOString() },
    { id:"e3", description:"Raw material — steel rods", amount:5000, category:"material", created_at: new Date().toISOString() },
    { id:"e4", description:"Misc office expenses",      amount:2000, category:"misc",      created_at: new Date().toISOString() },
  ],
  paid_invoices: [
    { id:"i1", customer_name:"Joshi Electronics", invoice_amount:25000 },
  ],
  top_items: [
    { name:"TMT Rod 12mm", qty:8 },
    { name:"Cement PPC 53", qty:50 },
    { name:"Grey Cloth", qty:8 },
  ],
};

const STATUS_COLORS: Record<string,string> = {
  new:"text-accent bg-accent/10", confirmed:"text-warning bg-warning/10",
  dispatched:"text-info bg-info/10", delivered:"text-success bg-success/10",
  cancelled:"text-danger bg-danger/10",
};

export default function TodayPage() {
  const [date, setDate]         = useState(todayStr());
  const [summary, setSummary]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"overview"|"sales"|"expenses">("overview");
  const [showExpForm, setShowExpForm]   = useState(false);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [expForm, setExpForm]   = useState({ description:"", amount:"", category:"misc" });
  const [saleForm, setSaleForm] = useState({ customer_name:"", amount:"", description:"", payment_mode:"cash" });
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const token = () => localStorage.getItem("vantro_token") || "";

  const load = useCallback(async (d = date) => {
    if (isDemoMode()) { setSummary(DEMO_SUMMARY); setLoading(false); return; }
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

  const changeDate = (d: string) => {
    setDate(d);
    load(d);
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode()) { setShowExpForm(false); return; }
    setSubmitting(true);
    try {
      await fetch(`${API}/api/expenses`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`},
        body: JSON.stringify(expForm),
      });
      setExpForm({ description:"", amount:"", category:"misc" });
      setShowExpForm(false);
      load(date);
    } finally { setSubmitting(false); }
  };

  const addSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode()) { setShowSaleForm(false); return; }
    setSubmitting(true);
    try {
      await fetch(`${API}/api/orders`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`},
        body: JSON.stringify({
          customer_name: saleForm.customer_name,
          total_amount: parseFloat(saleForm.amount),
          special_instructions: saleForm.description,
          items:[{ name: saleForm.description || "Sale", quantity:1, unit:"unit" }],
          status:"delivered", source:"manual",
        }),
      });
      setSaleForm({ customer_name:"", amount:"", description:"", payment_mode:"cash" });
      setShowSaleForm(false);
      load(date);
    } finally { setSubmitting(false); }
  };

  const deleteExpense = async (id: string) => {
    if (isDemoMode()) return;
    await fetch(`${API}/api/expenses/${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token()}` } });
    load(date);
  };

  const s       = summary?.summary;
  const income  = s?.income?.total   || 0;
  const expenses= s?.expenses?.total || 0;
  const net     = s?.net_profit      || 0;
  const isProfit= net >= 0;
  const { label, weekday, dayMonth } = fmtDateFull(date);
  const isToday = date === todayStr();

  return (
    <DashboardLayout pageTitle="Aaj ka Hisaab">

      {/* ── PREMIUM DATE NAVIGATOR ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2">
          {/* Prev day */}
          <button onClick={() => changeDate(addDays(date,-1))}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-secondary hover:text-primary hover:border-accent/40 transition-all">
            <FiChevronLeft size={16} />
          </button>

          {/* Date display — click to open native picker */}
          <button onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-accent/40 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <FiCalendar size={14} className="text-accent" />
            </div>
            <div className="text-left">
              {label && <p className="text-2xs font-bold text-accent uppercase tracking-wider leading-none mb-0.5">{label} · {weekday}</p>}
              {!label && <p className="text-2xs font-bold text-muted uppercase tracking-wider leading-none mb-0.5">{weekday}</p>}
              <p className="text-sm font-bold text-primary leading-none">{dayMonth}</p>
            </div>
            <FiChevronDown size={12} className="text-muted group-hover:text-secondary transition-colors ml-1" />
            {/* Hidden native date input */}
            <input ref={dateInputRef} type="date" value={date}
              onChange={e => changeDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
              style={{ colorScheme:"dark" }} />
          </button>

          {/* Next day — disabled if today */}
          <button onClick={() => changeDate(addDays(date,1))}
            disabled={isToday}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-secondary hover:text-primary hover:border-accent/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <FiChevronRight size={16} />
          </button>

          {/* Jump to today */}
          {!isToday && (
            <button onClick={() => changeDate(todayStr())}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all">
              Aaj
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowSaleForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all shadow-[0_2px_12px_rgba(0,102,255,0.35)]">
            <FiPlus size={13} /> Sale
          </button>
          <button onClick={() => setShowExpForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-bold hover:bg-danger/20 transition-all">
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
          {/* ── BIG P&L HERO CARD ─────────────────────────────────────────── */}
          <div className={`rounded-2xl p-5 mb-5 relative overflow-hidden ${
            isProfit
              ? "bg-gradient-to-br from-success/15 to-success/5 border border-success/20"
              : "bg-gradient-to-br from-danger/15 to-danger/5 border border-danger/20"
          }`}>
            <div className="absolute -top-2 -right-2 opacity-10">
              {isProfit
                ? <FiTrendingUp size={80} className="text-success" />
                : <FiTrendingDown size={80} className="text-danger" />}
            </div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Net {isProfit ? "Profit" : "Loss"} Today
            </p>
            <p className={`text-5xl font-black tracking-tight mb-4 ${isProfit ? "text-success" : "text-danger"}`}>
              {isProfit ? "+" : ""}{fmtINR(net)}
            </p>

            <div className="grid grid-cols-4 gap-3">
              {[
                { label:"Income",    value: `+${fmtINR(income, true)}`,   color:"text-success" },
                { label:"Expenses",  value: `-${fmtINR(expenses, true)}`, color:"text-danger"  },
                { label:"Orders",    value: String(s?.order_count || 0),  color:"text-primary" },
                { label:"Collected", value: String(s?.invoices_collected || 0), color:"text-primary" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-black/10 rounded-xl px-3 py-2">
                  <p className="text-2xs text-muted/70 mb-1">{label}</p>
                  <p className={`text-base font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── QUICK STATS ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { label:"Delivered", value: s?.orders_by_status?.delivered || 0, color:"text-success",  bg:"bg-success/10" },
              { label:"Pending",   value:(s?.orders_by_status?.new||0)+(s?.orders_by_status?.confirmed||0)+(s?.orders_by_status?.dispatched||0), color:"text-warning", bg:"bg-warning/10" },
              { label:"Calls",     value: s?.calls_made || 0,                  color:"text-accent",   bg:"bg-accent/10"  },
              { label:"Cancelled", value: s?.orders_by_status?.cancelled || 0, color:"text-danger",   bg:"bg-danger/10"  },
            ].map(stat => (
              <div key={stat.label} className={`card-premium p-3 text-center ${stat.bg} border-0`}>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-2xs text-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── TABS ──────────────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-4 border border-border">
            {(["overview","sales","expenses"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab===t
                    ? "bg-surface-1 text-primary shadow-sm border border-border"
                    : "text-muted hover:text-secondary"
                }`}>
                {t==="sales" ? `💰 Sales (${(summary?.orders||[]).length})`
                 : t==="expenses" ? `💸 Expenses (${(summary?.expenses||[]).length})`
                 : "📊 Overview"}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
          {tab==="overview" && (
            <div className="space-y-4">
              <div className="card-premium p-4">
                <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-3">Income Breakdown</p>
                <div className="space-y-3">
                  {[
                    { icon: FiShoppingBag, label:"Orders Income",       color:"#0066FF", value: s?.income?.orders   || 0 },
                    { icon: FiFileText,    label:"Invoices Collected",   color:"#10D98A", value: s?.income?.invoices || 0 },
                  ].map(({ icon: Icon, label, color, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${color}18`, border:`1px solid ${color}25` }}>
                          <Icon size={13} style={{ color }} />
                        </div>
                        <span className="text-sm text-secondary">{label}</span>
                      </div>
                      <span className="font-bold text-success text-sm">+{fmtINR(value)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-primary">Total Income</span>
                    <span className="text-success text-base">+{fmtINR(income)}</span>
                  </div>
                </div>
              </div>

              {expenses > 0 && s?.expenses?.by_category && (
                <div className="card-premium p-4">
                  <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-3">Expense Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(s.expenses.by_category as Record<string,number>).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm text-secondary">{CAT_EMOJI[cat]||"💸"} {cat.charAt(0).toUpperCase()+cat.slice(1)}</span>
                        <span className="font-semibold text-danger text-sm">-{fmtINR(amt as number)}</span>
                      </div>
                    ))}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-primary">Total Expenses</span>
                      <span className="text-danger">-{fmtINR(expenses)}</span>
                    </div>
                  </div>
                </div>
              )}

              {(summary?.paid_invoices||[]).length > 0 && (
                <div className="card-premium p-4 border-success/20 bg-success/5">
                  <p className="text-2xs font-bold text-success uppercase tracking-wider mb-3">🎉 Invoices Collected Today</p>
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

              {income===0 && expenses===0 && (
                <div className="card-premium p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
                    <FiZap size={24} className="text-muted opacity-50" />
                  </div>
                  <p className="font-bold text-primary mb-1">Aaj ka data khaali hai</p>
                  <p className="text-sm text-muted mb-4">Sale ya expense add karo upar se</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setShowSaleForm(true)}
                      className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all">
                      + Add Sale
                    </button>
                    <button onClick={() => setShowExpForm(true)}
                      className="px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-bold hover:bg-danger/20 transition-all">
                      + Add Expense
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SALES TAB ─────────────────────────────────────────────────── */}
          {tab==="sales" && (
            <div className="space-y-2">
              {(summary?.orders||[]).length===0 ? (
                <div className="card-premium p-10 text-center">
                  <FiShoppingBag size={32} className="text-muted mx-auto mb-3 opacity-40" />
                  <p className="font-bold text-primary mb-1">Koi sale nahi aaj</p>
                  <button onClick={() => setShowSaleForm(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all flex items-center gap-1.5 mx-auto">
                    <FiPlus size={13} /> Add Sale
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-muted px-1 mb-2">
                    <span>{(summary?.orders||[]).length} entries</span>
                    <span>Total: <span className="text-success font-bold">{fmtINR(income)}</span></span>
                  </div>
                  {(summary?.orders||[]).map((order: any) => {
                    const open = expanded === order.id;
                    return (
                      <div key={order.id} className="card-premium overflow-hidden">
                        <div className="p-4 flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-success/15 border border-success/20 flex items-center justify-center shrink-0">
                            <FiShoppingBag size={15} className="text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-primary text-sm">{order.customer_name}</p>
                              <p className="font-black text-success text-sm">{order.total_amount ? fmtINR(Number(order.total_amount)) : "—"}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-2xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status]||"text-muted bg-surface-2"}`}>
                                {order.status}
                              </span>
                              <span className="text-2xs text-muted">{fmtTime(order.created_at)}</span>
                              {order.source==="ai_call" && <span className="text-2xs text-accent bg-accent/10 px-1.5 rounded-full">📞 AI Call</span>}
                            </div>
                            {(order.items||[]).length > 0 && (
                              <p className="text-xs text-muted mt-1 truncate">
                                {order.items.slice(0,3).map((i:any) => `${i.quantity} ${i.unit} ${i.local_name||i.name}`).join(" · ")}
                              </p>
                            )}
                          </div>
                          <button onClick={() => setExpanded(open?null:order.id)} className="text-muted p-1 hover:text-primary">
                            {open ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                          </button>
                        </div>
                        {open && (order.delivery_time||order.special_instructions) && (
                          <div className="border-t border-border px-4 py-2.5 bg-surface-2/40 text-xs text-muted space-y-1">
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

          {/* ── EXPENSES TAB ──────────────────────────────────────────────── */}
          {tab==="expenses" && (
            <div className="space-y-2">
              {(summary?.expenses||[]).length===0 ? (
                <div className="card-premium p-10 text-center">
                  <FiTrendingDown size={32} className="text-muted mx-auto mb-3 opacity-40" />
                  <p className="font-bold text-primary mb-1">Koi expense nahi aaj</p>
                  <button onClick={() => setShowExpForm(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-danger/10 text-danger border border-danger/20 text-xs font-bold hover:bg-danger/20 transition-all flex items-center gap-1.5 mx-auto">
                    <FiPlus size={13} /> Add Expense
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-muted px-1 mb-2">
                    <span>{(summary?.expenses||[]).length} entries</span>
                    <span>Total: <span className="text-danger font-bold">{fmtINR(expenses)}</span></span>
                  </div>
                  {(summary?.expenses||[]).map((exp: any) => (
                    <div key={exp.id} className="card-premium p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0 text-lg">
                        {CAT_EMOJI[exp.category]||"💸"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary text-sm">{exp.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xs text-muted capitalize bg-surface-2 border border-border px-2 py-0.5 rounded-full">{exp.category}</span>
                          <span className="text-2xs text-muted">{fmtTime(exp.created_at)}</span>
                        </div>
                      </div>
                      <p className="font-black text-danger text-sm shrink-0">-{fmtINR(Number(exp.amount))}</p>
                      <button onClick={() => deleteExpense(exp.id)} className="text-danger/30 hover:text-danger p-1 transition-colors">
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

      {/* ── ADD EXPENSE MODAL ─────────────────────────────────────────────── */}
      {showExpForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-base">💸</div>
                <p className="font-bold text-primary">Add Expense</p>
              </div>
              <button onClick={() => setShowExpForm(false)} className="text-muted hover:text-primary text-lg">✕</button>
            </div>
            <form onSubmit={addExpense} className="space-y-3">
              <div>
                <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Kya tha? *</label>
                <input required value={expForm.description} onChange={e => setExpForm(f=>({...f, description:e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent"
                  placeholder="Petrol, driver salary, material…" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Amount (₹) *</label>
                  <input required type="number" value={expForm.amount} onChange={e => setExpForm(f=>({...f, amount:e.target.value}))}
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent"
                    placeholder="500" min="0" />
                </div>
                <div>
                  <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Category</label>
                  <select value={expForm.category} onChange={e => setExpForm(f=>({...f, category:e.target.value}))}
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent">
                    {EXP_CATS.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-danger/10 text-danger border border-danger/20 py-3 rounded-xl font-bold text-sm hover:bg-danger/20 transition-colors flex items-center justify-center gap-2">
                {submitting ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlus size={14} />}
                {submitting ? "Saving…" : "Add Expense"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD SALE MODAL ───────────────────────────────────────────────── */}
      {showSaleForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 border border-border rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-base">💰</div>
                <p className="font-bold text-primary">Add Sale</p>
              </div>
              <button onClick={() => setShowSaleForm(false)} className="text-muted hover:text-primary text-lg">✕</button>
            </div>
            <form onSubmit={addSale} className="space-y-3">
              <div>
                <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Customer Name *</label>
                <input required value={saleForm.customer_name} onChange={e => setSaleForm(f=>({...f, customer_name:e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent"
                  placeholder="Ramesh ji, Patel Traders…" autoFocus />
              </div>
              <div>
                <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Amount (₹) *</label>
                <input required type="number" value={saleForm.amount} onChange={e => setSaleForm(f=>({...f, amount:e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent"
                  placeholder="15000" min="0" />
              </div>
              <div>
                <label className="text-2xs text-muted font-semibold block mb-1.5 uppercase tracking-wider">Kya becha</label>
                <input value={saleForm.description} onChange={e => setSaleForm(f=>({...f, description:e.target.value}))}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent"
                  placeholder="5 truck bajri, 2 bag cement, cloth…" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-accent text-white py-3 rounded-xl font-bold text-sm hover:bg-accent/90 transition-all shadow-[0_2px_12px_rgba(0,102,255,0.35)] flex items-center justify-center gap-2">
                {submitting ? <FiRefreshCw className="animate-spin" size={14} /> : <FiPlus size={14} />}
                {submitting ? "Saving…" : "Add Sale"}
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

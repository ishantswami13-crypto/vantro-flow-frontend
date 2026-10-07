"use client";
import { authHeaders } from "@/lib/api";
import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiRefreshCw, FiTrendingDown,
  FiShoppingBag, FiFileText, FiCheckCircle, FiDollarSign,
  FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
  FiCalendar, FiZap,
} from "react-icons/fi";
import TodayDecisionsCard from "@/components/decisions/TodayDecisionsCard";
import { TodaySummary } from "@/components/os/TodaySummary";

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
// Local calendar date (IST for Indian users), not the UTC date.
function localIso(dt: Date) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; }
function todayStr() { return localIso(new Date()); }
// Older order rows hold items as a JSON string; never let that crash the page.
function orderItems(order: any): any[] {
  let items = order?.items;
  if (typeof items === "string") { try { items = JSON.parse(items); } catch { items = []; } }
  return Array.isArray(items) ? items : [];
}
function fmtDateFull(d: string) {
  const dt = new Date(d + "T00:00:00");
  const isToday   = d === todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const isYday    = d === localIso(yesterday);
  const label     = isToday ? "Today" : isYday ? "Yesterday" : "";
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
  return localIso(dt);
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string|null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (d = date) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API}/api/today/summary?date=${d}`, {
        headers: { ...authHeaders() }, credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) setSummary(data);
      else { setSummary(null); setLoadError(data.error || `The server answered ${res.status}.`); }
    } catch {
      setSummary(null);
      setLoadError("Could not reach Starlane. Check your connection.");
    } finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const changeDate = (d: string) => {
    setDate(d);
    load(d);
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method:"POST",
        headers: { ...authHeaders(), "Content-Type":"application/json" }, credentials: "include",
        body: JSON.stringify(expForm),
      });
      if (!res.ok) { setFormError("The expense was not saved. Check the amount and try again."); return; }
      setExpForm({ description:"", amount:"", category:"misc" });
      setShowExpForm(false);
      load(date);
    } catch {
      setFormError("The expense was not saved: Starlane could not be reached.");
    } finally { setSubmitting(false); }
  };

  const addSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method:"POST",
        headers: { ...authHeaders(), "Content-Type":"application/json" }, credentials: "include",
        body: JSON.stringify({
          customer_name: saleForm.customer_name,
          total_amount: parseFloat(saleForm.amount),
          special_instructions: saleForm.description,
          items:[{ name: saleForm.description || "Sale", quantity:1, unit:"unit" }],
          status:"delivered", source:"manual",
        }),
      });
      if (!res.ok) { setFormError("The sale was not saved. Check the amount and try again."); return; }
      setSaleForm({ customer_name:"", amount:"", description:"", payment_mode:"cash" });
      setShowSaleForm(false);
      load(date);
    } catch {
      setFormError("The sale was not saved: Starlane could not be reached.");
    } finally { setSubmitting(false); }
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    const res = await fetch(`${API}/api/expenses/${id}`, { method:"DELETE", headers: { ...authHeaders() }, credentials: "include" }).catch(() => null);
    if (!res || !res.ok) { setLoadError("That expense was not deleted. Try again."); return; }
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
    <DashboardLayout pageTitle="Today">
      <TodaySummary />
      <TodayDecisionsCard />

      {/* ── PREMIUM DATE NAVIGATOR ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2">
          {/* Prev day */}
          <button aria-label="Previous" onClick={() => changeDate(addDays(date,-1))}
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
          <button aria-label="Next" onClick={() => changeDate(addDays(date,1))}
            disabled={isToday}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-secondary hover:text-primary hover:border-accent/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <FiChevronRight size={16} />
          </button>

          {/* Jump to today */}
          {!isToday && (
            <button onClick={() => changeDate(todayStr())}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all">
              Today
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowSaleForm(true)}
            className="btn-primary-v32 flex items-center gap-1.5" style={{ padding: "6px 12px", fontSize: 12 }}>
            <FiPlus size={13} /> Sale
          </button>
          <button onClick={() => setShowExpForm(true)}
            className="btn-secondary-v32 flex items-center gap-1.5" style={{ padding: "6px 12px", fontSize: 12 }}>
            <FiPlus size={13} /> Expense
          </button>
        </div>
      </div>

      {formError && !showExpForm && !showSaleForm && <p role="alert" className="text-sm text-danger mb-3">{formError}</p>}
      {loading && !summary ? (
        <div className="flex items-center justify-center h-48 text-muted">
          <FiRefreshCw className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : loadError && !summary ? (
        <div role="alert" className="rounded-2xl p-5 mb-5 border border-danger/20 bg-danger/5">
          <p className="text-sm font-semibold text-danger">This day&apos;s sales and expenses could not be loaded.</p>
          <p className="text-sm text-secondary mt-1">{loadError} Nothing has been changed. The figures are hidden rather than shown as zero.</p>
          <button type="button" onClick={() => load(date)} className="mt-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold">Try again</button>
        </div>
      ) : (
        <>
          {/* ── NET MONEY (V32 sim_card style: white card, mono figure) ─────── */}
          <div className="fade-once mb-5" style={{ background: "var(--surface)", border: "1px solid rgb(var(--tk-ink) / 0.10)", borderRadius: 8, padding: 20 }}>
            <p style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 4 }}>
              Net money {isProfit ? "in" : "out"} {isToday ? "today" : "on this day"}
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
              Sales booked and payments received, minus expenses and purchases. This is not profit: it has no cost of goods.
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 34, color: isProfit ? "var(--positive)" : "var(--critical)", marginBottom: 18, lineHeight: 1 }}>
              {isProfit ? "+" : ""}{fmtINR(net)}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderTop: "1px solid var(--line)" }}>
              {[
                { label: "Money in", value: `+${fmtINR(income, true)}`, color: "var(--positive)" },
                { label: "Money out", value: `-${fmtINR(expenses, true)}`, color: "var(--critical)" },
                { label: "Orders", value: String(s?.order_count || 0), color: "var(--ink)" },
                { label: "Invoices paid", value: String(s?.invoices_collected || 0), color: "var(--ink)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "12px 0 0" }}>
                  <p style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── QUICK STATS ───────────────────────────────────────────────── */}
          <div className="flex items-center flex-wrap mb-5" style={{ gap: 10, fontSize: 13, color: "var(--body)" }}>
            {[
              { label: "delivered", value: s?.orders_by_status?.delivered || 0, color: "var(--positive)" },
              { label: "pending", value: (s?.orders_by_status?.new || 0) + (s?.orders_by_status?.confirmed || 0) + (s?.orders_by_status?.dispatched || 0), color: "var(--warning)" },
              { label: "calls", value: s?.calls_made || 0, color: "var(--accent)" },
              { label: "cancelled", value: s?.orders_by_status?.cancelled || 0, color: "var(--critical)" },
            ].map((stat, i) => (
              <span key={stat.label} className="flex items-center" style={{ gap: 6 }}>
                {i > 0 && <span aria-hidden style={{ color: "var(--line-strong)", marginRight: 4 }}>·</span>}
                <span style={{ fontFamily: "var(--font-sans)", color: "var(--ink)" }}>{stat.value}</span> {stat.label}
              </span>
            ))}
          </div>

          {/* ── TABS ──────────────────────────────────────────────────────── */}
          <nav aria-label="Today" className="flex items-center mb-4" style={{ gap: 22, borderBottom: "1px solid var(--line)" }}>
            {(["overview","sales","expenses"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className="hover-dim"
                style={{ padding: "8px 2px", marginBottom: -1, fontSize: 13, fontWeight: tab === t ? 500 : 400, color: tab === t ? "var(--ink)" : "var(--ink-2)", borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}` }}>
                {t==="sales" ? `Sales (${(summary?.orders||[]).length})`
                 : t==="expenses" ? `Expenses (${(summary?.expenses||[]).length})`
                 : "Overview"}
              </button>
            ))}
          </nav>

          {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
          {tab==="overview" && (
            <div className="space-y-4">
              <div className="card-premium p-4">
                <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-3">Money in, by source</p>
                <div className="space-y-3">
                  {[
                    { icon: FiShoppingBag, label:"Orders booked",       color:"var(--accent)", value: s?.income?.orders   || 0 },
                    { icon: FiFileText,    label:"Invoice payments received",   color:"var(--positive)", value: s?.income?.invoices || 0 },
                    { icon: FiDollarSign,  label:"Sales Recorded",       color:"#7C5CFC", value: s?.sales_total || 0 },
                  ].filter((r) => r.label !== "Sales Recorded" || r.value > 0).map(({ icon: Icon, label, color, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, border:`1px solid color-mix(in srgb, ${color} 15%, transparent)` }}>
                          <Icon size={13} style={{ color }} />
                        </div>
                        <span className="text-sm text-secondary">{label}</span>
                      </div>
                      <span className="font-bold text-success text-sm">+{fmtINR(value)}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-primary">Total money in</span>
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
                    {(s?.expenses?.purchases || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-secondary">📦 Purchases</span>
                        <span className="font-semibold text-danger text-sm">-{fmtINR(s.expenses.purchases)}</span>
                      </div>
                    )}
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
                  <p className="font-bold text-primary mb-1">Nothing recorded for this day</p>
                  <p className="text-sm text-muted mb-4">Add a sale or an expense above.</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => setShowSaleForm(true)}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all">
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
                    className="mt-3 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-all flex items-center gap-1.5 mx-auto">
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
                            {orderItems(order).length > 0 && (
                              <p className="text-xs text-muted mt-1 truncate">
                                {orderItems(order).slice(0,3).map((i:any) => `${i.quantity} ${i.unit} ${i.local_name||i.name}`).join(" · ")}
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
                      <button aria-label="Delete" onClick={() => deleteExpense(exp.id)} className="text-danger/30 hover:text-danger p-1 transition-colors">
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
              {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
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
              {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center gap-2">
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

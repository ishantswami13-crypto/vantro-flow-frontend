"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getToken } from "@/lib/api";
import {
  FiBook, FiMessageSquare, FiPhone, FiSearch, FiUser, FiUsers,
  FiX, FiZap, FiAlertTriangle, FiActivity, FiClock, FiCheckCircle,
  FiTrendingDown, FiShield, FiExternalLink,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Customer = {
  customer_name: string;
  customer_phone?: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
  last_entry: string;
  entry_count: number;
};

type Intelligence = {
  customer_id: string | null;
  name: string;
  score: {
    credit_risk_score: number;
    collection_priority_score: number;
    promise_reliability_score: number;
    average_delay_days: number;
    max_delay_days: number;
    broken_promise_count: number;
    tier: string;
    credit_recommendation: string;
    last_calculated_at: string | null;
  };
  summary: {
    total_outstanding: number;
    overdue_count: number;
    active_promises: number;
    broken_promises: number;
    pending_actions: number;
  };
  promises: any[];
  actions:  any[];
  invoices: any[];
  memories: any[];
};

const fmtINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtDate = (value?: string | null) => {
  if (!value) return "No activity";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const tierColor = (tier: string) =>
  tier === "HIGH_RISK" ? "#F5424D" : tier === "MEDIUM" ? "#F5A524" : "#10D98A";
const tierLabel = (tier: string) =>
  tier === "HIGH_RISK" ? "High Risk" : tier === "MEDIUM" ? "Medium" : "Low Risk";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoreMap, setScoreMap] = useState<Record<string, { score: number; tier: string; overdue_amount: number }>>({});
  const [promiseCountMap, setPromiseCountMap] = useState<Record<string, number>>({});

  // Intelligence panel
  const [panel, setPanel] = useState<{ name: string; phone?: string } | null>(null);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/khata`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load customers");
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadCustomers();
    const token = getToken();

    fetch(`${API}/api/customer-scores`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.scores) return;
        const map: Record<string, any> = {};
        d.scores.forEach((s: any) => { map[s.customer_name] = s; });
        setScoreMap(map);
      }).catch(() => {});

    fetch(`${API}/api/promises?status=active&limit=200`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.promises) return;
        const countMap: Record<string, number> = {};
        d.promises.forEach((p: any) => {
          const name = p.customers?.name;
          if (name) countMap[name] = (countMap[name] || 0) + 1;
        });
        setPromiseCountMap(countMap);
      }).catch(() => {});
  }, []);

  const openPanel = useCallback(async (name: string, phone?: string) => {
    setPanel({ name, phone });
    setIntelligence(null);
    setIntelligenceLoading(true);
    try {
      const params = new URLSearchParams({ name });
      if (phone) params.set("phone", phone);
      const res = await fetch(`${API}/api/customers/intelligence?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setIntelligence(data);
    } catch {} finally { setIntelligenceLoading(false); }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      [c.customer_name, c.customer_phone].some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [customers, search]);

  const totalReceivable = customers.reduce((s, c) => s + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  const totalAdvance    = customers.reduce((s, c) => s + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);
  const activeCustomers = customers.filter(c => Number(c.balance) > 0).length;
  const highRiskCount   = Object.values(scoreMap).filter(s => s.tier === "HIGH_RISK").length;

  const whatsappStatement = (customer: Customer) => {
    const balance = Number(customer.balance || 0);
    const message = balance > 0
      ? `Namaste ${customer.customer_name} ji, aapka hamare yahan ${fmtINR(balance)} baaki hai. Kripya payment update karein.`
      : balance < 0
        ? `Namaste ${customer.customer_name} ji, aapka ${fmtINR(Math.abs(balance))} advance hamare paas hai.`
        : `Namaste ${customer.customer_name} ji, aapka account clear hai.`;
    if (customer.customer_phone) {
      window.open(`https://wa.me/91${customer.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      navigator.clipboard.writeText(message);
    }
  };

  return (
    <DashboardLayout pageTitle="Customers">
      <div className="space-y-5 page-enter">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Customer Intelligence</h2>
            <p className="text-sm text-secondary mt-0.5">Behavioural profiles powered by Cortex · Auto-added from Sales, Invoices &amp; Khata</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadCustomers} className="px-4 py-2 rounded-xl bg-surface-2 text-secondary text-xs font-bold border border-border">Refresh</button>
            <Link href="/khata" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">Open Khata</Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-metric p-5">
            <p className="section-label mb-3">Total Customers</p>
            <p className="metric-lg text-primary">{customers.length}</p>
            <p className="text-2xs text-muted mt-1">{activeCustomers} with dues</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">We Need To Collect</p>
            <p className="metric-lg text-danger">{fmtINR(totalReceivable)}</p>
            <p className="text-2xs text-muted mt-1">lena hai</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">Customer Advance</p>
            <p className="metric-lg text-success">{fmtINR(totalAdvance)}</p>
            <p className="text-2xs text-muted mt-1">dena / adjust karna hai</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">High Risk</p>
            <p className="metric-lg" style={{ color: highRiskCount > 0 ? "#F5424D" : "#10D98A" }}>
              {highRiskCount > 0 ? highRiskCount : "None"}
            </p>
            <p className="text-2xs text-muted mt-1">{highRiskCount > 0 ? "need attention" : "all clear"}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or phone..."
            className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-3 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
        </div>

        {/* List */}
        {loading ? (
          <div className="card-premium p-10 text-center text-sm text-muted">Loading customers...</div>
        ) : error ? (
          <div className="card-premium p-10 text-center text-sm text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <FiUsers size={34} className="mx-auto mb-3 text-muted opacity-40" />
            <p className="text-sm font-bold text-primary">No customers yet</p>
            <p className="text-xs text-muted mt-1">Scan a sale invoice, create an invoice, or add a Khata entry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(customer => {
              const balance  = Number(customer.balance || 0);
              const riskInfo = scoreMap[customer.customer_name];
              const tc       = riskInfo ? tierColor(riskInfo.tier) : null;
              const promiseCount = promiseCountMap[customer.customer_name] || 0;
              return (
                <div key={customer.customer_name} className="card-premium p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: avatar + name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => openPanel(customer.customer_name, customer.customer_phone || undefined)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-105"
                        style={{ background: tc ? `${tc}18` : "rgba(79,110,247,0.12)", border: `1px solid ${tc ? `${tc}30` : "rgba(79,110,247,0.25)"}` }}
                        title="View intelligence profile">
                        <FiUser size={16} style={{ color: tc || "#8BA4F9" }} />
                      </button>
                      <div className="min-w-0">
                        <button onClick={() => openPanel(customer.customer_name, customer.customer_phone || undefined)}
                          className="font-bold text-primary truncate hover:text-accent transition-colors text-left">
                          {customer.customer_name}
                        </button>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-2xs text-muted">{customer.entry_count || 0} entries · {fmtDate(customer.last_entry)}</p>
                          {promiseCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ color: "#F5A524", background: "rgba(245,165,36,0.12)", border: "1px solid rgba(245,165,36,0.25)" }}>
                              🤝 {promiseCount} promise{promiseCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: balance + risk */}
                    <div className="text-right shrink-0">
                      <p className={balance > 0 ? "metric-value text-danger" : balance < 0 ? "metric-value text-success" : "metric-value text-muted"}>
                        {fmtINR(Math.abs(balance))}
                      </p>
                      <p className="text-2xs text-muted">{balance > 0 ? "lena hai" : balance < 0 ? "advance" : "clear"}</p>
                      {riskInfo && (
                        <span className="inline-block mt-1 text-[9px] font-bold rounded-full px-1.5 py-0.5"
                          style={{ color: tc!, background: `${tc}18`, border: `1px solid ${tc}35` }}>
                          {tierLabel(riskInfo.tier)} · {riskInfo.score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Given</p>
                      <p className="text-sm font-bold text-primary">{fmtINR(Number(customer.total_debit || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Paid</p>
                      <p className="text-sm font-bold text-primary">{fmtINR(Number(customer.total_credit || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Last</p>
                      <p className="text-sm font-bold text-primary truncate">{fmtDate(customer.last_entry)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link href={`/khata?customer=${encodeURIComponent(customer.customer_name)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-accent/10 text-accent border border-accent/20">
                      <FiBook size={11} /> Khata
                    </Link>
                    <button onClick={() => openPanel(customer.customer_name, customer.customer_phone || undefined)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg border transition-all"
                      style={{ background: "rgba(79,110,247,0.08)", color: "#8BA4F9", borderColor: "rgba(79,110,247,0.2)" }}>
                      <FiZap size={11} /> Intelligence
                    </button>
                    {customer.customer_phone && (
                      <a href={`tel:${customer.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-surface-2 text-secondary border border-border">
                        <FiPhone size={11} /> Call
                      </a>
                    )}
                    <button onClick={() => whatsappStatement(customer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-success/10 text-success border border-success/20">
                      <FiMessageSquare size={11} /> WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Intelligence Panel (slide-in) ─────────────────────────────── */}
      {panel && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setPanel(null)}>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          <div className="w-full max-w-sm bg-[#0d0d0d] border-l border-white/8 h-full overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 sticky top-0 z-10"
              style={{ background: "#0d0d0d" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.25)" }}>
                  <FiZap size={15} style={{ color: "#8BA4F9" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary leading-tight">{panel.name}</p>
                  <p className="text-[10px] text-muted">Cortex Intelligence Profile</p>
                </div>
              </div>
              <button onClick={() => setPanel(null)} className="text-muted hover:text-primary transition-colors p-1">
                <FiX size={18} />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 px-5 py-4 space-y-5">
              {intelligenceLoading ? (
                <div className="space-y-3 pt-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-white/4 animate-pulse" />)}
                </div>
              ) : !intelligence ? (
                <div className="text-center py-12">
                  <FiActivity size={28} className="mx-auto mb-3 text-muted opacity-40" />
                  <p className="text-sm text-muted">No Cortex profile yet</p>
                  <p className="text-xs text-muted mt-1">Create a sale or invoice for this customer to start tracking</p>
                </div>
              ) : (
                <>
                  {/* Risk score */}
                  <div className="rounded-xl p-4 border"
                    style={{
                      background: `${tierColor(intelligence.score.tier)}08`,
                      borderColor: `${tierColor(intelligence.score.tier)}25`,
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: tierColor(intelligence.score.tier) }}>
                        {tierLabel(intelligence.score.tier)}
                      </p>
                      <span className="text-2xl font-black" style={{ color: tierColor(intelligence.score.tier) }}>
                        {intelligence.score.credit_risk_score}<span className="text-xs font-normal opacity-60">/100</span>
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-snug">{intelligence.score.credit_recommendation}</p>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Outstanding",     value: fmtINR(intelligence.summary.total_outstanding),  color: intelligence.summary.total_outstanding > 0 ? "#F5424D" : "#10D98A" },
                      { label: "Overdue invoices", value: String(intelligence.summary.overdue_count),      color: intelligence.summary.overdue_count > 0 ? "#F5A524" : "#10D98A" },
                      { label: "Avg delay",        value: `${intelligence.score.average_delay_days}d`,    color: intelligence.score.average_delay_days > 10 ? "#F5A524" : "#10D98A" },
                      { label: "Promise reliability",value: `${intelligence.score.promise_reliability_score}%`, color: intelligence.score.promise_reliability_score < 70 ? "#F5424D" : "#10D98A" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg p-3 bg-white/4 border border-white/6">
                        <p className="text-[10px] text-muted mb-1">{label}</p>
                        <p className="text-sm font-bold" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Active promises */}
                  {intelligence.promises.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Active Promises</p>
                      <div className="space-y-2">
                        {intelligence.promises.filter(p => p.status === 'active').slice(0, 3).map((p, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-warning/8 border border-warning/15">
                            <div className="flex items-center gap-2">
                              <FiClock size={12} style={{ color: "#F5A524" }} />
                              <span className="text-xs text-secondary">{new Date(p.promised_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            </div>
                            {p.promised_amount && <span className="text-xs font-bold text-warning">{fmtINR(p.promised_amount)}</span>}
                          </div>
                        ))}
                        {intelligence.score.broken_promise_count > 0 && (
                          <p className="text-[10px] text-danger flex items-center gap-1">
                            <FiAlertTriangle size={10} /> {intelligence.score.broken_promise_count} broken promise{intelligence.score.broken_promise_count > 1 ? "s" : ""} on record
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pending AI actions */}
                  {intelligence.actions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">AI Actions</p>
                      <div className="space-y-2">
                        {intelligence.actions.slice(0, 4).map((a, i) => {
                          const priorityColor = a.priority === 'urgent' ? '#F5424D' : a.priority === 'high' ? '#F5A524' : '#4F6EF7';
                          return (
                            <div key={i} className="flex items-start gap-2 py-2 px-3 rounded-lg bg-white/4 border border-white/6">
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: priorityColor }} />
                              <p className="text-xs text-secondary leading-snug">{a.title}</p>
                            </div>
                          );
                        })}
                        <Link href="/ai-actions"
                          className="flex items-center gap-1.5 text-xs text-accent hover:underline mt-1">
                          <FiExternalLink size={11} /> View in Action Center
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Recent invoices */}
                  {intelligence.invoices.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Recent Invoices</p>
                      <div className="space-y-1.5">
                        {intelligence.invoices.slice(0, 4).map((inv, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/4 border border-white/6">
                            <div className="flex items-center gap-2">
                              {inv.payment_status === 'Paid'
                                ? <FiCheckCircle size={11} style={{ color: "#10D98A" }} />
                                : <FiTrendingDown size={11} style={{ color: inv.days_overdue > 0 ? "#F5424D" : "#F5A524" }} />}
                              <span className="text-xs text-muted">
                                {inv.days_overdue > 0 ? `${inv.days_overdue}d overdue` : inv.payment_status}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-primary">{fmtINR(parseFloat(inv.invoice_amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memory tags */}
                  {intelligence.memories.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Cortex Memory</p>
                      <div className="flex flex-wrap gap-1.5">
                        {intelligence.memories.slice(0, 8).map((m, i) => (
                          <span key={i} className="text-[10px] font-medium px-2 py-1 rounded-full"
                            style={{ background: "rgba(79,110,247,0.1)", color: "#8BA4F9", border: "1px solid rgba(79,110,247,0.2)" }}>
                            {m.memory_key.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score last updated */}
                  {intelligence.score.last_calculated_at && (
                    <p className="text-[10px] text-muted text-center pt-2">
                      Score last updated {fmtDate(intelligence.score.last_calculated_at)}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-4 border-t border-white/6 flex gap-2">
              <Link href="/collections" className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-accent/10 text-accent border border-accent/20">
                Collections →
              </Link>
              <Link href="/ai-actions" className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold bg-white/5 text-secondary border border-white/8">
                Action Center →
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

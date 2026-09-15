"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getToken, type CustomerPortfolioResponse } from "@/lib/api";
import { FiBook, FiMessageSquare, FiPhone, FiSearch, FiUser, FiUsers, FiAlertTriangle } from "react-icons/fi";

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

const fmtINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtDate = (value?: string | null) => {
  if (!value) return "No activity";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoreMap, setScoreMap] = useState<Record<string, { score: number; tier: string; overdue_amount: number; health_label?: string | null }>>({});
  const [portfolio, setPortfolio] = useState<CustomerPortfolioResponse | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/khata`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load customers");
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    fetch(`${API}/api/customer-scores`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.scores) return;
        const map: Record<string, any> = {};
        d.scores.forEach((s: any) => { map[s.customer_name] = s; });
        setScoreMap(map);
      }).catch(() => {});
    // Phase 10 — portfolio-level concentration + attention-ranked list.
    // Fails silently (stays null) when the feature flag is off or the request
    // errors — this section is purely additive and never blocks the base page.
    api.customers.portfolio().then(setPortfolio).catch(() => {});
  }, []);

  const HEALTH_LABEL_TEXT: Record<string, string> = {
    DORMANT: "Dormant", AT_RISK: "At Risk", WATCH: "Watch", GROWING: "Growing", HEALTHY: "Healthy",
  };
  const HEALTH_LABEL_COLOR: Record<string, string> = {
    DORMANT: "#8B8FA3", AT_RISK: "#F5424D", WATCH: "#F5A524", GROWING: "#10D98A", HEALTHY: "#3B82F6",
  };
  const attentionList = (portfolio?.customers || [])
    .filter(c => c.healthLabel !== "HEALTHY")
    .slice(0, 5);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [customer.customer_name, customer.customer_phone].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [customers, search]);

  const totalReceivable = customers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  const totalAdvance = customers.reduce((sum, c) => sum + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);
  const activeCustomers = customers.filter((c) => Number(c.balance) > 0).length;

  const whatsappStatement = (customer: Customer) => {
    const balance = Number(customer.balance || 0);
    const message = balance > 0
      ? `Namaste ${customer.customer_name} ji, aapka hamare yahan ${fmtINR(balance)} baaki hai. Kripya payment update karein.`
      : balance < 0
        ? `Namaste ${customer.customer_name} ji, aapka ${fmtINR(Math.abs(balance))} advance hamare paas hai.`
        : `Namaste ${customer.customer_name} ji, aapka account clear hai.`;

    if (customer.customer_phone) {
      window.open(`https://wa.me/91${customer.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
      return;
    }
    navigator.clipboard.writeText(message);
  };

  return (
    <DashboardLayout pageTitle="Customers">
      <div className="space-y-5 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-[26px] leading-[1.15]" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>Customers</h2>
            <p className="text-sm text-secondary mt-1">Auto-added from Sales, Invoices and Khata</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadCustomers} className="px-4 py-2 rounded-xl bg-surface-2 text-secondary text-xs font-bold border border-border">
              Refresh
            </button>
            <Link href="/khata" className="px-4 py-2 rounded-xl btn-primary text-xs font-bold">
              Open Khata
            </Link>
          </div>
        </div>

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
            <p className="section-label mb-3">Ledger Entries</p>
            <p className="metric-lg text-accent">{customers.reduce((s, c) => s + Number(c.entry_count || 0), 0)}</p>
            <p className="text-2xs text-muted mt-1">linked automatically</p>
          </div>
        </div>

        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or phone..."
            className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-3 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>

        {portfolio?.enabled && portfolio.customers.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="card-metric p-4">
                <p className="section-label mb-2">Top Customer Share</p>
                <p className="metric-lg text-primary">{portfolio.top1SharePct}%</p>
                <p className="text-2xs text-muted mt-1">of trailing-90d revenue</p>
              </div>
              <div className="card-metric p-4">
                <p className="section-label mb-2">Top 3 Concentration</p>
                <p className="metric-lg text-primary">{portfolio.top3SharePct}%</p>
                <p className="text-2xs text-muted mt-1">of trailing-90d revenue</p>
              </div>
              <div className="card-metric p-4">
                <p className="section-label mb-2">Top 5 Concentration</p>
                <p className="metric-lg text-primary">{portfolio.top5SharePct}%</p>
                <p className="text-2xs text-muted mt-1">of trailing-90d revenue</p>
              </div>
              <div className="card-metric p-4">
                <p className="section-label mb-2">Needs Attention</p>
                <p className="metric-lg text-danger">{attentionList.length}</p>
                <p className="text-2xs text-muted mt-1">{portfolio.concentrationRiskCount} concentration risk</p>
              </div>
            </div>

            {attentionList.length > 0 && (
              <div className="card-premium p-4">
                <h3 className="text-2xs font-bold text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <FiAlertTriangle size={12} /> Customers Needing Attention
                </h3>
                <div className="space-y-2">
                  {attentionList.map((c) => (
                    <div key={c.customerId || c.customerName} className="flex items-start justify-between gap-3 rounded-xl bg-surface-2/70 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-primary truncate">{c.customerName}</p>
                          <span
                            className="text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                            style={{ color: HEALTH_LABEL_COLOR[c.healthLabel], background: `${HEALTH_LABEL_COLOR[c.healthLabel]}18`, border: `1px solid ${HEALTH_LABEL_COLOR[c.healthLabel]}40` }}
                          >
                            {HEALTH_LABEL_TEXT[c.healthLabel] || c.healthLabel}
                          </span>
                        </div>
                        <p className="text-2xs text-muted mt-1">{c.healthEvidence[0] || c.evidence[0]}</p>
                      </div>
                      <p className="text-2xs text-muted shrink-0">Attention {c.attentionScore}/100</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            {filtered.map((customer) => {
              const balance = Number(customer.balance || 0);
              return (
                <div key={customer.customer_name} className="card-premium p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent/12 border border-accent/25 text-accent flex items-center justify-center shrink-0">
                        <FiUser size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-primary truncate">{customer.customer_name}</p>
                        <p className="text-2xs text-muted">{customer.entry_count || 0} entries · {fmtDate(customer.last_entry)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={balance > 0 ? "metric-value text-danger" : balance < 0 ? "metric-value text-success" : "metric-value text-muted"}>
                        {fmtINR(Math.abs(balance))}
                      </p>
                      <p className="text-2xs text-muted">{balance > 0 ? "lena hai" : balance < 0 ? "advance" : "clear"}</p>
                      {scoreMap[customer.customer_name] && (() => {
                        const risk = scoreMap[customer.customer_name];
                        const tierColor = risk.tier === "HIGH_RISK" ? "#F5424D" : risk.tier === "MEDIUM" ? "#F5A524" : "#10D98A";
                        const tierLabel = risk.tier === "HIGH_RISK" ? "High Risk" : risk.tier === "MEDIUM" ? "Medium" : "Low Risk";
                        const HEALTH_LABEL_TEXT: Record<string, string> = {
                          DORMANT: "Dormant", AT_RISK: "At Risk", WATCH: "Watch", GROWING: "Growing", HEALTHY: "Healthy",
                        };
                        const HEALTH_LABEL_COLOR: Record<string, string> = {
                          DORMANT: "#8B8FA3", AT_RISK: "#F5424D", WATCH: "#F5A524", GROWING: "#10D98A", HEALTHY: "#3B82F6",
                        };
                        const health = risk.health_label;
                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            <span className="inline-block text-[10px] font-semibold rounded-full px-2 py-0.5"
                              style={{ color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}40` }}>
                              {tierLabel} · {risk.score}
                            </span>
                            {health && HEALTH_LABEL_TEXT[health] && (
                              <span className="inline-block text-[10px] font-semibold rounded-full px-2 py-0.5"
                                style={{ color: HEALTH_LABEL_COLOR[health], background: `${HEALTH_LABEL_COLOR[health]}18`, border: `1px solid ${HEALTH_LABEL_COLOR[health]}40` }}>
                                {HEALTH_LABEL_TEXT[health]}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

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

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link
                      href={`/khata?customer=${encodeURIComponent(customer.customer_name)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-accent/10 text-accent border border-accent/20"
                    >
                      <FiBook size={11} /> Khata
                    </Link>
                    {customer.customer_phone && (
                      <a
                        href={`tel:${customer.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-surface-2 text-secondary border border-border"
                      >
                        <FiPhone size={11} /> Call
                      </a>
                    )}
                    <button
                      onClick={() => whatsappStatement(customer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-success/10 text-success border border-success/20"
                    >
                      <FiMessageSquare size={11} /> WhatsApp
                    </button>
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

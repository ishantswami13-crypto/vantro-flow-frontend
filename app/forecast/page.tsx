"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { FiTrendingDown, FiDollarSign, FiAlertTriangle, FiPhone, FiUpload, FiArrowRight } from "react-icons/fi";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { api, getUser } from "@/lib/api";
import Link from "next/link";

function fmt(v: number) {
  return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 shadow-card text-xs min-w-[160px]">
      <p className="text-secondary font-medium mb-2.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-secondary">{p.name}</span>
          </div>
          <span className="metric-value font-semibold" style={{ color: p.color }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function SkeletonCard() {
  return (
    <div className="card-metric p-5 animate-pulse">
      <div className="h-3 w-24 bg-surface-3 rounded mb-4" />
      <div className="h-8 w-20 bg-surface-3 rounded mb-2" />
      <div className="h-2.5 w-16 bg-surface-3 rounded" />
    </div>
  );
}

export default function ForecastPage() {
  const [range, setRange]       = useState<30 | 60 | 90>(30);
  const [loading, setLoading]   = useState(true);
  const [chartData, setChartData] = useState<{ date: string; optimistic: number; expected: number; pessimistic: number }[]>([]);
  const [kpis, setKpis]         = useState({ cashStart: 0, burnRate: 0, avgCollections: 0, runwayDays: 0 });
  const [topImpact, setTopImpact] = useState<{ name: string; amount: number; days_overdue: number; priority_score?: number }[]>([]);
  const [noData, setNoData]     = useState(false);

  const loadForecast = useCallback(async (days: 30 | 60 | 90) => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    try {
      const [forecastRes, invoicesRes] = await Promise.allSettled([
        api.forecast(user.id, { days }),
        api.invoices.list(user.id),
      ]);

      if (forecastRes.status === "fulfilled") {
        const f = forecastRes.value;
        const s = f.scenarios;

        // Build chart data: align by day index across scenarios
        const optCurve  = s?.optimistic?.curve  || [];
        const expCurve  = s?.expected?.curve    || [];
        const pesCurve  = s?.pessimistic?.curve || [];
        const maxLen = Math.max(optCurve.length, expCurve.length, pesCurve.length);

        if (maxLen === 0) {
          setNoData(true);
        } else {
          setNoData(false);
          const now = new Date();
          const merged = Array.from({ length: maxLen }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() + (optCurve[i]?.day ?? i));
            const label = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
            return {
              date:        label,
              optimistic:  Math.max(0, Math.round(optCurve[i]?.cash  ?? 0)),
              expected:    Math.max(0, Math.round(expCurve[i]?.cash  ?? 0)),
              pessimistic: Math.max(0, Math.round(pesCurve[i]?.cash ?? 0)),
            };
          });
          setChartData(merged);
          setKpis({
            cashStart:      f.cashStart || 0,
            burnRate:       f.burnRate || 0,
            avgCollections: f.avgDailyCollections || 0,
            runwayDays:     s?.pessimistic?.runwayDays ?? s?.expected?.runwayDays ?? 0,
          });
        }
      } else {
        setNoData(true);
      }

      if (invoicesRes.status === "fulfilled") {
        const overdue = (invoicesRes.value.invoices || [])
          .filter((inv: any) => inv.payment_status === "Pending" && inv.days_overdue > 0)
          .sort((a: any, b: any) => (b.invoice_amount - a.invoice_amount))
          .slice(0, 5)
          .map((inv: any) => ({
            name:           inv.customer_name,
            amount:         inv.invoice_amount,
            days_overdue:   inv.days_overdue,
            priority_score: inv.priority_score,
          }));
        setTopImpact(overdue);
      }
    } catch {
      setNoData(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadForecast(range); }, [range, loadForecast]);

  const isRunwayDanger = kpis.runwayDays > 0 && kpis.runwayDays < 15;

  return (
    <DashboardLayout pageTitle="Cash Flow Forecast">
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Cash Flow Forecast</h2>
            <p className="text-sm text-secondary mt-0.5">3-scenario projection based on your real collection history</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 border border-border rounded-xl">
            {([30, 60, 90] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={["px-5 py-2 text-xs font-bold rounded-lg transition-all",
                  range === r ? "bg-accent text-white shadow-accent-sm" : "text-secondary hover:text-primary",
                ].join(" ")}>
                {r}d
              </button>
            ))}
          </div>
        </div>

        {/* Danger alert */}
        {!loading && isRunwayDanger && (
          <Alert variant="danger" title={`Cash Runway: ${kpis.runwayDays} Days — Action Required`}>
            Pessimistic scenario shows cash exhaustion in {kpis.runwayDays} days at {fmt(kpis.burnRate)}/day burn.
            Focus on collecting from your top outstanding customers this week.
          </Alert>
        )}

        {/* KPI row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : !noData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {[
              { label: "Opening Cash",         value: fmt(kpis.cashStart),      sub: "as of today",            icon: FiDollarSign,    color: "#0066FF" },
              { label: "Daily Burn Rate",       value: fmt(kpis.burnRate),       sub: "last 30d average",       icon: FiTrendingDown,  color: "#F5424D" },
              { label: "Avg Daily Collections", value: fmt(kpis.avgCollections), sub: "based on history",       icon: FiDollarSign,    color: "#10D98A" },
              { label: "Cash Runway",           value: kpis.runwayDays > 0 ? `${kpis.runwayDays}d` : "—", sub: "pessimistic case", icon: FiAlertTriangle, color: kpis.runwayDays < 15 ? "#F5424D" : "#F5A524" },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="card-metric p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="section-label">{label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                </div>
                <p className="metric-lg" style={{ color }}>{value}</p>
                <p className="text-2xs text-muted mt-1">{sub}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* No data state */}
        {!loading && noData && (
          <div className="card-premium p-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-accent-dim border border-accent/20 rounded-2xl flex items-center justify-center mb-4">
              <FiUpload size={24} className="text-accent" />
            </div>
            <p className="text-sm font-bold text-primary mb-1">Not enough data for a forecast</p>
            <p className="text-xs text-muted mb-4 max-w-xs">
              Upload your invoices and mark some payments as received — the forecast model needs at least a few data points to project scenarios.
            </p>
            <Link href="/collections" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all">
              <FiUpload size={13} /> Upload Invoices <FiArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Chart */}
        {!loading && !noData && chartData.length > 0 && (
          <div className="card-premium p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <p className="text-sm font-bold text-primary">Cash Balance — Next {range} Days</p>
                <p className="text-xs text-secondary mt-0.5">Three scenarios based on your actual collection rate</p>
              </div>
              <div className="flex items-center gap-5 text-2xs">
                {[
                  { label: "Optimistic",  color: "#10D98A", dash: false },
                  { label: "Expected",    color: "#0066FF", dash: false },
                  { label: "Pessimistic", color: "#F5424D", dash: true  },
                ].map(({ label, color, dash }) => (
                  <span key={label} className="flex items-center gap-1.5 text-secondary">
                    <span className="w-5 inline-block" style={{ height: "2px", background: dash ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 4px, transparent 4px, transparent 8px)` : color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOpt"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10D98A" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10D98A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExp"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0066FF" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#556070", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={fmt} tick={{ fill: "#556070", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#F5424D" strokeDasharray="4 2" strokeWidth={1}
                  label={{ value: "Zero Cash", fill: "#F5424D", fontSize: 9, position: "insideTopLeft" }} />
                <Area type="monotone" dataKey="optimistic"  name="Optimistic"  stroke="#10D98A" strokeWidth={2}   fill="url(#gradOpt)" dot={false} />
                <Area type="monotone" dataKey="expected"    name="Expected"    stroke="#0066FF" strokeWidth={2.5} fill="url(#gradExp)" dot={false} />
                <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#F5424D" strokeWidth={2}   strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top impact customers */}
        {!loading && topImpact.length > 0 && (
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-bold text-primary">Top Outstanding — Highest Cash Impact</p>
              <p className="text-xs text-secondary mt-0.5">Collecting these improves your runway fastest</p>
            </div>
            <table className="w-full text-sm table-premium">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  <th className="text-left px-5 py-3 section-label w-8">#</th>
                  <th className="text-left px-4 py-3 section-label">Customer</th>
                  <th className="text-right px-4 py-3 section-label">Amount</th>
                  <th className="text-right px-4 py-3 section-label hidden sm:table-cell">Days Overdue</th>
                  <th className="px-4 py-3 section-label hidden md:table-cell">Priority</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {topImpact.map((c, i) => (
                  <tr key={c.name} className="animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="px-5 py-3.5 text-xs text-muted font-mono">{i + 1}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-primary">{c.name}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="metric-value text-sm text-accent">
                        {c.amount >= 100000 ? `₹${(c.amount/100000).toFixed(1)}L` : `₹${c.amount.toLocaleString("en-IN")}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <Badge variant={c.days_overdue > 45 ? "danger" : c.days_overdue > 30 ? "warning" : "default"}>{c.days_overdue}d</Badge>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {c.priority_score != null && (
                        <div className="flex items-center gap-2">
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${c.priority_score}%`, background: c.priority_score >= 70 ? "#10D98A" : "#F5A524" }} />
                          </div>
                          <span className="text-xs metric-value" style={{ color: c.priority_score >= 70 ? "#10D98A" : "#F5A524" }}>{c.priority_score}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href="/collections" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-accent-dim text-accent border border-accent/25 hover:bg-accent hover:text-white transition-all">
                        <FiPhone size={11} /> Call
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading skeleton for chart */}
        {loading && (
          <div className="card-premium p-6 animate-pulse">
            <div className="h-4 w-48 bg-surface-3 rounded mb-2" />
            <div className="h-3 w-64 bg-surface-3 rounded mb-6" />
            <div className="bg-surface-3 rounded-xl h-[300px]" />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

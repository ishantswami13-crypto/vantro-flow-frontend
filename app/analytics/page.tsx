"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiTrendingUp, FiDollarSign, FiPhone, FiActivity,
  FiBarChart2, FiUpload, FiArrowRight,
} from "react-icons/fi";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { api, getUser } from "@/lib/api";
import Link from "next/link";

const TOOLTIP_STYLE = {
  backgroundColor: "#0C1428",
  border: "1px solid #1E2D4A",
  borderRadius: 12,
  fontSize: 12,
  color: "#E8EFF8",
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

function SkeletonChart({ height = 220 }: { height?: number }) {
  return (
    <div className="card-premium p-5 animate-pulse">
      <div className="h-4 w-48 bg-surface-3 rounded mb-2" />
      <div className="h-3 w-32 bg-surface-3 rounded mb-5" />
      <div className="bg-surface-3 rounded-xl" style={{ height }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange]     = useState<"1m" | "3m" | "6m">("6m");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    total_outstanding: number;
    total_recovered: number;
    recovery_rate: number;
    monthly_trend: { month: string; recovered: number }[];
    top_customers: { name: string; amount: number }[];
  } | null>(null);
  const [callLogs, setCallLogs] = useState<{
    day: string; made: number; answered: number; promised: number;
  }[]>([]);
  const [empty, setEmpty] = useState(false);

  const load = useCallback(async () => {
    const user = getUser();
    if (!user?.id) {
      setEmpty(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [analyticsData, callData] = await Promise.allSettled([
        api.analytics(user.id),
        api.calls.list(user.id),
      ]);

      if (analyticsData.status === "fulfilled") {
        const a = analyticsData.value.analytics;
        setAnalytics(a);
        setEmpty(!a.monthly_trend?.length && !a.top_customers?.length);
      } else {
        setAnalytics({
          total_outstanding: 0,
          total_recovered: 0,
          recovery_rate: 0,
          monthly_trend: [],
          top_customers: [],
        });
        setEmpty(true);
      }

      if (callData.status === "fulfilled") {
        const calls = callData.value.calls || [];
        // Group by day of week
        const dayMap: Record<string, { made: number; answered: number; promised: number }> = {};
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        days.forEach(d => { dayMap[d] = { made: 0, answered: 0, promised: 0 }; });
        calls.forEach((c: any) => {
          const d = days[new Date(c.called_at).getDay()];
          dayMap[d].made++;
          if (c.did_pick_up) dayMap[d].answered++;
          if (c.promised_payment_date) dayMap[d].promised++;
        });
        // Return Mon–Sun order
        const ordered = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({ day: d, ...dayMap[d] }));
        setCallLogs(ordered);
      }
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build chart data from monthly trend (API gives recovered per month)
  const chartData = (analytics?.monthly_trend || []).slice(-(range === "1m" ? 1 : range === "3m" ? 3 : 6)).map(m => ({
    month: m.month?.slice(0, 7) || m.month,
    collected: +(m.recovered / 100000).toFixed(1),
    calls: 0,
  }));

  // Top customers from API
  const topCustomers = (analytics?.top_customers || []).slice(0, 5);

  // KPI cards
  const totalCollected = analytics?.total_recovered || 0;
  const recoveryRate   = analytics?.recovery_rate   || 0;
  const totalCalls     = callLogs.reduce((s, d) => s + d.made, 0);

  const kpis = [
    { label: "Total Collected",     value: totalCollected >= 100000 ? `₹${(totalCollected/100000).toFixed(2)}L` : `₹${totalCollected.toLocaleString("en-IN")}`, color: "#10D98A", icon: <FiDollarSign size={16} /> },
    { label: "Avg Recovery Rate",   value: `${recoveryRate}%`,     color: "#0066FF", icon: <FiTrendingUp size={16} /> },
    { label: "Calls Logged",        value: totalCalls.toString(),  color: "#F5A524", icon: <FiPhone size={16} /> },
    { label: "Outstanding",         value: analytics?.total_outstanding ? (analytics.total_outstanding >= 100000 ? `₹${(analytics.total_outstanding/100000).toFixed(1)}L` : `₹${analytics.total_outstanding.toLocaleString("en-IN")}`) : "—", color: "#F5424D", icon: <FiActivity size={16} /> },
  ];

  return (
    <DashboardLayout pageTitle="Analytics">
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Analytics</h2>
            <p className="text-sm text-secondary mt-0.5">Collections performance based on your real data</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
            {(["1m", "3m", "6m"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={["px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  range === r ? "bg-white text-black" : "text-muted hover:text-primary",
                ].join(" ")}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {kpis.map(k => (
              <div key={k.label} className="card-metric p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">{k.label}</p>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                    <span style={{ color: k.color }}>{k.icon}</span>
                  </div>
                </div>
                <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && empty && (
          <div className="card-premium p-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-accent-dim border border-accent/20 rounded-2xl flex items-center justify-center mb-4">
              <FiUpload size={24} className="text-accent" />
            </div>
            <p className="text-sm font-bold text-primary mb-1">No analytics data yet</p>
            <p className="text-xs text-muted mb-4 max-w-xs">Upload your invoices and log some calls — analytics will populate automatically as you collect.</p>
            <Link href="/collections" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all">
              <FiUpload size={13} /> Upload Invoices <FiArrowRight size={12} />
            </Link>
          </div>
        )}

        {!loading && !empty && (
          <>
            {/* Recovery Trend Chart */}
            <div className="card-premium p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-primary">Monthly Collections Trend</p>
                  <p className="text-xs text-muted mt-0.5">₹L collected per month from your invoices</p>
                </div>
                <FiBarChart2 size={16} className="text-muted" />
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10D98A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10D98A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                    <XAxis dataKey="month" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v}L`, "Collected"]} />
                    <Area type="monotone" dataKey="collected" name="Collected ₹L" stroke="#10D98A" strokeWidth={2} fill="url(#gc)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-muted">No collection data for this period</div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Call Effectiveness */}
              <div className="card-premium p-5">
                <p className="text-sm font-bold text-primary mb-1">Call Effectiveness (By Day)</p>
                <p className="text-xs text-muted mb-4">Calls made → answered → payment promised</p>
                {totalCalls > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={callLogs} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                      <XAxis dataKey="day" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="made"     name="Called"   fill="#1E2D4A" radius={[4,4,0,0]} />
                      <Bar dataKey="answered" name="Answered" fill="#0066FF" radius={[4,4,0,0]} />
                      <Bar dataKey="promised" name="Promised" fill="#10D98A" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-muted">
                    <div className="text-center">
                      <p>No calls logged yet</p>
                      <Link href="/collections" className="text-accent text-xs hover:underline mt-1 inline-block">Log a call</Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Customers */}
              <div className="card-premium p-5">
                <p className="text-sm font-bold text-primary mb-4">Top Outstanding Customers</p>
                {topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {topCustomers.map((c, i) => {
                      const maxAmt = topCustomers[0]?.amount || 1;
                      const pct = Math.round((c.amount / maxAmt) * 100);
                      return (
                        <div key={c.name} className="flex items-center gap-3">
                          <span className="text-2xs font-mono text-muted w-4">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-accent">
                              {c.amount >= 100000 ? `₹${(c.amount/100000).toFixed(1)}L` : `₹${c.amount.toLocaleString("en-IN")}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted">No customer data yet</div>
                )}
              </div>
            </div>

            {/* Calls vs Recovery Line */}
            {totalCalls > 0 && chartData.length > 0 && (
              <div className="card-premium p-5">
                <p className="text-sm font-bold text-primary mb-1">Calling Activity Over Time</p>
                <p className="text-xs text-muted mb-4">Collection trend based on logged call activity</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                    <XAxis dataKey="month" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#4A6080" }} />
                    <Line type="monotone" dataKey="collected" name="Collected ₹L" stroke="#10D98A" strokeWidth={2} dot={{ r: 3, fill: "#10D98A" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {loading && (
          <>
            <SkeletonChart height={220} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkeletonChart height={180} />
              <SkeletonChart height={180} />
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { FiTrendingDown, FiDollarSign, FiAlertTriangle, FiPhone } from "react-icons/fi";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

function generate(days: number) {
  const data = [];
  let o = 3200000, e = 3200000, p = 3200000;
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const label = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
    o = Math.max(0, o + (Math.random() * 180000 - 40000));
    e = Math.max(0, e + (Math.random() * 120000 - 60000));
    p = Math.max(0, p + (Math.random() * 60000  - 90000));
    const step = Math.ceil(days / 12);
    if (i % step === 0 || i === days)
      data.push({ date: label, optimistic: Math.round(o), expected: Math.round(e), pessimistic: Math.round(p) });
  }
  return data;
}

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

const TOP_IMPACT = [
  { name: "Mehta Fabrics Pvt Ltd",   amount: "₹8.4L", days: 62, score: 82 },
  { name: "Sharma Steel Works",      amount: "₹5.2L", days: 45, score: 67 },
  { name: "Patel Agro Industries",   amount: "₹3.2L", days: 38, score: 54 },
  { name: "Singh Logistics Pvt Ltd", amount: "₹1.8L", days: 55, score: 61 },
  { name: "Gupta Construction Co",   amount: "₹2.8L", days: 29, score: 71 },
];

export default function ForecastPage() {
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const data = generate(range);

  return (
    <DashboardLayout pageTitle="Cash Flow Forecast">
      <div className="space-y-6 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Cash Flow Forecast</h2>
            <p className="text-sm text-secondary mt-0.5">3-scenario projection · Updated in real time</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 border border-border rounded-xl">
            {([30, 60, 90] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={[
                  "px-5 py-2 text-xs font-bold rounded-lg transition-all",
                  range === r ? "bg-accent text-white shadow-accent-sm" : "text-secondary hover:text-primary",
                ].join(" ")}>
                {r}d
              </button>
            ))}
          </div>
        </div>

        <Alert variant="danger" title="Cash Runway: 12 Days — Action Required">
          Pessimistic scenario shows cash exhaustion in 12 days at ₹1.8L/day burn.
          Collecting from top 3 customers this week adds ~9 days of runway.
        </Alert>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {[
            { label: "Current Cash",          value: "₹32.0L", sub: "as of today",       icon: FiDollarSign,    color: "#0066FF" },
            { label: "Daily Burn Rate",        value: "₹1.8L",  sub: "last 30d average",  icon: FiTrendingDown,  color: "#F5424D" },
            { label: "Expected Collections",   value: "₹1.4L",  sub: "per day forecast",  icon: FiDollarSign,    color: "#10D98A" },
            { label: "Cash Runway",            value: "12 days", sub: "pessimistic case",  icon: FiAlertTriangle, color: "#F5A524" },
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

        {/* Chart */}
        <div className="card-premium p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-sm font-bold text-primary">Cash Balance — Next {range} Days</p>
              <p className="text-xs text-secondary mt-0.5">Three scenarios based on current collection rate</p>
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
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOpt"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10D98A" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10D98A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp"  x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0066FF" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#0066FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#F5424D" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#F5424D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#556070", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={fmt} tick={{ fill: "#556070", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#F5424D" strokeDasharray="4 2" strokeWidth={1} label={{ value: "Zero Cash", fill: "#F5424D", fontSize: 9, position: "insideTopLeft" }} />
              <Area type="monotone" dataKey="optimistic"  name="Optimistic"  stroke="#10D98A" strokeWidth={2} fill="url(#gradOpt)"  dot={false} />
              <Area type="monotone" dataKey="expected"    name="Expected"    stroke="#0066FF" strokeWidth={2.5} fill="url(#gradExp)"dot={false} />
              <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#F5424D" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Top impact */}
        <div className="card-premium overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-bold text-primary">Top 5 — Highest Cash Impact This Week</p>
            <p className="text-xs text-secondary mt-0.5">Collecting these adds 18+ days of runway</p>
          </div>
          <table className="w-full text-sm table-premium">
            <thead>
              <tr className="border-b border-border bg-surface-2/40">
                <th className="text-left px-5 py-3 section-label w-8">#</th>
                <th className="text-left px-4 py-3 section-label">Customer</th>
                <th className="text-right px-4 py-3 section-label">Amount</th>
                <th className="text-right px-4 py-3 section-label hidden sm:table-cell">Days Overdue</th>
                <th className="px-4 py-3 section-label hidden md:table-cell">AI Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {TOP_IMPACT.map((c, i) => (
                <tr key={c.name}>
                  <td className="px-5 py-3.5 text-xs text-muted font-mono">{i + 1}</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-primary">{c.name}</td>
                  <td className="px-4 py-3.5 text-right"><span className="metric-value text-sm text-accent">{c.amount}</span></td>
                  <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                    <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>{c.days}d</Badge>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${c.score}%`, background: c.score >= 70 ? "#10D98A" : "#F5A524" }} />
                      </div>
                      <span className="text-xs metric-value" style={{ color: c.score >= 70 ? "#10D98A" : "#F5A524" }}>{c.score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-accent-dim text-accent border border-accent/25 hover:bg-accent hover:text-white transition-all">
                      <FiPhone size={11} />
                      Call
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

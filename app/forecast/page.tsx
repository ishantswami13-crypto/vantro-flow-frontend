"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, MetricCard } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  FiTrendingDown, FiDollarSign, FiAlertTriangle, FiPhone,
} from "react-icons/fi";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

const generate = (days: number) => {
  const data = [];
  let optimistic = 3200000;
  let expected   = 3200000;
  let pessimistic = 3200000;
  const now = new Date();
  for (let i = 0; i <= days; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const label = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
    optimistic  = Math.max(0, optimistic  + (Math.random() * 180000 - 40000));
    expected    = Math.max(0, expected    + (Math.random() * 120000 - 60000));
    pessimistic = Math.max(0, pessimistic + (Math.random() * 60000  - 90000));
    if (i % Math.ceil(days / 10) === 0 || i === days) {
      data.push({ date: label, optimistic: Math.round(optimistic), expected: Math.round(expected), pessimistic: Math.round(pessimistic) });
    }
  }
  return data;
};

const formatINR = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3 shadow-xl text-xs">
      <p className="text-secondary mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 mb-1">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="metric-value text-primary">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const TOP_IMPACT = [
  { name: "Mehta Fabrics Pvt Ltd",  amount: "₹8.4L", days: 62, score: 82 },
  { name: "Sharma Steel Works",     amount: "₹5.2L", days: 45, score: 67 },
  { name: "Patel Agro Industries",  amount: "₹3.2L", days: 38, score: 54 },
  { name: "Singh Logistics Pvt Ltd",amount: "₹1.8L", days: 55, score: 61 },
  { name: "Gupta Construction Co",  amount: "₹2.8L", days: 29, score: 71 },
];

export default function ForecastPage() {
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const data = generate(range);

  return (
    <DashboardLayout pageTitle="Cash Flow Forecast">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">Cash Flow Forecast</h2>
            <p className="text-sm text-secondary mt-0.5">3-scenario projection based on current receivables</p>
          </div>
          <div className="flex gap-1 bg-surface border border-border rounded-md p-1">
            {([30, 60, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={[
                  "px-4 py-1.5 text-xs font-medium rounded transition-colors",
                  range === r ? "bg-accent text-white" : "text-secondary hover:text-primary",
                ].join(" ")}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        <Alert variant="danger" title="Cash Runway: 12 Days">
          At the current burn rate of ₹1.8L/day, you will run out of cash in 12 days under the pessimistic scenario. Call Mehta Fabrics and Sharma Steel today.
        </Alert>

        {/* Metric row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Current Cash Balance" value="₹32.0L" icon={<FiDollarSign size={16} />} accent="default" />
          <MetricCard label="Daily Burn Rate"       value="₹1.8L"  sub="avg last 30 days"   icon={<FiTrendingDown size={16} />} accent="danger" />
          <MetricCard label="Expected Daily Collections" value="₹1.4L" sub="based on history" icon={<FiDollarSign size={16} />} accent="success" />
          <MetricCard label="Runway (Expected)"     value="12 days" sub="pessimistic: 6d"   icon={<FiAlertTriangle size={16} />} accent="warning" />
        </div>

        {/* Chart */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-primary">Cash Balance — Next {range} Days</p>
            <div className="flex items-center gap-4 text-2xs">
              <span className="flex items-center gap-1.5 text-success"><span className="w-3 h-0.5 bg-success inline-block rounded" />Optimistic</span>
              <span className="flex items-center gap-1.5 text-accent"><span className="w-3 h-0.5 bg-accent inline-block rounded" />Expected</span>
              <span className="flex items-center gap-1.5 text-danger"><span className="w-3 h-0.5 bg-danger inline-block rounded" />Pessimistic</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2442" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#A0A4AC", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatINR}
                tick={{ fill: "#A0A4AC", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="optimistic"  name="Optimistic"  stroke="#00C48C" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expected"    name="Expected"    stroke="#0066FF" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pessimistic" name="Pessimistic" stroke="#FF4D4F" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top 5 impact customers */}
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Top 5 Customers — Highest Cash Impact</h3>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">Customer</th>
                  <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">Amount</th>
                  <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">Days Overdue</th>
                  <th className="text-center px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden md:table-cell">AI Score</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {TOP_IMPACT.map((c, i) => (
                  <tr key={c.name} className="table-row-hover border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs text-muted font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-xs font-medium text-primary">{c.name}</td>
                    <td className="px-4 py-3 text-right"><span className="metric-value text-xs text-accent">{c.amount}</span></td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>{c.days}d</Badge>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={["text-xs font-semibold", c.score >= 70 ? "text-success" : c.score >= 40 ? "text-warning" : "text-danger"].join(" ")}>
                        {c.score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-accent-dim text-accent border border-accent/30 rounded hover:bg-accent hover:text-white transition-colors">
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
      </div>
    </DashboardLayout>
  );
}

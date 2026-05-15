"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiTrendingUp, FiTrendingDown, FiUsers, FiDollarSign, FiPhone, FiBarChart2, FiActivity } from "react-icons/fi";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

const recoveryData = [
  { month: "Dec", collected: 18.2, outstanding: 42.1, calls: 38 },
  { month: "Jan", collected: 22.5, outstanding: 45.3, calls: 52 },
  { month: "Feb", collected: 19.8, outstanding: 48.7, calls: 44 },
  { month: "Mar", collected: 28.4, outstanding: 41.2, calls: 61 },
  { month: "Apr", collected: 31.2, outstanding: 38.9, calls: 58 },
  { month: "May", collected: 26.7, outstanding: 45.2, calls: 49 },
];

const topCustomers = [
  { name: "Mehta Fabrics Pvt Ltd", outstanding: 8.4, overdue: 62, score: 82, calls: 4 },
  { name: "Sharma Steel Works",    outstanding: 5.2, overdue: 45, score: 67, calls: 3 },
  { name: "Patel Agro Industries", outstanding: 3.1, overdue: 38, score: 54, calls: 2 },
  { name: "Gupta Construction Co", outstanding: 2.8, overdue: 29, score: 71, calls: 5 },
  { name: "Verma Chemicals Ltd",   outstanding: 1.9, overdue: 18, score: 45, calls: 1 },
];

const callData = [
  { day: "Mon", made: 12, answered: 8, promised: 5 },
  { day: "Tue", made: 15, answered: 11, promised: 7 },
  { day: "Wed", made: 9,  answered: 6,  promised: 3 },
  { day: "Thu", made: 18, answered: 14, promised: 9 },
  { day: "Fri", made: 14, answered: 10, promised: 6 },
  { day: "Sat", made: 6,  answered: 4,  promised: 2 },
];

const TOOLTIP_STYLE = {
  backgroundColor: "#0C1428", border: "1px solid #1E2D4A",
  borderRadius: 12, fontSize: 12,
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<"1m" | "3m" | "6m">("6m");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Analytics</h1>
            <p className="text-sm text-muted mt-0.5">Collections performance & business insights</p>
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
            {(["1m", "3m", "6m"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={["px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  range === r ? "bg-accent text-white shadow-accent-sm" : "text-muted hover:text-primary",
                ].join(" ")}
              >{r}</button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Collected (6m)", value: "₹1.47Cr", trend: "+18%", up: true,  icon: <FiDollarSign size={16}/>, color: "#10D98A" },
            { label: "Avg Recovery Rate",    value: "68%",      trend: "+4pp", up: true,  icon: <FiTrendingUp size={16}/>, color: "#0066FF" },
            { label: "Calls Made (6m)",      value: "302",      trend: "+22%", up: true,  icon: <FiPhone size={16}/>,     color: "#F5A524" },
            { label: "Avg Days to Collect",  value: "38d",      trend: "-5d",  up: true,  icon: <FiActivity size={16}/>,  color: "#10D98A" },
          ].map((k) => (
            <div key={k.label} className="card-metric p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">{k.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
              </div>
              <p className="metric-lg mb-1" style={{ color: k.color }}>{k.value}</p>
              <span className={["text-2xs font-bold font-mono", k.up ? "text-success" : "text-danger"].join(" ")}>
                {k.trend} vs last period
              </span>
            </div>
          ))}
        </div>

        {/* Recovery Trend Chart */}
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-primary">Collection vs Outstanding Trend</p>
              <p className="text-xs text-muted mt-0.5">Monthly ₹L values</p>
            </div>
            <FiBarChart2 size={16} className="text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={recoveryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10D98A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10D98A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F5424D" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F5424D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="month" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`₹${v}L`]} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#4A6080" }} />
              <Area type="monotone" dataKey="collected"    name="Collected"    stroke="#10D98A" strokeWidth={2} fill="url(#gc)" />
              <Area type="monotone" dataKey="outstanding"  name="Outstanding"  stroke="#F5424D" strokeWidth={2} fill="url(#go)" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Call Effectiveness */}
          <div className="card-premium p-5">
            <p className="text-sm font-bold text-primary mb-1">Call Effectiveness (This Week)</p>
            <p className="text-xs text-muted mb-4">Calls made → answered → payment promised</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={callData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
                <XAxis dataKey="day" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="made"     name="Called"   fill="#1E2D4A" radius={[4,4,0,0]} />
                <Bar dataKey="answered" name="Answered" fill="#0066FF" radius={[4,4,0,0]} />
                <Bar dataKey="promised" name="Promised" fill="#10D98A" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers Table */}
          <div className="card-premium p-5">
            <p className="text-sm font-bold text-primary mb-4">Top Outstanding Customers</p>
            <div className="space-y-3">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-2xs font-mono text-muted w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${c.score}%`, background: c.score >= 70 ? "#10D98A" : c.score >= 40 ? "#F5A524" : "#F5424D" }} />
                      </div>
                      <span className="text-2xs text-muted font-mono">{c.score}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">₹{c.outstanding}L</p>
                    <p className="text-2xs text-muted">{c.overdue}d overdue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Rate Line */}
        <div className="card-premium p-5">
          <p className="text-sm font-bold text-primary mb-1">Monthly Calls vs Recovery</p>
          <p className="text-xs text-muted mb-4">Correlation between calling activity and money collected</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={recoveryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="month" tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4A6080", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#4A6080" }} />
              <Line type="monotone" dataKey="calls"     name="Calls Made"  stroke="#F5A524" strokeWidth={2} dot={{ r: 3, fill: "#F5A524" }} />
              <Line type="monotone" dataKey="collected" name="Collected ₹L" stroke="#10D98A" strokeWidth={2} dot={{ r: 3, fill: "#10D98A" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </DashboardLayout>
  );
}

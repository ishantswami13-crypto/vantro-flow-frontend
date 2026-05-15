"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Alert } from "@/components/ui/Alert";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiDollarSign, FiClock, FiPercent, FiAlertTriangle, FiTrendingDown,
  FiTarget, FiMessageSquare, FiCheckSquare, FiArrowRight,
  FiList, FiTrendingUp, FiSettings, FiPhone,
} from "react-icons/fi";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const CUSTOMERS = [
  { id: 1, name: "Mehta Fabrics Pvt Ltd", outstanding: 840000,  days: 62, score: 82, lastPayment: "12 Jan", contact: "9876543210" },
  { id: 2, name: "Sharma Steel Works",    outstanding: 520000,  days: 45, score: 67, lastPayment: "28 Jan", contact: "9765432109" },
  { id: 3, name: "Patel Agro Industries", outstanding: 315000,  days: 38, score: 54, lastPayment: "5 Feb",  contact: "9654321098" },
  { id: 4, name: "Gupta Construction Co", outstanding: 280000,  days: 29, score: 71, lastPayment: "15 Feb", contact: "9543210987" },
  { id: 5, name: "Verma Chemicals Ltd",   outstanding: 195000,  days: 18, score: 45, lastPayment: "22 Feb", contact: "9432109876" },
];

const SPARKLINE = [
  { d: "1 Apr", v: 3800000 }, { d: "8 Apr",  v: 3600000 }, { d: "15 Apr", v: 3900000 },
  { d: "22 Apr", v: 3500000 },{ d: "1 May",  v: 3750000 }, { d: "8 May",  v: 4200000 },
  { d: "15 May", v: 4520000 },
];

function fmtAmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

const METRICS = [
  { label: "Total Outstanding",      value: "₹45.2L", sub: "42 customers",       icon: FiDollarSign,   accent: "#0066FF", glow: "rgba(0,102,255,0.15)",   pct: 72 },
  { label: "Days Sales Outstanding", value: "42",      sub: "days — ↓3d MoM",    icon: FiClock,        accent: "#F5A524", glow: "rgba(245,165,36,0.12)",   pct: 58 },
  { label: "Collection Rate",        value: "68%",     sub: "↑4pp this month",   icon: FiPercent,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)",   pct: 68 },
  { label: "Cash Runway",            value: "12d",     sub: "critical — act now",icon: FiTrendingDown, accent: "#F5424D", glow: "rgba(245,66,77,0.15)",    pct: 20 },
  { label: "Amount Overdue",         value: "₹20.1L",  sub: ">30 days",          icon: FiAlertTriangle,accent: "#F5424D", glow: "rgba(245,66,77,0.12)",    pct: 45 },
  { label: "Top Collection Prob.",   value: "82%",     sub: "Mehta Fabrics",     icon: FiTarget,       accent: "#10D98A", glow: "rgba(16,217,138,0.12)",   pct: 82 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-xs shadow-card">
      <p className="text-secondary mb-1">{label}</p>
      <p className="metric-value text-accent">{fmtAmt(payload[0].value)}</p>
    </div>
  );
};

export default function DashboardPage() {
  const cashRunway = 12;

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="space-y-6 page-enter">
        {/* Alert banner */}
        {cashRunway < 15 && (
          <Alert variant="danger" title="Critical: Cash Runway 12 Days">
            At current burn, cash runs out in 12 days under the pessimistic scenario.
            Collections of ₹8L+ this week are needed to stabilize.{" "}
            <Link href="/collections" className="font-bold underline underline-offset-2 hover:no-underline">
              See priority list
            </Link>
          </Alert>
        )}

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Collections Dashboard</h2>
            <p className="text-sm text-secondary mt-0.5 flex items-center gap-2">
              <span className="status-live text-xs text-success">Live</span>
              Thursday, 15 May 2024 · Updated just now
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="section-label mb-0.5">Collections needed today</p>
              <p className="metric-lg text-accent">₹14,20,000</p>
            </div>
            <Badge variant="danger" className="self-end mb-1">Urgent</Badge>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {METRICS.map(({ label, value, sub, icon: Icon, accent, glow, pct }) => (
            <div key={label} className="card-metric p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{label}</p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: glow, border: `1px solid ${accent}30` }}
                >
                  <Icon size={15} style={{ color: accent }} />
                </div>
              </div>
              <p className="metric-lg mb-1" style={{ color: accent }}>{value}</p>
              <p className="text-2xs text-muted mb-3">{sub}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: accent, opacity: 0.7 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Mid row: trend + quick actions */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Trend sparkline */}
          <div className="lg:col-span-2 card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-primary">Outstanding Trend</p>
                <p className="text-xs text-secondary mt-0.5">Last 7 weeks</p>
              </div>
              <span className="metric-value text-base text-accent">₹45.2L</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={SPARKLINE} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0066FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#556070", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="v" stroke="#0066FF" strokeWidth={2} fill="url(#areaGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick KPIs */}
          <div className="space-y-3">
            {[
              { label: "Collected this month", value: "₹8.4L",  pct: 68, color: "#10D98A" },
              { label: "Promised to pay",       value: "₹3.2L",  pct: 26, color: "#F5A524" },
              { label: "Unreachable",            value: "₹4.1L",  pct: 33, color: "#F5424D" },
            ].map(({ label, value, pct, color }) => (
              <div key={label} className="card-premium px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary">{label}</p>
                  <span className="metric-value text-sm" style={{ color }}>{value}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority call table */}
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-sm font-bold text-primary">Top Customers to Call Today</p>
              <p className="text-xs text-secondary mt-0.5">Sorted by AI collection priority score</p>
            </div>
            <Link href="/collections" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium">
              View all 42 <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-premium">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  <th className="text-left px-5 py-3 section-label">Customer</th>
                  <th className="text-right px-5 py-3 section-label">Outstanding</th>
                  <th className="text-right px-5 py-3 section-label hidden sm:table-cell">Days Overdue</th>
                  <th className="text-left px-5 py-3 section-label hidden md:table-cell">AI Score</th>
                  <th className="text-right px-5 py-3 section-label hidden lg:table-cell">Last Payment</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {CUSTOMERS.map((c, i) => (
                  <tr key={c.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-row-in">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: i === 0 ? "rgba(0,102,255,0.15)" : "#14203A", color: i === 0 ? "#0066FF" : "#8899AA", border: `1px solid ${i === 0 ? "rgba(0,102,255,0.3)" : "#1E2D4A"}` }}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-xs">{c.name}</p>
                          <p className="text-2xs text-muted">{c.contact}</p>
                        </div>
                        {i === 0 && (
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold bg-accent-dim text-accent border border-accent/20">
                            #1 Priority
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="metric-value text-sm text-primary">{fmtAmt(c.outstanding)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>
                        {c.days}d
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="score-bar-track">
                          <div
                            className="score-bar-fill"
                            style={{ width: `${c.score}%`, background: c.score >= 70 ? "#10D98A" : c.score >= 40 ? "#F5A524" : "#F5424D" }}
                          />
                        </div>
                        <span className={`text-xs font-semibold metric-value ${c.score >= 70 ? "text-success" : c.score >= 40 ? "text-warning" : "text-danger"}`}>
                          {c.score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-muted hidden lg:table-cell">{c.lastPayment}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a
                          href={`https://wa.me/91${c.contact}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-success-dim text-success border border-success/25 hover:bg-success hover:text-white transition-all"
                        >
                          <FiMessageSquare size={11} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
                          <FiCheckSquare size={11} />
                          <span className="hidden sm:inline">Log</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom nav cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: "/collections", Icon: FiList,       label: "Full Collections",   sub: "42 active · Sort by priority", color: "#0066FF" },
            { href: "/forecast",    Icon: FiTrendingUp,  label: "Cash Forecast",      sub: "12d runway · Act now",         color: "#F5424D" },
            { href: "/settings",    Icon: FiSettings,   label: "Settings",           sub: "Tally sync · Preferences",     color: "#10D98A" },
          ].map(({ href, Icon, label, sub, color }) => (
            <Link href={href} key={href}>
              <div className="card-metric p-4 group cursor-pointer flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{label}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">{sub}</p>
                </div>
                <FiArrowRight size={14} className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Alert } from "@/components/ui/Alert";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiDollarSign, FiClock, FiPercent, FiAlertTriangle, FiTrendingDown,
  FiTarget, FiMessageSquare, FiCheckSquare, FiArrowRight,
  FiList, FiTrendingUp, FiSettings, FiPhone, FiShield, FiZap,
  FiFileText, FiBook, FiPackage, FiUsers,
} from "react-icons/fi";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { api, getUser, type Metrics } from "@/lib/api";
import QuickSale from "@/components/QuickSale";
import { FiUpload } from "react-icons/fi";
import { isDemoMode } from "@/lib/demo";

const DEMO_BRIEFING = "Aaj 3 priority calls hain — Mehta Fabrics (₹8.4L, 62 din overdue) aaj sabse pehle. Sharma Steel ne last time uthaya tha — dobaara try karo. Cash runway 12 din ka hai, is hafte ₹5L+ zaroori hai.";

function getGreeting(name: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Shubh Prabhat" : h < 17 ? "Namaskar" : "Shubh Sandhya";
  const first = name.split(" ")[0];
  return `${salutation}, ${first}! ${h < 12 ? "☀️" : h < 17 ? "🙏" : "🌙"}`;
}

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

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
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [metrics, setMetrics]   = useState<Metrics | null>(null);
  const [promises, setPromises] = useState<{ customer_name: string; promised_payment_date: string; amount: number }[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [bizOverview, setBizOverview] = useState({ unpaidBills: 0, unpaidBillsAmt: 0, khataReceivable: 0, purchasesDue: 0, hasFeatures: false });
  const [ownerName, setOwnerName] = useState("User");
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;
    setUserPlan(user.plan || "free");

    // Load owner name for greeting
    const stored = (() => { try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; } })();
    setOwnerName(stored.business_name || user.business_name || user.email?.split("@")[0] || "User");

    // Fetch AI morning briefing (or use demo)
    if (isDemoMode()) {
      setBriefing(DEMO_BRIEFING);
      setBriefingLoading(false);
    } else {
      const token = localStorage.getItem("vantro_token") || "";
      fetch(`${API}/api/ml/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        if (d.success && d.briefing) setBriefing(d.briefing);
      }).catch(() => {}).finally(() => setBriefingLoading(false));
    }

    api.metrics(user.id).then(d => setMetrics(d.metrics)).catch(() => {});
    api.calls.list(user.id).then(d => {
      const todayPromises = (d.calls || []).filter(
        (c: any) => c.promised_payment_date && c.promised_payment_date >= today
      );
      setPromises(todayPromises);
    }).catch(() => {});

    // Load business overview data from new features
    const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/bills`, { headers }).then(r => r.json()).catch(() => ({ bills: [] })),
      fetch(`${API}/api/khata`, { headers }).then(r => r.json()).catch(() => ({ customers: [] })),
      fetch(`${API}/api/purchases`, { headers }).then(r => r.json()).catch(() => ({ purchases: [] })),
    ]).then(([billsD, khataD, purchasesD]) => {
      const unpaidBills = (billsD.bills || []).filter((b: any) => b.status !== "paid");
      const khataReceivable = (khataD.customers || []).reduce((s: number, c: any) => s + (c.balance > 0 ? c.balance : 0), 0);
      const purchasesDue = (purchasesD.purchases || []).filter((p: any) => p.status !== "paid").reduce((s: number, p: any) => s + (p.total_amount - p.paid_amount), 0);
      setBizOverview({
        unpaidBills: unpaidBills.length,
        unpaidBillsAmt: unpaidBills.reduce((s: number, b: any) => s + Number(b.total), 0),
        khataReceivable,
        purchasesDue,
        hasFeatures: unpaidBills.length > 0 || khataReceivable > 0 || purchasesDue > 0,
      });
    });
  }, []);

  // Override static values with real data when available
  const liveMetrics = metrics ? [
    { label: "Total Outstanding",      value: `₹${(metrics.total_outstanding/100000).toFixed(1)}L`, sub: `${metrics.total_customers} customers`,  icon: FiDollarSign,   accent: "#0066FF", glow: "rgba(0,102,255,0.15)",  pct: 72 },
    { label: "Days Sales Outstanding", value: "42",      sub: "days — target <30",   icon: FiClock,        accent: "#F5A524", glow: "rgba(245,165,36,0.12)", pct: 58 },
    { label: "Collection Rate",        value: `${metrics.avg_recovery_rate}%`, sub: "this period",  icon: FiPercent,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)", pct: Number(metrics.avg_recovery_rate) },
    { label: "Pending Invoices",       value: String(metrics.pending_invoices), sub: "awaiting payment", icon: FiAlertTriangle,accent: "#F5424D", glow: "rgba(245,66,77,0.12)",   pct: 45 },
    { label: "Amount Collected",       value: `₹${(metrics.total_paid/100000).toFixed(1)}L`,  sub: "total recovered",icon: FiTarget,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)", pct: 82 },
    { label: "Calls Made",             value: String(metrics.calls_made),  sub: "total logged", icon: FiPhone,        accent: "#9B6DFF", glow: "rgba(155,109,255,0.12)", pct: 60 },
  ] : METRICS;

  return (
    <DashboardLayout pageTitle="Dashboard">
      {showQuickSale && <QuickSale onClose={() => setShowQuickSale(false)} onSaved={() => { /* could refresh today P&L */ }} />}
      {/* Floating Quick Sale button */}
      <button onClick={() => setShowQuickSale(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-accent text-white font-bold text-sm shadow-[0_4px_24px_rgba(0,102,255,0.5)] hover:scale-105 active:scale-95 transition-all">
        <FiZap size={16} /> Quick Sale
      </button>
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

        {/* Free plan upgrade nudge */}
        {userPlan === "free" && metrics && metrics.total_customers > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-accent/10 to-success/10 border border-accent/20">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shrink-0 shadow-button-accent">
              <FiZap size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-primary">You're on the free plan</p>
              <p className="text-xs text-muted">Unlock WhatsApp automation, unlimited customers & Tally sync. Businesses recover 3× more on Pro.</p>
            </div>
            <Link href="/billing"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 transition-all shadow-button-accent whitespace-nowrap">
              Upgrade →
            </Link>
          </div>
        )}

        {/* Personalized greeting + AI Morning Briefing */}
        <div className="card-premium p-5 bg-gradient-to-r from-surface-1 to-surface-2 border-accent/10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-primary tracking-tight">
                {getGreeting(ownerName)}
              </h2>
              <p className="text-xs text-muted mt-1 flex items-center gap-2">
                <span className="status-live text-success">Live</span>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>

              {/* AI Briefing */}
              <div className="mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <FiZap size={11} className="text-accent" />
                  <p className="text-2xs font-bold text-accent uppercase tracking-wider">AI Morning Briefing</p>
                </div>
                {briefingLoading ? (
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs text-muted ml-1">Briefing taiyar ho rahi hai...</span>
                  </div>
                ) : briefing ? (
                  <p className="text-sm text-secondary leading-relaxed max-w-xl">{briefing}</p>
                ) : (
                  <p className="text-sm text-muted">
                    Collections mein invoices upload karo — AI kal se briefing dega. 🎯
                  </p>
                )}
              </div>
            </div>

            {/* Today's key number */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
              <div className="text-right">
                <p className="section-label mb-0.5">Collections needed today</p>
                <p className="metric-lg text-accent">₹14,20,000</p>
              </div>
              <Badge variant="danger">Urgent</Badge>
              <Link href="/collections"
                className="hidden sm:flex items-center gap-1.5 text-xs text-accent hover:underline font-semibold mt-1">
                See priority list <FiArrowRight size={11} />
              </Link>
            </div>
          </div>

          {/* Today's action items */}
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { icon: FiPhone,        label: "5 calls to make",         href: "/collections", color: "#10D98A" },
              { icon: FiMessageSquare,label: "3 WhatsApp to send",       href: "/whatsapp",    color: "#25D366" },
              { icon: FiTarget,       label: "₹3.2L promised today",     href: "/collections", color: "#F5A524" },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={label} href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-2/50 border border-border hover:border-accent/30 hover:bg-surface-2 transition-all group">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <p className="text-xs font-semibold text-secondary group-hover:text-primary transition-colors">{label}</p>
                <FiArrowRight size={11} className="ml-auto text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {liveMetrics.map(({ label, value, sub, icon: Icon, accent, glow, pct }) => (
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

        {/* Business Overview — bills, khata, purchases quick-stats */}
        {(bizOverview.hasFeatures || bizOverview.unpaidBills > 0) && (
          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Business Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/bills">
                <div className="card-metric p-4 group cursor-pointer hover:border-accent/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FiFileText size={15} className="text-accent" />
                    </div>
                    {bizOverview.unpaidBills > 0 && (
                      <span className="text-2xs bg-danger/20 text-danger font-bold px-1.5 py-0.5 rounded-full">{bizOverview.unpaidBills}</span>
                    )}
                  </div>
                  <p className="text-lg font-black text-primary">{bizOverview.unpaidBillsAmt > 0 ? (bizOverview.unpaidBillsAmt >= 100000 ? `₹${(bizOverview.unpaidBillsAmt/100000).toFixed(1)}L` : `₹${(bizOverview.unpaidBillsAmt/1000).toFixed(0)}K`) : "₹0"}</p>
                  <p className="text-xs text-muted mt-0.5">Unpaid Invoices</p>
                </div>
              </Link>
              <Link href="/khata">
                <div className="card-metric p-4 group cursor-pointer hover:border-success/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center">
                      <FiBook size={15} className="text-success" />
                    </div>
                  </div>
                  <p className="text-lg font-black text-success">{bizOverview.khataReceivable >= 100000 ? `₹${(bizOverview.khataReceivable/100000).toFixed(1)}L` : `₹${Math.round(bizOverview.khataReceivable/1000)}K`}</p>
                  <p className="text-xs text-muted mt-0.5">Khata Receivable</p>
                </div>
              </Link>
              <Link href="/purchases">
                <div className="card-metric p-4 group cursor-pointer hover:border-yellow-400/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                      <FiPackage size={15} className="text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-lg font-black text-yellow-400">{bizOverview.purchasesDue >= 100000 ? `₹${(bizOverview.purchasesDue/100000).toFixed(1)}L` : `₹${Math.round(bizOverview.purchasesDue/1000)}K`}</p>
                  <p className="text-xs text-muted mt-0.5">Purchases Due</p>
                </div>
              </Link>
              <Link href="/today">
                <div className="card-metric p-4 group cursor-pointer hover:border-accent/30 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                      <FiUsers size={15} className="text-accent" />
                    </div>
                  </div>
                  <p className="text-lg font-black text-primary">Today</p>
                  <p className="text-xs text-muted mt-0.5">P&amp;L Summary</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Empty state — shown when user has no real invoice data */}
        {metrics && metrics.total_customers === 0 && (
          <div className="card-premium p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-accent-dim border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUpload size={28} className="text-accent" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Upload your invoices to get started</h3>
            <p className="text-sm text-secondary mb-6 max-w-sm">
              Go to Collections and upload a CSV with your outstanding invoices. Vantro will prioritize who to call and generate WhatsApp messages automatically.
            </p>
            <Link href="/collections"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all">
              <FiUpload size={15} /> Upload Invoices
            </Link>
          </div>
        )}

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

        {/* Promise Tracker */}
        {promises.length > 0 && (
          <div className="card-premium overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-sm font-bold text-primary">Follow-ups Due</p>
                <p className="text-xs text-secondary mt-0.5">{promises.length} customers promised payment — check in today</p>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {promises.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">{p.customer_name}</p>
                    <p className="text-xs text-muted">Promised by {p.promised_payment_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.amount > 0 && <span className="text-sm font-bold text-accent">₹{Number(p.amount).toLocaleString("en-IN")}</span>}
                    <a href={`/collections`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold rounded-lg bg-accent-dim text-accent border border-accent/20 hover:bg-accent hover:text-white transition-all">
                      <FiPhone size={10}/> Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vantro ID mini-card */}
        <Link href="/my-id">
          <div className="card-premium p-5 flex items-center gap-4 group cursor-pointer hover:border-accent/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiZap size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-primary">Your Vantro Business ID</p>
                <span className="text-2xs font-bold text-accent bg-accent-dim border border-accent/20 px-1.5 py-0.5 rounded font-mono">
                  VAN-ID
                </span>
              </div>
              <p className="text-xs text-muted">Share your verified financial identity — build instant trust with customers & suppliers</p>
            </div>
            <FiArrowRight size={16} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </Link>

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

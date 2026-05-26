"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiDollarSign, FiClock, FiPercent, FiAlertTriangle, FiTrendingDown,
  FiTarget, FiMessageSquare, FiCheckSquare, FiArrowRight,
  FiList, FiTrendingUp, FiSettings, FiPhone, FiShield, FiZap,
  FiFileText, FiBook, FiPackage, FiUsers,
} from "react-icons/fi";
import { api, getUser, type Metrics, type Invoice } from "@/lib/api";
import QuickSale from "@/components/QuickSale";
import WelcomeGuide from "@/components/WelcomeGuide";
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


function fmtAmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

const METRICS = [
  { label: "Total Outstanding",      value: "₹45.2L", sub: "42 customers",       icon: FiDollarSign,   accent: "#4F6EF7", glow: "rgba(79,110,247,0.15)",   pct: 72 },
  { label: "Days Sales Outstanding", value: "42",      sub: "days — ↓3d MoM",    icon: FiClock,        accent: "#F5A524", glow: "rgba(245,165,36,0.12)",   pct: 58 },
  { label: "Collection Rate",        value: "68%",     sub: "↑4pp this month",   icon: FiPercent,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)",   pct: 68 },
  { label: "Cash Runway",            value: "12d",     sub: "critical — act now",icon: FiTrendingDown, accent: "#F5424D", glow: "rgba(245,66,77,0.15)",    pct: 20 },
  { label: "Amount Overdue",         value: "₹20.1L",  sub: ">30 days",          icon: FiAlertTriangle,accent: "#F5424D", glow: "rgba(245,66,77,0.12)",    pct: 45 },
  { label: "Top Collection Prob.",   value: "82%",     sub: "Mehta Fabrics",     icon: FiTarget,       accent: "#10D98A", glow: "rgba(16,217,138,0.12)",   pct: 82 },
];


// ─── Psychology helpers ───────────────────────────────────────────────────────
function getStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const s = JSON.parse(localStorage.getItem("vantro_streak") || "{}");
    const today = new Date().toDateString();
    if (s.lastDay === today) return s.count || 1;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (s.lastDay === yesterday) return s.count || 1;
    return 0;
  } catch { return 0; }
}

function updateStreak() {
  if (typeof window === "undefined") return;
  try {
    const s = JSON.parse(localStorage.getItem("vantro_streak") || "{}");
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (s.lastDay === today) return;
    const newCount = s.lastDay === yesterday ? (s.count || 1) + 1 : 1;
    localStorage.setItem("vantro_streak", JSON.stringify({ count: newCount, lastDay: today }));
  } catch {}
}

function getCollectedToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const d = JSON.parse(localStorage.getItem("vantro_today_collected") || "{}");
    const today = new Date().toDateString();
    return d.date === today ? (d.amount || 0) : 0;
  } catch { return 0; }
}

function getBadge(streak: number, collected: number): { label: string; emoji: string; color: string } {
  if (streak >= 180 || collected >= 5000000) return { label: "Recovery King",    emoji: "🏆", color: "#F59E0B" };
  if (streak >= 90  || collected >= 2000000) return { label: "Power Collector",  emoji: "👑", color: "#8B5CF6" };
  if (streak >= 30  || collected >= 500000)  return { label: "Chase Master",     emoji: "🎯", color: "#4F6EF7" };
  if (streak >= 7   || collected >= 100000)  return { label: "Active Collector", emoji: "⚡", color: "#10D98A" };
  return { label: "New Collector", emoji: "🌱", color: "#6B7280" };
}

// Demo risk customers (for loss aversion banner)
const RISK_CUSTOMERS = [
  { name: "Mehta Fabrics",   amount: 840000, daysLeft: 3 },
  { name: "Sharma Steel",    amount: 250000, daysLeft: 5 },
  { name: "Gupta Const.",    amount: 160000, daysLeft: 7 },
];

export default function DashboardPage() {
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [metrics, setMetrics]   = useState<Metrics | null>(null);
  const [promises, setPromises] = useState<{ customer_name: string; promised_payment_date: string; amount: number }[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [bizOverview, setBizOverview] = useState({ unpaidBills: 0, unpaidBillsAmt: 0, khataReceivable: 0, purchasesDue: 0, hasFeatures: false });
  const [ownerName, setOwnerName] = useState("User");
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [streak, setStreak]           = useState(0);
  const [collectedToday, setCollectedToday] = useState(0);
  const [dailyGoal]                   = useState(400000); // ₹4L default goal
  const [showPaymentCelebration, setShowPaymentCelebration] = useState<{ amount: number; name: string } | null>(null);
  const [showRiskBanner, setShowRiskBanner] = useState(true);
  const [showGuide, setShowGuide] = useState(false); // always false on SSR; useEffect sets real value
  const [guideData, setGuideData] = useState({ waConnected: false, autoEnabled: false });
  const [liveCustomers, setLiveCustomers] = useState<typeof CUSTOMERS>([]);
  const [rawInvoices, setRawInvoices]       = useState<Invoice[]>([]);
  const today = new Date().toISOString().split("T")[0];

  // Hydration-safe: read localStorage only after mount (never on the server)
  useEffect(() => {
    setShowGuide(localStorage.getItem("vantro_guide_dismissed") !== "1");
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;
    setUserPlan(user.plan || "free");

    // Load owner name for greeting
    const stored = (() => { try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; } })();
    setOwnerName(stored.business_name || user.business_name || user.email?.split("@")[0] || "User");

    // Streak + collected today
    updateStreak();
    setStreak(getStreak());
    setCollectedToday(isDemoMode() ? 240000 : getCollectedToday());

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

    // Load guide state (settings check)
    api.settings.get().then(d => {
      const s = d.settings;
      setGuideData({
        waConnected: true, // Vantro AutoPilot — always active via Twilio
        autoEnabled: !!s.automation_enabled,
      });
    }).catch(() => {});

    // Fetch top 5 priority customers (live, overdue first)
    api.invoices.list(user.id).then(d => {
      const pending = (d.invoices || []).filter(inv => inv.payment_status === "Pending");
      setRawInvoices(pending);
      const sorted = [...pending].sort((a, b) => b.days_overdue - a.days_overdue);
      const mapped = sorted.slice(0, 5).map((inv, i) => ({
        id: i + 1,
        name: inv.customer_name,
        outstanding: inv.invoice_amount,
        days: inv.days_overdue,
        score: Math.max(10, Math.min(99, 90 - inv.days_overdue)),
        lastPayment: inv.payment_date || "—",
        contact: inv.customer_phone || "",
      }));
      if (mapped.length > 0) setLiveCustomers(mapped);
    }).catch(() => {});
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
      const purchasesDue = (purchasesD.purchases || [])
        .filter((p: any) => p.status !== "paid")
        .reduce((s: number, p: any) => {
          const amount = Number(p.amount ?? p.total_amount ?? 0);
          const paid = Number(p.paid_amount ?? 0);
          return s + Math.max(amount - paid, 0);
        }, 0);
      setBizOverview({
        unpaidBills: unpaidBills.length,
        unpaidBillsAmt: unpaidBills.reduce((s: number, b: any) => s + Number(b.total), 0),
        khataReceivable,
        purchasesDue,
        hasFeatures: unpaidBills.length > 0 || khataReceivable > 0 || purchasesDue > 0,
      });
    });
  }, []);

  // ── Live computed values for Today's Actions ─────────────────────────────
  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const callsLeft    = rawInvoices.length; // pending invoices = calls still to chase
  const waToSend     = rawInvoices.filter(inv =>
    !inv.last_reminder_sent || (now - new Date(inv.last_reminder_sent).getTime()) > THREE_DAYS_MS
  ).length;
  const promisedAmt  = promises.reduce((s, p) => s + ((p as any).amount || 0), 0);

  // ── Live risk customers (60–89 days — approaching the 90-day uncollectable cliff) ──
  const liveRiskCustomers = liveCustomers.filter(c => c.days >= 60 && c.days < 90).slice(0, 3);
  const riskTotal         = liveRiskCustomers.reduce((s, c) => s + c.outstanding, 0);
  const showLiveRisk      = liveRiskCustomers.length > 0;

  // ── Override static values with real data when available ─────────────────
  const liveMetrics = metrics ? [
    { label: "Total Outstanding",      value: `₹${(metrics.total_outstanding/100000).toFixed(1)}L`, sub: `${metrics.total_customers} customers`,  icon: FiDollarSign,   accent: "#4F6EF7", glow: "rgba(79,110,247,0.15)",  pct: 72 },
    { label: "Days Sales Outstanding", value: metrics.total_customers > 0 ? "—" : "0", sub: "days — target <30",   icon: FiClock,        accent: "#F5A524", glow: "rgba(245,165,36,0.12)", pct: 0 },
    { label: "Collection Rate",        value: `${metrics.avg_recovery_rate}%`, sub: "this period",  icon: FiPercent,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)", pct: Number(metrics.avg_recovery_rate) },
    { label: "Pending Invoices",       value: String(metrics.pending_invoices), sub: "awaiting payment", icon: FiAlertTriangle,accent: "#F5424D", glow: "rgba(245,66,77,0.12)",   pct: 45 },
    { label: "Amount Collected",       value: `₹${(metrics.total_paid/100000).toFixed(1)}L`,  sub: "total recovered",icon: FiTarget,      accent: "#10D98A", glow: "rgba(16,217,138,0.12)", pct: 82 },
    { label: "Supplier Payables",      value: `₹${((metrics.total_payable || 0)/100000).toFixed(1)}L`, sub: `${metrics.total_suppliers || 0} suppliers`, icon: FiPackage, accent: "#F5A524", glow: "rgba(245,165,36,0.12)", pct: 45 },
  ] : [];

  return (
    <DashboardLayout pageTitle="Dashboard">
      {showQuickSale && <QuickSale onClose={() => setShowQuickSale(false)} onSaved={() => { /* could refresh today P&L */ }} />}
      {/* Floating Quick Sale button — hide when critical risk banner is visible */}
      {!(showRiskBanner && showLiveRisk) && (
        <button onClick={() => setShowQuickSale(true)}
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 hidden lg:flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg, #FF6B35 0%, #F55A22 100%)", boxShadow: "0 4px 20px rgba(255,107,53,0.5)" }}>
          <FiZap size={16} /> Quick Sale
        </button>
      )}
      <div className="space-y-6 page-enter">
        {/* Welcome guide — shows for new users until dismissed */}
        {showGuide && (
          <WelcomeGuide
            waConnected={guideData.waConnected}
            hasInvoices={(metrics?.pending_invoices ?? 0) > 0 || (rawInvoices.length > 0)}
            autoEnabled={guideData.autoEnabled}
            onDismiss={() => setShowGuide(false)}
          />
        )}

        {/* ── PROMISES DUE TODAY — highest-urgency banner ── */}
        {promises.length > 0 && (() => {
          const today = new Date().toISOString().split("T")[0];
          const dueToday = promises.filter(p => p.promised_payment_date <= today);
          if (dueToday.length === 0) return null;
          const total = dueToday.reduce((s, p) => s + ((p as any).amount || 0), 0);
          return (
            <div className="rounded-xl overflow-hidden"
              style={{ background: "rgba(245,165,36,0.08)", border: "1px solid rgba(245,165,36,0.3)" }}>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <div>
                    <p className="text-sm font-black text-warning leading-tight">
                      {dueToday.length} promise{dueToday.length > 1 ? "s" : ""} aaj due —{" "}
                      {total > 0 && `₹${(total / 100000).toFixed(1)}L`}
                    </p>
                    <p className="text-2xs text-muted mt-0.5">
                      {dueToday.map(p => p.customer_name).slice(0, 2).join(", ")}
                      {dueToday.length > 2 ? ` +${dueToday.length - 2} aur` : ""}
                    </p>
                  </div>
                </div>
                <Link href="/collections"
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-black text-black transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #FF6B35, #F55A22)",
                    boxShadow: "0 2px 10px rgba(255,107,53,0.4)",
                  }}>
                  Follow Up →
                </Link>
              </div>
            </div>
          );
        })()}


        {/* Free plan — loss aversion nudge tied to real pending count */}
        {userPlan === "free" && (
          <div className="rounded-xl border border-white/8 bg-surface-1 p-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                <span className="text-base">💸</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-primary leading-tight mb-0.5">
                  {(metrics?.pending_invoices ?? 0) > 0
                    ? `${metrics!.pending_invoices} invoices are overdue — not one reminder sent automatically.`
                    : "No automation is running. Every reminder is manual."}
                </p>
                <p className="text-xs text-muted leading-snug">
                  Businesses on Growth recover 3.2× more in the same time.
                  <span className="text-white"> ₹999/mo</span> — automation pays for itself in the first invoice.
                </p>
              </div>
            </div>
            <Link href="/billing"
              className="shrink-0 px-4 py-2 rounded-xl bg-white text-black text-xs font-black hover:bg-white/90 transition-all whitespace-nowrap">
              Start Automating →
            </Link>
          </div>
        )}

        {/* ── PAYMENT CELEBRATION OVERLAY (Variable Reward) ─────────────── */}
        {showPaymentCelebration && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPaymentCelebration(null)}>
            <div className="text-center px-8 py-12 rounded-3xl bg-surface-1 border border-success/30 shadow-2xl max-w-sm mx-4 animate-fade-in">
              <div className="text-6xl mb-4">🎊</div>
              <p className="text-lg font-black text-success mb-1">Wah {ownerName.split(" ")[0]} ji!</p>
              <p className="text-4xl font-black text-white mb-2">{fmtAmt(showPaymentCelebration.amount)}</p>
              <p className="text-sm text-muted mb-6">{showPaymentCelebration.name} ne pay kar diya! 💰</p>
              <div className="flex gap-2 justify-center">
                <button className="px-5 py-2.5 rounded-xl bg-success text-white text-sm font-bold">Share Karo 🎉</button>
                <button onClick={() => setShowPaymentCelebration(null)} className="px-5 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-medium">Dashboard</button>
              </div>
            </div>
          </div>
        )}

        {/* ── LOSS AVERSION BANNER (Kahneman — loss 2x stronger than gain) ── */}
        {showRiskBanner && showLiveRisk && (() => {
          const riskList = liveRiskCustomers.map(c => ({ name: c.name, amount: c.outstanding, daysLeft: 90 - c.days }));
          const total = riskTotal;
          return (
            <div className="rounded-xl border-2 p-4 relative overflow-hidden"
              style={{ background: "rgba(245,66,77,0.08)", borderColor: "#F5424D" }}>
              <div className="absolute inset-0 opacity-5"
                style={{ background: "repeating-linear-gradient(45deg, #F5424D, #F5424D 2px, transparent 2px, transparent 12px)" }} />
              <button onClick={() => setShowRiskBanner(false)}
                className="absolute top-3 right-3 text-danger/50 hover:text-danger text-xs">✕</button>
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">🚨</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-danger">
                    ₹{(total / 100000).toFixed(1)}L KHATRE MEIN HAI
                  </p>
                  <p className="text-xs text-danger/70 mt-0.5 mb-3">
                    {riskList.length} customers 90-din limit cross karne waale hain — 90 din baad 60% chances recover nahi hoga
                  </p>
                  <div className="space-y-1.5 mb-3">
                    {riskList.map((c) => (
                      <div key={c.name} className="flex items-center justify-between">
                        <span className="text-xs text-danger/80 font-medium">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-danger">{fmtAmt(c.amount)}</span>
                          <span className="text-2xs bg-danger/20 text-danger px-1.5 py-0.5 rounded-full font-bold">
                            {c.daysLeft} din ⏰
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/collections"
                    className="btn-cta inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs">
                    🔥 Abhi Call Karo <FiArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════════════
            AAJ KA SCORE — The morning hook card
            Answers in 3 seconds: expected · received · baaki
            ══════════════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}>

          {/* Top bar: greeting + streak */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <p className="text-xs text-muted font-medium flex items-center gap-1.5">
                <span className="status-live text-success">Live</span>
                {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
              <h2 className="text-lg font-black text-primary tracking-tight leading-tight">
                {getGreeting(ownerName)}
              </h2>
            </div>
            <div className="flex flex-col items-center px-3 py-2 rounded-xl border border-orange-500/20"
              style={{ background: "rgba(249,115,22,0.08)" }}>
              <span className="text-lg leading-none">🔥</span>
              <span className="text-base font-black text-orange-400 leading-tight">{streak || 1}</span>
              <span className="text-2xs text-muted leading-none">din</span>
            </div>
          </div>

          {/* THE NUMBER — biggest element on the screen */}
          <div className="px-5 pt-1 pb-4 text-center">
            <p className="text-2xs font-bold text-muted uppercase tracking-[0.15em] mb-2">
              AAJ COLLECT HUA
            </p>
            <p
              className="font-black leading-none tracking-tight transition-all duration-700"
              style={{
                fontSize: "clamp(2.8rem, 10vw, 4rem)",
                color: collectedToday > 0 ? "#10D98A" : "rgba(255,255,255,0.08)",
                textShadow: collectedToday > 0 ? "0 0 40px rgba(16,217,138,0.3)" : "none",
              }}
            >
              {collectedToday > 0 ? fmtAmt(collectedToday) : "₹0"}
            </p>

            {/* Goal progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-2xs text-muted mb-2">
                <span>Goal: {fmtAmt(dailyGoal)}</span>
                <span className="font-bold" style={{ color: collectedToday >= dailyGoal ? "#10D98A" : "#FF6B35" }}>
                  {Math.min(100, Math.round((collectedToday / dailyGoal) * 100))}%
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, (collectedToday / dailyGoal) * 100)}%`,
                    background: collectedToday >= dailyGoal
                      ? "linear-gradient(90deg, #10D98A, #06D6A0)"
                      : "linear-gradient(90deg, #FF6B35, #F5A524)",
                  }}
                />
              </div>
              <p className="text-2xs text-muted mt-1.5 text-center">
                {collectedToday >= dailyGoal
                  ? "🎉 Goal achieve ho gaya! Zabardast din!"
                  : `${fmtAmt(dailyGoal - collectedToday)} aur chahiye`}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 h-px bg-border/50" />

          {/* AI Briefing */}
          <div className="mx-5 my-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FiZap size={11} className="text-accent" />
              <p className="text-2xs font-bold text-accent uppercase tracking-wider">AI Briefing</p>
              {!briefingLoading && briefing && (
                <span className="ml-auto text-2xs text-muted">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {briefingLoading ? (
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
                <span className="text-xs text-muted ml-1">Taiyar ho rahi hai...</span>
              </div>
            ) : briefing ? (
              <p className="text-xs text-secondary leading-relaxed">{briefing}</p>
            ) : (
              <p className="text-xs text-muted">Invoices upload karo — AI kal se briefing dega 🎯</p>
            )}
          </div>

          {/* 3 action chips — Zeigarnik Effect */}
          <div className="px-5 pb-5 grid grid-cols-3 gap-2">
            {[
              {
                Icon: FiPhone,
                label: callsLeft > 0 ? `${callsLeft} Call${callsLeft !== 1 ? "s" : ""} Baaki` : "Calls Done ✓",
                href: "/collections",
                color: callsLeft > 0 ? "#F5424D" : "#10D98A",
                urgent: callsLeft > 0,
              },
              {
                Icon: FiMessageSquare,
                label: waToSend > 0 ? `${waToSend} WA Bhejo` : "WA Done ✓",
                href: "/whatsapp",
                color: waToSend > 0 ? "#25D366" : "#10D98A",
                urgent: false,
              },
              {
                Icon: FiTarget,
                label: promisedAmt > 0 ? `${fmtAmt(promisedAmt)} Promised` : "No Promises",
                href: "/collections",
                color: "#F5A524",
                urgent: false,
              },
            ].map(({ Icon, label, href, color, urgent }) => (
              <Link key={label} href={href}
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all text-center active:scale-95"
                style={{ background: `${color}10`, borderColor: `${color}28` }}>
                <div className="relative w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                  <Icon size={15} style={{ color }} />
                  {urgent && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-danger animate-pulse" />}
                </div>
                <p className="text-2xs font-bold leading-tight" style={{ color }}>{label}</p>
              </Link>
            ))}
          </div>

          {/* Identity badge */}
          {(() => {
            const badge = getBadge(streak, collectedToday + (metrics?.total_paid || 0));
            return (
              <div className="mx-5 mb-5 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: `${badge.color}0E`, border: `1px solid ${badge.color}22` }}>
                <span className="text-lg">{badge.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black" style={{ color: badge.color }}>{badge.label}</p>
                  <p className="text-2xs text-muted">Aapki identity — Vantro community</p>
                </div>
                <Link href="/collections" className="text-2xs font-bold shrink-0" style={{ color: badge.color }}>
                  Dekho →
                </Link>
              </div>
            );
          })()}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {liveMetrics.map(({ label, value, sub, icon: Icon, accent, glow, pct }) => {
            const isCritical = pct <= 25 && accent === "#F5424D";
            return (
              <div key={label} className={`card-metric p-5 ${isCritical ? "card-metric-critical" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <p className="section-label">{label}</p>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCritical ? "animate-pulse" : ""}`}
                    style={{ background: glow, border: `1px solid ${accent}30` }}
                  >
                    <Icon size={15} style={{ color: accent }} />
                  </div>
                </div>
                <p className={`mb-1 font-black tracking-tight ${isCritical ? "text-3xl" : "metric-lg"}`} style={{ color: accent }}>
                  {value}
                  {isCritical && <span className="text-xs font-semibold ml-1.5 opacity-70">⚠ critical</span>}
                </p>
                <p className="text-2xs text-muted mb-3">{sub}</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: accent, opacity: isCritical ? 1 : 0.7 }}
                  />
                </div>
              </div>
            );
          })}
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-sm">
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
              <span className="metric-value text-base text-accent">
                {metrics ? fmtAmt(metrics.total_outstanding) : "₹—"}
              </span>
            </div>
            <div className="flex items-center justify-center h-[110px] rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}>
              <p className="text-xs text-muted text-center">
                Trend will appear after invoices are added
              </p>
            </div>
          </div>

          {/* Quick KPIs — live data */}
          <div className="space-y-3">
            {(() => {
              const totalOut  = metrics?.total_outstanding || 0;
              const collected = metrics?.total_paid || 0;
              const promised  = promisedAmt;
              // "unreachable" = outstanding minus collected minus promised (approximate)
              const unreachable = Math.max(0, totalOut - promised);
              const collectedPct  = totalOut > 0 ? Math.min(100, Math.round((collected / (collected + totalOut)) * 100)) : 0;
              const promisedPct   = totalOut > 0 ? Math.min(100, Math.round((promised / totalOut) * 100)) : 0;
              const unreachPct    = totalOut > 0 ? Math.min(100, Math.round((unreachable / totalOut) * 100)) : 0;
              return [
                { label: "Total collected",  value: collected > 0 ? fmtAmt(collected) : "—", pct: collectedPct, color: "#10D98A" },
                { label: "Promised to pay",  value: promised  > 0 ? fmtAmt(promised)  : "—", pct: promisedPct,  color: "#F5A524" },
                { label: "Still outstanding",value: totalOut  > 0 ? fmtAmt(unreachable): "—", pct: unreachPct,  color: "#F5424D" },
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
              ));
            })()}
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
              View all {metrics?.pending_invoices ?? "—"} <FiArrowRight size={12} />
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
                {liveCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">
                      No outstanding invoices yet. <Link href="/collections" className="text-accent underline">Add your first invoice →</Link>
                    </td>
                  </tr>
                )}
                {liveCustomers.map((c, i) => (
                  <tr key={c.id} style={{ animationDelay: `${i * 40}ms` }} className="animate-row-in">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: i === 0 ? "rgba(79,110,247,0.12)" : "rgba(255,255,255,0.05)", color: i === 0 ? "#4F6EF7" : "rgba(255,255,255,0.4)", border: `1px solid ${i === 0 ? "rgba(79,110,247,0.25)" : "rgba(255,255,255,0.07)"}` }}
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
            { href: "/collections", Icon: FiList,       label: "Full Collections",   sub: "42 active · Sort by priority", color: "#4F6EF7" },
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

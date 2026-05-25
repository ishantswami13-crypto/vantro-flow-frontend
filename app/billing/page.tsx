"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import {
  FiCheck, FiArrowRight, FiZap, FiShield,
  FiCalendar, FiTrendingUp, FiMessageSquare, FiUsers,
} from "react-icons/fi";
import { api, getUser, type BillingRecord } from "@/lib/api";

declare global { interface Window { Razorpay: any; } }

/* ─── Plan data ─────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Know who to chase. Every day.",
    price: 999,
    annual: 799,
    badge: null,
    highlight: false,
    proof: "Solo founders & small teams",
    outcomes: [
      "AI ranks who to call first — zero guesswork",
      "Full picture: who owes what, since when",
      "Pre-written WhatsApp message — you tap Send",
      "Import from Excel or Tally in 2 minutes",
      "30-day cash flow forecast",
    ],
    cta: "Get Clarity",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Money collects itself.",
    price: 2499,
    annual: 1999,
    badge: "Most Popular",
    highlight: true,
    proof: "847 Indian MSMEs using this right now",
    outcomes: [
      "WhatsApp fires automatically at Day 7, 14, 30",
      "Customer gets UPI link — one tap to pay",
      "Tally syncs overnight — zero manual entry",
      "AI dunning sequences run while you sleep",
      "3 team members + full analytics",
    ],
    cta: "Start Automating",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Total control. Zero manual work.",
    price: 4999,
    annual: 3999,
    badge: "Best Value",
    highlight: false,
    proof: "CA firms & high-volume businesses",
    outcomes: [
      "Unlimited WhatsApp — bulk-send in 30 seconds",
      "10 team members + CA multi-client view",
      "Custom AI message voice in your brand tone",
      "PDF invoices + Excel exports, one click",
      "Dedicated account manager on WhatsApp",
    ],
    cta: "Get Full Control",
  },
];

const TESTIMONIALS = [
  {
    quote: "Collected ₹22L in 6 weeks that was stuck for 8 months. WhatsApp automation changed everything.",
    name: "Vikram Mehta",
    biz: "Mehta Fabrics, Surat",
    avatar: "VM",
  },
  {
    quote: "DSO dropped from 67 to 41 days in one quarter. The AI call list is sharper than my whole team.",
    name: "Priya Sharma",
    biz: "Sharma Steel Works, Ahmedabad",
    avatar: "PS",
  },
];

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — no contracts, no lock-in. Cancel from Settings in one click. You keep access until the end of your billing period.",
  },
  {
    q: "What if Vantro doesn't help me collect more?",
    a: "If you don't recover more than the plan cost in your first 30 days, we refund. No questions asked.",
  },
  {
    q: "Does WhatsApp automation work without Interakt/WATI?",
    a: "You need Interakt or WATI (both have free tiers). Setup takes 10 minutes. We walk you through it.",
  },
];

/* ─── Razorpay loader ───────────────────────────────────────────────── */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ─── Page ─────────────────────────────────────────────────────────── */
export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const user = getUser();
  const currentPlan = user?.plan || "free";
  const isFree = currentPlan === "free";

  useEffect(() => {
    api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
  }, []);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load payment gateway. Check your connection.");
      const { order, key } = await api.billing.createOrder({ plan: planId, period: billing });
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key, amount: order.amount, currency: order.currency, order_id: order.id,
          name: "Vantro Flow",
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — ${billing}`,
          prefill: { email: user?.email || "", contact: user?.phone || "", name: user?.business_name || "" },
          theme: { color: "#0066FF" },
          handler: async (response: any) => {
            try {
              await api.billing.verify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId, period: billing,
              });
              setSuccessPlan(planId);
              api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });
    } catch (e: any) {
      if (e?.message !== "Payment cancelled") alert(e?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const annualSave = (monthly: number, annual: number) =>
    Math.round((monthly - annual) * 12).toLocaleString("en-IN");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* ── Success ────────────────────────────────────────────── */}
        {successPlan && (
          <div className="px-4 py-3 rounded-xl bg-success/10 border border-success/30 text-sm text-success font-semibold flex items-center gap-2">
            <FiCheck size={15} />
            You're now on <span className="capitalize font-black">{successPlan}</span>. Automation is live.
          </div>
        )}

        {/* ── HEADER — pain framing for free, status for paid ───── */}
        {isFree ? (
          <div className="rounded-2xl border border-danger/25 bg-danger/5 p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl shrink-0">🔴</div>
              <div>
                <h1 className="text-lg font-black text-primary mb-1">
                  You're on Free — reminders aren't sending themselves.
                </h1>
                <p className="text-sm text-secondary leading-relaxed">
                  Every overdue invoice on your dashboard is waiting for a manual message.
                  That's hours every week. Businesses on Growth recover
                  <span className="text-white font-bold"> 3.2× more </span>
                  in the same time — because automation does the chasing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/15 border border-success/25 flex items-center justify-center">
                <FiZap size={18} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-black text-primary">
                  {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan — Active
                </p>
                <p className="text-xs text-muted">Automation is running. Thank you for building with Vantro.</p>
              </div>
            </div>
            <button className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-secondary hover:text-primary hover:border-white/20 transition-all">
              Manage Payment
            </button>
          </div>
        )}

        {/* ── ROI ANCHOR STRIP ──────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { num: "₹3.8L", label: "avg extra collected in 60 days on Growth", icon: FiTrendingUp },
            { num: "847",   label: "Indian MSMEs automating collections right now", icon: FiUsers },
            { num: "5 min", label: "to set up and start your first automation", icon: FiZap },
          ].map(({ num, label, icon: Icon }) => (
            <div key={num} className="rounded-xl border border-border bg-surface-1 p-4 text-center">
              <Icon size={14} className="text-muted mx-auto mb-2" />
              <p className="text-xl font-black text-primary mb-0.5">{num}</p>
              <p className="text-2xs text-muted leading-snug">{label}</p>
            </div>
          ))}
        </div>

        {/* ── TOGGLE ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-border">
            {(["monthly", "annual"] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)}
                className={[
                  "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                  billing === b
                    ? "bg-white text-black shadow-sm"
                    : "text-muted hover:text-primary",
                ].join(" ")}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === "annual" && (
                  <span className="text-2xs font-black bg-success text-white px-1.5 py-0.5 rounded-full">
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
          {billing === "annual" && (
            <p className="text-xs text-success font-semibold">
              Save up to ₹{annualSave(4999, 3999)}/year — 2 months free
            </p>
          )}
        </div>

        {/* ── PLAN CARDS ───────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const price = billing === "annual" ? plan.annual : plan.price;
            const isHighlight = plan.highlight;

            /* White card for Growth, dark for others */
            if (isHighlight) {
              return (
                <div key={plan.id} className="relative rounded-2xl bg-white p-7 flex flex-col shadow-2xl md:-mt-3 md:mb-3">
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-2xs font-black tracking-widest uppercase text-white bg-black shadow-lg">
                        ★ {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <p className="text-2xs font-bold tracking-[0.12em] uppercase text-black/40 mb-2">{plan.name}</p>
                    <p className="text-base font-black text-black mb-4 leading-tight">{plan.tagline}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-black tracking-tight">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-black/50 text-sm ml-1">/mo</span>
                    </div>
                    {billing === "annual" && (
                      <p className="text-xs text-black/40 mt-1">
                        ₹{(price * 12).toLocaleString("en-IN")}/year · save ₹{annualSave(plan.price, plan.annual)}
                      </p>
                    )}
                    <p className="text-2xs text-black/40 mt-2 font-medium">{plan.proof}</p>
                  </div>

                  <div className="h-px bg-black/10 mb-6" />

                  <ul className="space-y-3 mb-7 flex-1">
                    {plan.outcomes.map((o) => (
                      <li key={o} className="flex items-start gap-3 text-sm text-black/75">
                        <span className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                          <FiCheck size={9} className="text-white" />
                        </span>
                        {o}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                    disabled={isCurrent || !!loading}
                    className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-black hover:bg-black/85 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading === plan.id
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                      : isCurrent
                      ? "✓ Current Plan"
                      : <>{plan.cta} <FiArrowRight size={14} /></>
                    }
                  </button>
                  <p className="text-2xs text-black/30 text-center mt-2">14-day free trial · cancel anytime</p>
                </div>
              );
            }

            /* Dark cards for Starter + Pro */
            return (
              <div key={plan.id}
                className={[
                  "relative rounded-2xl border p-7 flex flex-col transition-all duration-200",
                  isCurrent
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-surface-1 hover:border-white/15",
                ].join(" ")}>

                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-black tracking-widest uppercase text-muted bg-surface-3 border border-border">
                      {plan.badge}
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-success/15 border border-success/25 text-2xs font-bold text-success">
                    Current
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-2xs font-bold tracking-[0.12em] uppercase text-muted mb-2">{plan.name}</p>
                  <p className="text-base font-black text-primary mb-4 leading-tight">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-primary tracking-tight">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted text-sm ml-1">/mo</span>
                  </div>
                  {billing === "annual" && (
                    <p className="text-xs text-muted mt-1">
                      ₹{(price * 12).toLocaleString("en-IN")}/year · save ₹{annualSave(plan.price, plan.annual)}
                    </p>
                  )}
                  <p className="text-2xs text-muted mt-2">{plan.proof}</p>
                </div>

                <div className="h-px bg-border mb-6" />

                <ul className="space-y-3 mb-7 flex-1">
                  {plan.outcomes.map((o) => (
                    <li key={o} className="flex items-start gap-3 text-sm text-secondary">
                      <span className="w-4 h-4 rounded-full border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                        <FiCheck size={9} className="text-white/70" />
                      </span>
                      {o}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={isCurrent || !!loading}
                  className={[
                    "w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                    isCurrent
                      ? "bg-success/10 text-success border border-success/20 cursor-default"
                      : "bg-white text-black hover:bg-white/90",
                  ].join(" ")}>
                  {loading === plan.id
                    ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Processing...</>
                    : isCurrent
                    ? "✓ Current Plan"
                    : <>{plan.cta} <FiArrowRight size={14} /></>
                  }
                </button>
                {!isCurrent && (
                  <p className="text-2xs text-muted text-center mt-2">14-day free trial · cancel anytime</p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── URGENCY BAR ──────────────────────────────────────── */}
        <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⏳</span>
            <p className="text-sm font-bold text-warning">Beta pricing — valid through June 2026</p>
          </div>
          <p className="text-xs text-muted">Prices will increase when we exit beta. Lock in now.</p>
        </div>

        {/* ── TRUST BAR ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
          {[
            { icon: FiShield, text: "256-bit encrypted" },
            { icon: FiCheck,  text: "Cancel anytime, no lock-in" },
            { icon: FiZap,    text: "Setup in under 5 minutes" },
            { icon: FiMessageSquare, text: "Pay via Razorpay — Indian UPI accepted" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5">
              <Icon size={12} className="text-success" />
              {text}
            </span>
          ))}
        </div>

        {/* ── SOCIAL PROOF ─────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          {TESTIMONIALS.map(({ quote, name, biz, avatar }) => (
            <div key={name} className="rounded-2xl border border-border bg-surface-1 p-5 hover:border-white/15 transition-all">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="text-sm text-secondary leading-relaxed mb-4">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {avatar}
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">{name}</p>
                  <p className="text-2xs text-muted">{biz}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Common Questions</p>
          {FAQS.map(({ q, a }, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-surface-2/50 transition-colors">
                <span className="text-sm font-semibold text-primary">{q}</span>
                <span className={`text-muted shrink-0 transition-transform duration-200 text-sm ${openFaq === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 border-t border-border">
                  <p className="text-sm text-secondary leading-relaxed pt-3">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── ENTERPRISE ──────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface-1 p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
              <FiShield size={17} className="text-muted" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Enterprise / CA Firms</p>
              <p className="text-xs text-muted">50+ clients · White-label · Custom integrations · Dedicated team</p>
            </div>
          </div>
          <a href="mailto:ishantswami13@gmail.com?subject=Vantro Enterprise Enquiry"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-secondary hover:text-primary hover:border-white/20 transition-all">
            Talk to Us <FiArrowRight size={13} />
          </a>
        </div>

        {/* ── BILLING HISTORY ─────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Invoice History</p>
            <FiCalendar size={14} className="text-muted" />
          </div>
          <div className="divide-y divide-border/60">
            {history.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted">
                No billing history yet. Your invoices will appear here after your first payment.
              </div>
            ) : history.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2/40 transition-colors">
                <div>
                  <p className="text-sm text-primary font-semibold capitalize">{inv.plan} Plan</p>
                  <p className="text-xs text-muted">{fmtDate(inv.created_at)}</p>
                </div>
                <span className={[
                  "text-2xs font-bold px-2 py-0.5 rounded-full border",
                  inv.status === "paid"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-surface-3 text-muted border-border",
                ].join(" ")}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

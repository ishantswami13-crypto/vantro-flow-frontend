"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  FiArrowRight, FiCheck, FiBarChart2, FiMessageSquare,
  FiTarget, FiShield, FiTrendingUp, FiUsers,
  FiMenu, FiX, FiPhoneCall, FiUpload, FiCpu,
  FiChevronDown, FiMail, FiZap, FiActivity, FiLock,
  FiDatabase, FiGitBranch, FiAlertTriangle,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { enableDemoMode } from "@/lib/demo";

// ── Scroll reveal ──────────────────────────────────────────────
function useReveal(threshold = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}
const rv = (vis: boolean, delay = 0): React.CSSProperties => ({
  opacity: vis ? 1 : 0,
  transform: vis ? "none" : "translateY(22px)",
  transition: `opacity 0.75s ease-out ${delay}ms, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
});

// ── Data ────────────────────────────────────────────────────────
const FEATURES = [
  { icon: FiTarget,       title: "Collections Autopilot",         desc: "Cortex scores every overdue receivable by recovery probability, drafts Hinglish messages, and creates the right action at the right time — automatically.",  accent: "#4F6EF7" },
  { icon: FiBarChart2,    title: "Live Business Dashboard",       desc: "Outstanding, overdue, payables due, cashflow gap, inventory risk — all in one command centre. Updated every time a sale or payment happens.",                  accent: "#10D98A" },
  { icon: FiMessageSquare,title: "WhatsApp Automation",           desc: "AI-drafted messages in Hinglish sent at optimal times via Twilio. Customers respond because it feels personal — not like a mass blast.",                    accent: "#FF6B35" },
  { icon: FiTrendingUp,   title: "Cashflow Intelligence",         desc: "Expected inflows vs outflows tracked event-by-event. Cortex detects a cash gap before it hits — not after.",                                              accent: "#9B6DFF" },
  { icon: FiShield,       title: "Zero-Touch Data Sync",          desc: "Tally ERP, Excel, CSV — invoices, customers, and ledger sync automatically. Every sale, purchase, and payment feeds the Cortex event graph.",              accent: "#F5A524" },
  { icon: FiUsers,        title: "Customer Behavioural Memory",   desc: "Cortex learns who pays after polite reminders, who needs owner calls, who breaks promises. Every interaction updates the customer intelligence profile.",   accent: "#10D98A" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: FiUpload,    title: "Connect once",         desc: "Link Tally or upload Excel. Invoices, customers, and ledger load automatically. Done in under 5 minutes.",  tag: "Tally · Excel · CSV" },
  { step: "02", icon: FiCpu,       title: "Cortex takes over",    desc: "Every sale, payment, and promise creates a business event. Cortex evaluates rules, creates actions, and queues what needs to happen next.",           tag: "Event graph · Rules engine" },
  { step: "03", icon: FiPhoneCall, title: "You approve. It runs.", desc: "Review AI recommendations in the Action Center. Approve the ones you want. Cortex executes, audits, and learns from the outcome.",                  tag: "Action Center · Audit trail" },
];

const CORTEX_EVENTS = [
  "Sale created → inventory reduces → receivable opens → cashflow updates",
  "Due date passes → risk re-scored → reminder action created",
  "Promise broken → customer score drops → escalation queued",
  "Stock falls below threshold → low stock alert → purchase suggested",
  "New credit sale → credit risk checked → approval required if high-risk",
  "Payment received → cashflow updated → promise resolved → score improved",
];

const INTEGRATIONS = ["Tally ERP", "WhatsApp Business", "Razorpay", "UPI / BHIM", "GST Portal", "Excel / CSV", "Twilio", "Interakt"];

const PLAN_FREE    = ["5 invoices/month", "Manual WhatsApp messages", "Basic dashboard", "CSV import"];
const PLAN_PRO     = ["Unlimited invoices", "WhatsApp auto-reminders", "Razorpay payment links", "AI priority scoring", "Cash flow forecast", "Tally ERP sync", "Auto dunning", "Cortex Action Center"];
const PLAN_SUCCESS = ["Everything in Pro", "No monthly fee — ever", "1.5% only on what Vantro collects", "AI voice calls", "Dedicated account manager", "API access + webhooks", "24/7 priority support"];

const FAQS = [
  { q: "What is Vantro Cortex?",                    a: "Cortex is the orchestration engine inside Vantro. Every sale, purchase, payment, and promise creates a business event. Cortex evaluates rules, calculates risk, and surfaces the right action — so you're always doing the highest-priority thing." },
  { q: "Do I need to add my own API keys?",         a: "No. Vantro manages everything — WhatsApp via Twilio, payment links via Razorpay. Zero technical setup from your end." },
  { q: "Does it work with Tally ERP 9 & TallyPrime?", a: "Yes — both versions. We sync customers, invoices, and ledger data automatically. No manual export after the first setup." },
  { q: "What counts as 'collected via Vantro'?",    a: "Any payment where the customer clicked a UPI/Razorpay link from Vantro, or paid after a Vantro WhatsApp reminder sent by Cortex." },
  { q: "Is my financial data safe?",                a: "All data encrypted at rest and in transit (AES-256 + TLS 1.3). Hosted on AWS Mumbai — your data never leaves India. Every action is audit-logged." },
  { q: "Can AI change my invoices or payments?",    a: "No. Cortex only suggests actions. It cannot mark payments, change amounts, delete invoices, or send messages without your explicit approval." },
];

const WA_NUMBER = "919911164055";

// ── Component ──────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [marqRef, marqVis] = useReveal(0.05);
  const [cortexRef, cortexVis] = useReveal(0.06);
  const [compRef, compVis] = useReveal(0.08);
  const [stepRef, stepVis] = useReveal();
  const [featRef, featVis] = useReveal();
  const [planRef, planVis] = useReveal(0.05);
  const [faqRef,  faqVis]  = useReveal();
  const [ctaRef,  ctaVis]  = useReveal(0.15);

  return (
    <div className="min-h-screen bg-bg text-primary overflow-x-hidden">

      {/* ═══════════════════════ NAV ═══════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50"
        style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(24px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-bold text-[15px] tracking-tight text-primary">Vantro</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm text-secondary">
            {[["#cortex","Cortex"],["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-primary transition-colors duration-150">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-secondary hover:text-primary transition-colors">Log in</Link>
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "#fff", color: "#000" }}>
              Start Free Trial <FiArrowRight size={13} />
            </Link>
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-1.5 rounded-lg text-secondary">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-1" style={{ background: "rgba(8,8,8,0.98)" }}>
            {[["#cortex","Cortex"],["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-surface-2 transition-colors">{label}</a>
            ))}
            <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 rounded-xl text-sm text-secondary bg-surface-2">Log In</Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)} className="block text-center py-2.5 rounded-xl text-sm font-bold bg-white text-black">Start Free Trial</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════ HERO ══════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: "#080808" }}>
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.38, filter: "brightness(0.65) saturate(0.7)" }} aria-hidden="true">
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 hero-ambient" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
          style={{ background: "radial-gradient(ellipse 110% 80% at 50% 50%, transparent 20%, rgba(8,8,8,0.8) 100%)" }} />
        <div className="absolute bottom-0 inset-x-0 h-56 pointer-events-none" aria-hidden="true"
          style={{ background: "linear-gradient(to top, #080808, transparent)" }} />

        <div className="relative z-10 text-center max-w-[900px] mx-auto px-6" style={{ paddingTop: "80px" }}>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-10"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.52)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: "#10D98A" }} />
            AI Business Operating System · India
          </div>

          {/* Headline */}
          <h1 className="text-white mb-4"
            style={{ fontSize: "clamp(3.4rem, 10vw, 7.5rem)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.92 }}>
            Your Business,<br />
            <span style={{ color: "rgba(255,255,255,0.36)" }}>On Autopilot.</span>
          </h1>

          {/* Cortex badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: "rgba(79,110,247,0.12)", border: "1px solid rgba(79,110,247,0.25)", color: "#8BA4F9" }}>
              <FiZap size={11} /> Powered by Vantro Cortex X
            </span>
          </div>

          {/* Sub-headline */}
          <p className="mx-auto mb-10 leading-relaxed"
            style={{ fontSize: "clamp(1rem, 2vw, 1.18rem)", color: "rgba(255,255,255,0.5)", maxWidth: "620px" }}>
            Vantro connects sales, purchases, inventory, receivables, WhatsApp follow-ups, cashflow, and customer behaviour — then tells you exactly what to do next.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/signup"
              className="inline-flex items-center gap-2 rounded-full font-semibold text-[15px] transition-opacity hover:opacity-88"
              style={{ background: "#ffffff", color: "#000000", padding: "14px 36px" }}>
              Start Automating Free <FiArrowRight size={15} />
            </Link>
            <button
              onClick={() => { enableDemoMode(); window.location.href = "/dashboard"; }}
              className="inline-flex items-center gap-2 rounded-full text-[15px] transition-colors"
              style={{ color: "rgba(255,255,255,0.48)", border: "1px solid rgba(255,255,255,0.1)", padding: "14px 36px" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.48)")}>
              👀 Try Demo — No Signup
            </button>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
            {["No credit card required", "14 days free", "Set up in 5 minutes", "Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>
                <FiCheck size={10} style={{ color: "#10D98A" }} /> {t}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 inset-x-0 text-center z-10">
          <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.14)" }}>
            "Karo business. Baaki Vantro karega."
          </p>
        </div>
      </section>

      {/* ═══════════════ INTEGRATION MARQUEE ════════════════════ */}
      <div ref={marqRef} style={rv(marqVis)} className="border-y border-border py-6 overflow-hidden">
        <p className="text-center text-[10px] text-muted uppercase tracking-[0.18em] font-bold mb-4">Works with your existing tools</p>
        <div className="overflow-hidden">
          <div className="animate-marquee">
            {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <div key={i} className="mx-4 px-4 py-2 rounded-xl border text-sm font-semibold text-secondary shrink-0 whitespace-nowrap"
                style={{ background: "#111111", borderColor: "rgba(255,255,255,0.07)" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ WHAT IS VANTRO CORTEX X ════════════════════ */}
      <section id="cortex" className="py-24 border-b border-border" style={{ background: "#0a0a0a" }}>
        <div ref={cortexRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(cortexVis)} className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Cortex X</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
              Not software.<br className="hidden sm:block" /> An orchestration engine.
            </h2>
            <p className="text-secondary max-w-2xl mx-auto text-base leading-relaxed">
              Vantro Cortex watches every business event, calculates risk, creates actions, asks for approval, and learns from outcomes. Every module is connected. Every event has consequences.
            </p>
          </div>

          {/* Event chain examples */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-14">
            {CORTEX_EVENTS.map((chain, i) => (
              <div key={i} style={{ ...rv(cortexVis, i * 50), background: "#080808" }}
                className="rounded-xl border border-border p-4 hover:border-accent/20 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(79,110,247,0.1)", border: "1px solid rgba(79,110,247,0.2)" }}>
                    <FiGitBranch size={11} className="text-accent" />
                  </div>
                  <p className="text-xs text-secondary leading-relaxed group-hover:text-primary/80 transition-colors">{chain}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture strip */}
          <div style={{ ...rv(cortexVis, 200), background: "linear-gradient(135deg, #0d0d0d, #111)" }}
            className="rounded-2xl border border-white/8 p-6 overflow-x-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted text-center mb-5">Cortex X Architecture</p>
            <div className="flex items-center justify-start sm:justify-center gap-2 flex-nowrap min-w-max mx-auto">
              {[
                { label: "Business Event", color: "#4F6EF7" },
                { label: "Rules Engine", color: "#F5A524" },
                { label: "Policy Guard", color: "#F5424D" },
                { label: "Action Created", color: "#9B6DFF" },
                { label: "Owner Approves", color: "#10D98A" },
                { label: "Audit + Learn", color: "#4F6EF7" },
              ].map(({ label, color }, i, arr) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color }}>{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-6 h-px mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ COMPARISON ══════════════════════════════════ */}
      <section className="py-20 border-b border-border">
        <div ref={compRef} className="max-w-5xl mx-auto px-4 sm:px-6">
          <div style={rv(compVis)} className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">The Difference</span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary tracking-tighter mb-3">
              Normal software records.<br className="hidden sm:block" /> Vantro Cortex acts.
            </h2>
          </div>

          <div style={rv(compVis, 100)} className="grid sm:grid-cols-2 gap-4">
            {/* Old way */}
            <div className="rounded-2xl border border-white/8 p-7" style={{ background: "#0d0d0d" }}>
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-6">Old business software</p>
              <div className="space-y-4">
                {[
                  { icon: FiDatabase, text: "Stores invoices and transactions" },
                  { icon: FiBarChart2, text: "Shows dashboards after the fact" },
                  { icon: FiUsers,    text: "Requires manual follow-up every time" },
                  { icon: FiActivity, text: "Modules work in isolation" },
                  { icon: FiAlertTriangle, text: "You find out about a cash crunch after it hits" },
                  { icon: FiLock,    text: "No memory of what worked per customer" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <Icon size={13} className="text-muted" />
                    </div>
                    <p className="text-sm text-muted">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vantro Cortex */}
            <div className="rounded-2xl p-7 relative overflow-hidden"
              style={{ background: "linear-gradient(145deg, #0f0f1a, #0a0a12)", border: "1px solid rgba(79,110,247,0.25)" }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top left, rgba(79,110,247,0.06) 0%, transparent 60%)" }} />
              <p className="relative text-sm font-bold uppercase tracking-wider mb-6" style={{ color: "#8BA4F9" }}>Vantro Cortex X</p>
              <div className="relative space-y-4">
                {[
                  { icon: FiGitBranch,  text: "Connects every module into one event graph", accent: "#4F6EF7" },
                  { icon: FiZap,         text: "Creates next actions in real-time after every event", accent: "#F5A524" },
                  { icon: FiActivity,   text: "Scores customer risk from behaviour, not just balance", accent: "#9B6DFF" },
                  { icon: FiTarget,     text: "Tells you who to call, when, and what to say", accent: "#10D98A" },
                  { icon: FiTrendingUp, text: "Detects cashflow gaps before they happen", accent: "#FF6B35" },
                  { icon: FiCpu,        text: "Learns from outcomes — adapts per customer over time", accent: "#4F6EF7" },
                ].map(({ icon: Icon, text, accent }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}>
                      <Icon size={13} style={{ color: accent }} />
                    </div>
                    <p className="text-sm text-secondary">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ════════════════════════ */}
      <section id="how-it-works" className="py-24 border-b border-border">
        <div ref={stepRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(stepVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">How it Works</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">Set up once.<br className="hidden sm:block" /> Cortex runs forever.</h2>
            <p className="text-secondary max-w-md mx-auto text-base leading-relaxed">No IT team. No lengthy onboarding. Connect your data once — Cortex handles the rest.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 relative">
            <div className="hidden sm:block absolute top-[38px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)" }} />
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, tag }, i) => (
              <div key={step} style={{ ...rv(stepVis, i * 100), background: "linear-gradient(145deg, #141414, #0e0e0e)" }}
                className="relative rounded-2xl border border-border p-7 flex flex-col group hover:border-accent/30 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 duration-300"
                    style={{ background: "rgba(79,110,247,0.1)", border: "1px solid rgba(79,110,247,0.2)" }}>
                    <Icon size={18} className="text-accent" />
                  </div>
                  <span className="text-xs font-black text-muted tracking-[0.15em]">{step}</span>
                </div>
                <h3 className="text-base font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-secondary leading-relaxed mb-5 flex-1">{desc}</p>
                <span className="inline-block px-3 py-1.5 rounded-full text-[10px] font-bold text-muted"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ WHAT VANTRO AUTOMATES ══════════════════ */}
      <section className="py-20 border-b border-border" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Modules</span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary tracking-tighter mb-3">One platform. Everything connected.</h2>
            <p className="text-secondary text-base max-w-md mx-auto">Live today — every module feeds the Cortex event graph.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Collections & Dunning",   live: true },
              { label: "Invoice Generation",      live: true },
              { label: "WhatsApp Automation",     live: true },
              { label: "Payment Links (UPI/RZP)", live: true },
              { label: "Cash Flow Forecast",      live: true },
              { label: "Tally ERP Sync",          live: true },
              { label: "AI Priority Scoring",     live: true },
              { label: "Cortex Action Center",    live: true },
              { label: "Customer Intelligence",   live: true },
              { label: "Khata / Bank Ledger",     live: true },
            ].map(({ label, live }) => (
              <div key={label} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all"
                style={{ background: live ? "rgba(16,217,138,0.04)" : "rgba(255,255,255,0.02)", borderColor: live ? "rgba(16,217,138,0.18)" : "rgba(255,255,255,0.06)" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: live ? "#10D98A" : "#556070" }} />
                <span className="text-xs font-semibold" style={{ color: live ? "#E0FFF5" : "#556070" }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {["GST Filing Reminders", "Purchase Order Automation", "Expense Tracking", "Payroll Automation", "Inventory Reorders"].map(label => (
              <div key={label} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#556070" }} />
                <span className="text-xs font-medium text-muted">{label}</span>
                <span className="ml-auto text-[9px] font-bold text-muted/60 uppercase tracking-wide shrink-0">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FEATURES ════════════════════════ */}
      <section id="features" className="py-24 border-b border-border" style={{ background: "#0e0e0e" }}>
        <div ref={featRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(featVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Platform</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
              Everything Cortex<br className="hidden sm:block" /> does for you
            </h2>
            <p className="text-secondary max-w-lg mx-auto text-base leading-relaxed">
              Built ground-up for Indian MSMEs — not enterprise bloatware re-skinned.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, accent }, i) => (
              <div key={title} style={{ ...rv(featVis, i * 60), background: "#080808" }}
                className="group relative rounded-2xl border border-border p-6 hover:border-white/15 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at top left, ${accent}08 0%, transparent 60%)` }} />
                <div className="relative flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}>
                    <Icon size={17} style={{ color: accent }} />
                  </div>
                </div>
                <h3 className="relative font-bold text-primary mb-2 text-sm">{title}</h3>
                <p className="relative text-secondary text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═════════════════════════ */}
      <section id="pricing" className="py-24 border-b border-border" style={{ background: "#080808" }}>
        <div ref={planRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(planVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">Start free. Scale on results.</h2>
            <p className="text-secondary text-base max-w-md mx-auto">Three tiers. No hidden fees. No lock-in.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* Free */}
            <div style={{ ...rv(planVis, 0), background: "#0e0e0e" }}
              className="rounded-2xl border border-border p-7 flex flex-col hover:border-white/15 transition-all duration-300">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-4">Free</p>
              <div className="mb-1"><span className="text-5xl font-black text-primary tracking-tighter">₹0</span><span className="text-muted text-sm ml-2">/forever</span></div>
              <p className="text-xs text-muted mb-7">Start tracking. No credit card.</p>
              <div className="h-px bg-border mb-6" />
              <ul className="space-y-3 mb-8 flex-1">
                {PLAN_FREE.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-4 h-4 rounded-full border border-white/15 flex items-center justify-center shrink-0"><FiCheck size={9} className="text-white/50" /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=free" className="block text-center py-3 rounded-xl text-sm font-bold text-secondary border border-border hover:border-white/20 hover:text-primary transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div style={{ ...rv(planVis, 80), background: "#fff" }} className="relative rounded-2xl p-7 flex flex-col shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-black text-white shadow-lg">★ Most Popular</span>
              </div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-black/40 mb-4">Pro</p>
              <div className="mb-1"><span className="text-5xl font-black text-black tracking-tighter">₹999</span><span className="text-black/50 text-sm ml-2">/month</span></div>
              <p className="text-xs text-black/50 mb-7">Full automation + Cortex. Flat fee.</p>
              <div className="h-px bg-black/10 mb-6" />
              <ul className="space-y-3 mb-8 flex-1">
                {PLAN_PRO.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-black/70">
                    <span className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0"><FiCheck size={9} className="text-white" /></span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" className="block text-center py-3 rounded-xl text-sm font-black text-white bg-black hover:bg-black/85 transition-all">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Success */}
            <div style={{ ...rv(planVis, 160), background: "linear-gradient(145deg, #141414, #0e0e0e)", borderColor: "rgba(16,217,138,0.2)" }}
              className="rounded-2xl border p-7 flex flex-col hover:border-success/30 transition-all duration-300">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-4">Success</p>
              <div className="mb-1"><span className="text-5xl font-black text-primary tracking-tighter">₹0</span><span className="text-muted text-sm ml-2">/mo + 1.5%</span></div>
              <p className="text-xs text-muted mb-7">Pay only when Vantro collects for you.</p>
              <div className="h-px bg-border mb-6" />
              <ul className="space-y-3 mb-8 flex-1">
                {PLAN_SUCCESS.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(16,217,138,0.12)", border: "1px solid rgba(16,217,138,0.25)" }}>
                      <FiCheck size={9} style={{ color: "#10D98A" }} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=success" className="block text-center py-3 rounded-xl text-sm font-bold text-primary border border-white/15 hover:border-success/40 hover:text-success transition-all">
                Start for Free → Pay from Results
              </Link>
            </div>
          </div>

          <div style={rv(planVis, 200)} className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10 text-xs text-muted">
            <span className="flex items-center gap-1.5"><FiCheck size={11} className="text-success" /> No credit card on Free &amp; Success</span>
            <span className="flex items-center gap-1.5"><FiCheck size={11} className="text-success" /> 14-day free trial on Pro</span>
            <span className="flex items-center gap-1.5"><FiCheck size={11} className="text-success" /> Cancel anytime, no lock-in</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════════ */}
      <section id="faq" className="py-24 border-b border-border">
        <div ref={faqRef} className="max-w-3xl mx-auto px-4 sm:px-6">
          <div style={rv(faqVis)} className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary tracking-tighter mb-3">Common questions</h2>
            <p className="text-sm text-muted">Still have doubts? WhatsApp us — we reply in minutes.</p>
          </div>
          <div className="space-y-2">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} style={{ ...rv(faqVis, i * 50), background: "#0e0e0e" }}
                className="rounded-2xl border border-border overflow-hidden hover:border-white/12 transition-all">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 hover:bg-white/[0.02] transition-colors">
                  <span className="text-sm font-semibold text-primary">{q}</span>
                  <FiChevronDown size={15} className={`text-muted shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 border-t border-border">
                    <p className="text-sm text-secondary leading-relaxed pt-4">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════ FINAL CTA ═════════════════════════ */}
      <section className="py-28 relative overflow-hidden" style={{ background: "#0e0e0e" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(79,110,247,0.06) 0%, transparent 60%)" }} />
        <div ref={ctaRef} style={rv(ctaVis)} className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-8"><LogoMark size={52} /></div>
          <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
            Let Cortex run<br className="hidden sm:block" /> your business.
          </h2>
          <p className="text-base text-secondary leading-relaxed mb-3 max-w-lg mx-auto">
            Every hour you spend chasing payments or entering data is an hour not spent growing. Vantro Cortex connects the dots — you just approve.
          </p>
          <p className="text-sm text-muted mb-10">Free for 14 days. Set up in 5 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold transition-all"
              style={{ background: "#fff", color: "#000" }}>
              Put My Business On Autopilot <FiArrowRight size={17} />
            </Link>
            <a href={`https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%20want%20to%20see%20a%20Vantro%20demo`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-semibold text-secondary border border-border hover:border-white/20 hover:text-primary transition-all"
              style={{ background: "rgba(255,255,255,0.025)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp for Demo
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">Set up in 5 minutes. Our team calls within 24 hours.</p>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ══════════════════════════ */}
      <footer className="border-t border-border" style={{ background: "#080808" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid sm:grid-cols-4 gap-10 mb-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <LogoMark size={24} />
                <span className="font-bold text-sm text-primary">Vantro</span>
              </div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#10D98A", fontStyle: "italic" }}>
                "Your business, on autopilot."
              </p>
              <p className="text-xs text-muted leading-relaxed mb-1 max-w-xs">
                AI Business Operating System for Indian MSMEs, powered by Vantro Cortex X.
              </p>
              <p className="text-xs text-muted mb-4">Collections, sales, inventory, cashflow — connected and automated.</p>
              <p className="text-xs text-muted">🇮🇳 Made in India · Data stays in India</p>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Product</p>
              <div className="space-y-2.5">
                {[["#cortex","Cortex X"],["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
                  <a key={href} href={href} className="block text-xs text-muted hover:text-secondary transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Get in Touch</p>
              <div className="space-y-2.5">
                <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp us
                </a>
                <a href="mailto:hello@vantro.in" className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors">
                  <FiMail size={13} /> hello@vantro.in
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted">© 2025 Vantro Technologies Pvt. Ltd.</p>
            <div className="flex gap-5 text-xs text-muted">
              <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link>
              <a href="mailto:ishantswami13@gmail.com?subject=Vantro Security" className="hover:text-secondary transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import {
  FiArrowRight, FiCheck, FiBarChart2, FiMessageSquare,
  FiTarget, FiShield, FiTrendingUp, FiUsers,
  FiChevronRight, FiMenu, FiX, FiPhoneCall, FiUpload, FiCpu,
  FiMail, FiChevronDown, FiClock,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { enableDemoMode } from "@/lib/demo";

const FEATURES = [
  {
    icon: FiTarget,
    title: "AI Collections Engine",
    desc: "Proprietary ML model scores every debtor by payment probability, days overdue, and behavioral signals — so every call is the highest-impact call.",
    stat: "3.2x", statLabel: "collection rate lift",
  },
  {
    icon: FiBarChart2,
    title: "Real-Time Receivables Intelligence",
    desc: "Live DSO, collection rate, cash runway, and 90-day forecasts. Know your cash position to the day, not the quarter.",
    stat: "18d", statLabel: "avg DSO reduction",
  },
  {
    icon: FiMessageSquare,
    title: "Hinglish WhatsApp Automation",
    desc: "Culturally-tuned collection messages in Hinglish sent via WhatsApp Business API. 3x higher response rate than English emails.",
    stat: "73%", statLabel: "open rate",
  },
  {
    icon: FiTrendingUp,
    title: "Cash Flow Forecasting",
    desc: "Three-scenario 90-day projections. Pessimistic, expected, optimistic — so you never get surprised by a cash crunch again.",
    stat: "90d", statLabel: "forward visibility",
  },
  {
    icon: FiShield,
    title: "Tally ERP Integration",
    desc: "One-click sync with Tally ERP 9 and TallyPrime. Customers, invoices, and ledger data — imported automatically, kept in sync.",
    stat: "<2min", statLabel: "setup time",
  },
  {
    icon: FiUsers,
    title: "Team Collections CRM",
    desc: "Assign customers to collectors, log promises-to-pay, track follow-ups, and measure team performance — all in one dashboard.",
    stat: "100%", statLabel: "audit trail",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: FiUpload,
    title: "Import in 2 minutes",
    desc: "Connect Tally ERP or upload an Excel sheet. Your invoices, customers, and outstanding amounts load automatically.",
    tag: "Tally · Excel · CSV",
  },
  {
    step: "02",
    icon: FiCpu,
    title: "AI scores your debtors",
    desc: "Our model ranks who to call first, predicts who will pay this week, and drafts the perfect Hinglish message for each customer.",
    tag: "No manual work",
  },
  {
    step: "03",
    icon: FiPhoneCall,
    title: "Collections happen",
    desc: "Send WhatsApp reminders, share UPI payment links, and track every promise-to-pay. Cash hits your account. Mark it done.",
    tag: "WhatsApp · UPI · Calls",
  },
];

const FAQS = [
  {
    q: "What counts as 'collected via Vantro' in Model B?",
    a: "Any payment where the customer clicked a UPI/Razorpay link sent from Vantro, or confirmed payment after a Vantro WhatsApp reminder. Manual payments you track yourself are not counted.",
  },
  {
    q: "Does it work with Tally ERP 9 and TallyPrime?",
    a: "Yes — both versions. We sync customers, invoices, and ledger data automatically. No manual export/import needed after the first setup.",
  },
  {
    q: "Is my financial data safe?",
    a: "All data is encrypted at rest and in transit (256-bit AES + TLS 1.3). We are hosted on AWS Mumbai region — your data never leaves India.",
  },
  {
    q: "Do I need technical knowledge to set this up?",
    a: "No. If you can use WhatsApp, you can use Vantro. Setup takes 5 minutes. Our team calls you within 24 hours to help if needed.",
  },
  {
    q: "What if I already have my own collection process?",
    a: "Vantro adds on top of what you do — it doesn't replace your team. Think of it as giving your existing process AI superpowers.",
  },
];

const SOCIAL_PROOF = [
  { name: "Vikram Mehta",  title: "Owner, Mehta Fabrics · Surat",              quote: "Collected ₹22L in 6 weeks that had been stuck for 8 months. The WhatsApp messages in Hinglish made all the difference.",                                              avatar: "VM" },
  { name: "Priya Sharma",  title: "CFO, Sharma Steel Works · Ahmedabad",        quote: "Our DSO dropped from 67 days to 41 days in the first quarter. The AI priority list is genuinely better than what our team used to do manually.",                       avatar: "PS" },
  { name: "Amit Gupta",    title: "MD, Gupta Construction · Pune",              quote: "Finally something built for Indian business reality. The Tally sync works perfectly and the cash forecast saved us from a serious crunch.",                             avatar: "AG" },
];

const PLAN_FREE    = ["5 invoices/month", "Manual WhatsApp messages", "Basic collections dashboard", "CSV import"];
const PLAN_PRO     = ["Unlimited invoices", "WhatsApp auto-reminders", "Razorpay payment links", "AI priority scoring", "Cash flow forecast", "Tally ERP sync", "Auto dunning & snooze"];
const PLAN_SUCCESS = ["Everything in Pro", "No monthly fee — ever", "1.5% only on what Vantro collects", "Auto-calls (Twilio AI voice)", "Dedicated account manager", "API access + webhooks", "Priority 24/7 support"];

const WA_NUMBER = "919911164055";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-bg text-primary font-sans overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-bold tracking-tight text-primary">Vantro</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-surface-2 text-muted border border-border">
              BETA
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#features"     className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing"      className="hover:text-primary transition-colors">Pricing</a>
            <a href="#faq"          className="hover:text-primary transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-secondary hover:text-primary transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white text-black hover:bg-white/90 transition-all">
              Start Free Trial
              <FiArrowRight size={14} />
            </Link>
            <button onClick={() => setMobileMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-2 transition-colors ml-1">
              {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-bg/95 backdrop-blur-xl px-4 py-4 space-y-1">
            {[
              { href: "#how-it-works", label: "How it Works" },
              { href: "#features",     label: "Features" },
              { href: "#pricing",      label: "Pricing" },
              { href: "#faq",          label: "FAQ" },
            ].map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-surface-2 transition-colors">
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-sm font-medium text-secondary bg-surface-2">
                Sign In
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}
                className="block text-center py-2.5 rounded-xl text-sm font-bold bg-white text-black hover:bg-white/90 transition-all">
                Start Free Trial
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden border-b border-border">
        {/* Subtle grid only — no color glows */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 bg-surface-2 border border-border text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live for Indian MSMEs
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-primary mb-6 leading-[1.05] tracking-tight">
              Stop Chasing<br />
              <span className="text-white">Payments.</span>
            </h1>

            <p className="text-lg sm:text-xl text-secondary leading-relaxed mb-5 max-w-2xl font-normal">
              AI-powered Collections OS built for Indian MSMEs. Know who to call, what to say, and when to follow up — in Hinglish.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs font-semibold text-secondary">
                <FiClock size={11} className="text-muted" />
                Tally sync in under 2 minutes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs font-semibold text-secondary">
                Zero code required
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-bold bg-white text-black hover:bg-white/90 transition-all">
                Start 14-Day Free Trial
                <FiArrowRight size={17} />
              </Link>
              <button
                onClick={() => { enableDemoMode(); window.location.href = "/dashboard"; }}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-semibold text-secondary bg-surface-2 border border-border hover:border-white/20 hover:text-primary transition-all">
                👀 Try Demo — No Signup
              </button>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              {["No credit card required", "Free for 14 days", "Cancel anytime", "256-bit encrypted"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <FiCheck size={11} className="text-success" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Floating dashboard card — desktop only */}
          <div className="hidden lg:block absolute right-4 xl:right-0 top-1/2 -translate-y-1/2 w-[380px] xl:w-[420px] rounded-2xl border border-white/10 bg-surface-1 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest">Today's Priority</p>
              <span className="flex items-center gap-1.5 text-xs text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Live
              </span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Mehta Fabrics", amount: "₹8.4L", days: "62d", score: 82, risk: "text-danger" },
                { name: "Sharma Steel",  amount: "₹5.2L", days: "45d", score: 67, risk: "text-warning" },
                { name: "Patel Agro",    amount: "₹3.1L", days: "38d", score: 54, risk: "text-warning" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="w-8 h-8 rounded-md bg-surface-3 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                    <div className="h-1 rounded-full bg-surface-3 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-white/60" style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">{c.amount}</p>
                    <p className={`text-2xs ${c.risk}`}>{c.days} overdue</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-2xs text-muted">Total outstanding</span>
              <span className="text-sm font-black text-primary">₹45.2L</span>
            </div>
          </div>

          {/* Inline hero card — mobile/tablet only */}
          <div className="lg:hidden mt-10 rounded-2xl border border-white/10 bg-surface-1 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest">Today's Priority</p>
              <span className="flex items-center gap-1.5 text-xs text-success">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Live
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: "Mehta Fabrics", amount: "₹8.4L", days: "62d", score: 82 },
                { name: "Sharma Steel",  amount: "₹5.2L", days: "45d", score: 67 },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="w-8 h-8 rounded-md bg-surface-3 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary">{c.name}</p>
                    <div className="h-1 rounded-full bg-surface-3 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-white/60" style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">{c.amount}</p>
                    <p className="text-2xs text-danger">{c.days} overdue</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-2xs text-muted">Total outstanding</span>
              <span className="text-sm font-black text-primary">₹45.2L</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="border-b border-border bg-surface-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { value: "18 days", label: "Avg. DSO Reduction",  sub: "across all customers" },
              { value: "+23%",    label: "Collection Rate Lift", sub: "in first 60 days" },
              { value: "6 hrs",   label: "Saved Per Week",       sub: "per collections team" },
              { value: "₹45Cr+",  label: "Receivables Managed", sub: "and growing" },
            ].map(({ value, label, sub }) => (
              <div key={label} className="px-6 py-10 text-center">
                <p className="text-3xl sm:text-4xl font-black text-primary mb-1 tracking-tight">{value}</p>
                <p className="text-sm font-semibold text-secondary mb-0.5">{label}</p>
                <p className="text-2xs text-muted">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-bg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-2xs font-bold tracking-[0.15em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">
              How it Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary mb-4 tracking-tight">
              Up and collecting in 3 steps
            </h2>
            <p className="text-secondary max-w-xl mx-auto text-sm leading-relaxed">
              No lengthy onboarding. No IT team required. Rajesh Kumar from Karol Bagh did it in 8 minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 relative">
            {/* Connector */}
            <div className="hidden sm:block absolute top-[30px] left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-white/10" />
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, tag }, i) => (
              <div key={step} className="relative rounded-2xl border border-border bg-surface-1 p-6 flex flex-col items-start">
                {/* Step number + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <span className="text-xs font-black text-muted tracking-widest">{step}</span>
                </div>
                <h3 className="text-base font-bold text-primary mb-2">{title}</h3>
                <p className="text-sm text-secondary leading-relaxed mb-4 flex-1">{desc}</p>
                <span className="inline-block px-3 py-1 rounded-full bg-surface-2 border border-border text-2xs font-semibold text-muted">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-surface-1 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-2xs font-bold tracking-[0.15em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">
              Platform
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary mb-4 tracking-tight">
              Built for the Indian MSME reality
            </h2>
            <p className="text-secondary max-w-xl mx-auto text-sm leading-relaxed">
              Not enterprise bloatware. Not a spreadsheet. A focused, powerful OS for getting your money back.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, stat, statLabel }) => (
              <div key={title} className="rounded-2xl border border-border bg-bg p-6 group hover:border-white/20 transition-all duration-200">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center group-hover:bg-surface-3 transition-colors">
                    <Icon size={18} className="text-secondary" />
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary">{stat}</p>
                    <p className="text-xs text-muted">{statLabel}</p>
                  </div>
                </div>
                <h3 className="font-bold text-primary mb-2 text-base">{title}</h3>
                <p className="text-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────────── */}
      <section id="proof" className="py-20 bg-bg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-2xs font-bold tracking-[0.15em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">
              Customer Stories
            </span>
            <h2 className="text-3xl font-black text-primary tracking-tight mb-3">
              Rajesh got paid. So can you.
            </h2>
            <p className="text-sm text-muted">Real businesses. Real numbers. No stock photos.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {SOCIAL_PROOF.map(({ name, title, quote, avatar }) => (
              <div key={name} className="rounded-2xl border border-border bg-surface-1 p-6 flex flex-col hover:border-white/20 transition-all duration-200">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <p className="text-sm text-secondary leading-relaxed mb-5 flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-surface-3 border border-border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{name}</p>
                    <p className="text-xs text-muted">{title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted mt-8">
            Join <span className="text-primary font-semibold">200+ MSMEs</span> across India already collecting smarter
          </p>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-surface-1 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-block text-2xs font-bold tracking-[0.15em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary mb-4 tracking-tight leading-tight">
              Start free. Scale on results.<br className="hidden sm:block" />
              <span className="text-secondary font-light"> Pay only when you get paid.</span>
            </h2>
            <p className="text-secondary text-base max-w-xl mx-auto">Three tiers. Every feature included. Zero hidden fees. No lock-in.</p>
          </div>

          {/* Cards — 3 tiers */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto">

            {/* Free */}
            <div className="relative rounded-2xl border border-border bg-bg p-7 flex flex-col hover:border-white/15 transition-all duration-300">
              <div className="mb-7">
                <p className="text-2xs font-bold tracking-[0.12em] uppercase text-muted mb-3">Free</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black text-primary tracking-tight">₹0</span>
                  <span className="text-muted text-sm ml-1">/forever</span>
                </div>
                <p className="text-xs text-muted mt-2">Start tracking. No credit card.</p>
              </div>

              <div className="h-px bg-border mb-6" />

              <ul className="space-y-3 mb-7 flex-1">
                {PLAN_FREE.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-4 h-4 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                      <FiCheck size={10} className="text-white/60" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/signup?plan=free"
                className="block text-center py-3 rounded-xl text-sm font-bold text-secondary bg-surface-2 border border-border hover:border-white/20 hover:text-primary transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Pro — highlighted (white card) */}
            <div className="relative rounded-2xl bg-white p-7 flex flex-col shadow-2xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-2xs font-black tracking-widest uppercase text-white bg-black shadow-lg">
                  ★ Most Popular
                </span>
              </div>

              <div className="mb-7">
                <p className="text-2xs font-bold tracking-[0.12em] uppercase text-black/40 mb-3">Pro</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black text-black tracking-tight">₹999</span>
                  <span className="text-black/50 text-sm ml-1">/month</span>
                </div>
                <p className="text-xs text-black/50 mt-2">Full automation. Flat fee. Zero surprises.</p>
              </div>

              <div className="h-px bg-black/10 mb-6" />

              <ul className="space-y-3 mb-7 flex-1">
                {PLAN_PRO.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-black/70">
                    <span className="w-4 h-4 rounded-full bg-black flex items-center justify-center shrink-0">
                      <FiCheck size={9} className="text-white" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/signup?plan=pro"
                className="block text-center py-3 rounded-xl text-sm font-black text-white bg-black hover:bg-black/85 transition-all">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Success — dark card */}
            <div className="relative rounded-2xl border border-white/10 bg-surface-1 p-7 flex flex-col hover:border-white/20 transition-all duration-300">
              <div className="mb-7">
                <p className="text-2xs font-bold tracking-[0.12em] uppercase text-muted mb-3">Success</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-black text-primary tracking-tight">₹0</span>
                  <span className="text-muted text-sm ml-1">/mo + 1.5%</span>
                </div>
                <p className="text-xs text-muted mt-2">Pay only when Vantro collects for you.</p>
              </div>

              <div className="h-px bg-border mb-6" />

              <ul className="space-y-3 mb-7 flex-1">
                {PLAN_SUCCESS.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                      <FiCheck size={10} className="text-white/70" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/signup?plan=success"
                className="block text-center py-3 rounded-xl text-sm font-bold text-primary border border-white/20 hover:bg-white/5 hover:border-white/30 transition-all">
                Start for Free → Pay from Results
              </Link>
            </div>
          </div>

          {/* Bottom note */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10 text-xs text-muted">
            <span className="flex items-center gap-1.5"><FiCheck size={12} className="text-success" /> No credit card ever required on Free &amp; Success</span>
            <span className="flex items-center gap-1.5"><FiCheck size={12} className="text-success" /> 14-day free trial on Pro</span>
            <span className="flex items-center gap-1.5"><FiCheck size={12} className="text-success" /> Cancel anytime, no lock-in</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-bg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-2xs font-bold tracking-[0.15em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">FAQ</span>
            <h2 className="text-3xl font-black text-primary tracking-tight mb-3">Common questions</h2>
            <p className="text-sm text-muted">Still have doubts? WhatsApp us — we reply in minutes.</p>
          </div>
          <div className="space-y-2">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-1 overflow-hidden hover:border-white/15 transition-all">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-surface-2/50 transition-colors">
                  <span className="text-sm font-semibold text-primary">{q}</span>
                  <FiChevronDown size={15} className={`text-muted shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 border-t border-border">
                    <p className="text-sm text-secondary leading-relaxed pt-3">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-24 bg-surface-1 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-8">
            <LogoMark size={56} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-primary mb-4 tracking-tight">
            Your cash is waiting.
          </h2>
          <p className="text-secondary text-base mb-3 leading-relaxed max-w-lg mx-auto">
            Every day you wait, your receivables age. Start collecting smarter — 14 days free, zero setup risk.
          </p>
          <p className="text-sm text-muted mb-10">
            Join <span className="text-primary font-semibold">200+ MSMEs</span> across India who collect smarter with Vantro
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold bg-white text-black hover:bg-white/90 transition-all">
              Get Started Free
              <FiArrowRight size={18} />
            </Link>
            <a href={`https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%20want%20to%20see%20a%20demo%20of%20Vantro`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-semibold text-secondary bg-surface-2 border border-border hover:border-white/20 hover:text-primary transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              See a Demo
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">Setup takes 5 minutes. Tally sync is automatic. Our team calls you within 24 hours.</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-border bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <LogoMark size={24} />
                <span className="font-bold text-sm text-primary">Vantro</span>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-3">
                India ka Business OS. AI-powered collections, cash flow, and operations — built for real Indian MSMEs.
              </p>
              <p className="text-xs text-muted">🇮🇳 Made with ❤️ in India</p>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Product</p>
              <div className="space-y-2">
                {["Features", "Pricing", "How it Works", "FAQ"].map(l => (
                  <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="block text-xs text-muted hover:text-secondary transition-colors">{l}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Get in Touch</p>
              <div className="space-y-2">
                <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp us
                </a>
                <a href="mailto:hello@vantro.in"
                  className="flex items-center gap-2 text-xs text-muted hover:text-secondary transition-colors">
                  <FiMail size={13} />
                  hello@vantro.in
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted">© 2025 Vantro Technologies Pvt. Ltd. · All rights reserved</p>
            <div className="flex gap-5 text-xs text-muted">
              {["Privacy Policy", "Terms of Service", "Security"].map((l) => (
                <a key={l} href="#" className="hover:text-secondary transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

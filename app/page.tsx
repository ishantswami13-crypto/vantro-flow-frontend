"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  FiArrowRight, FiCheck, FiBarChart2, FiMessageSquare,
  FiTarget, FiShield, FiTrendingUp, FiUsers,
  FiMenu, FiX, FiPhoneCall, FiUpload, FiCpu,
  FiChevronDown, FiMail, FiZap,
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

// ── Static data ────────────────────────────────────────────────
const FEATURES = [
  { icon: FiTarget,        title: "Collections Autopilot",        desc: "AI scores every debtor by payment probability and sends the right reminder at the right time — automatically. Zero manual chasing.",  stat: "3.2×", statLabel: "collection lift", accent: "#4F6EF7" },
  { icon: FiBarChart2,     title: "Real-Time Business Dashboard", desc: "Live DSO, cash runway, and risk alerts every morning. Know your exact cash position without opening a spreadsheet.",                  stat: "18d",  statLabel: "avg DSO drop",   accent: "#10D98A" },
  { icon: FiMessageSquare, title: "WhatsApp Business Automation", desc: "AI-crafted Hinglish messages sent at the optimal time. Customers respond because it feels personal, not corporate.",                   stat: "73%",  statLabel: "open rate",      accent: "#FF6B35" },
  { icon: FiTrendingUp,    title: "Cash Flow Autopilot",          desc: "90-day forecasts with three scenarios. Automated runway alerts before you hit a crunch — not after.",                                  stat: "90d",  statLabel: "visibility",     accent: "#9B6DFF" },
  { icon: FiShield,        title: "Zero-Touch Data Sync",         desc: "Tally ERP, Excel, CSV — data flows into Vantro automatically. Set it up once. Never do manual data entry again.",                     stat: "<2m",  statLabel: "to sync Tally",  accent: "#F5A524" },
  { icon: FiUsers,         title: "Team Workflow Automation",     desc: "Assign, follow up, log promises, track performance — all running in the background. Your team stays focused on closing.",              stat: "100%", statLabel: "audit trail",    accent: "#10D98A" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: FiUpload,    title: "Connect once",            desc: "Link Tally or upload Excel. Invoices, customers, and ledger load automatically — zero manual entry. Done in under 5 minutes.",  tag: "Tally · Excel · CSV" },
  { step: "02", icon: FiCpu,       title: "AI takes over",           desc: "Every morning, Vantro scores your debtors, drafts Hinglish messages, schedules reminders, and queues payment links.",           tag: "Runs every day · No manual work" },
  { step: "03", icon: FiPhoneCall, title: "Business runs itself",    desc: "Reminders go out. Customers pay. Cash hits your account. You check one dashboard — and get back to growing.",                  tag: "WhatsApp · UPI · Razorpay" },
];

const SOCIAL_PROOF = [
  { name: "Vikram Mehta", co: "Mehta Fabrics · Surat",     avatar: "VM", result: "₹22L in 6 weeks",   quote: "WhatsApp messages in Hinglish made all the difference. Customers responded — even ones silent for 8 months." },
  { name: "Priya Sharma", co: "Sharma Steel · Ahmedabad",  avatar: "PS", result: "DSO: 67d → 41d",     quote: "The AI priority list is genuinely better than what our team did manually. First week, we recovered ₹8L." },
  { name: "Amit Gupta",   co: "Gupta Construction · Pune", avatar: "AG", result: "Cash crunch avoided", quote: "The 90-day forecast saved us. We knew exactly when to tighten collections — before the crunch hit." },
];

const INTEGRATIONS = ["Tally ERP", "WhatsApp Business", "Razorpay", "UPI / BHIM", "GST Portal", "Excel / CSV", "Interakt", "Twilio"];

const PLAN_FREE    = ["5 invoices/month", "Manual WhatsApp messages", "Basic dashboard", "CSV import"];
const PLAN_PRO     = ["Unlimited invoices", "WhatsApp auto-reminders", "Razorpay payment links", "AI priority scoring", "Cash flow forecast", "Tally ERP sync", "Auto dunning"];
const PLAN_SUCCESS = ["Everything in Pro", "No monthly fee — ever", "1.5% only on what Vantro collects", "AI voice calls", "Dedicated account manager", "API access + webhooks", "24/7 priority support"];

const FAQS = [
  { q: "Do I need to add my own API keys?",         a: "No. Vantro manages everything — WhatsApp via our own account, payment links via our Razorpay. Zero technical setup from your end." },
  { q: "What counts as 'collected via Vantro'?",     a: "Any payment where the customer clicked a UPI/Razorpay link from Vantro, or paid after a Vantro WhatsApp reminder." },
  { q: "Does it work with Tally ERP 9 & TallyPrime?", a: "Yes — both versions. We sync customers, invoices, and ledger data automatically. No manual export after the first setup." },
  { q: "Is my financial data safe?",                a: "All data encrypted at rest and in transit (AES-256 + TLS 1.3). Hosted on AWS Mumbai — your data never leaves India." },
  { q: "Do I need technical knowledge?",            a: "No. If you can use WhatsApp, you can use Vantro. Setup takes 5 minutes. Our team calls within 24 hours to help." },
];

const WA_NUMBER = "919911164055";

const DEBTOR_PREVIEW = [
  { name: "Mehta Fabrics",  amt: "₹8.4L", days: "62d overdue", score: 92, color: "#F5424D" },
  { name: "Sharma Steel",   amt: "₹5.2L", days: "45d overdue", score: 74, color: "#F5A524" },
  { name: "Patel Agro",     amt: "₹3.1L", days: "38d overdue", score: 61, color: "#F5A524" },
  { name: "Kumar Textiles", amt: "₹1.8L", days: "14d overdue", score: 39, color: "#10D98A" },
];

// ── Component ──────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [marqRef, marqVis] = useReveal(0.05);
  const [statRef, statVis] = useReveal(0.1);
  const [stepRef, stepVis] = useReveal();
  const [featRef, featVis] = useReveal();
  const [testRef, testVis] = useReveal();
  const [planRef, planVis] = useReveal(0.05);
  const [faqRef,  faqVis]  = useReveal();
  const [ctaRef,  ctaVis]  = useReveal(0.15);

  return (
    <div className="min-h-screen bg-bg text-primary overflow-x-hidden">

      {/* ═══════════════════════ NAV ═══════════════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-50"
        style={{ background: "rgba(13,15,20,0.82)", backdropFilter: "blur(24px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">

          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-bold text-[15px] tracking-tight text-primary">Vantro</span>
            <span className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted tracking-widest">BETA</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm text-secondary">
            {[["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="hover:text-primary transition-colors duration-150">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-secondary hover:text-primary transition-colors">Log in</Link>
            <Link href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: "#fff", color: "#000", boxShadow: "0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset" }}>
              Start Free Trial <FiArrowRight size={13} />
            </Link>
            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-1.5 rounded-lg text-secondary hover:text-primary transition-colors">
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-4 space-y-1" style={{ background: "rgba(13,15,20,0.98)" }}>
            {[["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
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
      <section className="relative min-h-screen flex items-center overflow-hidden" style={{ paddingTop: "60px" }}>
        {/* Grid bg */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.013) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.013) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(79,110,247,0.09) 0%, transparent 65%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-16 lg:py-24">
          <div className="grid lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-12 xl:gap-20 items-center">

            {/* Left — text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
                style={{ background: "rgba(16,217,138,0.08)", border: "1px solid rgba(16,217,138,0.22)", color: "#10D98A" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Business Automation OS · India
              </div>

              <h1 className="font-black text-primary tracking-tighter leading-[1.02] mb-6"
                style={{ fontSize: "clamp(2.75rem, 7vw, 5rem)" }}>
                Your Business,<br />
                <span style={{
                  background: "linear-gradient(125deg, #E8F0FF 0%, #B0CAFF 45%, #7096FF 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                  On Autopilot.
                </span>
              </h1>

              <p className="text-lg text-secondary leading-relaxed mb-4 max-w-[500px]" style={{ fontWeight: 400 }}>
                Vantro automates your collections, invoicing, WhatsApp follow-ups, and cash flow — so you spend your time growing your business, not managing it.
              </p>
              <p className="text-sm text-muted mb-10 max-w-[480px]" style={{ fontStyle: "italic" }}>
                "Karo business. Baaki Vantro karega."
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-bold transition-all"
                  style={{ background: "#fff", color: "#000", boxShadow: "0 2px 20px rgba(255,255,255,0.12), 0 1px 4px rgba(0,0,0,0.5)" }}>
                  Start Automating Free <FiArrowRight size={15} />
                </Link>
                <button
                  onClick={() => { enableDemoMode(); window.location.href = "/dashboard"; }}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-secondary border border-border hover:border-white/20 hover:text-primary transition-all"
                  style={{ background: "rgba(255,255,255,0.025)" }}>
                  👀 Try Demo — No Signup
                </button>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                {["No credit card required", "14 days free", "Set up once, runs forever", "Cancel anytime"].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-muted">
                    <FiCheck size={11} className="text-success shrink-0" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — product preview card */}
            <div className="hidden lg:block animate-float-slow">
              <div className="rounded-2xl p-5"
                style={{ background: "linear-gradient(145deg, #1A1F2E 0%, #161A24 100%)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset" }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.12em]">Today's Priority List</p>
                    <p className="text-xs text-secondary mt-0.5">3 accounts need action</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{ background: "rgba(16,217,138,0.1)", color: "#10D98A", border: "1px solid rgba(16,217,138,0.2)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" /> Live
                  </span>
                </div>

                {/* Debtor rows */}
                <div className="space-y-2 mb-4">
                  {DEBTOR_PREVIEW.map((c) => (
                    <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: "#0D0F14", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${c.color}12`, border: `1px solid ${c.color}22`, color: c.color }}>
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-primary truncate">{c.name}</p>
                        <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.color, opacity: 0.8 }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold text-primary">{c.amt}</p>
                        <p className="text-[10px]" style={{ color: c.color }}>{c.days}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                  {[{ v: "₹18.5L", l: "Outstanding" }, { v: "4", l: "Overdue" }, { v: "73%", l: "WA open" }].map(({ v, l }) => (
                    <div key={l} className="text-center py-2 px-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-xs font-black text-primary">{v}</p>
                      <p className="text-[10px] text-muted mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <button className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold text-black transition-all"
                  style={{ background: "linear-gradient(135deg, #fff 0%, #e8f0ff 100%)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                  Send Reminders to All →
                </button>
              </div>
            </div>
          </div>

          {/* Mobile product card */}
          <div className="lg:hidden mt-8 rounded-2xl p-4"
            style={{ background: "linear-gradient(145deg, #1A1F2E, #161A24)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-secondary">Today's Priority</p>
              <span className="text-[10px] text-success flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" /> Live</span>
            </div>
            <div className="space-y-2">
              {DEBTOR_PREVIEW.slice(0, 2).map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                  style={{ background: "#0D0F14", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs font-semibold text-primary">{c.name}</p>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs font-bold text-primary">{c.amt}</span>
                    <span className="text-[10px]" style={{ color: c.color }}>{c.days}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between">
              <span className="text-[10px] text-muted">Total outstanding</span>
              <span className="text-xs font-black text-primary">₹45.2L</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ INTEGRATION MARQUEE ════════════════════ */}
      <div ref={marqRef} style={rv(marqVis)} className="border-y border-border py-6 overflow-hidden">
        <p className="text-center text-[10px] text-muted uppercase tracking-[0.18em] font-bold mb-4">Works with your existing tools</p>
        <div className="overflow-hidden">
          <div className="animate-marquee">
            {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <div key={i} className="mx-4 px-4 py-2 rounded-xl border text-sm font-semibold text-secondary shrink-0 whitespace-nowrap"
                style={{ background: "#1A1F2E", borderColor: "rgba(255,255,255,0.07)" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════ STATS BAR ═══════════════════════ */}
      <section ref={statRef} className="border-b border-border" style={{ background: "#161A24" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { value: "₹45Cr+",  label: "Receivables managed",   sub: "and growing" },
              { value: "18 days", label: "Avg DSO reduction",      sub: "across all customers" },
              { value: "+23%",    label: "Collection rate lift",    sub: "in first 60 days" },
              { value: "6 hrs",   label: "Saved per week",         sub: "per collections team" },
            ].map(({ value, label, sub }, i) => (
              <div key={label} style={rv(statVis, i * 80)} className="px-6 py-10 text-center">
                <p className="font-black text-primary tracking-tighter mb-1"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontFamily: "'IBM Plex Mono', monospace" }}>
                  {value}
                </p>
                <p className="text-sm font-semibold text-secondary mb-0.5">{label}</p>
                <p className="text-xs text-muted">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ════════════════════════ */}
      <section id="how-it-works" className="py-24 border-b border-border">
        <div ref={stepRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(stepVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">How it Works</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">Set up in minutes.<br className="hidden sm:block" /> Runs forever.</h2>
            <p className="text-secondary max-w-md mx-auto text-base leading-relaxed">No IT team. No lengthy onboarding. Rajesh Kumar from Karol Bagh was fully automated in 8 minutes.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 relative">
            <div className="hidden sm:block absolute top-[38px] left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)" }} />

            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, tag }, i) => (
              <div key={step} style={{ ...rv(stepVis, i * 100), background: "linear-gradient(145deg, #1A1F2E, #161A24)" }}
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
      <section className="py-20 border-b border-border" style={{ background: "#0D0F14" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Automation Modules</span>
            <h2 className="text-3xl sm:text-4xl font-black text-primary tracking-tighter mb-3">
              One platform. Everything automated.
            </h2>
            <p className="text-secondary text-base max-w-md mx-auto">
              Live today — with more modules shipping every month.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Collections & Dunning",    live: true  },
              { label: "Invoice Generation",       live: true  },
              { label: "WhatsApp Campaigns",       live: true  },
              { label: "Payment Links (UPI/RZP)",  live: true  },
              { label: "Cash Flow Forecasting",    live: true  },
              { label: "Tally ERP Sync",           live: true  },
              { label: "AI Priority Scoring",      live: true  },
              { label: "Auto Dunning Rules",       live: true  },
              { label: "Team Follow-up CRM",       live: true  },
              { label: "Khata / Bank Ledger",      live: true  },
            ].map(({ label, live }) => (
              <div key={label}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border transition-all"
                style={{
                  background: live ? "rgba(16,217,138,0.04)" : "rgba(255,255,255,0.02)",
                  borderColor: live ? "rgba(16,217,138,0.18)" : "rgba(255,255,255,0.06)",
                }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: live ? "#10D98A" : "#556070" }} />
                <span className="text-xs font-semibold" style={{ color: live ? "#E0FFF5" : "#556070" }}>{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "GST Filing Reminders",     live: false },
              { label: "Purchase Order Automation",live: false },
              { label: "Expense Tracking",         live: false },
              { label: "Payroll Automation",       live: false },
              { label: "Inventory Reorders",       live: false },
            ].map(({ label }) => (
              <div key={label}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border"
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
      <section id="features" className="py-24 border-b border-border" style={{ background: "#161A24" }}>
        <div ref={featRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(featVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Platform</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
              Everything Vantro<br className="hidden sm:block" /> automates for you
            </h2>
            <p className="text-secondary max-w-lg mx-auto text-base leading-relaxed">
              Not enterprise bloatware re-skinned for India. Built ground-up for the way Rajesh Kumar actually runs his business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, stat, statLabel, accent }, i) => (
              <div key={title} style={{ ...rv(featVis, i * 60), background: "#0D0F14" }}
                className="group relative rounded-2xl border border-border p-6 hover:border-white/15 transition-all duration-300 overflow-hidden cursor-default">
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at top left, ${accent}08 0%, transparent 60%)` }} />

                <div className="relative flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${accent}12`, border: `1px solid ${accent}22` }}>
                    <Icon size={17} style={{ color: accent }} />
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary tracking-tight">{stat}</p>
                    <p className="text-[10px] text-muted">{statLabel}</p>
                  </div>
                </div>
                <h3 className="relative font-bold text-primary mb-2 text-sm">{title}</h3>
                <p className="relative text-secondary text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ SOCIAL PROOF ═══════════════════════ */}
      <section id="proof" className="py-24 border-b border-border">
        <div ref={testRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(testVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Customer Stories</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-3">Rajesh got his time back.<br className="hidden sm:block" /> And ₹22 lakhs.</h2>
            <p className="text-sm text-muted">Real businesses. Real numbers. No stock photos.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {SOCIAL_PROOF.map(({ name, co, quote, avatar, result }, i) => (
              <div key={name} style={{ ...rv(testVis, i * 100), background: "linear-gradient(145deg, #1A1F2E, #161A24)" }}
                className="rounded-2xl border border-border p-7 flex flex-col hover:border-white/15 transition-all duration-300">
                {/* Result badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold mb-5 self-start"
                  style={{ background: "rgba(16,217,138,0.1)", border: "1px solid rgba(16,217,138,0.22)", color: "#10D98A" }}>
                  <FiZap size={9} /> {result}
                </div>
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, k) => (
                    <svg key={k} width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ))}
                </div>
                <p className="text-sm text-secondary leading-relaxed mb-6 flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-5 border-t border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0"
                    style={{ background: "rgba(79,110,247,0.15)", border: "1px solid rgba(79,110,247,0.25)" }}>
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{name}</p>
                    <p className="text-xs text-muted">{co}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p style={rv(testVis, 300)} className="text-center text-xs text-muted mt-10">
            Join <span className="text-primary font-semibold">200+ MSMEs</span> across India collecting smarter with Vantro
          </p>
        </div>
      </section>

      {/* ═══════════════════ PRICING ═════════════════════════ */}
      <section id="pricing" className="py-24 border-b border-border" style={{ background: "#161A24" }}>
        <div ref={planRef} className="max-w-7xl mx-auto px-4 sm:px-6">
          <div style={rv(planVis)} className="text-center mb-16">
            <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-muted border border-border rounded-full px-4 py-1.5 mb-5">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
              Start free. Scale on results.
            </h2>
            <p className="text-secondary text-base max-w-md mx-auto">Three tiers. No hidden fees. No lock-in. Pay only when you get paid.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">

            {/* Free */}
            <div style={{ ...rv(planVis, 0), background: "#0D0F14" }}
              className="rounded-2xl border border-border p-7 flex flex-col hover:border-white/15 transition-all duration-300">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-4">Free</p>
              <div className="mb-1">
                <span className="text-5xl font-black text-primary tracking-tighter">₹0</span>
                <span className="text-muted text-sm ml-2">/forever</span>
              </div>
              <p className="text-xs text-muted mb-7">Start tracking. No credit card.</p>
              <div className="h-px bg-border mb-6" />
              <ul className="space-y-3 mb-8 flex-1">
                {PLAN_FREE.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-4 h-4 rounded-full border border-white/15 flex items-center justify-center shrink-0">
                      <FiCheck size={9} className="text-white/50" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=free"
                className="block text-center py-3 rounded-xl text-sm font-bold text-secondary border border-border hover:border-white/20 hover:text-primary transition-all">
                Get Started Free
              </Link>
            </div>

            {/* Pro — white card */}
            <div style={{ ...rv(planVis, 80), background: "#fff" }} className="relative rounded-2xl p-7 flex flex-col shadow-2xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-black text-white shadow-lg">
                  ★ Most Popular
                </span>
              </div>
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-black/40 mb-4">Pro</p>
              <div className="mb-1">
                <span className="text-5xl font-black text-black tracking-tighter">₹999</span>
                <span className="text-black/50 text-sm ml-2">/month</span>
              </div>
              <p className="text-xs text-black/50 mb-7">Full automation. Flat fee. Zero surprises.</p>
              <div className="h-px bg-black/10 mb-6" />
              <ul className="space-y-3 mb-8 flex-1">
                {PLAN_PRO.map(f => (
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

            {/* Success */}
            <div style={{ ...rv(planVis, 160), background: "linear-gradient(145deg, #1A1F2E, #161A24)", borderColor: "rgba(16,217,138,0.2)" }}
              className="rounded-2xl border p-7 flex flex-col hover:border-success/30 transition-all duration-300">
              <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted mb-4">Success</p>
              <div className="mb-1">
                <span className="text-5xl font-black text-primary tracking-tighter">₹0</span>
                <span className="text-muted text-sm ml-2">/mo + 1.5%</span>
              </div>
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
              <Link href="/signup?plan=success"
                className="block text-center py-3 rounded-xl text-sm font-bold text-primary border border-white/15 hover:border-success/40 hover:text-success transition-all">
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
              <div key={i} style={{ ...rv(faqVis, i * 50), background: "#161A24" }}
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
      <section className="py-28 relative overflow-hidden" style={{ background: "#161A24" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(79,110,247,0.06) 0%, transparent 60%)" }} />

        <div ref={ctaRef} style={rv(ctaVis)} className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex justify-center mb-8">
            <LogoMark size={52} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tighter mb-4">
            Start automating<br className="hidden sm:block" /> your business today.
          </h2>
          <p className="text-base text-secondary leading-relaxed mb-3 max-w-lg mx-auto">
            Every hour you spend chasing payments or entering data is an hour not spent growing. Let Vantro handle it — free for 14 days.
          </p>
          <p className="text-sm text-muted mb-10">
            Join <span className="text-primary font-semibold">200+ MSMEs</span> across India already on autopilot
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold transition-all"
              style={{ background: "#fff", color: "#000", boxShadow: "0 2px 20px rgba(255,255,255,0.1)" }}>
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
          <p className="mt-6 text-xs text-muted">Set up in 5 minutes. Runs automatically. Our team calls within 24 hours.</p>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ══════════════════════════ */}
      <footer className="border-t border-border" style={{ background: "#0D0F14" }}>
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
              <p className="text-xs text-muted leading-relaxed mb-4 max-w-xs">
                Business Automation OS for Indian MSMEs. Collections, invoicing, WhatsApp, payments — automated so you can focus on growing.
              </p>
              <p className="text-xs text-muted">🇮🇳 Made in India · Data stays in India</p>
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Product</p>
              <div className="space-y-2.5">
                {[["#features","Features"],["#how-it-works","How it Works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
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
              {["Privacy Policy", "Terms of Service", "Security"].map(l => (
                <a key={l} href="#" className="hover:text-secondary transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

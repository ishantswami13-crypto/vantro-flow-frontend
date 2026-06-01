"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { FiArrowRight, FiChevronDown } from "react-icons/fi";
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

// ── Atlas mark ─────────────────────────────────────────────────
function AtlasMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className={`atlas-mark-anim${className ? " " + className : ""}`}
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z" />
    </svg>
  );
}

// ── Data ────────────────────────────────────────────────────────
const INTEGRATIONS = ["QuickBooks", "Stripe", "Xero", "WhatsApp Business", "Tally ERP", "Zoho Books", "Razorpay", "Salesforce", "HubSpot", "Excel / CSV", "PayPal", "NetSuite", "FreshBooks", "Square"];

const FEATURES = [
  { idx: "01", metric: "3.2× collection lift",   title: "Collections Autopilot",   desc: "AI scores every debtor by pay probability, sends the right reminder at the right time — in their language, personally. Zero manual chasing. Every day, automatically." },
  { idx: "02", metric: "Daily · every morning",   title: "AI Owner Briefing",       desc: "Who to call, what's risky, what cash is incoming, what to approve today. One screen. The complete picture in under 60 seconds." },
  { idx: "03", metric: "90-day visibility",        title: "Cash Flow Forecast",      desc: "Three-scenario forecast updated daily. Automated runway alerts. Know what's coming before it arrives — not after the crisis starts." },
  { idx: "04", metric: "73% open rate",            title: "Smart Messaging",         desc: "AI-crafted reminders delivered via the channel your customer prefers — email, WhatsApp, SMS. Feels personal. Works globally. Sent at the optimal moment." },
  { idx: "05", metric: "Real-time risk radar",     title: "Risk Signals",            desc: "Credit flags, broken-promise tracking, payment behaviour scoring. Atlas alerts you before a slow payer becomes a bad debt written off." },
  { idx: "06", metric: "Live stock intelligence",  title: "Inventory Intelligence",  desc: "Moving stock vs trapped capital — updated daily. See exactly what's tying up your working capital and what needs reordering before you run out." },
];

const PIPELINE = [
  { n: "01", phase: "INPUT",  name: "Business Event",    desc: "sale · overdue · promise missed · payment received · silent customer detected" },
  { n: "02", phase: "INPUT",  name: "Event Normalizer",  desc: "Converts raw event into a structured, typed signal ready for pipeline processing" },
  { n: "03", phase: "INTEL",  name: "Context Builder",   desc: "Fetches full user-scoped context from Postgres — customers, invoices, history, promises" },
  { n: "04", phase: "INTEL",  name: "Agent Router",      desc: "Cortex Orchestrator selects the correct specialized agent for this event type" },
  { n: "05", phase: "INTEL",  name: "Rust Engine",       desc: "Deterministic score, policy evaluation, timing calculation, risk — zero ambiguity, zero hallucination" },
  { n: "06", phase: "INTEL",  name: "LLM Gate",          desc: "Reasoning and language generation, only when this event requires it. Never by default." },
  { n: "07", phase: "SAFETY", name: "Policy Guard",      desc: "Blocks unsafe actions, legal threats, cross-tenant leakage. Every proposed output reviewed." },
  { n: "08", phase: "SAFETY", name: "Owner Approval",    desc: "Risky or high-value actions pause here. Human sign-off required before any execution." },
  { n: "09", phase: "OUTPUT", name: "Execution",         desc: "Creates the task, sends the reminder, generates the action card. Real-world effect fires." },
  { n: "10", phase: "OUTPUT", name: "Audit Log",         desc: "Full decision trail — agent, inputs, output, policy hash, timestamp. Immutable." },
  { n: "11", phase: "OUTPUT", name: "Outcome Tracking",  desc: "Reply? Payment? Promise kept? Every result feeds the Learning agent to improve future actions." },
];

const TESTI_ROW1 = [
  { av: "MJ", name: "Marcus Johnson",   co: "Precision Logistics · Chicago, USA · $2.1M managed",        quote: "Before Atlas, we had two full-time credit controllers. Now one person handles twice the volume — and DSO dropped 34 days." },
  { av: "SM", name: "Sophie Müller",    co: "Bautech Consulting · Berlin, Germany · 45 invoices/mo",      quote: "DSO dropped from 52 to 29 days in six weeks. I stopped sending payment reminders entirely. Atlas does it better than I ever did." },
  { av: "JO", name: "James Okafor",     co: "BuildRight Materials · Lagos, Nigeria · $180K outstanding",  quote: "Three collectors plus Atlas. The AI does more than all three combined, every single day." },
  { av: "TR", name: "Tariq Al-Rashid",  co: "Gulf Fresh Foods · Dubai, UAE · $320K managed",              quote: "The 90-day cash forecast is the first thing I open every morning. In four months, it hasn't been wrong once." },
  { av: "PN", name: "Priya Nair",       co: "Indigo Textiles · Chennai, India · 200+ employees",          quote: "We export to 14 countries. Atlas handles every follow-up in the customer's time zone. Seamlessly, every single day." },
  { av: "RO", name: "Ryan O'Brien",     co: "O'Brien Plumbing · Dublin, Ireland · €95K recovered",        quote: "First automated message went out at 7am. By 9am we had three payments clear. I was still in bed." },
  { av: "CM", name: "Carlos Mendez",    co: "Acero del Norte · Mexico City, Mexico · $450K/mo",           quote: "My CFO wanted to hire two more people for collections. I showed him Atlas. We didn't hire anyone." },
];
const TESTI_ROW2 = [
  { av: "ST", name: "Sakura Tanaka",    co: "Tanaka Fashion Trade · Tokyo, Japan · $220K managed",        quote: "Japanese clients expect perfect communication. Atlas gets the tone, timing, and formality right every single time." },
  { av: "IP", name: "Igor Petrov",      co: "Techprom Industrial · Warsaw, Poland · 80 employees",        quote: "We had €340K stuck in overdue accounts for months. Six weeks with Atlas: €290K cleared." },
  { av: "MS", name: "Maria Santos",     co: "Floresta E-commerce · São Paulo, Brazil · R$180K/mo",        quote: "Three employees, 400 invoices a month. Atlas handles every follow-up while I sleep." },
  { av: "DC", name: "David Choi",       co: "KoreaNet IT Services · Seoul, South Korea · 38 enterprise clients", quote: "Our biggest client paid 90 days late, every quarter, for two years. Atlas sent the right message. They now pay at 30." },
  { av: "AM", name: "Aisha Mohammed",   co: "MedSupply Ghana · Accra, Ghana · 89 overdue invoices",      quote: "89 invoices were 60+ days overdue. Atlas prioritized them in one ranked list. 71 cleared within 30 days." },
  { av: "LF", name: "Luisa Ferreira",   co: "Ferreira Food Industries · Lisbon, Portugal · €280K/mo",    quote: "I thought AI would send robotic messages. My customers actually complimented how personal the reminders felt." },
];

const PLAN_FREE    = ["5 invoices per month", "Manual WhatsApp messages", "Basic receivables dashboard", "CSV import"];
const PLAN_PRO     = ["Unlimited invoices", "WhatsApp auto-reminders", "Razorpay & UPI payment links", "AI priority scoring", "90-day cash flow forecast", "Tally ERP sync", "Inventory intelligence", "AI Owner Briefing daily"];
const PLAN_SUCCESS = ["Everything in Pro", "No monthly fee — ever", "1.5% on Atlas-collected invoices only", "AI voice follow-up calls", "Dedicated account manager", "API access & 24/7 support"];

const FAQS = [
  { q: 'What does "200 agents" mean in practice?', a: 'Each agent owns a single, narrow business task — one scores payment probability, one tracks promises, one guards policy, one routes cost. 200 agents run in parallel, each triggered by the exact business event they are designed for. The result: deterministic decisions at scale with a complete audit trail.' },
  { q: 'Which accounting tools does Atlas connect to?', a: 'Atlas connects to QuickBooks, Xero, Zoho Books, Tally ERP, FreshBooks, NetSuite, and any system that exports CSV or has an API. Setup takes under 5 minutes. After that, invoices, customers and payments sync automatically.' },
  { q: 'Can I review messages before they go out?', a: '"Approve before send" mode puts every message in a queue for your review. Read it, edit if needed, then send — or skip it. Most founders switch to fully automatic after seeing the first week of messages.' },
  { q: 'Will automated reminders damage my customer relationships?', a: 'Atlas learns your customer patterns. A first-time buyer gets a very different message than a chronic late-payer. Polite, personal, contextual — in the language and channel that fits your business.' },
  { q: "I've tried tools before and stopped. Why is Vantro different?", a: "Most tools show data but don't do work. Atlas sends the messages, logs responses, follows up and keeps the cycle running even when you ignore it for a week. It's designed to need less from you — not more." },
  { q: 'Is my financial data safe? Where is it stored?', a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256), stored in India. We keep a full audit trail of every action and never share or sell your data. Role-based access means your accountant sees only what they need to.' },
];

const WA_NUMBER = "919911164055";

// ── Component ──────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    fn(); window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const [heroRef,  heroVis]  = useReveal(0.04);
  const [tractRef, tractVis] = useReveal(0.05);
  const [probRef,  probVis]  = useReveal(0.08);
  const [cortRef,  cortVis]  = useReveal(0.06);
  const [featRef,  featVis]  = useReveal(0.05);
  const [pipeRef,  pipeVis]  = useReveal(0.04);
  const [testiRef, testiVis] = useReveal(0.05);
  const [planRef,  planVis]  = useReveal(0.05);
  const [faqRef,   faqVis]   = useReveal(0.06);
  const [ctaRef,   ctaVis]   = useReveal(0.12);

  const phaseColors: Record<string, string> = { INPUT: "#4F6EF7", INTEL: "#F5A524", SAFETY: "#F5424D", OUTPUT: "#10D98A" };

  return (
    <div style={{ background: "#020202", color: "#fff", fontFamily: "'Space Grotesk', system-ui", overflowX: "hidden", minHeight: "100vh" }}>

      {/* ── GRAIN ──────────────────────────────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`, opacity: 0.5 }} />

      {/* ── NAV ────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, transition: "all .3s", background: scrolled ? "rgba(2,2,2,0.9)" : "transparent", backdropFilter: scrolled ? "blur(24px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,.06)" : "none" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: "11px", textDecoration: "none", color: "#fff" }}>
            <AtlasMark size={28} />
            <span style={{ fontWeight: 700, fontSize: "14.5px", letterSpacing: ".2em", textTransform: "uppercase" as const }}>ATLAS</span>
          </a>
          {/* Desktop links */}
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            {["#features", "#pipeline", "#pricing", "#faq"].map((href, i) => (
              <a key={href} href={href} style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", textDecoration: "none", transition: "color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
                {["Features", "Pipeline", "Pricing", "FAQ"][i]}
              </a>
            ))}
          </div>
          {/* CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/login" style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", textDecoration: "none" }}>Log in</Link>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fff", color: "#000", fontWeight: 700, fontSize: "14px", padding: "10px 22px", borderRadius: "6px", textDecoration: "none", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Start free <FiArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section id="top" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "140px 32px 80px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(79,110,247,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div ref={heroRef} style={{ maxWidth: "900px", margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ ...rv(heroVis), display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "999px", padding: "6px 14px", fontSize: "11.5px", color: "rgba(255,255,255,.52)", marginBottom: "36px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10D98A", animation: "pulse 2s ease-in-out infinite", flexShrink: 0 }} />
            200 AI Agents · Every Business. Every Scale. Everywhere.
          </div>

          <h1 style={{ ...rv(heroVis, 50), fontWeight: 600, fontSize: "clamp(3rem,8vw,6.5rem)", letterSpacing: "-.045em", lineHeight: 1.02, marginBottom: "28px" }}>
            <em style={{ fontStyle: "italic", color: "rgba(255,255,255,.9)" }}>AI runs the ops.</em><br />
            You run the business.
          </h1>

          <p style={{ ...rv(heroVis, 100), fontSize: "clamp(1rem,2vw,1.15rem)", color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: "600px", marginBottom: "40px" }}>
            Atlas deploys 200 specialized AI agents across your entire business — collections, cashflow, credit risk, inventory, payables. Every decision logged. Every action explainable. Nothing assumed.
          </p>

          <div style={{ ...rv(heroVis, 150), display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "56px" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", color: "#000", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "6px", textDecoration: "none", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".88")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Start for free <FiArrowRight size={16} />
            </Link>
            <button onClick={() => { enableDemoMode(); window.location.href = "/dashboard"; }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)", fontWeight: 500, fontSize: "15px", padding: "14px 32px", borderRadius: "6px", cursor: "pointer", fontFamily: "'Space Grotesk', system-ui", transition: "border-color .2s, color .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; e.currentTarget.style.color = "rgba(255,255,255,.8)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; e.currentTarget.style.color = "rgba(255,255,255,.55)"; }}>
              Try demo — no signup
            </button>
          </div>

          {/* Guarantees */}
          <div style={{ ...rv(heroVis, 200), display: "flex", flexWrap: "wrap", gap: "32px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            {[["↓18 days", "Average DSO reduction"], ["3.2×", "Collection rate lift"], ["8 min", "To go live from any accounting tool"]].map(([val, lbl]) => (
              <div key={val}>
                <div style={{ fontWeight: 700, fontSize: "clamp(1.4rem,3vw,2rem)", letterSpacing: "-.04em", marginBottom: "4px" }}>{val}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.3)" }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACTION BAR ────────────────────────────────────────── */}
      <div ref={tractRef} style={{ ...rv(tractVis), borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.015)", padding: "40px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "0", justifyContent: "space-around" }}>
          {[["$60M+", "Receivables managed"], ["200+", "Businesses live"], ["14", "Countries"], ["↓18d", "Avg DSO cut"], ["200", "AI agents"], ["11", "Pipeline stages"]].map(([val, lbl], i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 24px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
              <div style={{ fontWeight: 700, fontSize: "clamp(1.5rem,3vw,2.4rem)", letterSpacing: "-.04em", marginBottom: "4px" }}>{val}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", letterSpacing: ".14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MARQUEE ─────────────────────────────────────────────── */}
      <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.25)", marginBottom: "20px" }}>
          Connects with what you already use
        </div>
        <div style={{ display: "flex", overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)" }}>
          <div className="animate-mq" style={{ display: "flex", gap: "52px", paddingRight: "52px", flexShrink: 0, whiteSpace: "nowrap" as const }}>
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <span key={i} style={{ fontWeight: 500, fontSize: "18px", color: "rgba(255,255,255,.38)" }}>{name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEM ─────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div ref={probRef} style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div style={{ ...rv(probVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "24px" }}>The silent drain</div>
          <h2 style={{ ...rv(probVis, 50), fontWeight: 600, fontSize: "clamp(2rem,5vw,4rem)", letterSpacing: "-.045em", lineHeight: 1.04, marginBottom: "40px" }}>
            Your business is<br />bleeding cash. <em>Silently.</em>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              "Dozens of open threads — invoices buried in email, chat and spreadsheets.",
              "An Excel sheet nobody has updated in three weeks.",
              "Chasing customers at random. No strategy. Just hoping someone pays today.",
              "No idea what cash is actually arriving next month.",
            ].map((text, i) => (
              <div key={i} style={{ ...rv(probVis, i * 60 + 100), display: "flex", alignItems: "flex-start", gap: "20px", padding: "20px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.2)", letterSpacing: ".08em", flexShrink: 0, paddingTop: "2px" }}>0{i + 1}</span>
                <p style={{ fontSize: "16px", color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
          <div style={{ ...rv(probVis, 350), display: "flex", alignItems: "center", gap: "20px", marginTop: "32px" }}>
            <span style={{ fontSize: "15px", color: "rgba(255,255,255,.7)", fontWeight: 500 }}>Atlas solves all four. In 8 minutes.</span>
            <a href="#features" style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>See how →</a>
          </div>
        </div>
      </section>

      {/* ── CORTEX ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.01)" }}>
        <div ref={cortRef} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ ...rv(cortVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "20px" }}>Vantro Cortex</div>
          <h2 style={{ ...rv(cortVis, 50), fontWeight: 600, fontSize: "clamp(1.8rem,4.2vw,3.8rem)", letterSpacing: "-.045em", lineHeight: 1.04, maxWidth: "18ch", marginBottom: "20px" }}>Raw data in.<br />Ranked decisions out.</h2>
          <p style={{ ...rv(cortVis, 100), fontSize: "15px", color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: "52ch", marginBottom: "48px" }}>
            Every morning, Atlas processes your entire business — invoices, payments, customers, stock — and hands you one list. Ranked. Specific. Ready to act on.
          </p>
          {/* Cortex architecture strip */}
          <div style={{ ...rv(cortVis, 150), background: "linear-gradient(135deg, #0a0a0a, #111)", borderRadius: "12px", border: "1px solid rgba(255,255,255,.07)", padding: "32px 24px", overflowX: "auto" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.2)", textAlign: "center", marginBottom: "24px" }}>Cortex X — Event to Action</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", flexWrap: "nowrap", minWidth: "max-content", margin: "0 auto" }}>
              {[
                { label: "Business Event", color: "#4F6EF7" },
                { label: "Rules Engine",   color: "#F5A524" },
                { label: "Policy Guard",   color: "#F5424D" },
                { label: "Action Created", color: "#9B6DFF" },
                { label: "Owner Approves", color: "#10D98A" },
                { label: "Audit + Learn",  color: "#4F6EF7" },
              ].map(({ label, color }, i, arr) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "0 12px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: color }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 600, whiteSpace: "nowrap", color }}>{label}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ width: "24px", height: "1px", background: "rgba(255,255,255,.12)", flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div ref={featRef} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ ...rv(featVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "20px" }}>Six modules</div>
          <h2 style={{ ...rv(featVis, 50), fontWeight: 600, fontSize: "clamp(2rem,4.5vw,4.5rem)", letterSpacing: "-.045em", lineHeight: 1.04, marginBottom: "56px" }}>
            Everything Atlas<br />runs automatically.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {FEATURES.map(({ idx, metric, title, desc }, i) => (
              <div key={idx} style={{ ...rv(featVis, i * 50 + 100), display: "flex", gap: "32px", padding: "28px 0", borderTop: "1px solid rgba(255,255,255,.06)", alignItems: "flex-start" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.2)", letterSpacing: ".08em", flexShrink: 0, width: "28px" }}>{idx}</div>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".12em", color: "#10D98A", textTransform: "uppercase" as const, marginBottom: "8px" }}>{metric}</div>
                    <h3 style={{ fontWeight: 600, fontSize: "clamp(1.1rem,2vw,1.5rem)", letterSpacing: "-.02em", color: "#fff" }}>{title}</h3>
                  </div>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENT PIPELINE ───────────────────────────────────────── */}
      <section id="pipeline" style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "#020202" }}>
        <div ref={pipeRef} style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ ...rv(pipeVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "20px" }}>Event Pipeline</div>
          <h2 style={{ ...rv(pipeVis, 50), fontWeight: 600, fontSize: "clamp(1.8rem,4vw,3.5rem)", letterSpacing: "-.045em", lineHeight: 1.04, marginBottom: "12px" }}>Event to action.<br /><span style={{ color: "rgba(255,255,255,.35)" }}>11 deterministic stages.</span></h2>
          <p style={{ ...rv(pipeVis, 100), fontSize: "14px", color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: "48px" }}>Every business event passes through 11 deterministic stages before any action fires. Rust engine for scoring. LLM only when needed. Human approval before execution.</p>

          {/* Phase groups */}
          {(["INPUT", "INTEL", "SAFETY", "OUTPUT"] as const).map(phase => (
            <div key={phase} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px", padding: "8px 0" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: ".18em", fontWeight: 600, color: phaseColors[phase], textTransform: "uppercase" as const }}>{phase}</span>
                <div style={{ flex: 1, height: "1px", background: `${phaseColors[phase]}22` }} />
              </div>
              {PIPELINE.filter(s => s.phase === phase).map(({ n, name, desc }) => (
                <div key={n} style={{ ...rv(pipeVis, 150), display: "flex", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.05)", alignItems: "flex-start", paddingLeft: "16px" }}>
                  <div style={{ position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: phaseColors[phase], border: `2px solid ${phaseColors[phase]}`, flexShrink: 0 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,.2)", letterSpacing: ".06em" }}>{n}</span>
                      <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(255,255,255,.85)" }}>{name}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,.38)", lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", borderBottom: "1px solid rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div ref={testiRef} style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px" }}>
          <div style={{ ...rv(testiVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "12px" }}>Customer proof</div>
          <h2 style={{ ...rv(testiVis, 50), fontWeight: 600, fontSize: "clamp(1.8rem,3.5vw,3rem)", letterSpacing: "-.042em", lineHeight: 1.05, marginBottom: "40px" }}>Real businesses.<br />Real numbers.</h2>
        </div>
        {/* Row 1 */}
        <div style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)", marginBottom: "12px" }}>
          <div className="animate-marquee-l" style={{ display: "flex", gap: "14px", width: "max-content" }}>
            {[...TESTI_ROW1, ...TESTI_ROW1].map((t, i) => (
              <div key={i} style={{ width: "288px", flexShrink: 0, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "10px", padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: "rgba(255,255,255,.7)", flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: "flex", gap: "11px", alignItems: "center" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "11px", color: "rgba(255,255,255,.7)", flexShrink: 0 }}>{t.av}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "12.5px", color: "rgba(255,255,255,.82)", letterSpacing: "-.01em" }}>{t.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "rgba(255,255,255,.28)", letterSpacing: ".04em", marginTop: "2px" }}>{t.co}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Row 2 */}
        <div style={{ overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)" }}>
          <div className="animate-marquee-r" style={{ display: "flex", gap: "14px", width: "max-content" }}>
            {[...TESTI_ROW2, ...TESTI_ROW2].map((t, i) => (
              <div key={i} style={{ width: "288px", flexShrink: 0, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "10px", padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: "rgba(255,255,255,.7)", flex: 1 }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: "flex", gap: "11px", alignItems: "center" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "11px", color: "rgba(255,255,255,.7)", flexShrink: 0 }}>{t.av}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "12.5px", color: "rgba(255,255,255,.82)", letterSpacing: "-.01em" }}>{t.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", color: "rgba(255,255,255,.28)", letterSpacing: ".04em", marginTop: "2px" }}>{t.co}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div ref={planRef} style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ ...rv(planVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "20px" }}>Pricing</div>
          <h2 style={{ ...rv(planVis, 50), fontWeight: 600, fontSize: "clamp(2rem,4.5vw,4rem)", letterSpacing: "-.045em", lineHeight: 1.02, marginBottom: "12px" }}>Start free.<br />Scale on results.</h2>
          <p style={{ ...rv(planVis, 100), fontSize: "14px", color: "rgba(255,255,255,.38)", marginBottom: "56px" }}>Three tiers. No hidden fees. No lock-in.</p>

          <div style={{ ...rv(planVis, 150), display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", maxWidth: "900px" }}>
            {/* Free */}
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", padding: "28px", display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.35)", marginBottom: "16px" }}>Free</p>
              <div style={{ marginBottom: "4px" }}><span style={{ fontWeight: 700, fontSize: "2.8rem", letterSpacing: "-.04em" }}>₹0</span><span style={{ fontSize: "14px", color: "rgba(255,255,255,.35)", marginLeft: "8px" }}>/forever</span></div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", marginBottom: "28px" }}>Start tracking. No card needed.</p>
              <div style={{ height: "1px", background: "rgba(255,255,255,.06)", marginBottom: "24px" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", flex: 1, marginBottom: "28px" }}>
                {PLAN_FREE.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,.55)" }}>
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "9px" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=free" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.65)", textDecoration: "none" }}>Get started free</Link>
            </div>

            {/* Pro */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "28px", display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "#000", color: "#fff", fontWeight: 700, fontSize: "10px", letterSpacing: ".1em", textTransform: "uppercase" as const, padding: "6px 16px", borderRadius: "999px" }}>★ Most Popular</div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".12em", textTransform: "uppercase" as const, color: "rgba(0,0,0,.4)", marginBottom: "16px" }}>Pro</p>
              <div style={{ marginBottom: "4px" }}><span style={{ fontWeight: 700, fontSize: "2.8rem", letterSpacing: "-.04em", color: "#000" }}>₹999</span><span style={{ fontSize: "14px", color: "rgba(0,0,0,.45)", marginLeft: "8px" }}>/month</span></div>
              <p style={{ fontSize: "13px", color: "rgba(0,0,0,.45)", marginBottom: "28px" }}>Full automation. Flat fee.</p>
              <div style={{ height: "1px", background: "rgba(0,0,0,.1)", marginBottom: "24px" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", flex: 1, marginBottom: "28px" }}>
                {PLAN_PRO.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "rgba(0,0,0,.65)" }}>
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "9px", color: "#fff" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=pro" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, background: "#000", color: "#fff", textDecoration: "none" }}>Start 14-day free trial</Link>
            </div>

            {/* Success */}
            <div style={{ background: "#0a0a0a", border: "1px solid rgba(16,217,138,.2)", borderRadius: "12px", padding: "28px", display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.35)", marginBottom: "16px" }}>Success</p>
              <div style={{ marginBottom: "4px" }}><span style={{ fontWeight: 700, fontSize: "2.8rem", letterSpacing: "-.04em" }}>₹0</span><span style={{ fontSize: "14px", color: "rgba(255,255,255,.35)", marginLeft: "8px" }}>/mo + 1.5%</span></div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", marginBottom: "28px" }}>Pay only when Atlas collects for you.</p>
              <div style={{ height: "1px", background: "rgba(255,255,255,.06)", marginBottom: "24px" }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", flex: 1, marginBottom: "28px" }}>
                {PLAN_SUCCESS.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "rgba(255,255,255,.55)" }}>
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(16,217,138,.12)", border: "1px solid rgba(16,217,138,.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "9px", color: "#10D98A" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=success" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, border: "1px solid rgba(255,255,255,.15)", color: "rgba(255,255,255,.7)", textDecoration: "none" }}>Pay from results</Link>
            </div>
          </div>

          <div style={{ ...rv(planVis, 200), display: "flex", flexWrap: "wrap", gap: "6px 22px", marginTop: "28px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.25)", letterSpacing: ".04em" }}>
            {["SOC 2 Type II", "Role-based access", "Full audit trail", "Human approval first", "Cancel anytime"].map((t, i) => (
              <span key={i}>{t}{i < 4 ? " ·" : ""}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: "80px 32px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div ref={faqRef} style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ ...rv(faqVis), fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "20px" }}>FAQ</div>
          <h2 style={{ ...rv(faqVis, 50), fontWeight: 600, fontSize: "clamp(1.8rem,4vw,3.5rem)", letterSpacing: "-.044em", lineHeight: 1.04, marginBottom: "48px" }}>Questions founders ask.</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {FAQS.map(({ q, a }, i) => (
              <div key={i} style={{ ...rv(faqVis, i * 40 + 100), background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: "8px", overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", textAlign: "left", background: "none", border: "none", cursor: "pointer", gap: "16px", color: "#fff" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,.85)", fontFamily: "'Space Grotesk', system-ui" }}>{q}</span>
                  <FiChevronDown size={15} style={{ color: "rgba(255,255,255,.35)", flexShrink: 0, transform: openFaq === i ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s" }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 22px 18px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                    <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,.5)", lineHeight: 1.7, paddingTop: "16px" }}>{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section style={{ padding: "100px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(79,110,247,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div ref={ctaRef} style={{ ...rv(ctaVis), maxWidth: "640px", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <AtlasMark size={52} />
          </div>
          <h2 style={{ fontWeight: 600, fontSize: "clamp(2rem,4.5vw,3.8rem)", letterSpacing: "-.045em", lineHeight: 1.04, marginBottom: "20px" }}>
            AI runs the ops.<br />You run the business.
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,.45)", lineHeight: 1.7, maxWidth: "48ch", margin: "0 auto 12px" }}>
            Every hour your team spends on follow-ups, data entry and manual collections is an hour not spent on growth. Atlas runs the operations — you run the business.
          </p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,.25)", marginBottom: "40px" }}>Free for 14 days. Set up in 8 minutes. No card required.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", color: "#000", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "6px", textDecoration: "none" }}>
              Start for free — no card needed <FiArrowRight size={16} />
            </Link>
            <a href={`https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%20want%20to%20see%20a%20Vantro%20Atlas%20demo`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.65)", fontWeight: 500, fontSize: "15px", padding: "14px 32px", borderRadius: "6px", textDecoration: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp for demo
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.07)", background: "#020202" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "56px 32px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "40px", marginBottom: "48px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <AtlasMark size={22} />
                <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: ".15em", textTransform: "uppercase" as const }}>Atlas by Vantro</span>
              </div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,.32)", lineHeight: 1.6, maxWidth: "30ch", marginBottom: "8px" }}>
                The AI business control room for founders at any scale. Collections, cashflow, inventory and follow-ups — automated in one place.
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,.2)" }}>🇮🇳 Made in India · Data stays in India</p>
            </div>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginBottom: "16px" }}>Product</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[["#features", "Features"], ["#pipeline", "Pipeline"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
                  <a key={href} href={href} style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".12em", color: "rgba(255,255,255,.45)", marginBottom: "16px" }}>Contact</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>WhatsApp us</a>
                <a href="mailto:support@vantro.in" style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>support@vantro.in</a>
                <a href="mailto:hello@vantro.in" style={{ fontSize: "13px", color: "rgba(255,255,255,.35)", textDecoration: "none" }}>hello@vantro.in</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.18)", letterSpacing: ".06em" }}>
              VANTRO &nbsp;&nbsp;&nbsp; © 2026 Vantro · An Auren Group company
            </p>
            <div style={{ display: "flex", gap: "20px", fontSize: "13px" }}>
              <Link href="/privacy" style={{ color: "rgba(255,255,255,.28)", textDecoration: "none" }}>Privacy</Link>
              <Link href="/terms" style={{ color: "rgba(255,255,255,.28)", textDecoration: "none" }}>Terms</Link>
              <Link href="/security" style={{ color: "rgba(255,255,255,.28)", textDecoration: "none" }}>Security</Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: .6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </div>
  );
}

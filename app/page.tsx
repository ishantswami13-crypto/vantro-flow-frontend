import Link from "next/link";
import { FiZap, FiArrowRight, FiCheck, FiBarChart2, FiMessageSquare, FiTarget } from "react-icons/fi";

const features = [
  {
    icon: FiTarget,
    title: "AI-Powered Collections Prioritization",
    desc: "Our model scores every customer by payment probability, days overdue, and relationship history — so your team calls the right person first, every time.",
  },
  {
    icon: FiBarChart2,
    title: "Real-Time Receivables Dashboard",
    desc: "Live visibility into outstanding amounts, DSO, collection rate, and 30-day cash runway. Know exactly where your cash is sitting right now.",
  },
  {
    icon: FiMessageSquare,
    title: "Hinglish WhatsApp Integration",
    desc: "Send professional collection messages in Hinglish via WhatsApp Business. Customers respond 3x faster to messages in their native language.",
  },
];

const modelA = [
  "14-day free trial",
  "Up to 500 customers",
  "WhatsApp integration",
  "AI prioritization",
  "Cash flow forecast",
  "Email support",
];

const modelB = [
  "Everything in Model A",
  "Unlimited customers",
  "Dedicated account manager",
  "Tally ERP sync",
  "Custom WhatsApp templates",
  "Priority support",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-primary font-sans">
      {/* Nav */}
      <nav className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
              <FiZap size={14} className="text-white" />
            </div>
            <span className="font-semibold tracking-tight">Vantro Flow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-secondary hover:text-primary transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-dim border border-accent/30 rounded-full text-xs text-accent font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Now live for Indian MSMEs
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-5 leading-tight tracking-tight">
          Get Paid Faster.
        </h1>
        <p className="text-lg sm:text-xl text-secondary max-w-2xl mx-auto mb-3 leading-relaxed">
          Collections OS for Indian MSMEs. Stop chasing payments manually — let AI prioritize who to call, when to call, and what to say.
        </p>
        <p className="text-sm text-muted mb-10">
          Trusted by MSME founders managing ₹50L–₹5Cr in receivables.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-md transition-colors"
          >
            Start 14-Day Free Trial
            <FiArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-surface-2 hover:bg-border text-secondary hover:text-primary text-sm font-medium rounded-md border border-border transition-colors"
          >
            View Demo Dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">No credit card required. Free for 14 days.</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Avg. DSO Reduction",  value: "18 days" },
            { label: "Collection Rate Lift", value: "+23%" },
            { label: "Time Saved / Week",    value: "6 hours" },
            { label: "MSME Founders",        value: "200+" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="metric-value text-2xl text-accent">{value}</p>
              <p className="text-xs text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Built for the Indian MSME reality</h2>
          <p className="text-secondary max-w-xl mx-auto text-sm leading-relaxed">
            Collections software that understands Rajesh, not just enterprise CFOs.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface border border-border rounded-lg p-6 hover:border-accent/40 transition-colors">
              <div className="w-10 h-10 bg-accent-dim border border-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="font-semibold text-primary mb-2 text-sm">{title}</h3>
              <p className="text-secondary text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-3">Simple, transparent pricing</h2>
            <p className="text-secondary text-sm">Two models. Pick what fits your business.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Model A */}
            <div className="bg-bg border border-border rounded-lg p-6">
              <div className="mb-5">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Model A — SaaS</p>
                <p className="metric-value text-3xl text-primary">₹1,999<span className="text-base font-sans font-normal text-secondary">/mo</span></p>
                <p className="text-xs text-muted mt-1">Flat monthly fee. Predictable cost.</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {modelA.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                    <FiCheck size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=saas" className="block text-center text-sm font-medium px-4 py-2.5 bg-surface-2 hover:bg-border text-primary rounded-md border border-border transition-colors">
                Start Free Trial
              </Link>
            </div>

            {/* Model B */}
            <div className="bg-bg border border-accent/60 rounded-lg p-6 relative">
              <div className="absolute -top-3 left-5">
                <span className="text-2xs font-semibold text-white bg-accent px-3 py-1 rounded-full uppercase tracking-wider">Recommended</span>
              </div>
              <div className="mb-5">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Model B — Hybrid</p>
                <p className="metric-value text-3xl text-primary">₹999<span className="text-base font-sans font-normal text-secondary">/mo + 1%</span></p>
                <p className="text-xs text-muted mt-1">Low base + 1% of amount collected via Vantro.</p>
              </div>
              <ul className="space-y-2.5 mb-6">
                {modelB.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                    <FiCheck size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=hybrid" className="block text-center text-sm font-semibold px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
            <FiZap size={10} className="text-white" />
          </div>
          <span className="text-sm font-medium text-secondary">Vantro Flow</span>
        </div>
        <p className="text-xs text-muted">2024 Vantro Technologies Pvt. Ltd. All rights reserved.</p>
        <div className="flex gap-4 text-xs text-muted">
          <Link href="#" className="hover:text-secondary transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-secondary transition-colors">Terms</Link>
          <Link href="#" className="hover:text-secondary transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

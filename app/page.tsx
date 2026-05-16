import Link from "next/link";
import {
  FiZap, FiArrowRight, FiCheck, FiBarChart2, FiMessageSquare,
  FiTarget, FiShield, FiTrendingUp, FiUsers, FiClock,
  FiChevronRight,
} from "react-icons/fi";

const FEATURES = [
  {
    icon: FiTarget,
    title: "AI Collections Engine",
    desc: "Proprietary ML model scores every debtor by payment probability, days overdue, and behavioral signals — so every call is the highest-impact call.",
    stat: "3.2x",
    statLabel: "collection rate lift",
  },
  {
    icon: FiBarChart2,
    title: "Real-Time Receivables Intelligence",
    desc: "Live DSO, collection rate, cash runway, and 90-day forecasts. Know your cash position to the day, not the quarter.",
    stat: "18d",
    statLabel: "avg DSO reduction",
  },
  {
    icon: FiMessageSquare,
    title: "Hinglish WhatsApp Automation",
    desc: "Culturally-tuned collection messages in Hinglish sent via WhatsApp Business API. 3x higher response rate than English emails.",
    stat: "73%",
    statLabel: "open rate",
  },
  {
    icon: FiTrendingUp,
    title: "Cash Flow Forecasting",
    desc: "Three-scenario 90-day projections. Pessimistic, expected, optimistic — so you never get surprised by a cash crunch again.",
    stat: "90d",
    statLabel: "forward visibility",
  },
  {
    icon: FiShield,
    title: "Tally ERP Integration",
    desc: "One-click sync with Tally ERP 9 and TallyPrime. Customers, invoices, and ledger data — imported automatically, kept in sync.",
    stat: "<2min",
    statLabel: "setup time",
  },
  {
    icon: FiUsers,
    title: "Team Collections CRM",
    desc: "Assign customers to collectors, log promises-to-pay, track follow-ups, and measure team performance — all in one dashboard.",
    stat: "100%",
    statLabel: "audit trail",
  },
];

const SOCIAL_PROOF = [
  { name: "Vikram Mehta", title: "Owner, Mehta Fabrics Pvt Ltd · Surat", quote: "Collected ₹22L in 6 weeks that had been stuck for 8 months. The WhatsApp messages in Hinglish made all the difference.", avatar: "VM" },
  { name: "Priya Sharma",  title: "CFO, Sharma Steel Works · Ahmedabad",  quote: "Our DSO dropped from 67 days to 41 days in the first quarter. The AI priority list is genuinely better than what our team used to do manually.", avatar: "PS" },
  { name: "Amit Gupta",   title: "MD, Gupta Construction · Pune",        quote: "Finally something built for Indian business reality. The Tally sync works perfectly and the cash forecast saved us from a serious crunch.", avatar: "AG" },
];

const MODEL_A = ["14-day free trial", "Up to 500 customers", "WhatsApp messaging", "AI priority scoring", "Cash flow forecast", "Tally sync", "Email & chat support"];
const MODEL_B = ["Everything in Model A", "Unlimited customers", "Dedicated account manager", "Custom WhatsApp templates", "Team management", "API access", "Priority 24/7 support"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-primary font-sans overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-button-accent">
              <FiZap size={15} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-primary">Vantro Flow</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-accent-dim text-accent border border-accent/20">
              BETA
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-primary transition-colors">Pricing</a>
            <a href="#proof"    className="hover:text-primary transition-colors">Customers</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-secondary hover:text-primary transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white">
              Start Free Trial
              <FiArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center bg-grid-pattern overflow-hidden">
        {/* Glow orbs */}
        <div className="hero-glow w-[500px] h-[500px] bg-accent/10 top-[-100px] left-[-100px]" />
        <div className="hero-glow w-[400px] h-[400px] bg-accent/6 bottom-[-80px] right-[10%]" />
        <div className="hero-glow w-[300px] h-[300px] bg-success/5 top-[20%] right-[-50px]" />

        {/* Scan line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 bg-surface-2 border border-border">
              <span className="status-live text-success text-xs">Live for Indian MSMEs</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-primary mb-6 leading-[1.05] tracking-tight">
              Stop Chasing{" "}
              <span className="gradient-text">Payments.</span>
              <br />
              Start Collecting.
            </h1>

            <p className="text-lg sm:text-xl text-secondary leading-relaxed mb-4 max-w-2xl font-light">
              AI-powered Collections OS built for Indian MSMEs. Know who to call, what to say, and when to follow up — in Hinglish.
            </p>
            <p className="text-sm text-muted mb-10 flex items-center gap-2">
              <FiClock size={13} className="text-accent" />
              Connects to Tally ERP in under 2 minutes. Zero code required.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-14">
              <Link href="/signup" className="btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-bold text-white">
                Start 14-Day Free Trial
                <FiArrowRight size={17} />
              </Link>
              <Link href="/dashboard" className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-base font-medium text-secondary hover:text-primary bg-surface-2 border border-border hover:border-border-2 transition-all">
                View Live Demo
                <FiChevronRight size={16} />
              </Link>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted">
              {["No credit card required", "Free for 14 days", "Cancel anytime", "256-bit encrypted"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <FiCheck size={11} className="text-success" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Floating dashboard preview card */}
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[420px] card-premium p-5 animate-float">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-secondary uppercase tracking-widest">Today's Priority</p>
              <span className="status-live text-xs text-success">Live</span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Mehta Fabrics", amount: "₹8.4L", days: "62d", score: 82, color: "text-success" },
                { name: "Sharma Steel",  amount: "₹5.2L", days: "45d", score: 67, color: "text-warning" },
                { name: "Patel Agro",    amount: "₹3.1L", days: "38d", score: 54, color: "text-warning" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="w-8 h-8 rounded-md bg-accent-dim border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{c.name}</p>
                    <div className="score-bar-track mt-1.5">
                      <div className="score-bar-fill bg-accent" style={{ width: `${c.score}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="metric-value text-xs text-primary">{c.amount}</p>
                    <p className={`text-2xs ${c.color}`}>{c.days} overdue</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-2xs text-muted">Total outstanding</span>
              <span className="metric-value text-sm text-accent">₹45.2L</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="border-y border-border bg-surface-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { value: "18 days",  label: "Avg. DSO Reduction",    sub: "across all customers" },
              { value: "+23%",     label: "Collection Rate Lift",   sub: "in first 60 days" },
              { value: "6 hrs",    label: "Saved Per Week",         sub: "per collections team" },
              { value: "₹45Cr+",   label: "Receivables Managed",   sub: "and growing" },
            ].map(({ value, label, sub }) => (
              <div key={label} className="px-6 py-8 text-center">
                <p className="metric-lg text-accent mb-1">{value}</p>
                <p className="text-xs font-semibold text-primary mb-0.5">{label}</p>
                <p className="text-2xs text-muted">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-grid-pattern">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-black text-primary mb-4 tracking-tight">
              Built for the Indian MSME reality
            </h2>
            <p className="text-secondary max-w-xl mx-auto text-sm leading-relaxed">
              Not enterprise bloatware. Not a spreadsheet. A focused, powerful OS for getting your money back.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {FEATURES.map(({ icon: Icon, title, desc, stat, statLabel }) => (
              <div key={title} className="card-metric p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-dim border border-accent/15 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <div className="text-right">
                    <p className="metric-value text-xl text-accent">{stat}</p>
                    <p className="text-2xs text-muted">{statLabel}</p>
                  </div>
                </div>
                <h3 className="font-bold text-primary mb-2 text-sm">{title}</h3>
                <p className="text-secondary text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────────── */}
      <section id="proof" className="py-24 bg-surface-1 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Customer Stories</p>
            <h2 className="text-3xl font-black text-primary tracking-tight">
              Rajesh got paid. So can you.
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 stagger-children">
            {SOCIAL_PROOF.map(({ name, title, quote, avatar }) => (
              <div key={name} className="card-premium p-6">
                <p className="text-sm text-secondary leading-relaxed mb-5 italic">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-accent-dim border border-accent/20 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary">{name}</p>
                    <p className="text-2xs text-muted">{title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-grid-pattern">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black text-primary mb-3 tracking-tight">
              Simple. Transparent. No surprises.
            </h2>
            <p className="text-secondary text-sm">Two models. One for predictability. One that pays for itself.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Model A */}
            <div className="card-premium p-7 flex flex-col">
              <div className="mb-6">
                <p className="section-label mb-2">Model A — SaaS</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="metric-xl text-primary">₹1,999</span>
                  <span className="text-secondary text-sm mb-1">/month</span>
                </div>
                <p className="text-xs text-muted">Flat fee. Predictable cost. Budget it once.</p>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {MODEL_A.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                    <FiCheck size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=saas" className="block text-center py-3 rounded-xl text-sm font-semibold text-primary bg-surface-2 border border-border hover:border-accent/40 hover:bg-surface-3 transition-all">
                Start Free Trial
              </Link>
            </div>

            {/* Model B */}
            <div className="relative border-gradient-accent rounded-xl p-7 flex flex-col" style={{ background: "linear-gradient(145deg, #101A30, #0C1428)" }}>
              <div className="absolute -top-3.5 left-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold text-white bg-gradient-accent shadow-button-accent">
                  <FiZap size={10} />
                  RECOMMENDED
                </span>
              </div>
              <div className="mb-6">
                <p className="section-label mb-2">Model B — Hybrid</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="metric-xl text-primary">₹999</span>
                  <span className="text-secondary text-sm mb-1">/mo + 1%</span>
                </div>
                <p className="text-xs text-muted">Low base. 1% only on amounts collected via Vantro.</p>
              </div>
              <ul className="space-y-3 mb-7 flex-1">
                {MODEL_B.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-secondary">
                    <FiCheck size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup?plan=hybrid" className="btn-primary block text-center py-3 rounded-xl text-sm font-bold text-white">
                Start Free Trial
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-muted mt-8">
            Both plans include 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-24 bg-surface-1 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-6 shadow-button-accent animate-float">
            <FiZap size={24} className="text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-primary mb-4 tracking-tight">
            Your cash is waiting.
          </h2>
          <p className="text-secondary text-base mb-10 leading-relaxed max-w-lg mx-auto">
            Every day you wait, your receivables age. Start collecting smarter — in 14 days free, with zero setup risk.
          </p>
          <Link href="/signup" className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white">
            Get Started Free
            <FiArrowRight size={18} />
          </Link>
          <p className="mt-4 text-xs text-muted">Setup takes 5 minutes. Tally sync is automatic.</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-border bg-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-gradient-accent flex items-center justify-center">
                <FiZap size={11} className="text-white" />
              </div>
              <span className="font-bold text-sm text-secondary">Vantro Flow</span>
            </div>
            <p className="text-xs text-muted order-last sm:order-none">
              © 2025 Vantro Technologies Pvt. Ltd.
            </p>
            <div className="flex gap-5 text-xs text-muted">
              {["Privacy Policy", "Terms of Service", "Contact Us", "Security"].map((l) => (
                <a key={l} href="#" className="hover:text-secondary transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

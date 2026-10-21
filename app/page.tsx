import "./landing.css";
import "./home.css";
import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { DownloadButton } from "@/components/marketing/DownloadButton";
import { DecisionTrace } from "@/components/marketing/landing/DecisionTrace";
import { AskDemo } from "@/components/marketing/landing/AskDemo";
import { HowItThinks } from "@/components/marketing/landing/HowItThinks";
import { StarField } from "@/components/marketing/landing/StarField";
import { Reveal } from "@/components/marketing/landing/Reveal";
import { HeroCards } from "@/components/marketing/landing/HeroCards";
import { BusinessGraph } from "@/components/marketing/landing/BusinessGraph";
import { Morning } from "@/components/marketing/landing/Morning";
import { CountUp } from "@/components/marketing/landing/CountUp";
import { ProductTour } from "@/components/marketing/landing/ProductTour";
import { ApproveLoop } from "@/components/marketing/landing/ApproveLoop";
import { BridgeDiagram } from "@/components/marketing/landing/BridgeDiagram";
import { DashboardThumb, ReportThumb, RuleThumb } from "@/components/marketing/landing/ProblemViz";
import { BridgeViz, WatchViz, MissionsViz, SimulateViz, MemoryViz, PreparedViz } from "@/components/marketing/landing/SurfaceVisuals";

// Starlane — public landing. A dark, cinematic frame around light working
// sections, one argument throughout: hero + real product, what it works with,
// the problem, one picture of the business, one decision end to end, the
// surfaces, a day with Starlane, how it thinks, Scan, built for Indian
// businesses, connection, trust and control, questions, access.
// Everything shown is either the real product, the real connector list, or
// sample data that is labelled as such. No logos, testimonials or metrics.

const SURFACES = [
  { name: "The Bridge", href: "/product/bridge", body: "What you are owed, what is overdue and the few things that need a decision — from your own books." },
  { name: "Scan", href: "/product/scan", body: "Look into any customer or invoice and see why it matters, with the evidence." },
  { name: "Watch", href: "/product/watch", body: "Invoices slipping, promises missed, syncs failing — raised once, closed when resolved." },
  { name: "Missions", href: "/product/missions", body: "“Collect ₹1.2 lakh in 14 days” — proposed step by step, measured against your books." },
  { name: "Simulate", href: "/product/simulate", body: "Likely collections, with every assumption visible and yours to change." },
  { name: "Memory", href: "/product/memory", body: "How each customer really pays, where Starlane learned it, and your say on it." },
  { name: "Prepared", href: "/product/prepared", body: "The next 24 hours, 7 days and 30 days, worked out ahead." },
];

const CONNECTIONS = [
  {
    kind: "Local software",
    head: "TallyPrime, through the Starlane bridge",
    body: "A small program on the computer that runs Tally reads vouchers and stock through Tally’s local export port and sends them to Starlane. Read-only. Paired with a one-time code; revocable from Starlane at any time.",
    state: "Available",
  },
  {
    kind: "Files",
    head: "CSV and Excel exports",
    body: "Any system that can export invoices can be connected today. Identical files are recognised and never imported twice.",
    state: "Available",
  },
  {
    kind: "External signals",
    head: "Public data feeds",
    body: "ECB reference exchange rates and USGS significant earthquakes, matched against your own suppliers and currencies. Nothing about your company is sent out.",
    state: "Available",
  },
  {
    kind: "Cloud software",
    head: "Official APIs, with your consent",
    body: "QuickBooks, Zoho Books, Xero and others connect through the vendor’s own OAuth, showing exactly what is shared. These are not built yet — tell us what you use when you apply.",
    state: "Not yet available",
  },
];

const CONTROLS = [
  { l: "Evidence", d: "Each recommendation shows the rows, rule and assumptions behind it. Observed, calculated, assumed and forecast are labelled differently — always." },
  { l: "Permissions", d: "Connections are read-only unless an action needs to write, and each says in plain words what Starlane receives. Bridge devices have their own credentials you can revoke." },
  { l: "Approvals", d: "Actions wait for a person. Opening an approval link never approves anything; you confirm on the page. Each action runs at most once." },
  { l: "Audit trail", d: "Every decision is recorded with who made it and when, alongside what was proposed and what happened after." },
  { l: "Limits", d: "External messages are off by default and stay off until explicitly enabled. Starlane never marks a payment received, changes an amount, or deletes records on its own." },
];

const VIZ: Record<string, { el: React.ReactNode; span: string }> = {
  "The Bridge": { el: <BridgeViz />, span: "slh-b-wide" },
  Watch: { el: <WatchViz />, span: "" },
  Missions: { el: <MissionsViz />, span: "" },
  Simulate: { el: <SimulateViz />, span: "" },
  Memory: { el: <MemoryViz />, span: "" },
  Prepared: { el: <PreparedViz />, span: "slh-b-full" },
};

const HEADLINE = "Your company’s state, turned into decisions and carried out.".split(" ");
const SCRUB = "None of them answers the question an owner faces every morning: what should we do today, and why?".split(" ");

const FAQ = [
  { q: "Will Starlane message my customers on its own?", a: "No. External messages are off by default and stay off until they are explicitly enabled. Even then, every reminder waits for a person to approve it, the text is shown in full before you do, and each approved action runs at most once." },
  { q: "What does it need from TallyPrime?", a: "A small bridge program on the computer that runs Tally reads vouchers and stock through Tally’s local export port and sends them to Starlane. It is read-only, paired with a one-time code, and you can revoke it from Starlane at any time." },
  { q: "We don’t use Tally. Can we still use Starlane?", a: "Yes, if your system can export invoices as CSV or Excel. Identical files are recognised and never imported twice. Connections to QuickBooks, Zoho Books, Xero and others through their official APIs are not built yet, so tell us what you use when you apply." },
  { q: "Can it change my books?", a: "No. Starlane never marks a payment received, changes an amount or deletes records on its own, and Scan cannot change records at all. It reads your books and checks them again to see what actually happened after an action." },
  { q: "Is there a Mac app?", a: "Not yet. The desktop app runs on Windows 10 and 11, 64-bit, and Starlane also runs in the browser." },
  { q: "How do we get started?", a: "Starlane is onboarding a small number of companies at a time, starting with businesses that run on TallyPrime or can export their books. Request a pilot and you will see straight away whether your systems are supported." },
];

const INDIA = [
  { k: "₹1,28,500", h: "Lakh and crore, the way you read them", b: "Every amount is grouped the Indian way, in rupees, from your own books. No converting 128,500 in your head." },
  { k: "Tally", h: "Keep TallyPrime. Starlane reads it.", b: "Nothing to migrate and no new accounting software. A read-only bridge on the Tally computer is the whole setup." },
  { k: "WhatsApp", h: "Reminders where your customers already reply", b: "Starlane drafts the message in the right tone. You read it in full and approve it; nothing is sent without you." },
  { k: "Windows", h: "Runs on the PC already in your office", b: "A desktop app for Windows 10 and 11, and the same Starlane in any browser, so the owner can check in from anywhere." },
];

const SOURCES = ["TallyPrime", "CSV exports", "Excel workbooks", "Bank statements", "ECB reference rates", "USGS earthquake feed", "WhatsApp drafts, sent only on approval", "Purchase history", "Stock and products"];

const PROMISES = [
  { n: 0, s: "", l: "messages sent without a person approving them" },
  { n: 1, s: "", l: "run, at most, for every action you approve" },
  { n: 100, s: "%", l: "of figures open to the rows behind them" },
];

const CONNECT_ICONS: Record<string, React.ReactNode> = {
  "Local software": <path d="M8 34h48M14 34V18h36v16M20 46h24M32 34v12M24 24h16" />,
  Files: <path d="M18 8h20l10 10v38H18zM38 8v10h10M24 30h16M24 38h16M24 46h10" />,
  "External signals": <><circle cx="32" cy="32" r="22" /><path d="M10 32h44M32 10c7 7 7 37 0 44M32 10c-7 7-7 37 0 44" /></>,
  "Cloud software": <path d="M20 46h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3A11 11 0 0 0 20 46z" />,
};

const CONTROL_ICONS: Record<string, React.ReactNode> = {
  Evidence: <><path d="M7 5h13l5 5v17H7z" /><path d="M11 14h10M11 18h10M11 22h6" /></>,
  Permissions: <><rect x="7" y="14" width="18" height="13" rx="2" /><path d="M11 14V10a5 5 0 0 1 10 0v4M16 19v3" /></>,
  Approvals: <><circle cx="16" cy="16" r="11" /><path d="M11 16.5l3.5 3.5L21 13" /></>,
  "Audit trail": <><path d="M8 6v20M8 9h4M8 16h4M8 23h4" /><path d="M15 9h10M15 16h10M15 23h7" /></>,
  Limits: <><path d="M16 4l10 4v8c0 6-4.5 10-10 12C10.5 26 6 22 6 16V8z" /><path d="M12 16h8" /></>,
};

export default function LandingPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Reveal />
      <Nav />
      <main id="main">
        {/* 1 — Hero: the star lane, the promise, the real product */}
        <header className="sl-dark slh-hero">
          <div className="slh-sky" aria-hidden>
            <StarField />
            <div className="slh-horizon" />
            <div className="slh-grain" />
          </div>
          <div className="sl-wrap slh-hero-copy">
            <span className="slh-pill"><i />Now onboarding a small number of companies</span>
            <h1 className="slh-display slh-words" aria-label="Your company’s state, turned into decisions and carried out.">
              {HEADLINE.map((w, i) => <span key={i} aria-hidden style={{ animationDelay: `${0.12 + i * 0.07}s` }}>{w}</span>)}
            </h1>
            <p className="slh-lede">
              Starlane connects to the systems your business already runs on, builds one current picture of it, weighs
              what could improve it, shows the evidence for each option, and once you approve, carries it out and checks
              what happened.
            </p>
            <div className="slh-ctas">
              <DownloadButton className="sl-btn sl-btn-solid slh-btn-lg" />
              <Link href="/access" className="sl-btn sl-btn-outline slh-btn-lg">Request a pilot</Link>
            </div>
            <p className="slh-fine">Windows 10 and 11, 64-bit. No macOS or Linux app yet; Starlane also runs in the browser.</p>
          </div>
          <div className="sl-wrap slh-shot-wrap">
            <figure className="slh-shot">
              <div className="slh-shot-bar"><span /><span /><span /><em>The Bridge · Starlane for Windows</em></div>
              <Image src="/product/bridge-desktop.webp" width={2880} height={1800} priority sizes="(max-width: 767px) 100vw, 1180px"
                alt="The Bridge in the Starlane desktop app for a fictional demo company: what it is owed and how much is overdue, two reminders waiting for approval, Watch alerts for invoices slipping past 30 and 90 days, two collection missions with progress, receivables by overdue band and who owes the most." />
            </figure>
            <HeroCards />
            <p className="slh-shot-cap">Real product view, on a fictional demo company’s books. Every figure opens to the invoices behind it.</p>
          </div>
        </header>

        {/* 2 — What it works with */}
        <section className="sl-dark slh-band" aria-label="What Starlane works with today">
          <p className="slh-band-label">Works today with</p>
          <div className="slh-marquee">
            <ul>
              {[...SOURCES, ...SOURCES].map((s, i) => <li key={i} aria-hidden={i >= SOURCES.length || undefined}>{s}</li>)}
            </ul>
          </div>
        </section>

        {/* 3 — The problem, as a statement */}
        <section className="sl-section slh-statement" aria-labelledby="problem-h">
          <div className="sl-wrap">
            <p className="sl-eyebrow" data-reveal>The problem</p>
            <h2 id="problem-h" className="slh-h2 slh-statement-h" data-reveal>You have the data. You still have to decide.</h2>
            <div className="slh-statement-lines">
              <div className="slh-problem" data-reveal><DashboardThumb /><p><span>Dashboards</span> show what already happened.</p></div>
              <div className="slh-problem" data-reveal><ReportThumb /><p><span>Reports</span> arrive after it mattered.</p></div>
              <div className="slh-problem" data-reveal><RuleThumb /><p><span>Automations</span> do exactly what they were told, whether or not it still makes sense.</p></div>
              <p className="slh-statement-last">{SCRUB.map((w, i) => <span key={i} className="slh-scrub">{w}</span>)}</p>
            </div>
          </div>
        </section>

        {/* 4 — One picture of the business */}
        <section className="sl-dark slh-section slh-graph" aria-labelledby="graph-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">One picture</p>
                <h2 id="graph-h" className="slh-h2">Every row in your books becomes one living picture of the business.</h2>
              </div>
              <p className="sl-p">Vouchers become invoices, payments and stock movements. Customers, suppliers and products are linked by what actually happened between them, and every row keeps where it came from.</p>
            </div>
            <div data-reveal><BusinessGraph /></div>
            <p className="sl-product-caption">Illustration on the fictional demo company from the product view above.</p>
          </div>
        </section>

        {/* 5 — One decision, end to end */}
        <section className="sl-dark slh-section slh-decision" aria-labelledby="decision-h">
          <div className="slh-glow" aria-hidden />
          <div className="sl-wrap slh-split">
            <div data-reveal>
              <p className="sl-eyebrow">One decision, end to end</p>
              <h2 id="decision-h" className="slh-h2">From five vouchers to one approved reminder, with every step on the record.</h2>
              <ol className="slh-steps">
                <li><b>Sources</b><span>Rows arrive from TallyPrime and become one picture.</span></li>
                <li><b>Options</b><span>Real choices are ranked by explicit rules, not a model’s taste.</span></li>
                <li><b>Evidence</b><span>Observed, calculated and assumed are labelled apart.</span></li>
                <li><b>Approval</b><span>Nothing goes out until a person says yes.</span></li>
                <li><b>Verification</b><span>Starlane checks your books for what actually happened.</span></li>
              </ol>
            </div>
            <div className="slh-light-card" data-reveal><DecisionTrace /></div>
          </div>
        </section>

        {/* 5b — From approval to paid */}
        <section className="sl-dark slh-section slh-loop" aria-labelledby="loop-h">
          <div className="slh-glow slh-glow-2" aria-hidden />
          <div className="sl-wrap">
            <div className="slh-center-head" data-reveal>
              <p className="sl-eyebrow">From approval to paid</p>
              <h2 id="loop-h" className="slh-h2">One tap from you. The rest is checked against your books.</h2>
              <p className="sl-p">You read the reminder in full and approve it. It goes out once, where WhatsApp is set up. When the payment lands in Tally, Starlane sees it on the next sync and records what actually worked.</p>
            </div>
            <div data-reveal><ApproveLoop /></div>
            <p className="sl-product-caption">Illustration on the fictional demo company. External messages are off by default and nothing is sent without your approval.</p>
          </div>
        </section>

        {/* 6 — The surfaces */}
        <section id="product" className="sl-section slh-surfaces" aria-labelledby="product-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <h2 id="product-h" className="slh-h2">An operating surface, not another dashboard.</h2>
              <p className="sl-p">Starlane opens on what needs a decision. Every number can be opened to the rows and events behind it.</p>
            </div>
            <ul className="slh-bento">
              {SURFACES.filter((s) => VIZ[s.name]).map((s) => (
                <li key={s.name} className={`slh-b ${VIZ[s.name].span}`} data-reveal>
                  <Link href={s.href} className="slh-b-link">
                    <div className="slh-b-viz">{VIZ[s.name].el}</div>
                    <div className="slh-b-copy">
                      <h3 className="sl-h3">{s.name}<span aria-hidden>→</span></h3>
                      <p className="sl-p">{s.body}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="sl-product-caption">Illustrations use the same fictional demo company as the product view above. Nothing here is customer data.</p>
            <div className="sl-hero-ctas">
              <Link href="/product" className="sl-link-arrow">All seven features, each with its real status</Link>
            </div>
          </div>
        </section>

        {/* 6b — The real screens */}
        <section className="sl-dark slh-section slh-tour" aria-labelledby="tour-h">
          <div className="slh-glow slh-glow-2" aria-hidden />
          <div className="sl-wrap">
            <div className="slh-center-head" data-reveal>
              <p className="sl-eyebrow">The real product</p>
              <h2 id="tour-h" className="slh-h2">One overdue invoice, through six screens.</h2>
              <p className="sl-p">Not mock-ups. These are screens from the Starlane app, following Mehta Hardware’s invoice from the alert to the approved reminder and what Starlane learned.</p>
            </div>
            <div data-reveal><ProductTour /></div>
            <p className="sl-product-caption">Captured from the Starlane app on a test company’s books (Gupta Traders, test data). External messages were switched off.</p>
          </div>
        </section>

        {/* 7 — A day with Starlane */}
        <section className="sl-dark slh-section slh-morning" aria-labelledby="morning-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">A day with Starlane</p>
                <h2 id="morning-h" className="slh-h2">Less time in spreadsheets. More of the day back.</h2>
              </div>
              <p className="sl-p">One illustrative day for the demo company: a few minutes of decisions in the morning, and the books checked for what happened after.</p>
            </div>
            <Morning />
          </div>
        </section>

        {/* 8 — How Starlane thinks */}
        <section id="how" className="sl-section" aria-labelledby="how-h">
          <div className="sl-wrap">
            <p className="sl-eyebrow" data-reveal>How it works</p>
            <h2 id="how-h" className="slh-h2" style={{ maxWidth: 820, marginBottom: 56 }} data-reveal>From the rows in your books to an outcome you can check.</h2>
            <div data-reveal><HowItThinks /></div>
          </div>
        </section>

        {/* 9 — Scan */}
        <section id="ask" className="sl-dark slh-section" aria-labelledby="ask-h">
          <div className="sl-wrap sl-ask-split">
            <div data-reveal>
              <p className="sl-eyebrow">Scan</p>
              <h2 id="ask-h" className="slh-h2">Ask it anything about your business. It answers from your books.</h2>
              <p className="sl-sub" style={{ marginTop: 22, maxWidth: 520 }}>
                Who owes the most, what cash looks like next month, which stock is running low. Starlane looks it up in your
                own invoices, customers, suppliers and forecast, and shows what it looked at.
              </p>
              <ul className="sl-reasons" style={{ marginTop: 22 }}>
                <li>When your records can’t answer a question, it says so instead of guessing.</li>
                <li>It can draft a WhatsApp reminder for you to send; it never sends anything itself.</li>
                <li>It cannot change your records: no marking paid, no edits, no orders.</li>
              </ul>
              <div className="sl-hero-ctas"><Link href="/product/scan" className="sl-link-arrow">How Scan works</Link></div>
            </div>
            <div className="slh-light-card" data-reveal><AskDemo /></div>
          </div>
        </section>

        {/* 10 — Built for Indian businesses */}
        <section className="sl-section slh-india" aria-labelledby="india-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">For Indian businesses</p>
                <h2 id="india-h" className="slh-h2">Built for how Indian businesses actually run.</h2>
              </div>
              <p className="sl-p">Not a Western finance suite with a rupee symbol added. Starlane starts from TallyPrime, WhatsApp and the owner who makes the call.</p>
            </div>
            <ul className="slh-india-grid">
              {INDIA.map((x) => (
                <li key={x.h} className="slh-india-tile" data-reveal>
                  <span className="slh-india-k" aria-hidden>{x.k}</span>
                  <h3 className="sl-h3">{x.h}</h3>
                  <p className="sl-p">{x.b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 11 — Connection */}
        <section id="connect" className="sl-section slh-connect" aria-labelledby="connect-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <h2 id="connect-h" className="slh-h2">Connected the way each system allows, and no further.</h2>
              <p className="sl-p">Every connection states what Starlane receives before you grant it. Nothing is connected without your consent, and nothing is scraped.</p>
            </div>
            <div data-reveal><BridgeDiagram /></div>
            <div className="slh-connect-grid">
              {CONNECTIONS.map((c) => (
                <article key={c.kind} className={`slh-c${c.state === "Available" ? "" : " slh-c-later"}`} data-reveal>
                  <div className="slh-c-art" aria-hidden>
                    <svg viewBox="0 0 64 64" width="56" height="56">{CONNECT_ICONS[c.kind]}</svg>
                  </div>
                  <div className="sl-connect-top">
                    <span className="sl-connect-kind">{c.kind}</span>
                    <span className={`sl-connect-state${c.state === "Available" ? " ok" : ""}`}>{c.state}</span>
                  </div>
                  <h3 className="sl-h3">{c.head}</h3>
                  <p className="sl-p">{c.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 12 — Trust and control */}
        <section id="trust" className="sl-dark slh-section slh-trust" aria-labelledby="trust-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <h2 id="trust-h" className="slh-h2">You stay in charge of every consequential step.</h2>
              <p className="sl-p">Starlane is built to be checked. The parts that matter most are the ones it will not do without you.</p>
            </div>
            <ul className="slh-promises">
              {PROMISES.map((p) => (
                <li key={p.l} data-reveal><span className="slh-promise-n"><CountUp to={p.n} suffix={p.s} /></span><span className="slh-promise-l">{p.l}</span></li>
              ))}
            </ul>
            <div className="slh-controls">
              {CONTROLS.map((r) => (
                <div key={r.l} className="slh-control" data-reveal><svg className="slh-control-i" viewBox="0 0 32 32" aria-hidden>{CONTROL_ICONS[r.l]}</svg><h3 className="sl-h3">{r.l}</h3><p className="sl-p">{r.d}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* 13 — Questions */}
        <section id="faq" className="sl-section slh-faq" aria-labelledby="faq-h">
          <div className="sl-wrap slh-faq-grid">
            <div data-reveal>
              <p className="sl-eyebrow">Questions</p>
              <h2 id="faq-h" className="slh-h2">What owners ask before they connect their books.</h2>
            </div>
            <div className="slh-faq-list" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q} className="slh-qa">
                  <summary><span>{f.q}</span><i aria-hidden /></summary>
                  <p className="sl-p">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 14 — Access */}
        <section className="sl-dark slh-final" aria-labelledby="access-h">
          <div className="slh-sky" aria-hidden>
            <StarField density={0.7} horizon={0.6} />
            <div className="slh-horizon slh-horizon-low" />
            <div className="slh-grain" />
          </div>
          <div className="sl-wrap slh-final-copy">
            <h2 id="access-h" className="slh-display slh-final-h" data-reveal>Starlane is onboarding a small number of companies at a time.</h2>
            <p className="slh-lede" data-reveal>
              We start with businesses that run on TallyPrime or can export their books, and are ready to connect real data.
              Tell us about yours; you will see straight away whether your systems are supported.
            </p>
            <div className="slh-ctas" data-reveal>
              <DownloadButton where="access" className="sl-btn sl-btn-solid slh-btn-lg" />
              <Link href="/access" className="sl-btn sl-btn-outline slh-btn-lg">Request a pilot</Link>
            </div>
            <Link href="/access/status" className="sl-link-arrow slh-final-status">Check on an application</Link>
          </div>
          <div className="sl-wrap slh-final-shot" aria-hidden>
            <Image src="/product/bridge-desktop.webp" width={2880} height={1800} sizes="(max-width: 767px) 100vw, 1180px" alt="" />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

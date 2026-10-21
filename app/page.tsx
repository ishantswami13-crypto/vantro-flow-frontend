import "./landing.css";
import "./home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { DownloadButton } from "@/components/marketing/DownloadButton";
import { DecisionTrace } from "@/components/marketing/landing/DecisionTrace";
import { AskDemo } from "@/components/marketing/landing/AskDemo";
import { HowItThinks } from "@/components/marketing/landing/HowItThinks";
import { StarField } from "@/components/marketing/landing/StarField";
import { Reveal } from "@/components/marketing/landing/Reveal";
import { HeroConsole } from "@/components/marketing/landing/HeroConsole";
import { BusinessGraph } from "@/components/marketing/landing/BusinessGraph";
import { Morning } from "@/components/marketing/landing/Morning";
import { CountUp } from "@/components/marketing/landing/CountUp";
import { PhoneRow } from "@/components/marketing/landing/PhoneRow";
import { ProductTour } from "@/components/marketing/landing/ProductTour";
import { ApproveLoop } from "@/components/marketing/landing/ApproveLoop";
import { IntegrationHub } from "@/components/marketing/landing/IntegrationHub";
import { BrandMark } from "@/components/marketing/landing/BrandMarks";
import { SystemsThumb, DashboardThumb, RuleThumb } from "@/components/marketing/landing/ProblemViz";
import { BridgeViz, WatchViz, MissionsViz, SimulateViz, MemoryViz, PreparedViz } from "@/components/marketing/landing/SurfaceVisuals";

// Starlane — public landing. One argument, in the order a leadership team
// meets it: the category and the product (hero), what it does, why the data a
// company already has is not enough, one continuously updated model, what it
// answers, one decision from signal to verified outcome, the surfaces, the real
// product, a day, how it works, Scan, who it is for, the phone, integrations
// with honest statuses, trust and control, questions, access.
// Everything shown is either the real product (captured on a test company),
// the real connector status, or a fictional company labelled as such. No
// logos, testimonials or metrics.

const SURFACES = [
  { name: "The Bridge", href: "/product/bridge", body: "What is owed, what is exposed and the few things that need a decision, from your own systems." },
  { name: "Scan", href: "/product/scan", body: "Look into any customer, supplier or invoice and see why it matters, with the evidence." },
  { name: "Watch", href: "/product/watch", body: "Invoices slipping, promises missed, syncs failing: raised once, closed when resolved." },
  { name: "Missions", href: "/product/missions", body: "“Collect $120,000 in 14 days”, proposed step by step and measured against the books." },
  { name: "Simulate", href: "/product/simulate", body: "Likely outcomes as a range, with every assumption visible and yours to change." },
  { name: "Memory", href: "/product/memory", body: "How each customer really behaves, where Starlane learned it, and your say on it." },
  { name: "Prepared", href: "/product/prepared", body: "The next 24 hours, 7 days and 30 days, worked out ahead." },
];

const CONTROLS = [
  { l: "Evidence", d: "Each recommendation shows the rows, rule and assumptions behind it. Observed, calculated, assumed and forecast are labelled differently, always." },
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

const HEADLINE = "The intelligence layer for your business.".split(" ");
const SCRUB = "So the questions every leadership team asks stay open: what changed, what matters, and what should we do about it?".split(" ");

// Only systems that work in the product today; see IntegrationHub.
const WORKS = [
  { n: "TallyPrime", mark: "tally" }, { n: "Excel", mark: "excel" }, { n: "Google Sheets", mark: "googlesheets" },
  { n: "CSV" }, { n: "Bank statements" }, { n: "Gmail", mark: "gmail" }, { n: "ECB rates" }, { n: "USGS" },
];

const CAPABILITIES = ["Understand what is happening", "Detect what changed", "Surface risks and opportunities", "Recommend what to do next", "Simulate the outcome", "Act through your tools", "Verify the result", "Remember what worked"];

const OUTCOMES = [
  { k: "01", h: "Know what changed overnight.", b: "Every sync is compared with the last one, so the morning starts with what moved, not with a hunt through reports." },
  { k: "02", h: "See where exposure is building.", b: "Cash, receivables, stock cover and customer behaviour, watched together, so a risk is raised while there is still time to act." },
  { k: "03", h: "Understand why it happened.", b: "Open any figure to the records behind it, and see which facts were observed, which were calculated and which were assumed." },
  { k: "04", h: "Know what deserves attention.", b: "A short list of decisions ranked by explicit rules and measured behaviour, not a feed of alerts to triage." },
  { k: "05", h: "Simulate before you commit.", b: "See the likely range of an option before anything happens, with every assumption visible and yours to change." },
  { k: "06", h: "Turn decisions into actions.", b: "Once a person approves, Starlane carries the action out through the tools you already use, once, and checks what followed." },
];

const AUDIENCE = [
  { k: "Executives", h: "The state of the business before the first meeting", b: "What changed, what is exposed and the few decisions that need you, with the evidence one click away." },
  { k: "Finance", h: "Cash and receivables you can defend", b: "Overdue exposure, likely collections as a range and every figure traced to the record it came from." },
  { k: "Operations", h: "Risks caught while there is time", b: "Stock cover, supplier dependencies and outside events matched to the parts of the business they touch." },
  { k: "Founders", h: "One view across every system", b: "The whole company in one model, and a record of every decision and what came of it as the business grows." },
];

const FAQ = [
  { q: "Which systems does it connect to today?", a: "TallyPrime through a small read-only bridge, CSV and Excel exports from any system (QuickBooks, Xero and Zoho Books exports are recognised), bank statement imports, Gmail for approved messages, and public feeds such as ECB exchange rates and USGS earthquakes. Direct connections to QuickBooks Online, Xero, Zoho Books, CRMs, commerce platforms and ERPs are planned, not built. Systems with an API, a database or an export can be added for a pilot through Starlane’s connector framework." },
  { q: "Can it change our records?", a: "No. Starlane never marks a payment received, changes an amount or deletes records on its own, and Scan cannot change records at all. It reads your systems and checks them again to see what actually happened after an action." },
  { q: "Will Starlane message customers on its own?", a: "No. External messages are off by default and stay off until they are explicitly enabled. Even then, every message waits for a person to approve it, the text is shown in full before you do, and each approved action runs at most once." },
  { q: "Is it built for larger companies?", a: "Yes. Evidence behind every recommendation, approvals before anything goes out and an audit trail of who decided what matter most where many people share one business. Starlane works with companies of any size, from owner-led businesses to multi-location enterprises, in any country whose systems it can connect." },
  { q: "Where does it run?", a: "In the browser, and as a desktop app for Windows 10 and 11, 64-bit. A phone app is in testing. There is no Mac app yet." },
  { q: "How do we get started?", a: "Request a pilot and tell us what you run. You will see straight away which of your systems Starlane can connect today and what a pilot would need. Starlane is onboarding a small number of companies at a time." },
];

const PROMISES = [
  { n: 0, s: "", l: "messages sent without a person approving them" },
  { n: 1, s: "", l: "run, at most, for every action you approve" },
  { n: 100, s: "%", l: "of figures open to the records behind them" },
];

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
        {/* 1 — Hero: the category first, then the product as a picture */}
        <header className="sl-dark slh-hero">
          <div className="slh-sky" aria-hidden>
            <StarField />
            <div className="slh-planet" />
            <div className="slh-grain" />
          </div>
          <div className="sl-wrap slh-hero-copy">
            <span className="slh-pill"><i />Now onboarding a select group of companies</span>
            <h1 className="slh-display slh-words" aria-label="The intelligence layer for your business.">
              {HEADLINE.map((w, i) => <span key={i} aria-hidden style={{ animationDelay: `${0.12 + i * 0.07}s` }}>{w}</span>)}
            </h1>
            <p className="slh-lede">
              Starlane connects your systems, operational data and outside signals into{" "}
              <b>one continuously updated understanding of the company. It finds what matters,</b>{" "}
              shows the evidence, simulates the options and, once you approve, acts through your existing tools.
            </p>
            <div className="slh-ctas">
              <Link href="/access" className="sl-btn sl-btn-solid slh-btn-lg">Request a pilot <span aria-hidden>→</span></Link>
              <a href="#how" className="sl-btn sl-btn-outline slh-btn-lg slh-btn-play"><i aria-hidden /><span>See how it works</span></a>
            </div>
            <div className="slh-works">
              <p>Works today with</p>
              <ul>
                {WORKS.map((w) => <li key={w.n}>{w.mark ? <BrandMark id={w.mark} size={17} /> : null}{w.n}</li>)}
              </ul>
            </div>
          </div>
          <div className="sl-wrap slh-shot-wrap">
            <figure className="slh-device">
              <div className="slh-device-screen"><HeroConsole /></div>
            </figure>
            <p className="slh-shot-cap">Illustration on a fictional company. The real product, captured on a test company, appears further down.</p>
          </div>
        </header>

        {/* 2 — What it does, as one loop */}
        <section className="sl-dark slh-band" aria-label="What Starlane does">
          <p className="slh-band-label">What it does</p>
          <div className="slh-marquee">
            <ul>
              {[...CAPABILITIES, ...CAPABILITIES].map((s, i) => <li key={i} aria-hidden={i >= CAPABILITIES.length || undefined}>{s}</li>)}
            </ul>
          </div>
        </section>

        {/* 3 — The problem: plenty of data, no understanding */}
        <section className="sl-section slh-statement" aria-labelledby="problem-h">
          <div className="sl-wrap">
            <p className="sl-eyebrow" data-reveal>The problem</p>
            <h2 id="problem-h" className="slh-h2 slh-statement-h" data-reveal>Your company produces more information than anyone can read.</h2>
            <div className="slh-statement-lines">
              <div className="slh-problem" data-reveal><SystemsThumb /><p><span>It is fragmented</span> across accounting, banking, CRM, inventory, inboxes and spreadsheets that never meet.</p></div>
              <div className="slh-problem" data-reveal><DashboardThumb /><p><span>Dashboards</span> show the numbers and still leave the connecting to people.</p></div>
              <div className="slh-problem" data-reveal><RuleThumb /><p><span>Automations</span> do exactly what they were told, whether or not it still makes sense.</p></div>
              <p className="slh-statement-last">{SCRUB.map((w, i) => <span key={i} className="slh-scrub">{w}</span>)}</p>
            </div>
          </div>
        </section>

        {/* 4 — One continuously updated model */}
        <section className="sl-dark slh-section slh-graph" aria-labelledby="graph-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">One model</p>
                <h2 id="graph-h" className="slh-h2">One continuously updated model of the business.</h2>
              </div>
              <p className="sl-p">Records from every connected system become customers, suppliers, products, invoices, payments and stock, linked by what actually happened between them. Outside signals are matched to the parts of the business they touch. Every fact keeps where it came from.</p>
            </div>
            <div data-reveal><BusinessGraph /></div>
            <p className="sl-product-caption">Illustration on the fictional company from the hero.</p>
          </div>
        </section>

        {/* 4b — What it answers */}
        <section className="sl-section slh-outcomes" aria-labelledby="outcomes-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">What it answers</p>
                <h2 id="outcomes-h" className="slh-h2">Changes, risks, opportunities and decisions, found for you.</h2>
              </div>
              <p className="sl-p">Starlane reasons across your internal records and outside signals together, and brings forward only what deserves a person’s attention.</p>
            </div>
            <ul className="slh-out-grid">
              {OUTCOMES.map((o) => (
                <li key={o.k} className="slh-out" data-reveal>
                  <span className="slh-out-k sl-num">{o.k}</span>
                  <h3 className="sl-h3">{o.h}</h3>
                  <p className="sl-p">{o.b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 — Signal to verified outcome */}
        <section className="sl-dark slh-section slh-decision" aria-labelledby="decision-h">
          <div className="slh-glow" aria-hidden />
          <div className="sl-wrap slh-split">
            <div data-reveal>
              <p className="sl-eyebrow">Signal to outcome</p>
              <h2 id="decision-h" className="slh-h2">Every recommendation travels the same path, and every step is on the record.</h2>
              <ol className="slh-steps">
                <li><b>Signal</b><span>Something changes in your systems or in the world.</span></li>
                <li><b>Evidence</b><span>The records behind it, with observed, calculated and assumed labelled apart.</span></li>
                <li><b>Decision</b><span>Real options ranked by explicit rules, not a model’s taste. A person decides.</span></li>
                <li><b>Action</b><span>Carried out once, through the tool it belongs in.</span></li>
                <li><b>Verification</b><span>The next sync shows what actually happened, and Memory keeps it.</span></li>
              </ol>
            </div>
            <div className="slh-light-card" data-reveal><DecisionTrace /></div>
          </div>
        </section>

        {/* 5b — From decision to verified outcome */}
        <section className="sl-dark slh-section slh-loop" aria-labelledby="loop-h">
          <div className="slh-glow slh-glow-2" aria-hidden />
          <div className="sl-wrap">
            <div className="slh-center-head" data-reveal>
              <p className="sl-eyebrow">From decision to verified outcome</p>
              <h2 id="loop-h" className="slh-h2">You approve once. Starlane checks what actually happened.</h2>
              <p className="sl-p">The exact message is shown in full before you approve it. It goes out once, from the account owner’s own mailbox. When the payment reaches the accounting system, Starlane sees it on the next sync and records what worked.</p>
            </div>
            <div data-reveal><ApproveLoop /></div>
            <p className="sl-product-caption">Illustration on a fictional company. External messages are off by default and nothing is sent without approval.</p>
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
            <p className="sl-product-caption">Illustrations on the same fictional company. Nothing here is customer data.</p>
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
              <p className="sl-p">Not mock-ups. These are screens captured from the Starlane app in a test run, following one overdue invoice from the alert to the approved reminder and what Starlane learned.</p>
            </div>
            <div data-reveal><ProductTour /></div>
            <p className="sl-product-caption">Captured from the Starlane app on a test company’s books. The test company invoices in Indian rupees, so amounts here are in INR. External messages were switched off.</p>
          </div>
        </section>

        {/* 7 — A day with Starlane */}
        <section className="sl-dark slh-section slh-morning" aria-labelledby="morning-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">A day with Starlane</p>
                <h2 id="morning-h" className="slh-h2">Less time assembling the picture. More time deciding.</h2>
              </div>
              <p className="sl-p">One illustrative day at the fictional company: a few minutes of decisions in the morning, and the systems checked for what happened after.</p>
            </div>
            <Morning />
          </div>
        </section>

        {/* 8 — How Starlane thinks */}
        <section id="how" className="sl-section" aria-labelledby="how-h">
          <div className="sl-wrap">
            <p className="sl-eyebrow" data-reveal>How it works</p>
            <h2 id="how-h" className="slh-h2" style={{ maxWidth: 820, marginBottom: 56 }} data-reveal>From raw records to an outcome you can check.</h2>
            <div data-reveal><HowItThinks /></div>
          </div>
        </section>

        {/* 9 — Scan */}
        <section id="ask" className="sl-dark slh-section" aria-labelledby="ask-h">
          <div className="sl-wrap sl-ask-split">
            <div data-reveal>
              <p className="sl-eyebrow">Scan</p>
              <h2 id="ask-h" className="slh-h2">Ask anything about the business. It answers from your own data.</h2>
              <p className="sl-sub" style={{ marginTop: 22, maxWidth: 520 }}>
                Who owes the most, what cash looks like next month, which stock is running low. Starlane looks it up in your
                own invoices, customers, suppliers and forecast, and shows exactly what it looked at.
              </p>
              <ul className="sl-reasons" style={{ marginTop: 22 }}>
                <li>When your records can’t answer a question, it says so instead of guessing.</li>
                <li>It can draft a reminder for you to review; it never sends anything itself.</li>
                <li>It cannot change your records: no marking paid, no edits, no orders.</li>
              </ul>
              <div className="sl-hero-ctas"><Link href="/product/scan" className="sl-link-arrow">How Scan works</Link></div>
            </div>
            <div className="slh-light-card" data-reveal><AskDemo /></div>
          </div>
        </section>

        {/* 10 — Who it is for */}
        <section className="sl-section slh-who" aria-labelledby="who-h">
          <div className="sl-wrap">
            <div className="sl-split-head" data-reveal>
              <div>
                <p className="sl-eyebrow">Who it is for</p>
                <h2 id="who-h" className="slh-h2">For the people accountable for the whole business.</h2>
              </div>
              <p className="sl-p">Mid-market companies, enterprise teams and multi-location businesses, in any industry and any country. Everyone who makes or carries out a decision sees the same picture, the same evidence and the same record.</p>
            </div>
            <ul className="slh-who-grid">
              {AUDIENCE.map((x) => (
                <li key={x.k} className="slh-who-tile" data-reveal>
                  <span className="slh-who-k" aria-hidden>{x.k}</span>
                  <h3 className="sl-h3">{x.h}</h3>
                  <p className="sl-p">{x.b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 10b — On the phone */}
        <section className="sl-dark slh-section slh-phones" aria-labelledby="phones-h">
          <div className="slh-glow slh-glow-2" aria-hidden />
          <div className="sl-wrap">
            <div className="slh-center-head" data-reveal>
              <p className="sl-eyebrow">On your phone</p>
              <h2 id="phones-h" className="slh-h2">The decision finds you, wherever you are.</h2>
              <p className="sl-p">The same Bridge, alerts and approvals in your pocket, so a decision never waits for you to get back to your desk. The phone app is in testing; until it is published, Starlane runs in your phone’s browser.</p>
            </div>
            <PhoneRow />
            <p className="sl-product-caption" style={{ textAlign: "center" }}>Real screens from the Starlane phone app in testing, on a test company’s books, with amounts in INR.</p>
          </div>
        </section>

        {/* 11 — Integrations, with honest statuses */}
        <section id="connect" className="sl-dark slh-section slh-connect" aria-labelledby="connect-h">
          <div className="slh-sky" aria-hidden>
            <div className="slh-planet slh-planet-sm" />
          </div>
          <div className="sl-wrap slh-connect-inner">
            <div className="slh-center-head" data-reveal>
              <p className="sl-eyebrow">Integrations</p>
              <h2 id="connect-h" className="slh-display slh-connect-h">Connect to the systems your business already runs on.</h2>
              <p className="slh-lede">Read-only unless an action needs to write, nothing connected without consent, nothing scraped. Every connection below says exactly where it stands today.</p>
            </div>
            <IntegrationHub limit={4} />
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
              <h2 id="faq-h" className="slh-h2">What teams ask before they connect their systems.</h2>
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
            <h2 id="access-h" className="slh-display slh-final-h" data-reveal>Turn your business into a system that understands itself.</h2>
            <p className="slh-lede" data-reveal>
              Starlane is onboarding a small number of companies at a time, of any size and in any country, starting with
              those whose systems it can connect today. Tell us what you run; you will see straight away what a pilot would need.
            </p>
            <div className="slh-ctas" data-reveal>
              <Link href="/access" className="sl-btn sl-btn-solid slh-btn-lg">Request a pilot</Link>
              <DownloadButton where="access" className="sl-btn sl-btn-outline slh-btn-lg" />
            </div>
            <Link href="/access/status" className="sl-link-arrow slh-final-status">Check on an application</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

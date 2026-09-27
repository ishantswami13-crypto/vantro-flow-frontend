import "./landing.css";
import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { PlatformAvailability } from "@/components/marketing/PlatformAvailability";
import { DecisionTrace } from "@/components/marketing/landing/DecisionTrace";
import { HowItThinks } from "@/components/marketing/landing/HowItThinks";

// Starlane — public landing. Seven sections, one argument:
//   hero, problem, how it thinks, real product, connection,
//   trust and control, access.
// Everything shown is either the real product, the real connector list, or
// sample data that is labelled as such. No logos, testimonials or metrics.

const SURFACES = [
  { name: "The Bridge", body: "Today’s state of the business and the few things that need a decision." },
  { name: "Discover", body: "Signals and opportunities, each linked to the rows and events behind it." },
  { name: "Watch", body: "Conditions you care about, re-evaluated every 15 minutes against live data." },
  { name: "Simulate", body: "What happens to cash if a customer pays late or a rate moves — from your real baseline." },
  { name: "Control", body: "Approvals, the frozen payload of every action, and the audit trail." },
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

export default function LandingPage() {
  return (
    <div className="sl">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        {/* 1 — Hero */}
        <header className="sl-wrap sl-hero sl-hero-split">
          <div className="sl-hero-copy">
            <span className="sl-eyebrow">Now onboarding a small number of companies</span>
            <h1 className="sl-h1">Your company’s state, turned into decisions — and carried out.</h1>
            <p className="sl-sub" style={{ marginTop: 28, maxWidth: 520 }}>
              Starlane connects to the systems your business already runs on, builds one current picture of it, weighs
              the actions that could improve it, shows the evidence for each, and — once you approve — carries them out
              and checks what happened.
            </p>
            <div className="sl-hero-ctas">
              <Link href="/access" className="sl-btn sl-btn-solid">Get Starlane</Link>
              <a href="#how" className="sl-link-arrow">See how it works</a>
            </div>
            <PlatformAvailability />
          </div>
          <DecisionTrace />
        </header>

        {/* 2 — The problem */}
        <section className="sl-section sl-problem" aria-labelledby="problem-h">
          <div className="sl-wrap sl-problem-grid">
            <h2 id="problem-h" className="sl-h2">You have the data. You still have to decide.</h2>
            <div className="sl-problem-lines">
              <p><span>Dashboards</span> show what already happened.</p>
              <p><span>Reports</span> arrive after it mattered.</p>
              <p><span>Automations</span> do exactly what they were told, whether or not it still makes sense.</p>
              <p className="sl-problem-last">None of them answers the question an owner faces every morning: what should we do today, and why?</p>
            </div>
          </div>
        </section>

        {/* 3 — How Starlane thinks */}
        <section id="how" className="sl-section" aria-labelledby="how-h">
          <div className="sl-wrap">
            <h2 id="how-h" className="sl-h2" style={{ maxWidth: 760, marginBottom: 48 }}>From the rows in your books to an outcome you can check.</h2>
            <HowItThinks />
          </div>
        </section>

        {/* 4 — Real product */}
        <section id="product" className="sl-section" aria-labelledby="product-h">
          <div className="sl-wrap">
            <div className="sl-split-head">
              <div>
                <h2 id="product-h" className="sl-h2">An operating surface, not another dashboard.</h2>
              </div>
              <p className="sl-p">Starlane opens on what needs a decision. Every number can be opened to the rows and events behind it.</p>
            </div>
            <figure className="sl-frame sl-product-ui">
              <div className="sl-product-heading"><span>Impact view</span><span>Real product, fictional demo company</span></div>
              <div className="sl-product-capture">
                <Image src="/product/intelligence-impact-2xa.png" width={2368} height={448} sizes="(max-width: 767px) 100vw, 1180px"
                  alt="Starlane impact view for a replayed earthquake event: revenue exposed, time to stockout, affected orders and confidence for a fictional demo company." />
              </div>
            </figure>
            <p className="sl-product-caption"><span><strong>Real product view.</strong> A historical earthquake replayed against a fictional demo company’s suppliers and orders; not customer results.</span></p>
            <ul className="sl-surfaces">
              {SURFACES.map((s) => (
                <li key={s.name}><h3 className="sl-h3">{s.name}</h3><p className="sl-p">{s.body}</p></li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 — Connection */}
        <section id="connect" className="sl-section" aria-labelledby="connect-h">
          <div className="sl-wrap">
            <div className="sl-split-head">
              <div>
                <h2 id="connect-h" className="sl-h2">Connected the way each system allows — and no further.</h2>
              </div>
              <p className="sl-p">Every connection states what Starlane receives before you grant it. Nothing is connected without your consent, and nothing is scraped.</p>
            </div>
            <div className="sl-connect-grid">
              {CONNECTIONS.map((c) => (
                <article key={c.kind} className="sl-connect">
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

        {/* 6 — Trust and control */}
        <section id="trust" className="sl-section" aria-labelledby="trust-h">
          <div className="sl-wrap">
            <div className="sl-split-head">
              <div>
                <h2 id="trust-h" className="sl-h2">You stay in charge of every consequential step.</h2>
              </div>
              <p className="sl-p">Starlane is built to be checked. The parts that matter most are the ones it will not do without you.</p>
            </div>
            <div>
              {CONTROLS.map((r) => (
                <div key={r.l} className="sl-ev-row"><p className="sl-h3">{r.l}</p><p className="sl-p">{r.d}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* 7 — Access */}
        <section className="sl-section sl-section-monumental sl-access" aria-labelledby="access-h">
          <div className="sl-wrap">
            <h2 id="access-h" className="sl-h2" style={{ maxWidth: 780 }}>Starlane is onboarding a small number of companies at a time.</h2>
            <p className="sl-sub" style={{ maxWidth: 620, marginTop: 24 }}>
              We start with businesses that run on TallyPrime or can export their books, and are ready to connect real data.
              Tell us about yours; you will see straight away whether your systems are supported.
            </p>
            <div className="sl-hero-ctas">
              <Link href="/access" className="sl-btn sl-btn-solid">Get Starlane</Link>
              <Link href="/access/status" className="sl-link-arrow">Check on an application</Link>
            </div>
            <PlatformAvailability />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

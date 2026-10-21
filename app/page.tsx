import "./landing.css";
import "./home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { DownloadButton } from "@/components/marketing/DownloadButton";
import { DecisionTrace } from "@/components/marketing/landing/DecisionTrace";
import { HowItThinks } from "@/components/marketing/landing/HowItThinks";
import { Reveal } from "@/components/marketing/landing/Reveal";
import { HeroConsole } from "@/components/marketing/landing/HeroConsole";
import { BusinessGraph } from "@/components/marketing/landing/BusinessGraph";
import { CATEGORIES } from "@/components/marketing/landing/integrationsData";

// Starlane, public homepage. One argument in the order a leadership team meets
// it: the category and the product, the problem, the fragmentation behind it,
// one continuously updated model, what changes, how it works, how Starlane
// knows what it says, what it connects to, the controls, questions, access.
// Product pictures use a fictional company and say so. Integration statuses
// come from the same list as /integrations, which mirrors the backend
// connector registry. No logos, testimonials, certifications or metrics.

const SYSTEMS = [
  { k: "Accounting", v: "Invoices, payments, credit terms" },
  { k: "Banking", v: "Movements and balances" },
  { k: "CRM", v: "Accounts, pipeline, contacts" },
  { k: "Inventory", v: "Stock, cover, open orders" },
  { k: "Inboxes", v: "Promises, disputes, approvals" },
  { k: "Spreadsheets", v: "Everything that fits nowhere else" },
];

const CHANGES = [
  { h: "What changed overnight", b: "Every sync is compared with the last one, so the day starts with what moved." },
  { h: "Where exposure is building", b: "Receivables, suppliers, stock cover and customer behaviour, watched together while there is still time to act." },
  { h: "Why it happened", b: "Any figure opens to the records behind it." },
  { h: "What deserves attention", b: "A short list of decisions ranked by explicit rules and measured behaviour. Not a feed of alerts." },
  { h: "What each option would do", b: "Simulated as a range, with every assumption visible and yours to change." },
  { h: "Act, with approval", b: "Once a person approves, the action runs once, through the tool it belongs in." },
  { h: "Verify the result", b: "The next sync shows what actually happened, and Starlane remembers what worked." },
];

const SURFACES = [
  { name: "The Bridge", href: "/product/bridge", body: "What is owed, what is exposed and the decisions that need you." },
  { name: "Scan", href: "/product/scan", body: "Any customer, supplier or invoice, with the evidence." },
  { name: "Watch", href: "/product/watch", body: "Risks raised once and closed when resolved." },
  { name: "Missions", href: "/product/missions", body: "One objective, proposed step by step, measured against the books." },
  { name: "Simulate", href: "/product/simulate", body: "Likely outcomes as a range, assumptions visible." },
  { name: "Memory", href: "/product/memory", body: "How each customer really behaves, and where that was learned." },
  { name: "Prepared", href: "/product/prepared", body: "The next day, week and month, worked out ahead." },
];

const EVIDENCE = [
  { k: "Observed", b: "Read directly from a connected system. An invoice, a payment, a stock count." },
  { k: "Calculated", b: "Derived from observed facts by a stated rule. Days overdue, exposure, stock cover." },
  { k: "Assumed", b: "Used where the records are silent, and marked so you can correct it. Payment terms, lead times." },
  { k: "Simulated", b: "A range of likely outcomes, never a single promise. Collections over the next 30 days." },
];

// Verified against the product and the backend; nothing here is aspirational.
const CONTROLS = [
  { l: "Approval before action", d: "Actions wait for a person. Opening an approval link never approves anything; you confirm on the page." },
  { l: "Runs at most once", d: "What you approve is frozen when it is proposed, and each approved action runs once." },
  { l: "Evidence on every recommendation", d: "The records, the rule and the assumptions behind it, labelled apart." },
  { l: "Audit trail", d: "Every decision is recorded with who made it, when, what was proposed and what followed." },
  { l: "Read-only connections", d: "Starlane reads your systems. Each Bridge device has its own credentials, and you can revoke them." },
  { l: "External messages off by default", d: "Nothing goes to a customer or supplier until messaging is explicitly enabled, and then only with approval." },
  { l: "No silent changes to records", d: "Starlane never marks a payment received, changes an amount or deletes a record on its own." },
  { l: "Scoped to your company", d: "Every request is tied to the signed-in account, and data is read only within that company’s scope." },
];

const FAQ = [
  { q: "Which systems does it connect to today?", a: "TallyPrime through a small read-only bridge, CSV and Excel exports from any system (QuickBooks, Xero and Zoho Books exports are recognised), bank statement imports, Gmail for approved messages, and public feeds such as ECB exchange rates and USGS earthquakes. Direct connections to QuickBooks Online, Xero, Zoho Books, CRMs, commerce platforms and ERPs are planned, not built. Systems with an API, a database or an export can be added for a pilot through Starlane’s connector framework." },
  { q: "Can it change our records?", a: "No. Starlane never marks a payment received, changes an amount or deletes records on its own, and Scan cannot change records at all. It reads your systems and checks them again to see what actually happened after an action." },
  { q: "Will Starlane message customers on its own?", a: "No. External messages are off by default and stay off until they are explicitly enabled. Even then, every message waits for a person to approve it, the text is shown in full before you do, and each approved action runs at most once." },
  { q: "Is it built for larger companies?", a: "Evidence behind every recommendation, approvals before anything goes out and an audit trail of who decided what matter most where many people share one business. Starlane works with companies of any size, in any country whose systems it can connect." },
  { q: "Does Starlane hold security certifications?", a: "Not yet. Starlane does not claim SOC 2, ISO 27001 or similar certifications. During a pilot we take your team through the controls on this page and how they are built." },
  { q: "Where does it run?", a: "In the browser, and as a desktop app for Windows 10 and 11, 64-bit. A phone app is in testing. There is no Mac app yet." },
  { q: "How do we get started?", a: "Request a pilot and tell us what you run. You will see straight away which of your systems Starlane can connect today and what a pilot would need." },
];

const INT_TOTAL = CATEGORIES.reduce((n, c) => n + c.items.length, 0);

export default function LandingPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Reveal />
      <Nav tone="dark" />
      <main id="main">
        {/* 1. Category, then the product */}
        <header className="sx-dark sx-hero">
          <div className="sx-planet" aria-hidden />
          <div className="sl-wrap sx-hero-copy">
            <p className="sx-pill"><i aria-hidden />Now onboarding a select group of companies</p>
            <h1 className="sx-display">The intelligence layer <br className="sx-br" />for your business.</h1>
            <p className="sx-lede">
              Starlane connects the systems and signals behind your company, understands what changed and what
              matters, and helps turn decisions into action.
            </p>
            <div className="sx-ctas">
              <Link href="/access" className="sl-btn sl-btn-solid sx-btn">Request a pilot</Link>
              <a href="#how" className="sl-btn sl-btn-outline sx-btn">See how it works</a>
            </div>
          </div>
          <div className="sl-wrap sx-shot">
            <HeroConsole />
            <p className="sx-cap">Illustration on a fictional company, Halden Supply Co. Figures are examples.</p>
          </div>
        </header>

        {/* 2–3. The problem and the fragmentation behind it */}
        <section className="sx-section sx-ivory" aria-labelledby="problem-h">
          <div className="sl-wrap sx-two">
            <div data-reveal>
              <p className="sx-eyebrow"><span>01</span>The problem</p>
              <h2 id="problem-h" className="sx-h2">Your company produces more information than anyone can read.</h2>
              <p className="sx-p">The facts exist. They sit in systems that were never designed to talk to each other, and the work of connecting them falls to people.</p>
            </div>
            <dl className="sx-systems" data-reveal>
              {SYSTEMS.map((s) => (
                <div key={s.k}><dt>{s.k}</dt><dd>{s.v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="sl-wrap">
            <p className="sx-statement" data-reveal>
              Dashboards show the numbers. Automations follow their rules. <span>Neither tells you what changed, what matters, or what to do next.</span>
            </p>
          </div>
        </section>

        {/* 4. One continuously updated model */}
        <section className="sx-section sx-dark" aria-labelledby="model-h">
          <div className="sl-wrap">
            <div className="sx-head" data-reveal>
              <p className="sx-eyebrow"><span>02</span>One model</p>
              <h2 id="model-h" className="sx-h2">One continuously updated model of the business.</h2>
              <p className="sx-p">Records from every connected system become customers, suppliers, products, invoices, payments and stock, linked by what actually happened between them. Outside signals are matched to the parts of the business they touch. Every fact keeps its source.</p>
            </div>
            <div data-reveal><BusinessGraph /></div>
            <p className="sx-cap">Illustration on the same fictional company.</p>
          </div>
        </section>

        {/* 5. What changes */}
        <section className="sx-section sx-ivory" aria-labelledby="changes-h">
          <div className="sl-wrap sx-two sx-two-top">
            <div className="sx-sticky" data-reveal>
              <p className="sx-eyebrow"><span>03</span>What changes</p>
              <h2 id="changes-h" className="sx-h2">Less time assembling the picture. More time deciding.</h2>
              <p className="sx-p">Starlane does the reading and the connecting. People keep the judgement.</p>
            </div>
            <ol className="sx-list">
              {CHANGES.map((c, i) => (
                <li key={c.h} data-reveal>
                  <span className="sx-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.h}</h3>
                  <p>{c.b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 6. How it works, and the product surfaces */}
        <section id="how" className="sx-section sx-bone" aria-labelledby="how-h">
          <div className="sl-wrap">
            <div className="sx-head" data-reveal>
              <p className="sx-eyebrow"><span>04</span>How it works</p>
              <h2 id="how-h" className="sx-h2">From raw records to an outcome you can check.</h2>
            </div>
            <div data-reveal><HowItThinks /></div>

            <div className="sx-surfaces" data-reveal>
              <div className="sx-surfaces-head">
                <h3 className="sx-h3">Seven surfaces, one model.</h3>
                <Link href="/product" className="sx-link">Product details<span aria-hidden>→</span></Link>
              </div>
              <ul>
                {SURFACES.map((s) => (
                  <li key={s.name}>
                    <Link href={s.href}><b>{s.name}</b><span>{s.body}</span></Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Evidence */}
        <section className="sx-section sx-dark" aria-labelledby="evidence-h">
          <div className="sl-wrap">
            <div className="sx-head" data-reveal>
              <p className="sx-eyebrow"><span>05</span>Evidence</p>
              <h2 id="evidence-h" className="sx-h2">Every figure says how Starlane knows it.</h2>
              <p className="sx-p">Numbers are computed from your records, never written by a language model. Each one carries one of four labels.</p>
            </div>
            <dl className="sx-evidence" data-reveal>
              {EVIDENCE.map((e) => (
                <div key={e.k}><dt><i className={`sx-tag sx-tag-${e.k.toLowerCase()}`}>{e.k}</i></dt><dd>{e.b}</dd></div>
              ))}
            </dl>
            <div className="sx-trace" data-reveal><DecisionTrace /></div>
          </div>
        </section>

        {/* 8. Integrations, with honest statuses */}
        <section id="connect" className="sx-section sx-ivory" aria-labelledby="connect-h">
          <div className="sl-wrap">
            <div className="sx-head" data-reveal>
              <p className="sx-eyebrow"><span>06</span>Integrations</p>
              <h2 id="connect-h" className="sx-h2">Connect the systems your business already runs on.</h2>
              <p className="sx-p">Every connection carries its real status. Live works today. Planned is on the roadmap. Custom is built for your pilot on the connector framework.</p>
            </div>
            <table className="sx-int" data-reveal>
              <caption className="sl-sr">Integrations by category and status</caption>
              <thead><tr><th scope="col">Category</th><th scope="col">Live today</th><th scope="col">Planned or custom</th></tr></thead>
              <tbody>
                {CATEGORIES.map((c) => {
                  const live = c.items.filter((i) => i.s === "live").map((i) => i.n);
                  const rest = c.items.filter((i) => i.s !== "live").map((i) => i.n);
                  return (
                    <tr key={c.id}>
                      <th scope="row">{c.k}</th>
                      <td data-label="Live">{live.length ? live.join(", ") : <span className="sx-none">Not yet</span>}</td>
                      <td data-label="Planned or custom">{rest.length ? rest.join(", ") : <span className="sx-none">All live</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="sx-after" data-reveal><Link href="/integrations" className="sx-link">All {INT_TOTAL} integrations and what each status means<span aria-hidden>→</span></Link></p>
          </div>
        </section>

        {/* 9. Trust and control: real capabilities only */}
        <section id="trust" className="sx-section sx-dark" aria-labelledby="trust-h">
          <div className="sl-wrap sx-two sx-two-top">
            <div className="sx-sticky" data-reveal>
              <p className="sx-eyebrow"><span>07</span>Trust and control</p>
              <h2 id="trust-h" className="sx-h2">You stay in charge of every consequential step.</h2>
              <p className="sx-p">Starlane does not yet hold third-party security certifications, and does not claim them. These are the controls it has today.</p>
              <p className="sx-after"><Link href="/security" className="sx-link">Security details<span aria-hidden>→</span></Link></p>
            </div>
            <dl className="sx-controls">
              {CONTROLS.map((c) => (
                <div key={c.l} data-reveal><dt>{c.l}</dt><dd>{c.d}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        {/* 10. Questions */}
        <section id="faq" className="sx-section sx-ivory" aria-labelledby="faq-h">
          <div className="sl-wrap sx-two sx-two-top">
            <div data-reveal>
              <p className="sx-eyebrow"><span>08</span>Questions</p>
              <h2 id="faq-h" className="sx-h2">What teams ask before they connect their systems.</h2>
            </div>
            <div className="sx-faq" data-reveal>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary><span>{f.q}</span><i aria-hidden /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 11. Access */}
        <section className="sx-dark sx-final" aria-labelledby="access-h">
          <div className="sx-planet sx-planet-low" aria-hidden />
          <div className="sl-wrap sx-final-copy">
            <h2 id="access-h" className="sx-display sx-final-h" data-reveal>Bring Starlane into your organization.</h2>
            <p className="sx-lede" data-reveal>
              Starlane is onboarding a small number of companies at a time. Tell us what you run, and you will see which
              systems connect today and what a pilot would need.
            </p>
            <div className="sx-ctas" data-reveal>
              <Link href="/access" className="sl-btn sl-btn-solid sx-btn">Request a pilot</Link>
            </div>
            <p className="sx-final-links" data-reveal>
              <DownloadButton where="access" className="" label="Download for Windows" />
              <Link href="/access/status">Check on an application</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

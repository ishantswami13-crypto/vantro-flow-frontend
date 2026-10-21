import "./landing.css";
import "./home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { TodaySurface, DecisionSurface } from "@/components/marketing/landing/ProductSurfaces";
import { GROUPS, groupItems } from "@/components/marketing/landing/integrationsData";

// Starlane, public homepage. Seven sections: what Starlane is, with the
// product; the problem; how it works; one decision in full; integrations;
// control and deployment; access. Light is the working surface; dark is kept
// for the product in depth and the close. Product surfaces use a fictional
// company and say so. Integration statuses come from the same list as
// /integrations, which mirrors the backend connector registry. No logos,
// testimonials, certifications or metrics.

const SYSTEMS = [
  { k: "Accounting and ERP", has: "Invoices, payments, terms, orders", gap: "Which overdue balance is about to matter" },
  { k: "Banking", has: "Movements and balances", gap: "Whether expected cash actually arrived" },
  { k: "CRM", has: "Accounts, contacts, pipeline", gap: "Which customer is quietly ordering less" },
  { k: "Inventory", has: "Stock, cover, open orders", gap: "Which shortage reaches which customer order" },
  { k: "Communication", has: "Promises, disputes, approvals", gap: "Who committed to what, and whether it happened" },
  { k: "External signals", has: "Exchange rates, public events", gap: "Which part of the business they touch" },
];

const LOOP = [
  { k: "Signal", h: "Know what changed", b: "Each sync is compared with the last. Material changes are raised; the rest stays quiet." },
  { k: "Context", h: "Connect it to the business", b: "Customers, suppliers, products, invoices and payments are held as one model, linked by what happened between them." },
  { k: "Evidence", h: "See the basis", b: "Figures are labelled as fact, calculated, assumption or estimate, with the records they came from." },
  { k: "Decision", h: "Compare before committing", b: "Real options are ranked by explicit rules and simulated as ranges. A person decides." },
  { k: "Action", h: "Act with control", b: "Proposed actions wait for approval. The message you approve is the message sent, once." },
  { k: "Verification", h: "Check the result", b: "Afterwards, Starlane checks the books for what actually happened, and records the outcome." },
];

// Verified against the product and backend; see /security.
const CONTROLS = [
  { k: "Approval queue", b: "Proposed actions wait for a person, and higher-risk action types always require approval. Opening an approval link changes nothing." },
  { k: "Runs at most once", b: "Each approved action is claimed atomically and runs at most once. The message text you approve is the text sent." },
  { k: "Evidence on record", b: "Figures keep their basis (fact, calculated, assumption or estimate) and the records behind them." },
  { k: "Audit trail", b: "Decisions are logged with who made them, when, and the values before and after." },
  { k: "Read-only connections", b: "TallyPrime is read through export only. Each Bridge device has its own credential, which you can revoke." },
  { k: "Outbound messaging off by default", b: "Nothing is sent to customers or suppliers until messaging is explicitly enabled. AI agents are blocked from marking payments received, changing amounts or deleting records." },
];

const DEPLOY = [
  { k: "Your systems stay", b: "Starlane sits alongside them. Nothing is migrated or replaced." },
  { k: "Where it runs", b: "In the browser, and as a Windows 10 and 11 desktop app for pilots. A phone app is in testing." },
  { k: "Scope", b: "Every request is scoped to the signed-in account, and each business’s data stays within its own account." },
  { k: "Leaving", b: "Revoke the bridge credentials and the connection stops." },
];

export default function LandingPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        {/* 01 — What Starlane is, and the product */}
        <header className="st-hero">
          <div className="st-wrap st-grid">
            <div className="st-hero-copy">
              <h1 className="st-display">The intelligence layer for your business.</h1>
              <p className="st-lead">
                Starlane brings the systems, signals and operating context of a company into one continuously updated
                view, so teams can see what changed, decide what matters and act with evidence.
              </p>
              <div className="st-actions">
                <Link href="/access" className="sl-btn sl-btn-solid st-btn">Request a pilot</Link>
                <a href="#product" className="st-textlink">Explore the product<span aria-hidden>→</span></a>
              </div>
              <p className="st-meta st-hero-meta">Private pilots · Selected organizations</p>
            </div>
            <div className="st-hero-shot">
              <TodaySurface />
              <p className="st-cap">Illustration on a fictional company. Figures are examples.</p>
            </div>
          </div>
        </header>

        {/* 02 — The problem */}
        <section className="st-section" aria-labelledby="problem-h">
          <div className="st-wrap st-grid">
            <div className="st-col-head">
              <p className="st-meta">The problem</p>
              <h2 id="problem-h" className="st-h2">Your company already knows what happened. The knowledge is spread across systems.</h2>
              <p className="st-body">Each system answers its own questions well. The questions that matter sit between them, and connecting them is left to people, reports and memory.</p>
            </div>
            <div className="st-col-body">
              <table className="st-table st-sys">
                <caption className="sl-sr">What each system holds, and what it cannot tell you on its own</caption>
                <thead><tr><th scope="col">System</th><th scope="col">Holds</th><th scope="col">Can’t tell you alone</th></tr></thead>
                <tbody>
                  {SYSTEMS.map((s) => (
                    <tr key={s.k}><th scope="row">{s.k}</th><td data-label="Holds">{s.has}</td><td data-label="Can’t tell you alone">{s.gap}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 03 — How it works: the operating model */}
        <section id="how" className="st-section st-stone" aria-labelledby="how-h">
          <div className="st-wrap">
            <div className="st-head">
              <p className="st-meta">How Starlane works</p>
              <h2 id="how-h" className="st-h2">One operating model, from signal to verified outcome.</h2>
            </div>
            <ol className="st-loop">
              {LOOP.map((s, i) => (
                <li key={s.k}>
                  <p className="st-loop-k"><span>{String(i + 1).padStart(2, "0")}</span>{s.k}</p>
                  <h3>{s.h}</h3>
                  <p>{s.b}</p>
                </li>
              ))}
            </ol>
            <p className="st-loop-foot">
              Sources connect read-only: a local bridge for TallyPrime, file imports from any system, and public feeds.
              <Link href="/product" className="st-textlink">How each part works<span aria-hidden>→</span></Link>
            </p>
          </div>
        </section>

        {/* 04 — One decision, in full */}
        <section id="product" className="st-section st-ink" aria-labelledby="product-h">
          <div className="st-wrap">
            <div className="st-head st-head-split">
              <div>
                <p className="st-meta">The product</p>
                <h2 id="product-h" className="st-h2">One decision, with everything behind it.</h2>
              </div>
              <p className="st-body">The overdue balance from this morning’s view, opened. The evidence, the options, the exact action and who must approve it, on one screen.</p>
            </div>
            <DecisionSurface />
            <p className="st-cap">Illustration on the same fictional company.</p>
          </div>
        </section>

        {/* 05 — Integrations */}
        <section id="connect" className="st-section" aria-labelledby="connect-h">
          <div className="st-wrap st-grid">
            <div className="st-col-head">
              <p className="st-meta">Integrations</p>
              <h2 id="connect-h" className="st-h2">Works with the systems your business already runs on.</h2>
              <p className="st-body">Every connection carries its real status. Live works today. Planned is on the roadmap. Custom is built for your pilot on the connector framework.</p>
              <p className="st-after"><Link href="/integrations" className="st-textlink">See every integration and its status<span aria-hidden>→</span></Link></p>
            </div>
            <div className="st-col-body">
              <table className="st-table st-int">
                <caption className="sl-sr">Integrations by category: live today, and planned or custom</caption>
                <thead><tr><th scope="col">Category</th><th scope="col">Connects today</th><th scope="col">Planned, or custom for a pilot</th></tr></thead>
                <tbody>
                  {GROUPS.map((g) => {
                    const items = groupItems(g.ids);
                    const live = items.filter((i) => i.s === "live").map((i) => i.n);
                    const next = items.filter((i) => i.s !== "live").map((i) => i.n);
                    return (
                      <tr key={g.k}>
                        <th scope="row">{g.k}</th>
                        <td data-label="Connects today">{live.length ? live.join(", ") : <span className="st-none">None yet</span>}</td>
                        <td data-label="Planned, or custom for a pilot">{next.join(", ")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 06 — Control and deployment */}
        <section id="trust" className="st-section st-trust" aria-labelledby="trust-h">
          <div className="st-wrap st-grid">
            <div className="st-col-head">
              <p className="st-meta">Control</p>
              <h2 id="trust-h" className="st-h2">Designed for decisions that matter.</h2>
              <p className="st-body">Starlane recommends. People decide. Decisions are recorded.</p>
              <p className="st-after"><Link href="/security" className="st-textlink">Security and control<span aria-hidden>→</span></Link></p>
            </div>
            <div className="st-col-body">
              <dl className="st-rows">
                {CONTROLS.map((c) => <div key={c.k}><dt>{c.k}</dt><dd>{c.b}</dd></div>)}
              </dl>
              <h3 className="st-h3 st-sub">Deployment</h3>
              <dl className="st-rows">
                {DEPLOY.map((c) => <div key={c.k}><dt>{c.k}</dt><dd>{c.b}</dd></div>)}
              </dl>
              <p className="st-fine">Starlane does not hold SOC 2, ISO 27001 or other third-party certifications, and does not claim them.</p>
            </div>
          </div>
        </section>

        {/* 07 — Access */}
        <section className="st-section st-ink st-close" aria-labelledby="access-h">
          <div className="st-wrap st-grid">
            <div className="st-col-head">
              <h2 id="access-h" className="st-h2">Bring Starlane into your organization.</h2>
              <div className="st-actions">
                <Link href="/access" className="sl-btn sl-btn-solid st-btn">Request a pilot</Link>
                <Link href="/integrations" className="st-textlink">See integrations<span aria-hidden>→</span></Link>
              </div>
            </div>
            <ol className="st-col-body st-pilot">
              <li><span>01</span><b>Tell us what you run</b><p>We confirm which of your systems connect today and what a pilot would need.</p></li>
              <li><span>02</span><b>Connect read-only</b><p>Nothing in your systems changes. Messaging stays off unless you enable it.</p></li>
              <li><span>03</span><b>Review with your team</b><p>Work through real changes and decisions on your own data, with evidence.</p></li>
            </ol>
          </div>
        </section>
      </main>
      <Footer tone="dark" />
    </div>
  );
}

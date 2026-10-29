import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";
import { SystemsPlate, StatePlate, EvidenceStack } from "@/components/marketing/home/Plates";
import { WatchRoom, SimulationRoom, VerificationRecord } from "@/components/marketing/home/Rooms";
import { PlatformAvailability } from "@/components/marketing/PlatformAvailability";

export const metadata: Metadata = pageMetadata({
  path: "/platform",
  title: "Product",
  description:
    "How Starlane works, end to end: read-only connections to the systems you run, one model of the business, the changes that matter, the evidence and options behind each decision, and a check on what happened next.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// The product, in the order it works: connect, model, watch, decide, verify.
// Same fictional company as the homepage; every figure is illustrative.

const CAPTION = "Sample data · Fictional business · Narmada Pipes & Fittings";

const FEATURES: Array<[string, string, string]> = [
  ["/product/bridge", "The Bridge", "What you are owed, what is overdue, what needs you and what is coming, from your own books."],
  ["/product/scan", "Scan", "Look into any customer or invoice and see why it matters, or ask in plain words."],
  ["/product/watch", "Watch", "Invoices slipping, promises missed, syncs failing. Raised once, with evidence, closed when resolved."],
  ["/product/missions", "Missions", "One objective with a deadline, proposed step by step and measured against your books."],
  ["/product/simulate", "Simulate", "Likely collections, with every assumption visible and yours to change."],
  ["/product/memory", "Memory", "What Starlane learned about how you get paid, and your say on it."],
  ["/product/prepared", "Prepared", "The next 24 hours, 7 days and 30 days, worked out from the dates in your books."],
];

export default function PlatformPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/platform", "Product")} />
      <PageHero
        kicker="Product"
        title={<>One model of the business, <em>read every morning.</em></>}
        lead="Starlane connects to the systems you already run, keeps a single current record of what happened between customers, suppliers, stock and cash, and raises only what changed. Every figure carries its evidence, and every action waits for a person."
        index={[["#connect", "Connect"], ["#model", "Model"], ["#watch", "Watch"], ["#decide", "Decide"], ["#verify", "Verify"]]}
      >
        <div className="f-actions">
          <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
          <Link href="/product" className="f-link">Product guide<span aria-hidden>→</span></Link>
        </div>
      </PageHero>

      <section id="connect" className="f f-light" aria-labelledby="p1-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="01" k="Connect" />
            <h2 id="p1-h" className="f-h2">Read-only, from what you already run.</h2>
            <p className="f-lede">Nothing in your systems changes.</p>
            <p className="f-body">TallyPrime is read through a local bridge with a revocable credential per device. Bank statements, stock and spreadsheets arrive as exports. Your team logs the promises customers make. External feeds are switched on per pilot.</p>
            <p className="f-note"><span className="f-key f-key-solid" />Live today <span className="f-key f-key-dash" />Planned or custom</p>
            <p className="f-after"><Link href="/integrations" className="f-link">Every integration and its status<span aria-hidden>→</span></Link></p>
          </div>
          <div className="f-main"><SystemsPlate /></div>
        </div>
      </section>

      <section id="model" className="f f-slab" aria-labelledby="p2-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="02" k="Model" />
              <h2 id="p2-h" className="f-h2">Every entity on one record.</h2>
            </div>
            <div>
              <p className="f-lede">Every customer, invoice, payment, promise and order, on one record that stays current.</p>
              <p className="f-body">Starlane links entities by what actually happened between them, updates the record as each system syncs, and marks changes where they occur.</p>
            </div>
          </div>
          <StatePlate />
        </div>
      </section>

      <section id="watch" className="f f-dark" aria-labelledby="p3-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="03" k="Watch" />
              <h2 id="p3-h" className="f-h2">Only what changed, and why it matters.</h2>
            </div>
            <p className="f-body">Watch compares each sync with the last. A change is raised once, with its exposure and the records behind it, and closed when it resolves. The rest stays quiet.</p>
          </div>
        </div>
        <div className="f-bleed"><WatchRoom /></div>
      </section>

      <section id="decide" className="f f-light" aria-labelledby="p4-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="04" k="Decide" />
            <h2 id="p4-h" className="f-h2">Every figure shows its work.</h2>
            <p className="f-lede">Fact, calculation, assumption or estimate, and always the record it came from.</p>
            <p className="f-body">Open a decision and its reasoning comes apart into layers you can check. No language model produces these numbers; they come from your records and rules you can read.</p>
            <dl className="f-tags">
              <div><dt><i className="tag tag-fact">Fact</i></dt><dd>Read from a system</dd></div>
              <div><dt><i className="tag tag-calc">Calculated</i></dt><dd>Derived from facts</dd></div>
              <div><dt><i className="tag tag-asm">Assumption</i></dt><dd>Stated, and yours to change</dd></div>
              <div><dt><i className="tag tag-est">Estimate</i></dt><dd>A simulated range</dd></div>
            </dl>
          </div>
          <div className="f-main"><EvidenceStack /></div>
        </div>
      </section>

      <section className="f f-dark f-room" aria-labelledby="p5-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="04" k="Simulate" />
            <h2 id="p5-h" className="f-h2">Compare before committing.</h2>
            <p className="f-body">Real options are simulated as ranges against this customer’s own history, and ranked by rules you can read. A person decides.</p>
            <dl className="s6-dec">
              <div><dt>Decision</dt><dd>Escalate Gupta Traders</dd></div>
              <div><dt>Owed</dt><dd className="num">₹18,42,000 · 47 days</dd></div>
              <div><dt>Horizon</dt><dd>30 days</dd></div>
            </dl>
          </div>
          <div className="f-main"><SimulationRoom /></div>
        </div>
      </section>

      <section id="verify" className="f f-slab f-verify" aria-labelledby="p6-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="05" k="Verify" />
              <h2 id="p6-h" className="f-h2">It checks what happened next.</h2>
            </div>
            <p className="f-lede">An approved action runs once, exactly as approved. Then Starlane watches the books to see whether it worked.</p>
          </div>
          <VerificationRecord />
          <p className="f-cap">{CAPTION} · Outbound messaging and outcome checks are off by default.</p>
        </div>
      </section>

      <section className="f f-light" aria-labelledby="p7-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index k="In the product" />
              <h2 id="p7-h" className="f-h2">Seven places to work.</h2>
            </div>
            <div>
              <p className="f-body">Everything above lives in seven features, the same seven in the sidebar when you sign in. The product guide covers each one, page by page, with its real status.</p>
              <PlatformAvailability />
            </div>
          </div>
          <ul className="ft-list">
            {FEATURES.map(([href, k, b], i) => (
              <li key={href}>
                <Link href={href}>
                  <span className="ft-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{k}</h3>
                  <p>{b}</p>
                  <span className="gd-go" aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CloseBand title="See it on your own books." secondary={["/integrations", "Check your systems"]} />
    </SiteShell>
  );
}

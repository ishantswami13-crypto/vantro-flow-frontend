import "./landing.css";
import "./start.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { HeroStage } from "@/components/marketing/home/HeroStage";
import { SystemsPlate, StatePlate, EvidenceStack } from "@/components/marketing/home/Plates";
import { WatchRoom, SimulationRoom, VerificationRecord } from "@/components/marketing/home/Rooms";
import { Glyph } from "@/components/marketing/home/Glyph";
import { InView, MotionGate } from "@/components/marketing/home/InView";
import { CATEGORIES, type Item } from "@/components/marketing/landing/integrationsData";

// Starlane, public homepage. Ten frames that tell one story on one fictional
// company (Halden Supply Co.): the systems, the business as a record, what
// changed, the evidence, the options, and what happened afterwards. Dark
// sections are product rooms; light sections are the editorial argument.
// Every product figure is illustrative and labelled so. Every capability
// shown exists in the product; integration statuses come from the registry.

const CAPTION = "Illustrative workflow · Fictional company · Halden Supply Co";

const BAND: Array<{ k: string; ids: string[] }> = [
  { k: "Finance", ids: ["accounting", "banking"] },
  { k: "ERP", ids: ["erp"] },
  { k: "CRM", ids: ["crm"] },
  { k: "Commerce", ids: ["commerce", "payments"] },
  { k: "Data", ids: ["spreadsheets", "inventory", "databases"] },
  { k: "Communication", ids: ["communication", "support"] },
  { k: "External", ids: ["world"] },
];
const bandItems = (ids: string[]): Item[] => CATEGORIES.filter((c) => ids.includes(c.id)).flatMap((c) => c.items);
const COUNT = (s: string) => CATEGORIES.reduce((n, c) => n + c.items.filter((i) => i.s === s).length, 0);

const CONTROLS = [
  { g: "gate", k: "Approval queue", b: "Proposed actions wait for a person. Higher-risk types always require approval." },
  { g: "once", k: "Runs at most once", b: "Each approved action is claimed once. The text you approve is the text sent." },
  { g: "evidence", k: "Evidence on record", b: "Every figure keeps its basis and the source records behind it." },
  { g: "audit", k: "Audit trail", b: "Who decided, when, and the values before and after, in an append-only log." },
  { g: "readonly", k: "Read-only connections", b: "TallyPrime is read through export only, with a revocable credential per device." },
  { g: "signal", k: "Messaging off by default", b: "Nothing reaches a customer or supplier until outbound messaging is enabled." },
];

function Index({ n, k }: { n: string; k: string }) {
  return <p className="f-index"><span>S/{n}</span>{k}</p>;
}

export default function LandingPage() {
  return (
    <div className="sl sl-start">
      <MotionGate />
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav tone="dark" />
      <main id="main">
        {/* 01 · Hero */}
        <header className="f f-dark f-hero">
          <div className="f-wrap f-grid">
            <div className="f-hero-copy">
              <h1 className="f-display">The intelligence layer for your business.</h1>
              <p className="f-lead">
                Starlane reads the systems your company already runs, keeps one living model of the business, and
                shows what changed, what it means and what to do, with the evidence behind it.
              </p>
              <div className="f-actions">
                <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
                <a href="#how" className="f-link">See how it works<span aria-hidden>→</span></a>
              </div>
              <ul className="f-facts">
                <li><Glyph name="readonly" />Read-only connections</li>
                <li><Glyph name="evidence" />Every figure sourced</li>
                <li><Glyph name="gate" />A person approves</li>
              </ul>
              <p className="f-meta">Private pilots with selected organizations</p>
            </div>
            <div className="f-hero-stage">
              <HeroStage />
            </div>
          </div>
          <div className="f-wrap"><p className="f-cap f-hero-cap">{CAPTION}</p></div>
        </header>

        {/* 02 · Fragmented systems */}
        <section id="how" className="f f-light" aria-labelledby="f2-h">
          <div className="f-wrap f-grid">
            <div className="f-side">
              <Index n="02" k="Fragmented systems" />
              <h2 id="f2-h" className="f-h2">Your company already knows what happened.</h2>
              <p className="f-lede">The questions that matter sit between your systems.</p>
              <p className="f-body">Accounting knows the balance. Your team knows the promise. The bank knows whether the money arrived. Nobody connects them until it is late.</p>
              <p className="f-note"><span className="f-key f-key-solid" />Live today <span className="f-key f-key-dash" />Planned or custom</p>
            </div>
            <div className="f-main"><SystemsPlate /></div>
          </div>
        </section>

        {/* 03 · The business as a record */}
        <section className="f f-slab" aria-labelledby="f3-h">
          <div className="f-wrap">
            <div className="f-head f-head-split">
              <div>
                <Index n="03" k="One model" />
                <h2 id="f3-h" className="f-h2">One model of the business.</h2>
              </div>
              <div>
                <p className="f-lede">Every customer, invoice, payment, promise and order, on one record that stays current.</p>
                <p className="f-body">Starlane links entities by what actually happened between them, updates the record as each system syncs, and marks changes where they occur.</p>
              </div>
            </div>
            <StatePlate />
          </div>
        </section>

        {/* 04 · Know what changed */}
        <section id="product" className="f f-dark" aria-labelledby="f4-h">
          <div className="f-wrap">
            <div className="f-head f-head-split">
              <div>
                <Index n="04" k="Know what changed" />
                <h2 id="f4-h" className="f-h2">07:42. Four things changed.</h2>
              </div>
              <p className="f-body">Only material changes are raised, each with its exposure and the records behind it. The rest stays quiet.</p>
            </div>
          </div>
          <div className="f-bleed"><WatchRoom /></div>
        </section>

        {/* 05 · Evidence */}
        <section className="f f-light" aria-labelledby="f5-h">
          <div className="f-wrap f-grid">
            <div className="f-side">
              <Index n="05" k="Evidence" />
              <h2 id="f5-h" className="f-h2">Every figure shows its work.</h2>
              <p className="f-lede">Fact, calculation, assumption or estimate, and always the record it came from.</p>
              <p className="f-body">Open any decision and its reasoning comes apart into layers you can check, from the invoices it started with to the check that will follow it.</p>
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

        {/* 06 · Simulation */}
        <section className="f f-dark f-room" aria-labelledby="f6-h">
          <div className="f-wrap f-grid">
            <div className="f-side">
              <Index n="06" k="Simulate" />
              <h2 id="f6-h" className="f-h2">Compare before committing.</h2>
              <p className="f-body">Real options are simulated as ranges against this customer’s own history, and ranked by rules you can read. A person decides.</p>
              <dl className="s6-dec">
                <div><dt>Decision</dt><dd>Escalate Brightwater Retail</dd></div>
                <div><dt>Owed</dt><dd className="num">$184,200 · 47 days</dd></div>
                <div><dt>Horizon</dt><dd>30 days</dd></div>
              </dl>
            </div>
            <div className="f-main"><SimulationRoom /></div>
          </div>
        </section>

        {/* 07 · Action, then verification */}
        <section className="f f-slab f-verify" aria-labelledby="f7-h">
          <div className="f-wrap">
            <div className="f-head f-head-split">
              <div>
                <Index n="07" k="Verify" />
                <h2 id="f7-h" className="f-h2">It checks what happened next.</h2>
              </div>
              <p className="f-lede">Most software stops at the recommendation. Starlane watches the books afterwards.</p>
            </div>
            <VerificationRecord />
            <p className="f-cap">{CAPTION} · Outbound messaging and outcome checks are off by default.</p>
          </div>
        </section>

        {/* 08 · Integrations */}
        <section className="f f-light" aria-labelledby="f8-h">
          <div className="f-wrap">
            <div className="f-head f-head-split">
              <div>
                <Index n="08" k="Integrations" />
                <h2 id="f8-h" className="f-h2">Works with the systems you already run.</h2>
              </div>
              <div>
                <p className="f-body">Every connection carries its real status: {COUNT("live")} live today, {COUNT("planned")} planned, {COUNT("custom")} that can be built for a pilot on the connector framework. External feeds are switched on per pilot.</p>
                <p className="f-after"><Link href="/integrations" className="f-link">See every integration<span aria-hidden>→</span></Link></p>
              </div>
            </div>
            <InView className="i8">
              {BAND.map((b) => (
                <div key={b.k} className="i8-col">
                  <h3 className="i8-k">{b.k}</h3>
                  <ul>
                    {bandItems(b.ids).map((i) => (
                      <li key={i.n} className={`i8-${i.s}`}><i aria-hidden />{i.n}<span className="sl-sr"> ({i.s})</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </InView>
            <ul className="i8-legend">
              <li className="i8-live"><i aria-hidden />Live</li>
              <li className="i8-planned"><i aria-hidden />Planned</li>
              <li className="i8-custom"><i aria-hidden />Custom, can be built for a pilot</li>
            </ul>
          </div>
        </section>

        {/* 09 · Control */}
        <section id="trust" className="f f-dark f-room f-control" aria-labelledby="f9-h">
          <div className="f-wrap f-grid">
            <div className="f-side">
              <Index n="09" k="Control" />
              <h2 id="f9-h" className="f-statement">Built for control.</h2>
              <p className="f-body">Starlane recommends. People decide. Every decision is recorded.</p>
              <p className="f-after"><Link href="/security" className="f-link">Security and control<span aria-hidden>→</span></Link></p>
            </div>
            <div className="f-main">
              <InView as="ul" className="c9">
                {CONTROLS.map((c, i) => (
                  <li key={c.k} style={{ "--n": i } as React.CSSProperties}><Glyph name={c.g} size={20} /><h3>{c.k}</h3><p>{c.b}</p></li>
                ))}
              </InView>
              <p className="c9-foot">Scope: every request is limited to the signed-in account. Starlane holds no third-party security certifications and claims none.</p>
            </div>
          </div>
        </section>

        {/* 10 · Close */}
        <section className="f f-dark f-close" aria-labelledby="f10-h">
          <div className="f-close-bg" aria-hidden />
          <div className="f-wrap">
            <div className="f-close-copy">
              <h2 id="f10-h" className="f-display f-display-close">Bring Starlane into your organization.</h2>
              <div className="f-actions">
                <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
                <Link href="/integrations" className="f-link">See integrations<span aria-hidden>→</span></Link>
              </div>
            </div>
            <ol className="f-steps">
              <li><span>01</span><b>Tell us what you run</b><p>We confirm which of your systems connect today and what a pilot needs.</p></li>
              <li><span>02</span><b>Connect read-only</b><p>Nothing in your systems changes. Messaging stays off unless you enable it.</p></li>
              <li><span>03</span><b>Review with your team</b><p>Work through real changes and decisions on your own data, with the evidence.</p></li>
            </ol>
          </div>
        </section>
      </main>
      <Footer tone="dark" />
    </div>
  );
}

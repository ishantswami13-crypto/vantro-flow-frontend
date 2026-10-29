import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";
import { Stack3D, type Plate } from "@/components/marketing/site/Stack3D";
import { Glyph } from "@/components/marketing/home/Glyph";

export const metadata: Metadata = pageMetadata({
  path: "/pricing",
  title: "Pricing and pilots",
  description:
    "Starlane is available through private pilots. How a pilot runs, what it includes, what stays off by default, and how pricing is agreed.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Starlane is sold through private pilots; pricing is agreed directly. This
// page describes the pilot as the access flow and product actually run it,
// and states plainly what is off by default or not yet supported.

const STEPS = [
  ["Apply", "Three short steps: your company, the systems you run, and what you want to change. You see an explained assessment straight away, produced by fixed rules rather than AI."],
  ["Scope", "We confirm which of your systems connect today, what would be custom work, and who approves actions on your side."],
  ["Connect read-only", "TallyPrime through the local bridge; bank statements, stock and spreadsheets as exports. Nothing in your systems changes."],
  ["Review with your team", "Work through real changes and decisions on your own data, with the evidence. Then decide whether to continue, and on what terms."],
];

const INCLUDED: Array<[string, string, string]> = [
  ["system", "The seven features", "Ask Starlane, Approvals, Decisions, Monitors, Tasks, Scenarios and Memory, on your own data."],
  ["readonly", "Live connections", "Every integration marked Live, connected read-only."],
  ["external", "Custom connectors where needed", "Systems not in the catalogue can be built for the pilot on the connector framework."],
  ["gate", "A walkthrough of the controls", "We take your team through each control on the security page and how it is built."],
];

const OFF: Array<[string, string]> = [
  ["Outbound messaging", "Off until you enable it for the account. Even then, each message waits for approval."],
  ["External feeds", "Exchange rates and public events are switched on per pilot."],
  ["Organisations and SSO", "Multi-user organisations and single sign-on are not supported yet."],
];

const FAQ: Array<[string, string]> = [
  ["What does a pilot need from us?", "Someone who knows which systems you run, access to TallyPrime on one Windows machine or exports of the rest, and a person who will approve or decline what Starlane proposes."],
  ["Does Starlane change anything in our systems?", "No. Connections are read-only. TallyPrime is read through export only, and each bridge device has its own credential, which you can revoke."],
  ["Will Starlane contact our customers?", "Not unless outbound messaging is enabled for your account, and then only with text a person has approved, sent once."],
  ["Are the numbers produced by AI?", "No language model produces the figures. They come from your records, simple calculations and simulations you can inspect, each labelled as fact, calculated, assumption or estimate."],
];

const HERO_PLATES: Plate[] = [
  { k: "Step 1", title: "Apply", lines: 2 },
  { k: "Step 2", title: "Connect read-only", lines: 2 },
  { k: "Step 3", title: "Mornings on your data", lines: 2 },
  { k: "Step 4", title: "Decide", kind: "top", lines: 2 },
];

export default function PricingPage() {
  return (
    <SiteShell>
      <JsonLd data={[breadcrumb("/pricing", "Pricing and pilots"), {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      }]} />
      <PageHero
        kicker="Pricing and pilots"
        visual={<Stack3D plates={HERO_PLATES} variant="stairs" label="Four steps rising: apply, connect read-only, mornings on your own data, then decide." />}
        title={<>Start with a pilot, <em>on your own books.</em></>}
        lead="Starlane is available through private pilots with selected organizations. We agree pricing with each organization directly, once you have seen what Starlane does with your data."
        index={[["#pilot", "How a pilot runs"], ["#included", "What is included"], ["#faq", "Questions"]]}
      >
        <div className="f-actions">
          <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
          <Link href="/integrations" className="f-link">Check your systems<span aria-hidden>→</span></Link>
        </div>
      </PageHero>

      <section id="pilot" className="f f-light" aria-labelledby="pr1-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="01" k="How a pilot runs" />
              <h2 id="pr1-h" className="f-h2">Four steps, nothing changed in your systems.</h2>
            </div>
            <p className="f-body">You decide at the end whether Starlane earned a place, on your data rather than a demo.</p>
          </div>
          <ol className="f-steps pr-steps">
            {STEPS.map(([k, b], i) => (
              <li key={k}><span>{String(i + 1).padStart(2, "0")}</span><b>{k}</b><p>{b}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="included" className="f f-dark f-room" aria-labelledby="pr2-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="02" k="What is included" />
            <h2 id="pr2-h" className="f-h2">The whole product, on your data.</h2>
            <p className="f-body">A pilot is not a cut-down trial. What is off by default stays off until you choose otherwise.</p>
          </div>
          <div className="f-main">
            <ul className="c9">
              {INCLUDED.map(([g, k, b]) => <li key={k}><Glyph name={g} size={20} /><h3>{k}</h3><p>{b}</p></li>)}
            </ul>
            <h3 className="sg-k pr-off-k">Off by default, or not yet supported</h3>
            <ul className="pz-list">
              {OFF.map(([k, v]) => <li key={k}><h4 className="pz-h">{k}</h4><p>{v}</p></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="f f-light" aria-labelledby="pr3-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="03" k="Questions" />
            <h2 id="pr3-h" className="f-h2">Before you apply.</h2>
          </div>
          <div className="f-main">
            <div className="qa">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary><span>{q}</span><i aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CloseBand title="Apply in three short steps." secondary={["/platform", "See the product"]} />
    </SiteShell>
  );
}

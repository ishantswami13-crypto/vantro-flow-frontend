import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";
import { Stack3D, type Plate } from "@/components/marketing/site/Stack3D";
import { InView } from "@/components/marketing/home/InView";

export const metadata: Metadata = pageMetadata({
  path: "/company",
  title: "Company",
  description:
    "Why Starlane exists, the principles it is built on, and where it is today. Starlane is built by Vantro Technologies.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Company. No team, funding, customer or location claims: only why the product
// exists, the principles visible in how it is built, and an honest status.

const PRINCIPLES = [
  ["Evidence before assertion", "Every figure carries the records it came from and says whether it is a fact, a calculation, an assumption or an estimate. If Starlane cannot show its work, it does not show the number."],
  ["People decide", "Starlane recommends. A person approves, and the approval is recorded. Actions that would mark a payment received, change an amount or delete a record are blocked outright."],
  ["Read before write", "Connections are read-only. Nothing in your systems changes, and nothing reaches a customer or supplier until messaging is enabled and a person approves it."],
  ["Quiet by default", "Only material changes are raised. The measure of a good morning is how little you had to read to know what mattered."],
  ["Say what is absent", "Every integration carries its real status, and the security page lists what Starlane does not claim. We would rather lose a deal than imply something exists."],
];

const HERO_PLATES: Plate[] = [
  { k: "Read from a system", title: "Fact", lines: 3 },
  { k: "Derived from facts", title: "Calculation", lines: 3 },
  { k: "Stated, yours to change", title: "Assumption", lines: 3 },
  { k: "Shown with its working", title: "Decision", kind: "top", lines: 3 },
];

export default function CompanyPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/company", "Company")} />
      <PageHero
        kicker="Company"
        visual={<Stack3D plates={HERO_PLATES} variant="stack" label="Four layers of a decision: fact, calculation and assumption beneath the decision they support." />}
        title={<>Software that <em>shows its work.</em></>}
        lead="Starlane is built by Vantro Technologies. We think the people who run a business should know each morning what changed, why it matters and what to do, without taking anyone’s word for it, including ours."
      />

      <section className="f f-light" aria-labelledby="c1-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="01" k="Why Starlane" />
            <h2 id="c1-h" className="f-h2">The facts are already there.</h2>
          </div>
          <div className="f-main co-prose">
            <p className="f-lede">The facts of a business are spread across its accounts, its bank, its stock and what customers said on the phone.</p>
            <p className="f-body">Each system is right about its own part. The trouble lives between them: a promise that was missed while the invoice still looked current, a supplier bill that grew because a currency moved, an order that depends on stock that is running out. By the time someone joins them up, the money is late.</p>
            <p className="f-body">Starlane joins them up every morning, from the systems a company already runs, and puts the few things that matter in front of the person who can act, with everything needed to check them.</p>
          </div>
        </div>
      </section>

      <section className="f f-dark f-room" aria-labelledby="c2-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="02" k="Principles" />
              <h2 id="c2-h" className="f-h2">Five rules the product is built on.</h2>
            </div>
            <p className="f-body">Each one is visible in how Starlane behaves, not only in what this page says.</p>
          </div>
          <InView as="ol" className="co-pr">
            {PRINCIPLES.map(([k, b], i) => (
              <li key={k} style={{ "--n": i } as React.CSSProperties}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{k}</h3>
                <p>{b}</p>
              </li>
            ))}
          </InView>
        </div>
      </section>

      <section className="f f-slab" aria-labelledby="c3-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="03" k="Where we are" />
            <h2 id="c3-h" className="f-h2">Early, and honest about it.</h2>
          </div>
          <div className="f-main">
            <p className="f-lede" style={{ marginTop: 0 }}>Starlane runs in private pilots with selected organizations.</p>
            <p className="f-body">You will not find customer logos or results on this site yet. We will show them when they are real and when the companies behind them agree. Until then, every product figure here is illustrative, on a fictional company, and labelled so.</p>
          </div>
        </div>
      </section>

      <section className="f f-light" aria-labelledby="c4-h">
        <div className="f-wrap">
          <div className="f-head">
            <Index n="04" k="Contact" />
            <h2 id="c4-h" className="f-h2">Talk to us.</h2>
          </div>
          <ul className="pz-list">
            <li><h3 className="pz-h">Pilots</h3><p>Apply in three short steps. Tell us what you run and what you want to change. <Link href="/access" className="f-inline">Request a pilot</Link></p></li>
            <li><h3 className="pz-h">Security</h3><p>Report a vulnerability privately before disclosing it. <Link href="/security#disclosure" className="f-inline">How to report</Link></p></li>
            <li><h3 className="pz-h">Existing pilots</h3><p>Sign in to Starlane, or use the link in your approval email. <Link href="/login" className="f-inline">Sign in</Link></p></li>
          </ul>
        </div>
      </section>

      <CloseBand title="Bring Starlane into your organization." />
    </SiteShell>
  );
}

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell, Paint } from "@/components/marketing/hx/Shell";
import { Hero, Panel } from "@/components/marketing/hx/Blocks";
import { Gallery } from "@/components/marketing/hx/Interactive";
import { CommandCenterMock, DecisionMock, PlanMock, SourcesMock, LedgerMock, MemoryMock } from "@/components/marketing/hx/Mocks";

export const metadata: Metadata = pageMetadata({
  path: "/company",
  title: "Company",
  description:
    "Why Starlane exists, the principles it is built on, and where it is today. Starlane is built by Vantro Technologies.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Company. No team, funding, customer or location claims: only why the product
// exists, the principles visible in how it is built, and an honest status.

const PRINCIPLES: Array<[string, string, React.ReactNode, "moss" | "slate" | "clay" | "plum" | "umber" | "stone"]> = [
  ["Evidence before assertion", "Every figure carries the records it came from and says whether it is a fact, a calculation, an assumption or an estimate.", <DecisionMock key="a" />, "stone"],
  ["People decide", "Starlane recommends. A person approves, and the approval is recorded. Actions that would mark a payment received, change an amount or delete a record are blocked.", <PlanMock key="b" />, "plum"],
  ["Read before write", "Connections are read-only. Nothing reaches a customer or supplier until messaging is enabled and a person approves it.", <SourcesMock key="c" />, "moss"],
  ["Quiet by default", "Only material changes are raised. A good morning is measured by how little you had to read.", <CommandCenterMock key="d" />, "slate"],
  ["Say what is absent", "Every integration carries its real status, and the security page lists what Starlane does not claim.", <LedgerMock key="e" />, "clay"],
  ["Learn, and show it", "What Starlane learns about how a business gets paid is shown in plain words, and is yours to change.", <MemoryMock key="f" className="fit" />, "umber"],
];

const SLIDES: Array<[string, "night" | "umber" | "slate" | "plum"]> = [
  ["The facts of a business are already there.", "night"],
  ["The trouble lives between the systems.", "umber"],
  ["Starlane joins them up every morning.", "slate"],
  ["And leaves the decision to a person.", "plum"],
];

export default function CompanyPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/company", "Company")} />
      <Hero variant="stack" kicker="Company" title={<>We’re helping finance teams know what changed, and act on it</>} cta={null} />

      <section className="hx-s pt64" aria-label="Starlane at a glance">
        <div className="hx-w">
          <ul className="hx-tri">
            {[["Read-only", "Connections to your systems"], ["Sourced", "Every figure, with its record"], ["Approved", "Every outbound step, by a person"]].map(([n, l], i) => (
              <li key={n} className="hx-r" style={{ "--d": i } as React.CSSProperties}><p className="hx-num sm">{n}</p><p>{l}</p></li>
            ))}
          </ul>
        </div>
        <Gallery slides={SLIDES.map(([t, tone], i) => <Fragment key={t}><Paint id={`gal-${i}`} tone={tone} seed={i * 5 + 3} /><p>{t}</p></Fragment>)} />
      </section>

      <section className="hx-s pt128 pb128" aria-labelledby="why-h">
        <div className="hx-w hx-2">
          <h2 id="why-h" className="hx-h2 hx-r">Why Starlane</h2>
          <div className="hx-r" style={{ display: "grid", gap: 16 }}>
            <p className="hx-lead" style={{ color: "var(--fg)" }}>The facts of a business are spread across its accounts, its bank, its stock and what customers said on the phone.</p>
            <p className="hx-b1" style={{ fontSize: "calc(18px * var(--s))" }}>Each system is right about its own part. The trouble lives between them: a promise that was missed while the invoice still looked current, a supplier bill that grew because a currency moved, an order that depends on stock that is running out. By the time someone joins them up, the money is late. Starlane joins them up every morning, from the systems a company already runs, and puts the few things that matter in front of the person who can act, with everything needed to check them.</p>
          </div>
        </div>
        <div className="hx-w hx-tiles" style={{ marginTop: "calc(96px * var(--s))" }}>
          {PRINCIPLES.map(([h, b, view, tone], i) => (
            <article key={h} className="hx-tile hx-r" style={{ "--d": i % 3 } as React.CSSProperties}>
              <Panel id={`pr-${i}`} tone={tone} seed={i * 3 + 1} kind="">{view}</Panel>
              <h3 className="hx-h4">{h}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hx-s pt64 pb128" aria-label="A line we hold to">
        <div className="hx-w hx-pull hx-r">
          <blockquote>“If Starlane cannot show its work, it does not show the number.”</blockquote>
          <p>The rule every screen in Starlane is built to</p>
        </div>
      </section>

      <section className="hx-s alt pt128 pb128" aria-labelledby="now-h">
        <div className="hx-w hx-stack">
          <h2 id="now-h" className="hx-h2 hx-r">Where We Are</h2>
          <ul>
            <li className="hx-r"><small>Status</small><b>Private pilots with selected organisations</b><p>You will not find customer logos or results on this site yet. We will show them when they are real and the businesses behind them agree.</p><Link href="/pilots" className="hx-arrow hx-b2">How a pilot runs <i>→</i></Link></li>
            <li className="hx-r"><small>Product</small><b>Every figure on this site is sample data</b><p>Product views show a fictional business, and are labelled so.</p><Link href="/platform" className="hx-arrow hx-b2">See the platform <i>→</i></Link></li>
            <li className="hx-r"><small>Builder</small><b>Starlane is built by Vantro Technologies</b><p>Questions about pilots, security or an existing account all start with the links below.</p><Link href="/security#disclosure" className="hx-arrow hx-b2">Report a vulnerability <i>→</i></Link></li>
          </ul>
        </div>
      </section>

      <section className="hx-s pt128 pb128" aria-labelledby="talk-h">
        <div className="hx-w">
          <h2 id="talk-h" className="hx-split-h hx-r">Talk to us. <span>Request a pilot, or sign in to the one you have.</span></h2>
          <div className="hx-acts hx-r" style={{ marginTop: 32 }}>
            <Link href="/access" className="hx-btn">Request a Pilot</Link>
            <Link href="/login" className="hx-btn line">Sign In</Link>
          </div>
        </div>
      </section>
    </HxShell>
  );
}

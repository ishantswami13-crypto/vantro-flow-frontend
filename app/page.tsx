import "./landing.css";
import "./start.css";
import "./site.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, SITE_URL, pageMetadata } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteShell, Index, CloseBand } from "@/components/marketing/site/Site";
import { HeroConsole } from "@/components/marketing/site/HeroConsole";
import { SystemsPlate, EvidenceStack } from "@/components/marketing/home/Plates";
import { WatchRoom, VerificationRecord } from "@/components/marketing/home/Rooms";
import { Glyph } from "@/components/marketing/home/Glyph";
import { InView } from "@/components/marketing/home/InView";
import { CATEGORIES } from "@/components/marketing/landing/integrationsData";

// Starlane, public homepage. The short version of one story on one fictional
// company (Halden Supply Co.): what changed, why, what to do, and what
// happened next. Each frame hands off to the page that covers it in depth.
// Every product figure is illustrative and labelled so. Every capability shown
// exists in the product; integration statuses come from the registry.

const CAPTION = "Illustrative · Fictional company · Halden Supply Co.";

const COUNT = (s: string) => CATEGORIES.reduce((n, c) => n + c.items.filter((i) => i.s === s).length, 0);
// Live connections by name (registry status "live"); public feeds are opt-in per pilot.
const LIVE = ["TallyPrime", "Excel", "CSV", "Google Sheets exports", "Bank statements", "Accounting exports", "Stock exports"];

const CONTROLS = [
  { g: "gate", k: "Approval queue", b: "Proposed actions wait for a person. Higher-risk types always require approval." },
  { g: "once", k: "Runs at most once", b: "Each approved action is claimed once. The text you approve is the text sent." },
  { g: "audit", k: "Audit trail", b: "Who decided, when, and the values before and after, in an append-only log." },
  { g: "signal", k: "Messaging off by default", b: "Nothing reaches a customer or supplier until outbound messaging is enabled." },
];

const PAGES = [
  { href: "/platform", g: "system", k: "Product", b: "Connect, model, watch, decide and verify: the whole loop, frame by frame." },
  { href: "/integrations", g: "external", k: "Integrations", b: `${COUNT("live")} live today, ${COUNT("planned")} planned, and custom work for a pilot. Every status is real.` },
  { href: "/security", g: "readonly", k: "Security", b: "The controls that exist now, in plain words, and what Starlane does not claim." },
  { href: "/pricing", g: "range", k: "Pricing", b: "How a pilot runs, what it includes, and how pricing is agreed afterwards." },
  { href: "/company", g: "scope", k: "Company", b: "Why Starlane exists and the principles it is built on." },
];

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: `${SITE.name} · ${SITE.tagline}`,
  absoluteTitle: true,
  description: SITE.description,
});

export const viewport: Viewport = { themeColor: "#0B0D10" };

// Who publishes the site, the site itself, and the product, for search engines.
const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE.name,
      legalName: SITE.legalName,
      url: SITE_URL,
      logo: `${SITE_URL}/branding/starlane-icon-light-512.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE.name,
      description: SITE.description,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE.name,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE.description,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function LandingPage() {
  return (
    <SiteShell>
      <JsonLd data={STRUCTURED} />
      {/* 01 · Hero */}
      <header className="f f-dark hx hx-c hx-cine">
        <div className="hx-stars" aria-hidden />
        <div className="hx-horizon" aria-hidden />
        <div className="f-wrap hx-top">
          <Link href="/pricing" className="hx-kicker">Private pilots now open<span aria-hidden>→</span></Link>
          <h1 className="f-display hx-h"><span>Know what changed</span> <em>before it costs you.</em></h1>
          <p className="f-lead hx-lead">
            Starlane reads the systems you already run and puts the few changes that matter in front of you each
            morning, with the evidence behind every figure. A person decides.
          </p>
          <div className="f-actions hx-actions">
            <Link href="/access" className="sl-btn sl-btn-solid sl-btn-lg">Request a pilot</Link>
            <Link href="/platform" className="f-link">See the product<span aria-hidden>→</span></Link>
          </div>
        </div>
        <div className="f-wrap hx-base">
          <ul className="hx-facts">
            <li>Read-only connections</li>
            <li>Every figure sourced</li>
            <li>Nothing sent without approval</li>
          </ul>
        </div>
        <div className="hx-stage">
          <div className="f-wrap"><HeroConsole /></div>
        </div>
        <div className="f-wrap hx-foot"><p className="f-cap">{CAPTION}</p></div>
      </header>

      {/* Live sources, by name */}
      <section className="f-light rb" aria-labelledby="rb-h">
        <div className="f-wrap rb-in">
          <h2 id="rb-h" className="rb-k">Reads from, today</h2>
          <ul className="rb-list">
            {LIVE.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <Link href="/integrations" className="f-link rb-more">All integrations<span aria-hidden>→</span></Link>
        </div>
      </section>

      {/* 02 · Fragmented systems */}
      <section id="how" className="f f-light" aria-labelledby="f2-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="01" k="The problem" />
            <h2 id="f2-h" className="f-h2">Your company already knows what happened.</h2>
            <p className="f-lede">The questions that matter sit between your systems.</p>
            <p className="f-body">Accounting knows the balance. Your team knows the promise. The bank knows whether the money arrived. Nobody connects them until it is late.</p>
            <p className="f-note"><span className="f-key f-key-solid" />Live today <span className="f-key f-key-dash" />Planned or custom</p>
          </div>
          <div className="f-main"><SystemsPlate /></div>
        </div>
      </section>

      {/* 03 · Know what changed */}
      <section className="f f-dark" aria-labelledby="f4-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="02" k="Know what changed" />
              <h2 id="f4-h" className="f-h2">07:42. Four things changed.</h2>
            </div>
            <div>
              <p className="f-body">Only material changes are raised, each with its exposure and the records behind it. The rest stays quiet, so the four that matter are the four you see.</p>
              <p className="f-after"><Link href="/platform#watch" className="f-link">How Watch works<span aria-hidden>→</span></Link></p>
            </div>
          </div>
        </div>
        <div className="f-bleed"><WatchRoom /></div>
      </section>

      {/* 04 · Evidence */}
      <section className="f f-light" aria-labelledby="f5-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="03" k="Evidence" />
            <h2 id="f5-h" className="f-h2">Every figure shows its work.</h2>
            <p className="f-lede">Fact, calculation, assumption or estimate, and always the record it came from.</p>
            <p className="f-body">Open any decision and its reasoning comes apart into layers you can check, from the invoices it started with to the check that will follow it. No language model produces these numbers.</p>
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

      {/* 05 · Action, then verification */}
      <section className="f f-slab f-verify" aria-labelledby="f7-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="04" k="Verify" />
              <h2 id="f7-h" className="f-h2">It checks what happened next.</h2>
            </div>
            <div>
              <p className="f-lede">Most software stops at the recommendation. Starlane watches the books afterwards.</p>
              <p className="f-after"><Link href="/platform#verify" className="f-link">From decision to outcome<span aria-hidden>→</span></Link></p>
            </div>
          </div>
          <VerificationRecord />
          <p className="f-cap">{CAPTION} · Outbound messaging and outcome checks are off by default.</p>
        </div>
      </section>

      {/* 06 · Control */}
      <section className="f f-dark f-room f-control" aria-labelledby="f9-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="05" k="Control" />
            <h2 id="f9-h" className="f-statement">Starlane recommends. People decide.</h2>
            <p className="f-body">Every decision is recorded, and nothing is sent to a customer or supplier without a person saying so.</p>
            <p className="f-after"><Link href="/security" className="f-link">Security and control<span aria-hidden>→</span></Link></p>
          </div>
          <div className="f-main">
            <InView as="ul" className="c9">
              {CONTROLS.map((c, i) => (
                <li key={c.k} style={{ "--n": i } as React.CSSProperties}><Glyph name={c.g} size={20} /><h3>{c.k}</h3><p>{c.b}</p></li>
              ))}
            </InView>
          </div>
        </div>
      </section>

      {/* 07 · Go deeper */}
      <section className="f f-light gd" aria-labelledby="gd-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index k="Go deeper" />
              <h2 id="gd-h" className="f-h2">Everything, checked page by page.</h2>
            </div>
            <p className="f-body">Each page says what exists today and what does not. Start where your questions are.</p>
          </div>
          <InView as="ul" className="gd-list">
            {PAGES.map((p, i) => (
              <li key={p.href} style={{ "--n": i } as React.CSSProperties}>
                <Link href={p.href}>
                  <Glyph name={p.g} size={20} />
                  <h3>{p.k}</h3>
                  <p>{p.b}</p>
                  <span className="gd-go" aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </InView>
        </div>
      </section>

      <CloseBand title="Bring Starlane into your organization." />
    </SiteShell>
  );
}

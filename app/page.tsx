import "./landing.css";
import "./start.css";
import "./site.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, SITE_URL, pageMetadata } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteShell, Index, CloseBand } from "@/components/marketing/site/Site";
import { HeroBrief } from "@/components/marketing/site/HeroBrief";
import { ApprovalPhone } from "@/components/marketing/site/ApprovalPhone";
import { SystemsPlate, EvidenceStack } from "@/components/marketing/home/Plates";
import { WatchRoom, VerificationRecord } from "@/components/marketing/home/Rooms";
import { Glyph } from "@/components/marketing/home/Glyph";
import { InView } from "@/components/marketing/home/InView";

// Starlane, public homepage. The short version of one story on one fictional
// company (Narmada Pipes & Fittings): what changed, why, what to do, and what
// happened next. Each frame hands off to the page that covers it in depth.
// Every product figure is illustrative and labelled so. Every capability shown
// exists in the product; integration statuses come from the registry.

const CAPTION = "Sample data · Fictional business · Narmada Pipes & Fittings";

// Live connections by name (registry status "live"); public feeds are opt-in per pilot.
const LIVE = ["TallyPrime", "Excel", "CSV", "Google Sheets exports", "Bank statements", "Accounting exports", "Stock exports"];

const CONTROLS = [
  { g: "gate", k: "Approval queue", b: "Proposed actions wait for a person. Higher-risk types always require approval." },
  { g: "once", k: "Runs at most once", b: "Each approved action is claimed once. The text you approve is the text sent." },
  { g: "audit", k: "Audit trail", b: "Who decided, when, and the values before and after, in an append-only log." },
  { g: "signal", k: "Messaging off by default", b: "Nothing reaches a customer or supplier until outbound messaging is enabled." },
];

const DOES = [
  "Reads TallyPrime, bank statements and stock, read-only",
  "Compares today with yesterday and raises only material changes",
  "Shows the records behind every figure",
  "Drafts reminders and estimates what they may bring in, as a range",
  "Can check the books afterwards to see what actually happened",
];
const NEVER = [
  "Create, edit or delete entries in your books",
  "Mark a payment as received or change an amount",
  "Message a customer or supplier without your approval",
  "Lend money or act as a collection agency",
  "Let a language model produce your numbers",
];

const PILOT = [
  ["Apply", "Three short steps: your business, the systems you run, and what you want to change."],
  ["Connect read-only", "TallyPrime through a local bridge on one Windows machine; bank statements and stock as exports. Nothing in your systems changes."],
  ["Mornings on your own data", "Real changes, with the evidence, and decisions that wait for you."],
  ["Decide", "Continue or stop. Pricing is agreed with you once you have seen what Starlane finds."],
];

const FAQ: Array<[string, string]> = [
  ["Does Starlane change anything in Tally?", "No. Connections are read-only. TallyPrime is read through export only, and each bridge device has its own credential, which you can revoke."],
  ["Will Starlane message my customers?", "Not unless outbound messaging is enabled for your account, and then only with text you have approved, sent once."],
  ["Are the numbers made up by AI?", "No language model produces the figures. They come from your records, simple calculations and simulations you can inspect, each labelled fact, calculated, assumption or estimate."],
  ["What do I need for a pilot?", "Someone who knows which systems you run, TallyPrime on one Windows machine or exports of the rest, and a person who will approve or decline what Starlane proposes."],
  ["Who can see my data?", "Every request is scoped to your account, and one account is one business. Passwords are hashed and sign-in is rate-limited. The security page lists each control and what Starlane does not claim."],
  ["What does it cost?", "Starlane is available through private pilots, and pricing is agreed with each business once you have seen what it finds in your own data."],
];


const HOME_DESCRIPTION =
  "A morning brief for owners who run on Tally. Starlane reads TallyPrime, bank statements and stock, read-only, shows the few changes worth your attention with the evidence behind every figure, and sends nothing to a customer until you approve it.";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: `${SITE.name} · Morning cash brief for businesses on Tally`,
  absoluteTitle: true,
  description: HOME_DESCRIPTION,
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
      <JsonLd data={[STRUCTURED, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }]} />
      {/* 01 · Hero */}
      <header className="f f-dark hx hx-c hx-cine">
        <div className="hx-scene" aria-hidden>
          <picture>
            {/* Phones skip the picture: the brief is the first screen there, and a
                transparent pixel keeps the image off a slow connection. */}
            <source media="(max-width: 760px)" srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
            <img
              src="/brand/hero-dawn-1600.webp"
              srcSet="/brand/hero-dawn-1600.webp 1600w, /brand/hero-dawn-2560.webp 2560w"
              sizes="100vw"
              alt=""
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="f-wrap hx-split">
          <div className="hx-copy">
            <Link href="/pricing" className="hx-kicker">Private pilots now open<span aria-hidden>→</span></Link>
            <h1 className="f-display hx-h">
              <span>Who owes you.</span> <span>Who broke a promise.</span> <span>Who to call <em>today.</em></span>
            </h1>
            <p className="f-lead hx-lead">
              Starlane reads your TallyPrime, bank statements and stock, read-only. Each morning it shows the few changes
              worth your attention, with the evidence behind every figure.<span className="hx-lead-x"> Nothing reaches a customer until you approve it.</span>
            </p>
            <div className="f-actions hx-actions">
              <Link href="/access" className="sl-btn sl-btn-solid sl-btn-lg">Request a pilot</Link>
              <Link href="#brief" className="f-link">See a sample brief<span aria-hidden>→</span></Link>
            </div>
            <ul className="hx-micro">
              <li>Read-only access</li>
              <li>Nothing sent without your approval</li>
              <li>Every figure sourced</li>
            </ul>
          </div>
          <div className="hx-shot"><HeroBrief /></div>
        </div>
      </header>

      {/* Live sources, by name */}
      <section className="f-light rb" aria-labelledby="rb-h">
        <div className="f-wrap rb-in">
          <h2 id="rb-h" className="rb-k">Works with what you already run</h2>
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
            <h2 id="f2-h" className="f-h2">Your business already knows what happened.</h2>
            <p className="f-lede">The questions that matter sit between your systems.</p>
            <p className="f-body">Accounting knows the balance. Your team knows the promise. The bank knows whether the money arrived. Nobody connects them until it is late.</p>
            <p className="f-note"><span className="f-key f-key-solid" />Live today <span className="f-key f-key-dash" />Planned or custom</p>
          </div>
          <div className="f-main"><SystemsPlate /></div>
        </div>
      </section>

      {/* 03 · Know what changed */}
      <section id="brief" className="f f-dark" aria-labelledby="f4-h">
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
            <h2 id="f5-h" className="f-h2">Every number shows its working.</h2>
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

      {/* 06 · Approval */}
      <section className="f f-dark f-room f-control" aria-labelledby="f9-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="05" k="Approval" />
            <h2 id="f9-h" className="f-h2">You approve. Then it sends.</h2>
            <p className="f-body">Starlane drafts the reminder in your words and waits. Approve it, change it or skip it from your phone. The text you approve is the text that goes, once, and every step is logged.</p>
            <p className="f-after"><Link href="/security" className="f-link">Security and control<span aria-hidden>→</span></Link></p>
          </div>
          <div className="f-main"><ApprovalPhone /></div>
        </div>
        <div className="f-wrap">
          <InView as="ul" className="c9 c9-row">
            {CONTROLS.map((c, i) => (
              <li key={c.k} style={{ "--n": i } as React.CSSProperties}><Glyph name={c.g} size={20} /><h3>{c.k}</h3><p>{c.b}</p></li>
            ))}
          </InView>
        </div>
      </section>

      {/* 07 · Does and does not */}
      <section className="f f-light dn" aria-labelledby="dn-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="06" k="Plainly" />
              <h2 id="dn-h" className="f-h2">What Starlane does, and what it never does.</h2>
            </div>
            <p className="f-body">Your books stay yours. Starlane reads them, and it is blocked from changing them.</p>
          </div>
          <div className="dn-cols">
            <div className="dn-col">
              <h3>Does</h3>
              <ul>{DOES.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <div className="dn-col dn-not">
              <h3>Never does</h3>
              <ul>{NEVER.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* 08 · Pilot */}
      <section className="f f-dark pl" aria-labelledby="pl-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="07" k="Private pilot" />
            <h2 id="pl-h" className="f-h2">Start on your own books.</h2>
            <p className="f-body">Starlane is available through private pilots with a small number of businesses. You see what it finds in your own data before you decide anything, and we agree pricing with you afterwards.</p>
            <div className="f-actions pl-actions">
              <Link href="/access" className="sl-btn sl-btn-solid sl-btn-lg">Request a pilot</Link>
              <Link href="/pricing" className="f-link">How a pilot runs<span aria-hidden>→</span></Link>
            </div>
          </div>
          <div className="f-main">
            <ol className="pl-steps">
              {PILOT.map(([k, v], i) => (
                <li key={k}><span className="num">{String(i + 1).padStart(2, "0")}</span><h3>{k}</h3><p>{v}</p></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 09 · Questions */}
      <section id="faq" className="f f-light fq" aria-labelledby="fq-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="08" k="Questions" />
            <h2 id="fq-h" className="f-h2">Asked by owners, answered plainly.</h2>
          </div>
          <div className="f-main">
            <div className="fq-list">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CloseBand title="Fewer surprises. Faster cash." />
    </SiteShell>
  );
}

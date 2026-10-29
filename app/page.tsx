import "./landing.css";
import "./start.css";
import "./site.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, SITE_URL, pageMetadata } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteShell, CloseBand } from "@/components/marketing/site/Site";
import { HeroBrief } from "@/components/marketing/site/HeroBrief";
import { ApprovalPhone } from "@/components/marketing/site/ApprovalPhone";
import { Scene3D, type Plate } from "@/components/marketing/site/Stack3D";
import { WatchRoom } from "@/components/marketing/home/Rooms";

// Starlane, public homepage. Deliberately short: the promise, the product,
// three rules, the morning view, the approval, and questions. The detail lives
// on the platform, security and pricing pages. Product figures are sample data
// on a fictional business and labelled so.

// Live connections by name (registry status "live"); public feeds are opt-in per pilot.
const LIVE = ["TallyPrime", "Excel", "CSV", "Google Sheets", "Bank statements", "Stock exports"];

const LAYERS: Plate[] = [
  { k: "Source", title: "TallyPrime", lines: 4 },
  { k: "Source", title: "Bank statements", lines: 3 },
  { k: "Source", title: "Stock", lines: 3 },
  { k: "Starlane", title: "Morning brief", kind: "top", lines: 4 },
];
const LAYERS_LEGEND: Array<[string, string]> = [
  ["TallyPrime", "Read through a local bridge, export only."],
  ["Bank statements", "Imported as statement files."],
  ["Stock", "Levels and movements, from your exports."],
  ["Morning brief", "What changed since yesterday, with the records behind it."],
];

const RULES = [
  ["Read-only.", "Starlane reads TallyPrime, bank statements and stock. Nothing in your books is created, changed or deleted."],
  ["Sourced.", "Every figure is marked fact, calculation, assumption or estimate, with the record it came from."],
  ["Approved.", "Nothing reaches a customer until you approve the exact text, and it is sent once."],
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

export const viewport: Viewport = { themeColor: "#0F0E0D" };

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
      <header className="f f-dark ex-hero">
        <div className="f-wrap">
          <h1 className="ex-h">
            <span>Who owes you.</span> <span>Who broke a promise.</span> <span>Who to call <em>today.</em></span>
          </h1>
          <p className="ex-lead">
            A morning brief from your TallyPrime, bank statements and stock. Every figure sourced. Nothing sent without your approval.
          </p>
          <div className="ex-actions">
            <Link href="/access" className="sl-btn sl-btn-solid sl-btn-lg">Request a pilot</Link>
            <Link href="#brief" className="f-link">See a sample brief<span aria-hidden>→</span></Link>
          </div>
          <div className="ex-shot"><HeroBrief /></div>
          <div className="ex-works">
            <h2 className="ex-works-k">Works with what you already run</h2>
            <ul>{LIVE.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        </div>
      </header>

      <section className="f f-light ex-layers" aria-labelledby="ex-layers-h">
        <div className="f-wrap">
          <div className="ex-head">
            <h2 id="ex-layers-h" className="ex-h2">Three systems. One morning view.</h2>
            <p className="ex-sub">Starlane reads each one, read-only, and keeps a single record of what happened between customers, suppliers, stock and cash.</p>
          </div>
          <Scene3D plates={LAYERS} legend={LAYERS_LEGEND} label="TallyPrime, bank statements and stock, stacked as layers beneath one morning brief." />
        </div>
      </section>


      <section id="brief" className="f f-dark ex-sec" aria-labelledby="ex-watch-h">
        <div className="f-wrap ex-head">
          <h2 id="ex-watch-h" className="ex-h2">Four things changed overnight. You see those four.</h2>
          <p className="ex-sub">Only material changes are raised, each with its exposure and the records behind it. Everything else stays quiet.</p>
        </div>
        <div className="f-bleed"><WatchRoom /></div>
      </section>

      <section className="f f-light ex-rules" aria-labelledby="ex-rules-h">
        <div className="f-wrap">
          <h2 id="ex-rules-h" className="ex-h2">Three rules it never breaks.</h2>
          <ol className="ex-tri">
            {RULES.map(([k, v]) => <li key={k}><h3>{k}</h3><p>{v}</p></li>)}
          </ol>
          <p className="ex-more"><Link href="/security" className="f-link">Security and control<span aria-hidden>→</span></Link></p>
        </div>
      </section>

      <section className="f f-dark ex-sec ex-approve" aria-labelledby="ex-ap-h">
        <div className="f-wrap ex-split">
          <div>
            <h2 id="ex-ap-h" className="ex-h2">You approve. Then it sends.</h2>
            <p className="ex-sub">Starlane drafts the reminder in your words and waits. Approve, edit or skip it from your phone. The text you approve is the text that goes, once, and every step is logged.</p>
            <p className="ex-more"><Link href="/platform" className="f-link">See the product<span aria-hidden>→</span></Link></p>
          </div>
          <ApprovalPhone />
        </div>
      </section>

      <section id="faq" className="f f-light ex-faq" aria-labelledby="fq-h">
        <div className="f-wrap ex-split">
          <h2 id="fq-h" className="ex-h2">Questions owners ask.</h2>
          <div className="fq-list">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CloseBand title="Fewer surprises. Faster cash." />
    </SiteShell>
  );
}

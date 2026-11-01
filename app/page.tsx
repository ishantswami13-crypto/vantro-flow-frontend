import "./landing.css";
import "./start.css";
import "./site.css";
import "./film.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, SITE_URL, pageMetadata } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteShell } from "@/components/marketing/site/Site";
import { HeroFilm } from "@/components/marketing/site/HeroFilm";
import { HomeTabs } from "@/components/marketing/home2/Tabs";
import { Texture } from "@/components/marketing/home2/Texture";

// Starlane, public homepage. Deliberately short: the promise, the product,
// three rules, the morning view, the approval, and questions. The detail lives
// on the platform, security and pricing pages. Product figures are sample data
// on a fictional business and labelled so.

// Live connections by name (registry status "live"); public feeds are opt-in per pilot.
const LIVE = ["TallyPrime", "Excel", "CSV", "Google Sheets", "Bank statements", "Stock exports"];


// One change, start to finish, on the sample business.
const PATH_STEPS: Array<[string, string]> = [
  ["Raised", "Gupta Traders missed a second payment promise."],
  ["Shown", "Three open invoices, 47 days overdue, each from TallyPrime."],
  ["Proposed", "A firm WhatsApp reminder, then an owner call."],
  ["Approved", "By you, from your phone. Sent once, as written."],
  ["Checked", "The books show ₹6,00,000 received against INV-1042."],
];


const RULES = [
  ["Read-only.", "Starlane reads TallyPrime, bank statements and stock. Nothing in your books is created, changed or deleted."],
  ["Sourced.", "Every figure is marked fact, calculation, assumption or estimate, with the record it came from."],
  ["Approved.", "Nothing reaches a customer until you approve the exact text, and it is sent once."],
];

const RULE_TONES = ["moss", "slate", "clay"] as const;

const FACTS: Array<[string, string, string]> = [
  ["0", "writes to your books", "Connections are read-only. Nothing in TallyPrime is created, changed or deleted."],
  ["4", "kinds of figure", "Fact, calculation, assumption or estimate, each with the record it came from."],
  ["1", "approval per message", "Every reminder waits for you and is sent once, exactly as written."],
  ["07:42", "brief on your phone", "What changed overnight, before the working day starts. Sample time."],
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

export const viewport: Viewport = { themeColor: "#F8F7F4" };

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
    <SiteShell navTone="light">
      <JsonLd data={[STRUCTURED, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }]} />
      <header className="hv">
        <div className="hv-wrap">
          <div className="hv-top">
            <h1 className="hv-h"><span>Who owes you.</span> <span>Who to call today.</span></h1>
            <div className="hv-side">
              <p className="hv-lead">Owners who run on TallyPrime see the few changes worth their attention each morning, with the evidence behind every figure.</p>
              <Link href="/access" className="hv-cta">Request a pilot</Link>
            </div>
          </div>
          <div id="film" className="hv-film"><HeroFilm /></div>
          <div className="hv-works">
            <h2 className="hv-works-k">Works with what you already run</h2>
            <ul>{LIVE.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        </div>
      </header>

      <div className="hp">
        <section className="hp-sec hp-intro" aria-label="What Starlane is">
          <div className="hp-wrap">
            <p className="hp-kicker">Starlane</p>
            <p className="hp-statement">
              Starlane reads your TallyPrime, bank statements and stock overnight, <span>raises the few changes that matter, shows the record behind every figure, and waits for you before anything reaches a customer.</span>
            </p>
          </div>
        </section>

        <section className="hp-sec" aria-labelledby="hp-do-h">
          <div className="hp-wrap">
            <div className="hp-head">
              <h2 id="hp-do-h" className="hp-h2">Built for the owner&apos;s morning</h2>
              <p className="hp-sub">One view across receivables, payables and stock, read-only, with every figure sourced.</p>
            </div>
            <HomeTabs />
          </div>
        </section>

        <section className="hp-sec hp-facts" aria-labelledby="hp-facts-h">
          <div className="hp-wrap">
            <h2 id="hp-facts-h" className="hp-h2">How it behaves, every day</h2>
            <ul className="hp-stats">
              {FACTS.map(([n, k, v]) => <li key={k}><p className="hp-stat-n">{n}</p><p className="hp-stat-k">{k}</p><p className="hp-stat-v">{v}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="hp-sec" aria-labelledby="hp-rules-h">
          <div className="hp-wrap">
            <div className="hp-head hp-head-row">
              <h2 id="hp-rules-h" className="hp-h2">Three rules it never breaks</h2>
              <Link href="/security" className="hp-btn-line">Security and control</Link>
            </div>
            <ol className="hp-cards">
              {RULES.map(([k, v], i) => (
                <li key={k}>
                  <div className="hp-card-art"><Texture id={`hp-rule-${i}`} tone={RULE_TONES[i]} seed={7 + i * 9} /><span className="hp-card-num">0{i + 1}</span></div>
                  <h3>{k}</h3>
                  <p>{v}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hp-sec hp-path" aria-labelledby="hp-path-h">
          <div className="hp-wrap">
            <div className="hp-head">
              <h2 id="hp-path-h" className="hp-h2">One change, start to finish</h2>
              <p className="hp-sub">Raised, shown with its evidence, proposed, approved by you, then checked against the books. Sample data on a fictional business.</p>
            </div>
            <ol className="hp-steps">
              {PATH_STEPS.map(([k, v], i) => <li key={k}><span className="hp-step-n">{String(i + 1).padStart(2, "0")}</span><h3>{k}</h3><p>{v}</p></li>)}
            </ol>
          </div>
        </section>

        <section id="faq" className="hp-sec" aria-labelledby="fq-h">
          <div className="hp-wrap hp-split">
            <h2 id="fq-h" className="hp-h2">Questions owners ask</h2>
            <div className="hp-faq">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}<i aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-sec hp-close" aria-labelledby="hp-close-h">
          <div className="hp-wrap">
            <div className="hp-close-panel">
              <Texture id="hp-close-tx" tone="moss" seed={17} />
              <div className="hp-close-copy">
                <h2 id="hp-close-h">See it on your own business.</h2>
                <p>Private pilots for businesses that run on TallyPrime. Read-only connections, and nothing is sent without your approval.</p>
                <div className="hp-close-act">
                  <Link href="/access" className="hp-btn-light">Request a pilot</Link>
                  <Link href="/platform" className="hp-btn-ghost">See the product</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

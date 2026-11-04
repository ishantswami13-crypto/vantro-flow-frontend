import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { SITE, SITE_URL, pageMetadata } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell, Paint } from "@/components/marketing/hx/Shell";
import { Hero, Panel, CenterHead, DuoCards, StatRows, Controls } from "@/components/marketing/hx/Blocks";
import { SourceGrid, Accordion, Quotes, Rail } from "@/components/marketing/hx/Interactive";
import { CommandCenterMock, AgentRunMock, LedgerMock, VaultMock, DecisionMock, MemoryMock, PlanMock } from "@/components/marketing/hx/Mocks";
import { HeroDashboard } from "@/components/marketing/hx/HeroDashboard";
import { CommandCenterVideo } from "@/components/marketing/site/CommandCenterVideo";
import "./ccv.css";

// Starlane, public homepage. Product views are sample data on a fictional
// business. No customer names, logos or results: the proof is what the product
// does and the rules it keeps.

const HOME_DESCRIPTION =
  "Starlane is the agent platform for finance teams: agents read your ledgers, bank statements and stock read-only, work out what changed and what to do, and nothing reaches a customer or supplier until a person approves it.";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: `${SITE.name} · Agents for finance teams that show their work`,
  absoluteTitle: true,
  description: HOME_DESCRIPTION,
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE.name, legalName: SITE.legalName, url: SITE_URL, logo: `${SITE_URL}/branding/starlane-icon-light-512.png` },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE.name, description: HOME_DESCRIPTION, publisher: { "@id": `${SITE_URL}/#organization` }, inLanguage: "en" },
    { "@type": "SoftwareApplication", name: SITE.name, url: SITE_URL, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: HOME_DESCRIPTION, publisher: { "@id": `${SITE_URL}/#organization` } },
  ],
};

// The systems Starlane reads, cycling in place: only connections that are
// live today (integrationsData.ts), then the currencies it reads as booked.
const SOURCES = [
  ["TallyPrime", "Bank statements", "Excel", "Google Sheets", "CSV", "Stock exports"],
  ["QuickBooks exports", "Xero exports", "Zoho Books exports", "Promise log", "Credit notes", "Supplier bills"],
  ["USD", "EUR", "GBP", "INR", "AED", "SGD"],
];

const ACC = [
  { k: "agents", title: "Agents", body: "Describe the work and Starlane plans it, reads the records, and returns a review-ready result with every figure sourced.", href: "/platform/agents", view: <Panel id="acc-a" tone="night" kind="tall bleed-r"><AgentRunMock /></Panel> },
  { k: "cc", title: "Command Center", body: "Cash at risk, collections against plan and what the agents did overnight, across every entity and currency.", href: "/platform/command-center", view: <Panel id="acc-b" tone="stone" kind="tall bleed-r"><CommandCenterMock /></Panel> },
  { k: "dec", title: "Decisions", body: "Every recommendation arrives with its evidence, each figure marked fact, calculation, assumption or estimate.", href: "/platform/decisions", view: <Panel id="acc-c" tone="clay" kind="tall"><DecisionMock className="fit" /></Panel> },
  { k: "vault", title: "Vault", body: "Ledgers, bank statements, contracts and policies in one place, read-only, for agents and people to work from.", href: "/platform/vault", view: <Panel id="acc-d" tone="slate" kind="tall bleed-r"><VaultMock /></Panel> },
  { k: "mem", title: "Memory", body: "Starlane learns how each customer pays and how your team works, and shows you what it learned so you can change it.", href: "/platform/memory", view: <Panel id="acc-e" tone="plum" kind="tall"><MemoryMock className="fit" /></Panel> },
];

// Principles rather than testimonials: Starlane is in private pilots and names
// no customers.
const QUOTES = [
  { text: "If Starlane cannot show where a number came from, it does not show the number.", by: "Evidence before assertion", role: "Starlane operating principle 01", href: "/company", cta: "Our principles", view: <Panel id="q-a" tone="stone" kind="" className="hx-q-art"><DecisionMock /></Panel> },
  { text: "Agents prepare the work. A person approves it, and the approval is recorded.", by: "People decide", role: "Starlane operating principle 02", href: "/security", cta: "How approvals work", view: <Panel id="q-b" tone="plum" kind="" className="hx-q-art"><PlanMock /></Panel> },
  { text: "Nothing in your books is created, changed or deleted. Connections are read-only.", by: "Read before write", role: "Starlane operating principle 03", href: "/security#controls", cta: "See every control", view: <Panel id="q-c" tone="moss" kind="" className="hx-q-art"><LedgerMock /></Panel> },
];

const RAIL = [
  { href: "/product/bridge", k: "Walkthrough", t: "The Bridge: what you are owed, what is overdue and what needs you today.", tone: "night" as const },
  { href: "/product/watch", k: "Walkthrough", t: "Watch: promises missed and invoices slipping, raised once with evidence.", tone: "umber" as const },
  { href: "/product/missions", k: "Walkthrough", t: "Missions: one objective with a deadline, planned step by step.", tone: "ink" as const },
  { href: "/product/simulate", k: "Walkthrough", t: "Simulate: likely collections, every assumption visible and yours.", tone: "slate" as const },
  { href: "/product/memory", k: "Walkthrough", t: "Memory: what Starlane learned about how you get paid.", tone: "plum" as const },
];

const FACTS: Array<[string, string, string]> = [
  ["Writes to your books", "0", "Connections are read-only. Nothing in your ledgers is created, changed or deleted."],
  ["Kinds of figure, each labelled", "4", "Fact, calculation, assumption or estimate, with the record it came from."],
  ["Approval for every outbound message", "1", "Each reminder waits for a person and is sent once, exactly as approved."],
  ["Currencies read as booked", "Any", "Foreign invoices keep their currency. The rate behind each converted figure is shown as an assumption."],
  ["Morning brief, before the day starts", "07:42", "What changed overnight, on your phone. Sample time."],
];

const CONTROLS: Array<[string, string, string]> = [
  ["eye", "Read-only connections", "/security#controls"],
  ["check", "Approval queue", "/security#controls"],
  ["once", "Runs at most once", "/security#controls"],
  ["stop", "Hard limits on actions", "/security#controls"],
  ["log", "Append-only audit trail", "/security#controls"],
  ["lock", "Hashed passwords, rate-limited sign-in", "/security#controls"],
  ["key", "Revocable device credentials", "/security#controls"],
  ["shield", "What we do not claim", "/security#claims"],
];

export default function HomePage() {
  return (
    <HxShell>
      <JsonLd data={STRUCTURED} />
      <Hero
        title={<>Run Finance on Agents That Show Their Work</>}
        lead="Finance teams and owners use Starlane to see what changed overnight, what it puts at risk and what to do, with the evidence behind every figure."
      >
        <div className="hx-panel hero hd-host"><HeroDashboard /></div>
      </Hero>

      <section className="hx-s pt128 pb128" aria-labelledby="src-h">
        <div className="hx-w">
          <h2 id="src-h" className="hx-d3 hx-r" style={{ textAlign: "center" }}>Reads the Systems Your Business Already Runs</h2>
          <SourceGrid sets={SOURCES} className="hx-r fade" />
        </div>
      </section>

      <section className="hx-s pt64" aria-labelledby="one-h">
        <div className="hx-w">
          <CenterHead title={<span id="one-h">One Platform for Finance Work</span>} body={"Owners and finance teams work from one sourced record. Agents run the\nrepetitive work, and every action waits for a person."} />
          <DuoCards items={[
            { title: "For Finance Teams", body: "Close faster on one record across ledgers, bank statements and stock, with agents doing the matching and the first pass.", href: "/solutions/finance-teams", cta: "Explore Starlane for Finance Teams", tone: "moss", view: <LedgerMock /> },
            { title: "For Owners", body: "Know who owes you, who broke a promise and what cash is at risk, and approve the next step from your phone.", href: "/solutions/owners", cta: "Explore Starlane for Owners", tone: "umber", view: <CommandCenterMock /> },
          ]} />
        </div>
      </section>

      <section className="hx-s pt160" aria-labelledby="film-h">
        <div className="hx-w">
          <CenterHead pill="New" title={<span id="film-h">Introducing the Command Center</span>} body="One morning in Starlane, from the overnight review to an approved reminder, in 38 seconds.">
            <Link href="/access" className="hx-btn">Request a Demo</Link>
          </CenterHead>
          <div className="hx-film hx-r scale" id="film"><CommandCenterVideo /></div>
        </div>
      </section>

      <section className="hx-s pt160 pb128" aria-labelledby="inn-h">
        <div className="hx-w">
          <h2 id="inn-h" className="hx-h2 hx-r">Product Built for the People Who Run the Numbers</h2>
          <Accordion items={ACC} />
        </div>
      </section>

      <section className="hx-s alt pt128 pb64" aria-label="Principles">
        <div className="hx-w">
          <Quotes items={QUOTES} />
        </div>
      </section>

      <section className="hx-s ink pt160" aria-labelledby="see-h">
        <div className="hx-w">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <h2 id="see-h" className="hx-h2 hx-r">See the Work, Step by Step</h2>
            <Link href="/product" className="hx-btn sm line hx-r">See the Product Guide</Link>
          </div>
          <Rail label="Product walkthroughs">
            {RAIL.map((r, i) => (
              <Link key={r.href} href={r.href}>
                <Paint id={`rail-${i}`} tone={r.tone} seed={i * 6 + 3} />
                <small>{r.k}</small>
                <p>{r.t}</p>
                <i aria-hidden>→</i>
              </Link>
            ))}
          </Rail>
        </div>
      </section>

      <section className="hx-s ink pt128 pb128" aria-label="Starlane by design">
        <div className="hx-w">
          <StatRows title="Built to Keep Finance Teams Focused, and Every Figure Checkable" items={FACTS} />
        </div>
      </section>

      <section className="hx-s ink2 grain pt128 pb128" aria-label="Security">
        <div className="hx-w">
          <Controls
            title="Controls Built In, Not Bolted On"
            body="Starlane is built so that agents can prepare work without being able to change your books. Every request is scoped to your account, every decision is logged, and the security page says plainly what Starlane does not claim."
            items={CONTROLS}
          />
        </div>
      </section>
    </HxShell>
  );
}

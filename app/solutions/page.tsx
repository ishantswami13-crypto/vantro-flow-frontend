import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, Panel, Card, Controls } from "@/components/marketing/hx/Blocks";
import { CONTROLS, CONTROLS_BODY, SOLUTIONS } from "@/components/marketing/hx/data";
import { ScopeMock } from "@/components/marketing/hx/Mocks";

export const metadata: Metadata = pageMetadata({
  path: "/solutions",
  title: "Solutions",
  description:
    "How finance teams, owners and collections staff use Starlane across distribution, manufacturing, wholesale and global trade: receivables, payables, stock and cash on one sourced record.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Solutions by team, by industry and by workflow. The section and row ids are
// the anchors the top bar's Solutions menu links to.

type Row = [id: string, title: string, body: string, href?: string];

const TEAMS: Row[] = [
  ["owners", "For Owners", "A morning brief on your phone: who owes you, who broke a promise, what cash is at risk and what to do first.", "/solutions/owners"],
  ["finance", "For Finance Teams", "One record across ledgers, bank statements and stock, with every figure marked fact, calculation, assumption or estimate.", "/solutions/finance-teams"],
  ["collections", "For Collections Teams", "A ranked list of who to call today and why, every promise tracked, and reminders prepared for approval.", "/solutions/collections"],
];
const INDUSTRIES: Row[] = [
  ["distribution", "Distribution & Trading", "Many customers on credit, many small invoices, followed customer by customer.", "/solutions/distribution"],
  ["manufacturing", "Manufacturing", "Supplier bills, stock and receivables moving together, with the cash effect shown.", "/solutions/manufacturing"],
  ["wholesale", "Wholesale & Stockists", "Credit limits and slow stock joined per customer, so exposure is clear.", "/solutions/distribution"],
  ["global", "Exporters & Global Trade", "Invoices and bills in their booked currencies, every conversion shown with its rate.", "/solutions/global-trade"],
];
const WORKFLOWS: Row[] = [
  ["receivables", "Receivables & Collections", "Overdue invoices, missed promises and silence, ranked by what they put at risk.", "/platform/decisions"],
  ["payables", "Payables & Suppliers", "What falls due, to whom, and what paying it today leaves in the bank.", "/platform/command-center"],
  ["stock", "Stock & Cash", "Stock that is not moving, and stock that will run out, set against the cash it holds or needs.", "/platform/command-center"],
  ["agents", "Agents & Approvals", "Agents prepare the next step. A person approves it, and the approval is recorded.", "/platform/agents"],
];

function Group({ id, title, lead, rows, alt }: { id: string; title: string; lead: string; rows: Row[]; alt?: boolean }) {
  return (
    <section id={id} className={`hx-s pt128 pb128${alt ? " alt" : ""}`} aria-labelledby={`${id}-h`}>
      <div className="hx-w hx-stack">
        <div className="hx-r">
          <h2 id={`${id}-h`} className="hx-h2">{title}</h2>
          <p className="hx-b1" style={{ marginTop: 16, maxWidth: "calc(440px * var(--s))" }}>{lead}</p>
        </div>
        <ul>
          {rows.map(([rid, h, b, href], i) => (
            <li key={rid} id={rid} className="hx-r" style={{ "--d": i } as React.CSSProperties}>
              <b>{h}</b><p>{b}</p>
              {href && <Link href={href} className="hx-arrow hx-b2">Learn more <i>→</i></Link>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function SolutionsPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/solutions", "Solutions")} />
      <Hero kicker="Solutions" title={<>One Record for Owners,<br />Finance and Collections</>} lead="Starlane reads the systems a business already runs, read-only, and gives each person their part: the owner the decisions, finance the evidence, collections the calls.">
        <Panel id="sols-hero" tone="moss" seed={4} kind="hero"><ScopeMock /></Panel>
      </Hero>
      <section className="hx-s pt128" aria-label="Solutions">
        <div className="hx-w hx-cards">
          {SOLUTIONS.map((s, i) => (
            <Card key={s.slug} i={i} c={{ href: `/solutions/${s.slug}`, title: s.kicker.replace("Starlane for ", ""), body: s.lead, meta: "Solution", tone: s.tone, art: s.kicker.replace("Starlane for ", ""), tag: "Starlane for" }} />
          ))}
        </div>
      </section>
      <Group id="teams" title="Each person sees their part" lead="The same sourced record, arranged for the decision in front of each role." rows={TEAMS} />
      <Group id="industries" title="Built for businesses that sell on credit" lead="Where cash depends on customers paying on time, suppliers being paid and stock moving." rows={INDUSTRIES} alt />
      <Group id="workflows" title="From what changed to what to do" lead="Each workflow ends in a step a person approves, and is checked against the books afterwards." rows={WORKFLOWS} />
      <section className="hx-s ink2 grain pt128 pb128" aria-label="Security">
        <div className="hx-w"><Controls title="Controls built in, not bolted on" body={CONTROLS_BODY} items={CONTROLS} /></div>
      </section>
    </HxShell>
  );
}

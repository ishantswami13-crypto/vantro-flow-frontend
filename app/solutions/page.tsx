import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";

export const metadata: Metadata = pageMetadata({
  path: "/solutions",
  title: "Solutions",
  description:
    "How owners, finance teams and collections staff use Starlane across distribution, manufacturing, wholesale and global trade: receivables, payables, stock and cash on one sourced record.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Solutions: by team, by industry and by workflow. Each entry describes what
// Starlane reads and what it shows. No outcomes or customer claims.

type Row = [id: string, title: string, body: string];

const TEAMS: Row[] = [
  ["owners", "For Owners", "A morning brief on your phone: who owes you, who broke a promise, what cash is at risk and what to do first. Nothing reaches a customer until you approve the exact text."],
  ["finance", "For Finance Teams", "One record across TallyPrime, bank statements and stock, with every figure marked fact, calculation, assumption or estimate and linked to the record it came from."],
  ["collections", "For Collections Teams", "A ranked list of who to call today and why, the promises each customer made, and reminders prepared for the owner to approve."],
];

const INDUSTRIES: Row[] = [
  ["distribution", "Distribution & Trading", "Many customers on credit, many small invoices. Starlane follows each customer's payment behaviour and raises the ones drifting late before the month closes."],
  ["manufacturing", "Manufacturing", "Supplier bills, stock and receivables move together. Starlane shows where an order depends on stock that is running low and what that does to cash."],
  ["wholesale", "Wholesale & Stockists", "Credit limits and slow stock tie up cash. Starlane joins exposure per customer with what is sitting in the warehouse."],
  ["global", "Exporters & Global Trade", "Invoices and bills in other currencies are read as they are booked. The rate behind each rupee figure is shown and marked as an assumption you can change; live feeds are switched on per pilot."],
];

const WORKFLOWS: Row[] = [
  ["receivables", "Receivables & Collections", "Overdue invoices, missed promises and silence, ranked by what they put at risk, each with its evidence."],
  ["payables", "Payables & Suppliers", "What falls due, to whom, and what paying it today leaves in the bank."],
  ["stock", "Stock & Cash", "Stock that is not moving, and stock that will run out, set against the cash it holds or needs."],
  ["agents", "Agents & Approvals", "Agents prepare the next step, such as a reminder or a call list. A person approves it, the approval is recorded, and anything that would change an amount, mark a payment received or delete a record is blocked."],
];

function Block({ id, n, k, title, lead, rows, tone = "f-light" }: { id: string; n: string; k: string; title: string; lead: string; rows: Row[]; tone?: string }) {
  return (
    <section id={id} className={`f ${tone}`} aria-labelledby={`${id}-h`}>
      <div className="f-wrap">
        <div className="f-head f-head-split">
          <div>
            <Index n={n} k={k} />
            <h2 id={`${id}-h`} className="f-h2">{title}</h2>
          </div>
          <p className="f-body">{lead}</p>
        </div>
        <ul className="pz-list">
          {rows.map(([rid, h, b]) => (
            <li key={rid} id={rid}><h3 className="pz-h">{h}</h3><p>{b}</p></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function SolutionsPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/solutions", "Solutions")} />
      <PageHero
        kicker="Solutions"
        title={<>One record for the owner, <em>finance and collections.</em></>}
        lead="Starlane reads the systems a business already runs, read-only, and gives each person the part that is theirs: the owner the decisions, finance the evidence, collections the calls. Every action waits for a person."
        index={[["#teams", "Teams"], ["#industries", "Industries"], ["#workflows", "Workflows"]]}
      >
        <div className="f-actions">
          <Link href="/access" className="sl-btn sl-btn-solid">Request a Demo</Link>
          <Link href="/platform" className="f-link">See the platform<span aria-hidden>→</span></Link>
        </div>
      </PageHero>
      <Block id="teams" n="01" k="Teams" title="Each person sees their part." lead="The same sourced record, arranged for the decision in front of each role." rows={TEAMS} />
      <Block id="industries" n="02" k="Industries" title="Built for businesses that sell on credit." lead="Where cash depends on customers paying on time, suppliers being paid and stock moving." rows={INDUSTRIES} tone="f-slab" />
      <Block id="workflows" n="03" k="Workflows" title="From what changed to what to do." lead="Each workflow ends in a step a person approves, and is checked against the books afterwards." rows={WORKFLOWS} />
      <CloseBand title="See it on your own business." />
    </SiteShell>
  );
}

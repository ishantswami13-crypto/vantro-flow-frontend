import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";

export const metadata: Metadata = pageMetadata({
  path: "/pilots",
  title: "Customers",
  description:
    "Starlane runs in private pilots with businesses that run on TallyPrime. Who a pilot is for, how it runs, and why there are no customer logos on this site yet.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Customers. Starlane is in private pilots, so this page names no customers and
// shows no results. It says who pilots are for and how one runs.

const FIT: Array<[string, string]> = [
  ["You sell on credit", "Customers pay you days or weeks after the invoice, and late payments decide what you can pay this week."],
  ["You run on TallyPrime", "Or keep your books in exports: Excel, CSV, Google Sheets, bank statements and stock reports."],
  ["Someone will decide", "An owner or finance lead who will approve or decline what Starlane proposes, every working day."],
];

const STEPS: Array<[string, string]> = [
  ["Connect", "TallyPrime through the desktop bridge, read-only, with a credential you can revoke. Everything else as exports."],
  ["First brief", "Starlane builds one record of customers, invoices, payments, promises and stock, and shows what changed."],
  ["Daily use", "You approve or decline each proposed step. Nothing is sent without your approval, and it is sent once."],
  ["Review", "Together we check what Starlane raised against what actually happened in your books."],
];

export default function PilotsPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/pilots", "Customers")} />
      <PageHero
        kicker="Customers"
        title={<>Built with the businesses <em>in our pilots.</em></>}
        lead="Starlane runs in private pilots with businesses that run on TallyPrime. You will not find customer logos or results here yet; we will show them when they are real and the businesses behind them agree."
      >
        <div className="f-actions">
          <Link href="/access" className="sl-btn sl-btn-solid">Request a Demo</Link>
          <Link href="/pricing" className="f-link">Pricing and pilots<span aria-hidden>→</span></Link>
        </div>
      </PageHero>

      <section id="fit" className="f f-light" aria-labelledby="pl1-h">
        <div className="f-wrap">
          <div className="f-head">
            <Index n="01" k="Who it is for" />
            <h2 id="pl1-h" className="f-h2">A good fit for a pilot.</h2>
          </div>
          <ul className="pz-list">{FIT.map(([h, b]) => <li key={h}><h3 className="pz-h">{h}</h3><p>{b}</p></li>)}</ul>
        </div>
      </section>

      <section id="how" className="f f-slab" aria-labelledby="pl2-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="02" k="How a pilot runs" />
              <h2 id="pl2-h" className="f-h2">Four steps, on your own data.</h2>
            </div>
            <p className="f-body">The product figures elsewhere on this site are illustrative, on a fictional business. A pilot shows the same views on yours.</p>
          </div>
          <ol className="pz-list">{STEPS.map(([h, b], i) => <li key={h}><h3 className="pz-h"><span>{String(i + 1).padStart(2, "0")}</span>{h}</h3><p>{b}</p></li>)}</ol>
        </div>
      </section>

      <CloseBand title="Bring Starlane into your business." />
    </SiteShell>
  );
}

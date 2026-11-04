import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell, Paint } from "@/components/marketing/hx/Shell";
import { CenterHead, StatRows } from "@/components/marketing/hx/Blocks";
import { SourceGrid } from "@/components/marketing/hx/Interactive";
import { SOLUTIONS } from "@/components/marketing/hx/data";

export const metadata: Metadata = pageMetadata({
  path: "/pilots",
  title: "Customers",
  description:
    "Starlane runs in private pilots. Who a pilot is for, how one runs, and why there are no customer logos or results on this site yet.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Customers. Starlane is in private pilots, so this page names no customers and
// shows no results. The story cards are the teams and industries a pilot is
// built for, each linking to its solution page.

const SOURCES = [
  ["TallyPrime", "Bank statements", "Excel", "Google Sheets", "CSV", "Stock exports"],
  ["QuickBooks exports", "Xero exports", "Zoho Books exports", "Promise log", "Credit notes", "Supplier bills"],
];

const STEPS: Array<[string, string, string]> = [
  ["Week one", "Connect", "TallyPrime through the desktop bridge, read-only, with a credential you can revoke. Everything else as exports."],
  ["Day one of use", "First brief", "Starlane builds one record of customers, invoices, payments, promises and stock, and shows what changed."],
  ["Every working day", "Daily use", "You approve or decline each proposed step. Nothing is sent without your approval, and it is sent once."],
  ["End of pilot", "Review", "Together we check what Starlane raised against what actually happened in your books."],
];

export default function PilotsPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/pilots", "Customers")} />
      <section className="hx-s pt64" aria-labelledby="cu-h">
        <div className="hx-w">
          <CenterHead as="h1" size="hx-d2" title={<span id="cu-h">Built With the Businesses in Our Pilots</span>} body="Starlane runs in private pilots. You will not find customer logos or results here yet; we will show them when they are real and the businesses behind them agree." />
          <SourceGrid sets={SOURCES} className="row hx-r fade" />
          <div className="hx-stories" id="fit">
            {SOLUTIONS.map((s, i) => (
              <Link key={s.slug} href={`/solutions/${s.slug}`} className="hx-story hx-r" style={{ "--d": i % 3 } as React.CSSProperties}>
                <Paint id={`story-${i}`} tone={s.tone} seed={i * 7 + 2} />
                <small>A pilot for {s.kicker.replace("Starlane for ", "")}</small>
                <p>{s.lead}</p>
                <span>See the solution <i aria-hidden>→</i></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="hx-s pt128 pb128" aria-label="How a pilot runs">
        <div className="hx-w">
          <div className="hx-2"><div /><h2 className="hx-h2 hx-r">Four steps, on your own data.</h2></div>
          <ul className="hx-stats" style={{ marginTop: "calc(64px * var(--s))" }}>
            {STEPS.map(([when, h, b], i) => (
              <li key={h} className="hx-r" style={{ "--d": i } as React.CSSProperties}>
                <span>{when}<small>{b}</small></span>
                <p className="hx-num sm">{h}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hx-s ink pt128 pb128" aria-label="A good fit">
        <div className="hx-w">
          <StatRows title="A Good Fit for a Pilot" items={[
            ["You sell on credit", "Days", "Customers pay you days or weeks after the invoice, and late payments decide what you can pay this week."],
            ["You keep your books in a system", "Any", "TallyPrime, or exports from QuickBooks, Xero, Zoho Books, Excel, CSV, Google Sheets, bank statements and stock reports."],
            ["Someone will decide", "1", "An owner or finance lead who will approve or decline what Starlane proposes, every working day."],
          ]} />
          <div className="hx-acts hx-r" style={{ marginTop: 48 }}>
            <Link href="/access" className="hx-btn">Request a Pilot</Link>
            <Link href="/pricing" className="hx-btn line">Pricing and Pilots</Link>
          </div>
        </div>
      </section>
    </HxShell>
  );
}

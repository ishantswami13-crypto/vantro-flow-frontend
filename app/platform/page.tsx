import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, Panel, Tiles, StackStats, AltRows, ToolLists, Controls, SplitHead } from "@/components/marketing/hx/Blocks";
import { Quotes } from "@/components/marketing/hx/Interactive";
import { CONTROLS, CONTROLS_BODY, MODULES, PRINCIPLES } from "@/components/marketing/hx/data";
import { CommandCenterMock, DecisionMock, PlanMock, QueueMock, SourcesMock, LedgerMock } from "@/components/marketing/hx/Mocks";
import { CommandCenterVideo } from "@/components/marketing/site/CommandCenterVideo";
import "../ccv.css";

export const metadata: Metadata = pageMetadata({
  path: "/platform",
  title: "Platform",
  description:
    "The Starlane platform: agents, the Command Center, decisions with their evidence, a read-only vault, memory and connectors, for finance teams and owners.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

const QUOTE_VIEWS = [<DecisionMock key="a" />, <PlanMock key="b" />, <LedgerMock key="c" />, <CommandCenterMock key="d" />];
const QUOTE_TONES = ["stone", "plum", "moss", "slate"] as const;

export default function PlatformPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/platform", "Platform")} />
      <Hero kicker="Platform Overview" title={<>Engineered for<br />Every Finance Task</>} lead="Finance teams and owners use Starlane to cut through scattered ledgers, statements and stock, and act on what changed.">
        <div id="film"><CommandCenterVideo /></div>
      </Hero>

      <section className="hx-s pt160 pb128" aria-labelledby="why-h">
        <div className="hx-w">
          <h2 id="why-h" className="hx-h2 hx-r" style={{ maxWidth: "calc(440px * var(--s))" }}>Why finance teams choose Starlane</h2>
          <Tiles items={[
            { title: "Move fast, stay sharp", body: "Hand the first pass to agents: matching, ranking and drafting. Your team spends its time on the decisions.", tone: "umber", view: <QueueMock /> },
            { title: "Decide with confidence", body: "Every recommendation shows its working, and every outbound step waits for a person and runs once.", tone: "plum", view: <DecisionMock /> },
            { title: "Put your records to work", body: "Ledgers, exports, bank statements and stock, unified read-only in one record built for precision.", tone: "clay", view: <SourcesMock /> },
          ]} />
        </div>
      </section>

      <section className="hx-s alt pt128 pb64" aria-label="By design">
        <div className="hx-w">
          <StackStats title="Built for checking, not trusting" items={[["0", "writes to your books, ever"], ["4", "kinds of figure, each labelled with its source"], ["1", "approval for every outbound message, sent once"]]} />
        </div>
      </section>

      <section className="hx-s pt128 pb64" aria-label="Principles">
        <div className="hx-w">
          <Quotes items={PRINCIPLES.map((p, i) => ({ ...p, view: <Panel id={`pq-${i}`} tone={QUOTE_TONES[i]} kind="" className="hx-q-art">{QUOTE_VIEWS[i]}</Panel> }))} />
        </div>
      </section>

      <section className="hx-s ink pt160 pb128" aria-label="Products">
        <div className="hx-w">
          <SplitHead strong="One platform for the whole finance team." soft="Each part does one job well, and every part works from the same sourced record." className="hx-mute" />
          <AltRows items={MODULES.map((m) => ({ title: m.name, body: m.lead, href: `/platform/${m.slug}`, tone: m.tone, view: m.hero }))} />
        </div>
      </section>

      <section className="hx-s ink pt96 pb160" aria-label="Where Starlane works">
        <div className="hx-w">
          <ToolLists title="Works with the tools your team already uses" lists={[
            { h: "Use Starlane in:", items: [["Web app"], ["Morning brief on your phone"], ["Desktop bridge", "Windows"], ["Approval links"]] },
            { h: "Read records from:", items: [["TallyPrime", "Live"], ["QuickBooks, Xero and Zoho Books exports", "Live"], ["Bank statements", "Live"], ["Excel, CSV and Google Sheets", "Live"], ["Stock exports", "Live"], ["Live bank feeds", "Planned"], ["NetSuite, Dynamics", "Custom"]] },
          ]} />
        </div>
      </section>

      <section className="hx-s ink2 grain pt128 pb128" aria-label="Security">
        <div className="hx-w"><Controls title="Controls built in, not bolted on" body={CONTROLS_BODY} items={CONTROLS} /></div>
      </section>
    </HxShell>
  );
}

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, Panel, IconCards, SplitHead, AltRows, Controls } from "@/components/marketing/hx/Blocks";
import { Accordion, Quotes, SourceGrid } from "@/components/marketing/hx/Interactive";
import { CONTROLS, CONTROLS_BODY, MODULES, PRINCIPLES, SOLUTIONS } from "@/components/marketing/hx/data";
import { DecisionMock, PlanMock, LedgerMock } from "@/components/marketing/hx/Mocks";

// One page per team or industry, in the reference's solution-page order.

export const dynamicParams = false;
export function generateStaticParams() { return SOLUTIONS.map((s) => ({ slug: s.slug })); }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  if (!s) return {};
  return pageMetadata({ path: `/solutions/${s.slug}`, title: s.kicker.replace("Starlane for ", ""), description: s.description });
}

export const viewport: Viewport = { themeColor: "#0F0E0D" };

const SOURCES = [
  ["TallyPrime", "Bank statements", "Excel", "Google Sheets", "CSV", "Stock exports"],
  ["QuickBooks exports", "Xero exports", "Zoho Books exports", "Promise log", "Credit notes", "Supplier bills"],
];
const QV = [<DecisionMock key="a" />, <PlanMock key="b" />, <LedgerMock key="c" />];

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  if (!s) notFound();
  const mods = s.modules.map((k) => MODULES.find((m) => m.slug === k)!).filter(Boolean);
  return (
    <HxShell>
      <JsonLd data={breadcrumb(`/solutions/${s.slug}`, s.kicker)} />
      <Hero kicker={s.kicker} title={s.title} lead={s.lead}>
        <Panel id="sol-hero" tone={s.tone} seed={9} kind="hero">{s.hero}</Panel>
      </Hero>

      <section className="hx-s pb64" aria-label="Sources"><div className="hx-w"><SourceGrid sets={SOURCES} className="row hx-r fade" /></div></section>

      <section className="hx-s pt96 pb128" aria-labelledby="why-h">
        <div className="hx-w">
          <h2 id="why-h" className="hx-h2 hx-r">Built for the Way You Work</h2>
          <IconCards items={s.why} />
        </div>
      </section>

      <section className="hx-s ink pt128 pb160" aria-labelledby="uses-h">
        <div className="hx-w">
          <h2 id="uses-h" className="hx-h2 hx-r">{s.usesTitle}</h2>
          <Accordion items={s.uses.map((u, i) => ({ k: u.k, title: u.title, body: u.body, view: <Panel id={`su-${i}`} tone={i % 2 ? "night" : s.tone} seed={i * 4 + 1} kind="tall">{u.view}</Panel> }))} />
          <div style={{ marginTop: "calc(160px * var(--s))" }}>
            <Quotes items={PRINCIPLES.slice(0, 3).map((p, i) => ({ ...p, view: <Panel id={`sq-${i}`} tone={["umber", "plum", "slate"][i] as "umber"} kind="" className="hx-q-art">{QV[i]}</Panel> }))} />
          </div>
          <div style={{ marginTop: "calc(160px * var(--s))" }}>
            <SplitHead strong={s.strong} soft={s.soft} />
            <AltRows items={mods.map((m) => ({ title: m.name, body: m.lead, href: `/platform/${m.slug}`, tone: m.tone, view: m.hero }))} />
          </div>
        </div>
      </section>

      <section className="hx-s ink2 grain pt128 pb128" aria-label="Security">
        <div className="hx-w"><Controls title="Controls built in, not bolted on" body={CONTROLS_BODY} items={CONTROLS} /></div>
      </section>
    </HxShell>
  );
}

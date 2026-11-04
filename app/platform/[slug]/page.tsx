import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, Panel, SplitHead, Features, Spotlight, StackStats, Controls } from "@/components/marketing/hx/Blocks";
import { Accordion, Quotes } from "@/components/marketing/hx/Interactive";
import { CONTROLS, CONTROLS_BODY, MODULES, PRINCIPLES } from "@/components/marketing/hx/data";

// One page per part of the platform, in the reference's sub-page order: hero
// with a product view, a split statement, feature blocks, an optional
// spotlight, figures by design, principles, uses, then security.

export const dynamicParams = false;
export function generateStaticParams() { return MODULES.map((m) => ({ slug: m.slug })); }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) return {};
  return pageMetadata({ path: `/platform/${m.slug}`, title: m.name, description: m.description });
}

export const viewport: Viewport = { themeColor: "#0F0E0D" };

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) notFound();
  return (
    <HxShell>
      <JsonLd data={breadcrumb(`/platform/${m.slug}`, m.name)} />
      <Hero crumb={["/platform", "Platform"]} kicker={m.name} title={m.title} lead={m.lead}>
        <Panel id="mod-hero" tone={m.tone} seed={7} kind="hero">{m.hero}</Panel>
      </Hero>

      <section className="hx-s pt160 pb160" aria-label={`${m.name} features`}>
        <div className="hx-w">
          <SplitHead strong={m.strong} soft={m.soft} />
          <div style={{ marginTop: "calc(120px * var(--s))" }}><Features items={m.feats} /></div>
          {m.spot && <div style={{ marginTop: "calc(160px * var(--s))" }}><Spotlight {...m.spot} /></div>}
        </div>
      </section>

      <section className="hx-s alt pt128 pb128" aria-label="By design">
        <div className="hx-w">
          <StackStats title={m.statsTitle} items={m.stats} />
          <div style={{ marginTop: "calc(96px * var(--s))" }}>
            <Quotes wide items={PRINCIPLES} />
          </div>
        </div>
      </section>

      <section className="hx-s ink pt160 pb160" aria-labelledby="uses-h">
        <div className="hx-w">
          <div className="hx-2"><div /><h2 id="uses-h" className="hx-h2 hx-r">{m.usesTitle}</h2></div>
          <Accordion className="hx-acc-ink" items={m.uses.map((u, i) => ({ ...u, view: <Panel id={`use-${i}`} tone={i % 2 ? "night" : m.tone} seed={i * 3 + 2} kind="tall">{m.hero}</Panel> }))} />
        </div>
      </section>

      <section className="hx-s ink2 grain pt128 pb128" aria-label="Security">
        <div className="hx-w"><Controls title="Controls built in, not bolted on" body={CONTROLS_BODY} items={CONTROLS} /></div>
      </section>
    </HxShell>
  );
}

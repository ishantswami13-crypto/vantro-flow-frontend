import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../home.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";
import { Stack3D, type Plate } from "@/components/marketing/site/Stack3D";
import { IntegrationHub } from "@/components/marketing/landing/IntegrationHub";
import { CATEGORIES } from "@/components/marketing/landing/integrationsData";

const count = (state: string) => CATEGORIES.reduce((n, c) => n + c.items.filter((i) => i.s === state).length, 0);

export const metadata: Metadata = pageMetadata({
  path: "/integrations",
  title: "Integrations",
  description:
    "Every system Starlane connects to, by category, with how it connects and its real status: live today, planned, or built for your pilot.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// The full integrations catalogue, as reference documentation. The homepage
// reads the same list; statuses mirror the backend connector registry.

const STATES = [
  { c: "ih-live", k: "Live", n: count("live"), b: "Works in the product today. Connections are read-only; TallyPrime is read through a local bridge, the rest through exports." },
  { c: "ih-planned", k: "Planned", n: count("planned"), b: "On the roadmap, or built and not yet switched on. Not usable yet, and not shown as if it were." },
  { c: "ih-custom", k: "Custom", n: count("custom"), b: "Not in the catalogue. Can be built for your pilot on the connector framework, through an API, webhook, database or file." },
];

const HERO_PLATES: Plate[] = [
  { k: "Live", title: "TallyPrime", kind: "top" },
  { k: "Live", title: "Excel" },
  { k: "Live", title: "CSV" },
  { k: "Live", title: "Google Sheets" },
  { k: "Live", title: "Bank statements" },
  { k: "Live", title: "Stock exports" },
  { k: "Planned or custom", title: "ERP", kind: "plan" },
  { k: "Planned", title: "CRM", kind: "plan" },
  { k: "Planned", title: "Commerce", kind: "plan" },
];

export default function IntegrationsPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/integrations", "Integrations")} />
      <PageHero
        kicker="Integrations"
        visual={<Stack3D plates={HERO_PLATES} variant="grid" label="Nine tiles: TallyPrime, Excel, CSV, Google Sheets, bank statements and stock exports are live and raised; ERP, CRM and commerce are planned and flat." />}
        title={<>Works with the systems <em>you already run.</em></>}
        lead="Each entry shows how it connects and its real status. Nothing in your systems changes: Starlane reads, and every action it proposes waits for a person."
      >
        <div className="f-actions">
          <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
          <a href="#catalogue" className="f-link">Browse the catalogue<span aria-hidden>→</span></a>
        </div>
      </PageHero>

      <section className="f f-slab ih-states" aria-labelledby="i1-h">
        <div className="f-wrap">
          <Index k="Three statuses" />
          <h2 id="i1-h" className="sl-sr">What each status means</h2>
          <ul className="ih-grid">
            {STATES.map((s) => (
              <li key={s.k} className={s.c}>
                <p className="ih-n num">{s.n}</p>
                <h3><i aria-hidden />{s.k}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="catalogue" className="f f-light ih-cat" aria-label="All integrations">
        <div className="f-wrap">
          <div className="sl sl-home ih-wrap">
            <IntegrationHub />
          </div>
        </div>
      </section>

      <section className="f f-slab" aria-labelledby="i3-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index k="Not listed?" />
            <h2 id="i3-h" className="f-h2">If it has an export, it can connect.</h2>
          </div>
          <div className="f-main">
            <p className="f-lede" style={{ marginTop: 0 }}>A system with an API, a database or an export can be connected for your pilot on the connector framework.</p>
            <p className="f-body">Tell us what you run when you apply. We confirm what connects today and what a pilot would need, before anything is connected.</p>
            <div className="f-actions"><Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link></div>
          </div>
        </div>
      </section>

      <CloseBand title="Start with the systems you have." secondary={["/security", "How connections are secured"]} />
    </SiteShell>
  );
}

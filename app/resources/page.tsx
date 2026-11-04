import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, Panel, Card, type CardItem } from "@/components/marketing/hx/Blocks";
import { ResourceFilter } from "@/components/marketing/hx/Interactive";
import { AgentRunMock } from "@/components/marketing/hx/Mocks";
import { CommandCenterVideo } from "@/components/marketing/site/CommandCenterVideo";
import "../ccv.css";

export const metadata: Metadata = pageMetadata({
  path: "/resources",
  title: "Resources",
  description: "Guides, walkthroughs and explainers on how Starlane works: agents, decisions, connections, security and pilots.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Every resource here is a page on this site. Types and topics drive the filter.

const LEAD: CardItem = { href: "/product", title: "The Starlane Product Guide: every view, from the Bridge to Memory", meta: "Guide", tone: "stone", art: "The Starlane Product Guide", tag: "Guide", body: "What each part of Starlane shows, what it reads, and what it leaves to you. The best place to start." };

const SIDE: CardItem[] = [
  { href: "/platform#film", title: "One morning in the Command Center, in 38 seconds", meta: "Film", tone: "night", art: "Command Center film", tag: "Film" },
  { href: "/platform/decisions", title: "Four kinds of figure: how Starlane shows its working", meta: "Explainer", tone: "clay", art: "Fact, calculation, assumption, estimate", tag: "Explainer" },
  { href: "/security", title: "Read-only by design: every control, and what we do not claim", meta: "Explainer", tone: "slate", art: "Read-only by design", tag: "Security" },
];

const ALL: CardItem[] = [
  { href: "/product/bridge", title: "The Bridge: what you are owed and what needs you", meta: "Walkthrough · Cash", tone: "moss", art: "The Bridge", tag: "Walkthrough", type: "Walkthrough", topic: "Cash", aud: "Owners Finance teams" },
  { href: "/product/scan", title: "Scan: look into any customer or invoice", meta: "Walkthrough · Collections", tone: "umber", art: "Scan", tag: "Walkthrough", type: "Walkthrough", topic: "Collections", aud: "Finance teams Collections teams" },
  { href: "/product/watch", title: "Watch: promises missed and invoices slipping", meta: "Walkthrough · Collections", tone: "night", art: "Watch", tag: "Walkthrough", type: "Walkthrough", topic: "Collections", aud: "Collections teams Owners" },
  { href: "/product/missions", title: "Missions: one objective, planned step by step", meta: "Walkthrough · Agents", tone: "plum", art: "Missions", tag: "Walkthrough", type: "Walkthrough", topic: "Agents", aud: "Finance teams" },
  { href: "/product/simulate", title: "Simulate: likely collections, every assumption visible", meta: "Walkthrough · Cash", tone: "slate", art: "Simulate", tag: "Walkthrough", type: "Walkthrough", topic: "Cash", aud: "Finance teams Owners" },
  { href: "/product/memory", title: "Memory: what Starlane learned about how you get paid", meta: "Walkthrough · Agents", tone: "clay", art: "Memory", tag: "Walkthrough", type: "Walkthrough", topic: "Agents", aud: "Collections teams" },
  { href: "/product/prepared", title: "Prepared: the next 24 hours, 7 days and 30 days", meta: "Walkthrough · Cash", tone: "stone", art: "Prepared", tag: "Walkthrough", type: "Walkthrough", topic: "Cash", aud: "Owners" },
  { href: "/platform/agents", title: "How Starlane agents plan, work and wait for approval", meta: "Explainer · Agents", tone: "umber", art: "Agents", tag: "Explainer", type: "Explainer", topic: "Agents", aud: "Finance teams Owners" },
  { href: "/integrations", title: "Integrations: every connector and its real status", meta: "Guide · Connections", tone: "moss", art: "Integrations", tag: "Guide", type: "Guide", topic: "Connections", aud: "Finance teams" },
  { href: "/download", title: "Set up the desktop bridge for TallyPrime", meta: "Guide · Connections", tone: "night", art: "Desktop bridge", tag: "Guide", type: "Guide", topic: "Connections", aud: "Finance teams" },
  { href: "/pricing", title: "How pilots and pricing work", meta: "Guide · Pilots", tone: "slate", art: "Pilots and pricing", tag: "Guide", type: "Guide", topic: "Pilots", aud: "Owners Finance teams" },
  { href: "/security#claims", title: "What Starlane does not claim, said plainly", meta: "Explainer · Security", tone: "plum", art: "What is absent", tag: "Explainer", type: "Explainer", topic: "Security", aud: "Owners Finance teams" },
];

export default function ResourcesPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/resources", "Resources")} />
      <Hero variant="stack" title="Resources" lead="Guides, walkthroughs and explainers on how Starlane works." cta={null} />

      <section className="hx-s pt64 pb128" aria-label="Featured">
        <div className="hx-w hx-res">
          <div className="hx-res-big"><Card c={LEAD} i={0} /></div>
          <div className="hx-res-side">{SIDE.map((c, i) => <Card key={c.href} c={c} i={i + 1} />)}</div>
        </div>
      </section>

      <section className="hx-s pb128" aria-labelledby="all-h">
        <div className="hx-w">
          <h2 id="all-h" className="hx-sr" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>All resources</h2>
          <ResourceFilter types={["Walkthrough", "Explainer", "Guide"]} topics={["Agents", "Cash", "Collections", "Connections", "Pilots", "Security"]} />
          <div className="hx-2 hx-r" style={{ marginTop: "calc(32px * var(--s))", alignItems: "center" }}>
            <Panel id="res-film" tone="night" kind="card"><AgentRunMock /></Panel>
            <div style={{ display: "grid", gap: 16, paddingLeft: "calc(32px * var(--s))", justifyItems: "start" }}>
              <p className="hx-cap">Featured walkthrough</p>
              <h3 className="hx-d2">An Agent Run, From Request to Approval</h3>
              <p className="hx-b1">See how an agent plans an overdue review, reads the records, and leaves each reminder waiting for you.</p>
              <Link href="/platform/agents" className="hx-btn">Watch the Walkthrough</Link>
            </div>
          </div>
          <div className="hx-cards" style={{ marginTop: "calc(64px * var(--s))", rowGap: "calc(48px * var(--s))" }}>
            {ALL.map((c, i) => <Card key={c.href} c={c} i={i} />)}
          </div>
        </div>
      </section>

      <section className="hx-s ink pt128 pb128" aria-label="Film">
        <div className="hx-w"><div className="hx-film hx-r scale" style={{ marginTop: 0 }}><CommandCenterVideo /></div></div>
      </section>
    </HxShell>
  );
}

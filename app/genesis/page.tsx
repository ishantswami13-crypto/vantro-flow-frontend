"use client";

import Link from "next/link";
import { ATLAS_AGENTS, ATLAS_PACKS, ATLAS_WORKFLOWS, EXECUTABLE, DIMENSION_LABEL, packsByDimension, type PackDimension } from "@/lib/atlas";
import { AtlasShell, ProofLegend, ATLAS_COPY } from "@/components/atlas/AtlasUI";

export default function GenesisPage() {
  const liveAgents = ATLAS_AGENTS.filter((a) => EXECUTABLE(a.execution_status)).length;
  const livePacks = ATLAS_PACKS.filter((p) => EXECUTABLE(p.execution_status)).length;
  const dims = Object.keys(DIMENSION_LABEL) as PackDimension[];

  return (
    <AtlasShell title="Genesis" subtitle={`${ATLAS_COPY.tagline}. Not a SaaS module list — a foundational operating layer where any business can be structured, automated, governed and scaled through agents, workflows, memory, evidence and packs.`} active="/genesis">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 28 }}>
        <Big n={ATLAS_PACKS.length} l="packs" s="8 dimensions" />
        <Big n={ATLAS_AGENTS.length} l="agents" s="organised by swarm" />
        <Big n={ATLAS_WORKFLOWS.length} l="workflows" s="gated end-to-end" />
        <Big n={livePacks} l="live packs" s="evidence-gated" />
        <Big n={liveAgents} l="live agents" s="rest visible-but-blocked" />
      </div>

      <Block title="Why packs, not SaaS modules">
        A trader, a global manufacturer and a SaaS CFO do not need the same product — they need the same
        primitives (agents, workflows, evidence, approvals) <em>re-composed</em> for their reality. A pack is
        that composition: business type × size × role × workflow × region × industry × enterprise need × swarm.
      </Block>

      <Block title="Proof-gated by construction">
        {ATLAS_COPY.proof}. Only <strong>Live · Proven</strong> / <strong>Live · Limited</strong> entries execute, and only
        through evidence, approval and audit gates. Hundreds of agents are visible for evaluation — none of them can
        run until they are proven. That is why launching with a large surface is safe.
      </Block>

      <ProofLegend />

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "12px 0" }}>The eight dimensions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {dims.map((d) => {
          const ps = packsByDimension(d);
          const href = d === "industry" ? "/industry-packs" : d === "region" ? "/region-packs" : d === "enterprise_custom" ? "/enterprise-governance" : "/packs";
          return (
            <Link key={d} href={href} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{DIMENSION_LABEL[d]}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{ps.length} packs →</div>
            </Link>
          );
        })}
      </div>
    </AtlasShell>
  );
}

function Big({ n, l, s }: { n: number; l: string; s: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700 }}>{n}</div>
      <div style={{ fontSize: 13 }}>{l}</div>
      <div style={{ fontSize: 11, color: "var(--faint)" }}>{s}</div>
    </div>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20, maxWidth: 760 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>{title}</h2>
      <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>{children}</p>
    </section>
  );
}

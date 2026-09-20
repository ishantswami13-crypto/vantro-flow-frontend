"use client";

import Link from "next/link";
import { ATLAS_PACKS, ATLAS_AGENTS, ATLAS_WORKFLOWS, DIMENSION_LABEL, packsByDimension, EXECUTABLE, type PackDimension } from "@/lib/atlas";
import { AtlasShell, StatusBadge } from "@/components/atlas/AtlasUI";

export default function BusinessGraphPage() {
  const dims = Object.keys(DIMENSION_LABEL) as PackDimension[];
  return (
    <AtlasShell
      title="Business Graph"
      subtitle="How Atlas composes: dimensions → packs → agents & workflows. The same primitives re-used everywhere, each node carrying its own proof status."
      active="/business-graph"
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        <span>{dims.length} dimensions</span><span>→ {ATLAS_PACKS.length} packs</span>
        <span>→ {ATLAS_AGENTS.length} agents</span><span>+ {ATLAS_WORKFLOWS.length} workflows</span>
      </div>

      {dims.map((d) => {
        const packs = packsByDimension(d);
        return (
          <details key={d} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 16 }}>
              {DIMENSION_LABEL[d]} <span style={{ color: "var(--faint)", fontSize: 13 }}>· {packs.length} packs · {packs.filter((p) => EXECUTABLE(p.execution_status)).length} live</span>
            </summary>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
              {packs.map((p) => (
                <Link key={p.id} href={`/packs/${p.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ fontSize: 13 }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--faint)" }}>{p.included_agent_ids.length}a</span>
                </Link>
              ))}
            </div>
          </details>
        );
      })}

      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["live_proven", "live_limited", "preview", "connector_required", "custom_required", "partner_required", "roadmap"] as const).map((s) => (
          <span key={s} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <StatusBadge status={s} />
            <span style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>{ATLAS_PACKS.filter((p) => p.execution_status === s).length}</span>
          </span>
        ))}
      </div>
    </AtlasShell>
  );
}

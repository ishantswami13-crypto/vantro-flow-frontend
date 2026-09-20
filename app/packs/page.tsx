"use client";

import { useMemo, useState } from "react";
import {
  ATLAS_PACKS, DIMENSIONS, recommendPacks, DIMENSION_LABEL,
  type PackDimension, type AtlasPack,
} from "@/lib/atlas";
import { AtlasShell, PackCard, Grid, ProofLegend, SafetyNote, ATLAS_COPY } from "@/components/atlas/AtlasUI";

const DIMS: (PackDimension | "all")[] = [
  "all", "business_type", "business_size", "role", "workflow", "region", "industry", "enterprise_custom", "agent_swarm",
];

export default function PacksPage() {
  const [dim, setDim] = useState<PackDimension | "all">("all");
  const [sel, setSel] = useState<Record<string, string>>({});

  const filtered = useMemo<AtlasPack[]>(
    () => (dim === "all" ? ATLAS_PACKS : ATLAS_PACKS.filter((p) => p.dimension === dim)),
    [dim],
  );

  const recos = useMemo(() => {
    const active = Object.fromEntries(Object.entries(sel).filter(([, v]) => v));
    if (!Object.keys(active).length) return null;
    return recommendPacks(active);
  }, [sel]);

  const modeKeys = ["business_type", "business_size", "industry", "region", "role", "automation_goal"];

  return (
    <AtlasShell
      title="Pack Library"
      subtitle={`${ATLAS_COPY.custom}. ${ATLAS_PACKS.length} packs across 8 dimensions — the same agents, workflows and evidence re-composed for your business.`}
      active="/packs"
    >
      <SafetyNote />

      {/* Business Mode Selector */}
      <section style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 4 }}>Business Mode</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
          Describe your business — Atlas recommends the packs that fit.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
          {modeKeys.map((k) => (
            <label key={k} style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
              {k.replace(/_/g, " ")}
              <select
                value={sel[k] || ""}
                onChange={(e) => setSel((s) => ({ ...s, [k]: e.target.value }))}
                style={{ width: "100%", marginTop: 4, padding: "7px 8px", borderRadius: 8, background: "#000", color: "#fff", border: "1px solid var(--line)" }}
              >
                <option value="">— any —</option>
                {(DIMENSIONS[k] || []).map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
              </select>
            </label>
          ))}
        </div>
        {recos && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: "var(--c-node)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
              ▸ Recommended for you ({recos.recommended.length}) · {recos.live_recommended.length} live now
            </div>
            <Grid>
              {recos.recommended.slice(0, 9).map((r: { pack: AtlasPack; reasons: string[] }) => (
                <div key={r.pack.id}>
                  <PackCard pack={r.pack} />
                  <div style={{ fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
                    {r.reasons[0]}
                  </div>
                </div>
              ))}
            </Grid>
          </div>
        )}
      </section>

      <ProofLegend />

      {/* Dimension tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {DIMS.map((d) => (
          <button key={d} onClick={() => setDim(d)}
            style={{
              fontSize: 13, fontFamily: "var(--font-mono)", padding: "6px 12px", borderRadius: 999,
              border: "1px solid var(--line)",
              color: dim === d ? "#000" : "var(--muted)", background: dim === d ? "#fff" : "transparent",
            }}>
            {d === "all" ? `All (${ATLAS_PACKS.length})` : `${DIMENSION_LABEL[d as PackDimension]} (${ATLAS_PACKS.filter((p) => p.dimension === d).length})`}
          </button>
        ))}
      </div>

      <Grid>
        {filtered.map((p) => <PackCard key={p.id} pack={p} />)}
      </Grid>
    </AtlasShell>
  );
}

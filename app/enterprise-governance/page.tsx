"use client";

import { packsByDimension } from "@/lib/atlas";
import { AtlasShell, PackCard, Grid, ProofLegend, SafetyNote, ATLAS_COPY } from "@/components/atlas/AtlasUI";

export default function EnterpriseGovernancePage() {
  const packs = packsByDimension("enterprise_custom");
  return (
    <AtlasShell
      title="Enterprise Governance & Custom"
      subtitle={`${ATLAS_COPY.custom}. ${packs.length} enterprise / custom packs — co-built operating layers for groups, multi-entity and multi-country structures. Each is custom_required or partner_required and ships behind a custom deployment.`}
      active="/enterprise-governance"
    >
      <SafetyNote />
      <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>Custom operating layer</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Enterprises do not get a fixed product — they get Atlas shaped to their structure, governed, evidenced and audited.
          These packs are visible for evaluation; activation runs through a custom deployment with the execution guard enforcing every gate.
        </p>
        <button style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#000", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Request custom deployment
        </button>
      </div>
      <ProofLegend />
      <Grid>{packs.map((p) => <PackCard key={p.id} pack={p} />)}</Grid>
    </AtlasShell>
  );
}

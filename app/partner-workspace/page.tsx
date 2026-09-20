"use client";

import { ATLAS_PACKS } from "@/lib/atlas";
import { AtlasShell, PackCard, Grid, SafetyNote } from "@/components/atlas/AtlasUI";

export default function PartnerWorkspacePage() {
  const partnerPacks = ATLAS_PACKS.filter((p) => p.execution_status === "partner_required");
  return (
    <AtlasShell
      title="Partner Workspace"
      subtitle={`${partnerPacks.length} partner packs — co-build, white-label and advisor surfaces. Partner-required packs are visible for evaluation but only execute once a partner is enabled for the tenant.`}
      active="/partner-workspace"
    >
      <SafetyNote />
      <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 20, maxWidth: 760 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 6 }}>Co-build the operating layer</h2>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          Partners and advisors extend Atlas into new industries and regions. These packs ship as <strong>partner_required</strong> —
          the execution guard blocks them until a partner is explicitly enabled, with the same evidence, approval and audit gates.
        </p>
        <button style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#000", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Become a partner
        </button>
      </div>
      <Grid>{partnerPacks.map((p) => <PackCard key={p.id} pack={p} />)}</Grid>
    </AtlasShell>
  );
}

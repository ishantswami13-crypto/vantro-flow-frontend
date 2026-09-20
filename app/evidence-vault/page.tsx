"use client";

import { ATLAS_AGENTS } from "@/lib/atlas";
import { AtlasShell, ATLAS_COPY } from "@/components/atlas/AtlasUI";

export default function EvidenceVaultPage() {
  const evidenceAgents = ATLAS_AGENTS.filter((a) => a.evidence_required);
  return (
    <AtlasShell
      title="Evidence Vault"
      subtitle={`${ATLAS_COPY.proof}. Every executable agent must cite evidence before it acts — no claim without a source, no action without a trail.`}
      active="/evidence-vault"
    >
      <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 20, maxWidth: 760 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>The evidence contract</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
          The proven Owner Briefing surface ships an <strong>evidence contract</strong>: every claim and recommendation links
          to evidence ids with a confidence score, a <code>safe_to_show</code> flag, and an audit id. Claims that cannot be
          backed are blocked, not shown. Atlas extends this contract to every executable agent and workflow.
        </p>
        <ul style={{ color: "var(--muted)", fontSize: 14, marginTop: 10, lineHeight: 1.7 }}>
          <li>Claims carry <code>evidence_ids</code> + <code>confidence</code> + <code>blocked_reason</code>.</li>
          <li>Recommendations are <code>safe_to_auto_execute: false</code> — humans approve.</li>
          <li>Every executable carries <code>audit_required</code> = true.</li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Stat l="Evidence-required agents" v={String(evidenceAgents.length)} />
        <Stat l="Audit-required" v={`${ATLAS_AGENTS.length} / ${ATLAS_AGENTS.length}`} s="all agents" />
        <Stat l="Auto-execute on risk" v="0" s="never" />
      </div>
      <p style={{ color: "var(--faint)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
        Live evidence records populate here once an executable pack runs against connected data sources.
      </p>
    </AtlasShell>
  );
}

function Stat({ l, v, s }: { l: string; v: string; s?: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, minWidth: 180 }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase" }}>{l}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 4 }}>{v}</div>
      {s && <div style={{ fontSize: 11, color: "var(--muted)" }}>{s}</div>}
    </div>
  );
}

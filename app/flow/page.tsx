"use client";

import Link from "next/link";
import { ATLAS_WORKFLOWS, AGENTS_BY_ID } from "@/lib/atlas";
import { AtlasShell, StatusBadge, RiskBadge, ProofLegend, SafetyNote } from "@/components/atlas/AtlasUI";

export default function FlowPage() {
  return (
    <AtlasShell
      title="Workflow Templates"
      subtitle={`${ATLAS_WORKFLOWS.length} multi-step workflows that wire agents into business flows — with approval, evidence and audit points at every risky step. External sending is off by default in every workflow.`}
      active="/flow"
    >
      <SafetyNote />
      <ProofLegend />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ATLAS_WORKFLOWS.map((w) => (
          <div key={w.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{w.name}</strong>
              <div style={{ display: "flex", gap: 8 }}><StatusBadge status={w.execution_status} /><RiskBadge risk={w.risk_level} /></div>
            </div>
            <ol style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: "12px 0", counterReset: "step" }}>
              {w.steps.map((s, i) => (
                <li key={i} style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 10px" }}>
                  {i + 1}. {s}
                  {w.approval_points.includes(s) && <span style={{ color: "var(--c-safe)" }}> · approval</span>}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)" }}>
              <span>approval points: {w.approval_points.length || 0}</span>
              <span>evidence points: {w.evidence_points.length}</span>
              <span>audit points: {w.audit_points.length}</span>
              <span style={{ color: w.external_send_allowed ? "var(--c-rust)" : "var(--c-node)" }}>
                external_send: {String(w.external_send_allowed)}
              </span>
            </div>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {w.required_agents.map((aid) => (
                <Link key={aid} href={`/agents/${aid}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", color: "var(--muted)" }}>
                  {AGENTS_BY_ID[aid]?.name || aid}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AtlasShell>
  );
}

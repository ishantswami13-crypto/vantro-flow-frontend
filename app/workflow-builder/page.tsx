"use client";

import { useState } from "react";
import Link from "next/link";
import { ATLAS_WORKFLOWS, getWorkflow } from "@/lib/atlas";
import { AtlasShell, StatusBadge, RiskBadge, SafetyNote } from "@/components/atlas/AtlasUI";

export default function WorkflowBuilderPage() {
  const [selectedId, setSelectedId] = useState(ATLAS_WORKFLOWS[0]?.id || "");
  const wf = getWorkflow(selectedId);

  return (
    <AtlasShell
      title="Workflow Builder"
      subtitle="Start from a template, see every step and its gates, then configure a custom workflow per tenant. Custom blueprints ship as custom_required — they cannot execute until configured and proven."
      active="/workflow-builder"
    >
      <SafetyNote />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ATLAS_WORKFLOWS.map((w) => (
            <button key={w.id} onClick={() => setSelectedId(w.id)}
              style={{
                textAlign: "left", padding: "8px 10px", borderRadius: 8, fontSize: 13,
                border: "1px solid var(--line)",
                background: w.id === selectedId ? "rgba(255,255,255,0.06)" : "transparent",
                color: w.id === selectedId ? "#fff" : "var(--muted)",
              }}>
              {w.name}
            </button>
          ))}
        </div>

        {wf && (
          <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{wf.name}</strong>
              <div style={{ display: "flex", gap: 8 }}><StatusBadge status={wf.execution_status} /><RiskBadge risk={wf.risk_level} /></div>
            </div>
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)", marginTop: 14, textTransform: "uppercase" }}>Steps & gates</h3>
            <ol style={{ paddingLeft: 18, marginTop: 8 }}>
              {wf.steps.map((s, i) => (
                <li key={i} style={{ fontSize: 14, marginBottom: 6 }}>
                  {s}
                  {wf.approval_points.includes(s) && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--c-safe)", fontFamily: "var(--font-mono)" }}>· approval gate</span>}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--faint)", marginTop: 8 }}>
              <span>evidence points: {wf.evidence_points.length}</span>
              <span>audit points: {wf.audit_points.length}</span>
              <span style={{ color: "var(--c-node)" }}>external_send: {String(wf.external_send_allowed)}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase" }}>Agents used</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {wf.required_agents.map((aid) => (
                  <Link key={aid} href={`/agents/${aid}`} style={{ fontSize: 11, fontFamily: "var(--font-mono)", border: "1px solid var(--line)", borderRadius: 6, padding: "2px 8px", color: "var(--muted)" }}>{aid}</Link>
                ))}
              </div>
            </div>
            <button style={{ marginTop: 16, padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#000", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              Clone as custom workflow (custom_required)
            </button>
          </div>
        )}
      </div>
    </AtlasShell>
  );
}

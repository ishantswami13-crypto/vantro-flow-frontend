"use client";

import { ATLAS_AGENTS, ATLAS_WORKFLOWS } from "@/lib/atlas";
import { AtlasShell, AgentCard, Grid, SafetyNote } from "@/components/atlas/AtlasUI";

export default function ApprovalsPage() {
  const approvalAgents = ATLAS_AGENTS.filter((a) => a.approval_required);
  const wfApprovalPoints = ATLAS_WORKFLOWS.reduce((n, w) => n + w.approval_points.length, 0);

  return (
    <AtlasShell
      title="Approval Control"
      subtitle={`${approvalAgents.length} agents and ${wfApprovalPoints} workflow steps require human approval before they can act. Maker ≠ checker; every decision is audited.`}
      active="/approvals"
    >
      <SafetyNote />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat l="Approval-gated agents" v={String(approvalAgents.length)} />
        <Stat l="Workflow approval points" v={String(wfApprovalPoints)} />
        <Stat l="Auto-executed risky actions" v="0" s="by design" />
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 20, maxWidth: 760 }}>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>
          When an executable agent reaches a risky step, it does not act — it packages the action and its evidence and
          routes it to the right approver. The Approval Control pack (router · packager · threshold guard · segregation-of-duties · audit)
          enforces this. Nothing customer-facing, financial, legal or destructive proceeds without an approved decision.
        </p>
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 12 }}>Agents that route through approval</h2>
      <Grid>{approvalAgents.slice(0, 60).map((a) => <AgentCard key={a.id} agent={a} />)}</Grid>
      {approvalAgents.length > 60 && <p style={{ color: "var(--faint)", fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 12 }}>Showing 60 of {approvalAgents.length}.</p>}
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

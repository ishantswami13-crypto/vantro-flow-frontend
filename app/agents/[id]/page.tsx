"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAgent, getPack, canExecuteAgent, explainDecision, EXECUTABLE, type AtlasContext } from "@/lib/atlas";
import { AtlasShell, StatusBadge, RiskBadge, GateChips } from "@/components/atlas/AtlasUI";

const DEMO_CTX: AtlasContext = {
  userRole: "owner",
  connectedDataSources: ["invoices", "collections", "customers", "suppliers", "inventory", "orders", "purchases", "ledger", "bank", "khata", "forecast", "analytics", "metrics", "business_profile", "evidence_vault", "audit_log"],
  activeConnectors: [],
  evidenceProvided: true, approvalGranted: false, auditEnabled: true, externalSendEnabled: false,
};

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const agent = getAgent(decodeURIComponent(id));
  const decision = useMemo(() => (agent ? canExecuteAgent(agent, DEMO_CTX) : null), [agent]);

  if (!agent) {
    return (
      <AtlasShell title="Agent not found" active="/agents">
        <Link href="/agents" style={{ color: "var(--c-node)" }}>← Back to agents</Link>
      </AtlasShell>
    );
  }
  const live = EXECUTABLE(agent.execution_status);
  const packs = agent.pack_ids.map((pid) => getPack(pid)).filter(Boolean);

  return (
    <AtlasShell title={agent.name} subtitle={agent.description} active="/agents">
      <Link href="/agents" style={{ color: "var(--c-node)", fontFamily: "var(--font-mono)", fontSize: 13 }}>← Agent mesh</Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "16px 0" }}>
        <StatusBadge status={agent.execution_status} />
        <RiskBadge risk={agent.risk_level} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>{agent.domain} · {agent.role}</span>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>{agent.id}</code>
      </div>

      <div style={{
        border: `1px solid ${decision?.allowed ? "var(--c-node)" : "var(--c-safe)"}55`,
        background: `${decision?.allowed ? "var(--c-node)" : "var(--c-safe)"}10`,
        borderRadius: 12, padding: 14, marginBottom: 20,
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 6, color: decision?.allowed ? "var(--c-node)" : "var(--c-safe)" }}>
          {decision?.allowed ? "▸ Ready to run (demo context)" : live ? "◌ Blocked by gates" : "◌ Not executable"}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{decision ? explainDecision(decision) : ""}</div>
        {agent.blocked_reason && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Reason: {agent.blocked_reason}</div>}
      </div>

      <F label="Job to be done" v={agent.job_to_be_done} />
      <F label="Input data" v={agent.input_data} />
      <F label="Output / decision / action" v={agent.output_decision_or_action} />
      <F label="Actions supported" v={agent.actions_supported.join(", ")} />
      <F label="Proof gate" v={agent.proof_gate} />
      <F label="Live route" v={agent.live_route || "— (not executable / insight-only)"} />

      <div style={{ margin: "16px 0" }}>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase" }}>Gates</span>
        <div style={{ marginTop: 6 }}>
          <GateChips evidence={agent.evidence_required} approval={agent.approval_required} audit={agent.audit_required} connector={agent.connector_required} />
        </div>
      </div>

      <div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase" }}>In packs</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {packs.length === 0 && <span style={{ color: "var(--faint)" }}>— composed into packs by dimension —</span>}
          {packs.map((p) => p && (
            <Link key={p.id} href={`/packs/${p.id}`} style={{ fontSize: 12, fontFamily: "var(--font-mono)", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 10px", color: "var(--muted)" }}>
              {p.name}
            </Link>
          ))}
        </div>
      </div>
    </AtlasShell>
  );
}

function F({ label, v }: { label: string; v: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <div style={{ fontSize: 14, color: "var(--fg)" }}>{v}</div>
    </div>
  );
}

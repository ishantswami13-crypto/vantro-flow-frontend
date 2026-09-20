"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getPack, getWorkflow, AGENTS_BY_ID, canExecutePack, explainDecision,
  EXECUTABLE, type AtlasContext,
} from "@/lib/atlas";
import { AtlasShell, StatusBadge, RiskBadge, GateChips, AgentCard, Grid } from "@/components/atlas/AtlasUI";

// A demo context: audit on, owner role, common data sources connected, BUT
// external send OFF — so the page shows honest "ready" vs "blocked" states.
const DEMO_CTX: AtlasContext = {
  userRole: "owner",
  connectedDataSources: ["invoices", "collections", "customers", "suppliers", "inventory", "orders", "purchases", "ledger", "bank", "khata", "forecast", "analytics", "metrics", "business_profile", "evidence_vault", "audit_log"],
  activeConnectors: [],
  evidenceProvided: true, approvalGranted: false, auditEnabled: true, externalSendEnabled: false,
};

export default function PackDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id || "";
  const pack = getPack(decodeURIComponent(id));

  const decision = useMemo(() => (pack ? canExecutePack(pack, DEMO_CTX) : null), [pack]);

  if (!pack) {
    return (
      <AtlasShell title="Pack not found" active="/packs">
        <Link href="/packs" style={{ color: "var(--c-node)" }}>← Back to packs</Link>
      </AtlasShell>
    );
  }

  const agents = pack.included_agent_ids.map((aid) => AGENTS_BY_ID[aid]).filter(Boolean);
  const workflows = pack.included_workflow_ids.map((wid) => getWorkflow(wid)).filter(Boolean);
  const live = EXECUTABLE(pack.execution_status);
  const connected = DEMO_CTX.connectedDataSources || [];

  return (
    <AtlasShell title={pack.name} subtitle={pack.description} active="/packs">
      <Link href="/packs" style={{ color: "var(--c-node)", fontFamily: "var(--font-mono)", fontSize: 13 }}>← All packs</Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "16px 0" }}>
        <StatusBadge status={pack.execution_status} />
        <RiskBadge risk={pack.risk_level} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)" }}>
          {pack.category} · {pack.dimension} · setup: {pack.setup_complexity} · {pack.automation_depth}
        </span>
      </div>

      {/* Activation / gate state */}
      <div style={{
        border: `1px solid ${decision?.allowed ? "var(--c-node)" : "var(--c-safe)"}55`,
        background: `${decision?.allowed ? "var(--c-node)" : "var(--c-safe)"}10`,
        borderRadius: 12, padding: 14, marginBottom: 20,
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 6 }}>
          {decision?.allowed
            ? <span style={{ color: "var(--c-node)" }}>▸ {pack.activation_cta} — gates satisfied in this demo context</span>
            : <span style={{ color: "var(--c-safe)" }}>◌ {live ? "Blocked by gates" : "Not executable"}</span>}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>{decision ? explainDecision(decision) : ""}</div>
        {pack.blocked_reason && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>Reason: {pack.blocked_reason}</div>}
        {pack.dimension === "enterprise_custom" && (
          <button style={{ marginTop: 10, padding: "8px 14px", borderRadius: 8, background: "#fff", color: "#000", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Request custom deployment
          </button>
        )}
      </div>

      <Section title="Who & why">
        <Field label="Target customer" value={pack.target_customer} />
        <Field label="Business problem" value={pack.business_problem} />
        <Field label="Primary outcome" value={pack.primary_outcome} />
        <Field label="Roadmap note" value={pack.roadmap_note} />
      </Section>

      <Section title="Gates">
        <GateChips evidence={pack.evidence_required} approval={pack.approval_required} audit={pack.audit_required} connector={(pack.required_connectors || []).length > 0} />
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>
          required gates: {decision?.required_gates.join(" · ") || "—"}
        </div>
      </Section>

      <Section title="Data sources">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {pack.required_data_sources.length === 0 && <span style={{ color: "var(--faint)" }}>none</span>}
          {pack.required_data_sources.map((s) => {
            const ok = connected.includes(s);
            return (
              <span key={s} style={{
                fontSize: 11, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 6,
                border: `1px solid ${ok ? "var(--c-node)" : "var(--c-safe)"}55`, color: ok ? "var(--c-node)" : "var(--c-safe)",
              }}>{ok ? "✓ connected" : "✗ missing"} · {s}</span>
            );
          })}
        </div>
        {pack.required_connectors.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--c-db)", fontFamily: "var(--font-mono)" }}>
            connectors: {pack.required_connectors.join(", ")}
          </div>
        )}
      </Section>

      <Section title={`Included workflows (${workflows.length})`}>
        {workflows.length === 0 && <span style={{ color: "var(--faint)" }}>none</span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {workflows.map((w) => w && (
            <Link key={w.id} href="/flow" style={{ display: "flex", justifyContent: "space-between", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
              <span style={{ fontSize: 13 }}>{w.name}</span>
              <StatusBadge status={w.execution_status} />
            </Link>
          ))}
        </div>
      </Section>

      <Section title={`Included agents (${agents.length})`}>
        <Grid>{agents.map((a) => <AgentCard key={a.id} agent={a} />)}</Grid>
      </Section>
    </AtlasShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <div style={{ fontSize: 14, color: "var(--fg)" }}>{value}</div>
    </div>
  );
}

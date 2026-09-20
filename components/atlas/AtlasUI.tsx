"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — shared UI primitives
// Every Atlas surface composes these so status / proof / gates are shown the
// same way everywhere. Styling rides the global `.atlas-page` design system.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import {
  STATUS_META, RISK_META, EXECUTABLE,
  type ExecutionStatus, type RiskLevel, type AtlasPack, type AtlasAgent,
} from "@/lib/atlas";

// ── Brand copy (PART 6 required language) ─────────────────────────────────────
export const ATLAS_COPY = {
  tagline: "AI Business Civilization Infrastructure",
  what: "BusinessOS — agent-run business operations",
  proof: "Evidence-backed intelligence · proof-gated automation",
  custom: "A custom operating layer for every business type and scale",
};

// ── Top navigation across Atlas surfaces ──────────────────────────────────────
const NAV: { href: string; label: string }[] = [
  { href: "/command", label: "Command" },
  { href: "/genesis", label: "Genesis" },
  { href: "/packs", label: "Packs" },
  { href: "/agents", label: "Agents" },
  { href: "/flow", label: "Workflows" },
  { href: "/business-graph", label: "Graph" },
  { href: "/evidence-vault", label: "Evidence" },
  { href: "/approvals", label: "Approvals" },
];

export function AtlasShell({
  title, subtitle, children, active,
}: {
  title: string; subtitle?: string; children: React.ReactNode; active?: string;
}) {
  return (
    <div className="atlas-page" style={{ minHeight: "100vh", padding: "clamp(20px,4vw,48px)" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 18 }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                style={{
                  fontSize: 13, fontFamily: "var(--font-mono)", padding: "6px 10px", borderRadius: 8,
                  border: "1px solid var(--line)",
                  color: active === n.href ? "#000" : "var(--muted)",
                  background: active === n.href ? "#fff" : "transparent",
                }}>
                {n.label}
              </Link>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-ai)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            {ATLAS_COPY.tagline}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, margin: "6px 0 4px" }}>
            {title}
          </h1>
          {subtitle && <p style={{ color: "var(--muted)", maxWidth: 720 }}>{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}

// ── Status / risk badges ──────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: ExecutionStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--font-mono)",
      padding: "3px 9px", borderRadius: 999, color: m.color, border: `1px solid ${m.color}55`, background: `${m.color}12`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: m.color }} />
      {m.label}{m.executable ? "" : " · blocked"}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const m = RISK_META[risk];
  return (
    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: m.color, border: `1px solid ${m.color}44`, padding: "2px 7px", borderRadius: 6 }}>
      risk: {m.label}
    </span>
  );
}

// ── Gate chips (evidence / approval / audit / connector) ──────────────────────
export function GateChips({
  evidence, approval, audit, connector,
}: { evidence?: boolean; approval?: boolean; audit?: boolean; connector?: boolean }) {
  const chips: { label: string; on: boolean }[] = [
    { label: "evidence", on: !!evidence },
    { label: "approval", on: !!approval },
    { label: "audit", on: !!audit },
    { label: "connector", on: !!connector },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {chips.map((c) => (
        <span key={c.label} style={{
          fontSize: 11, fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: 6,
          border: "1px solid var(--line)", color: c.on ? "var(--fg)" : "var(--faint)",
          background: c.on ? "rgba(255,255,255,0.06)" : "transparent",
        }}>
          {c.on ? "✓" : "·"} {c.label}
        </span>
      ))}
    </div>
  );
}

// ── Card shell ────────────────────────────────────────────────────────────────
export function Card({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = (
    <div style={{
      border: "1px solid var(--line)", borderRadius: 14, padding: 16, background: "rgba(255,255,255,0.02)",
      height: "100%", display: "flex", flexDirection: "column", gap: 10,
    }}>
      {children}
    </div>
  );
  return href ? <Link href={href} style={{ display: "block", height: "100%" }}>{inner}</Link> : inner;
}

export function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

// ── Pack & agent cards ────────────────────────────────────────────────────────
export function PackCard({ pack }: { pack: AtlasPack }) {
  const live = EXECUTABLE(pack.execution_status);
  return (
    <Card href={`/packs/${pack.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{pack.name}</strong>
        <StatusBadge status={pack.execution_status} />
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>{pack.category} · {pack.dimension}</div>
      <p style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>{pack.business_problem}</p>
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>
        <span>{pack.included_agent_ids.length} agents</span>
        <span>{pack.included_workflow_ids.length} workflows</span>
      </div>
      <RiskBadge risk={pack.risk_level} />
      <span style={{ fontSize: 12, color: live ? "var(--c-node)" : "var(--c-ai)", fontFamily: "var(--font-mono)" }}>
        {live ? "▸ " + pack.activation_cta : "◌ " + (pack.blocked_reason || pack.activation_cta)}
      </span>
    </Card>
  );
}

export function AgentCard({ agent }: { agent: AtlasAgent }) {
  return (
    <Card href={`/agents/${encodeURIComponent(agent.id)}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: 15 }}>{agent.name}</strong>
        <StatusBadge status={agent.execution_status} />
      </div>
      <div style={{ fontSize: 12, color: "var(--faint)", fontFamily: "var(--font-mono)" }}>{agent.domain} · {agent.role}</div>
      <p style={{ fontSize: 13, color: "var(--muted)", flex: 1 }}>{agent.job_to_be_done}</p>
      <GateChips evidence={agent.evidence_required} approval={agent.approval_required} audit={agent.audit_required} connector={agent.connector_required} />
      <RiskBadge risk={agent.risk_level} />
    </Card>
  );
}

// ── Proof-level legend (reusable banner) ──────────────────────────────────────
export function ProofLegend() {
  const order: ExecutionStatus[] = ["live_proven", "live_limited", "preview", "connector_required", "custom_required", "partner_required", "roadmap", "disabled"];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 20px" }}>
      {order.map((s) => <StatusBadge key={s} status={s} />)}
    </div>
  );
}

// ── Safety banner ─────────────────────────────────────────────────────────────
export function SafetyNote() {
  return (
    <div style={{
      border: "1px solid var(--c-safe)55", background: "var(--c-safe)10", borderRadius: 12,
      padding: "12px 14px", fontSize: 13, color: "var(--muted)", marginBottom: 20,
    }}>
      <strong style={{ color: "var(--c-safe)" }}>Proof-gated.</strong>{" "}
      Only <em>Live · Proven</em> and <em>Live · Limited</em> run — and only through evidence, approval and audit gates.
      Everything else is visible for evaluation but cannot execute. External / customer-facing sending is off by default.
    </div>
  );
}

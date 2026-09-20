"use client";

import Link from "next/link";
import { ATLAS_AGENTS, getPack, EXECUTABLE } from "@/lib/atlas";
import { AtlasShell, AgentCard, Grid, ProofLegend, SafetyNote, ATLAS_COPY } from "@/components/atlas/AtlasUI";

export default function CommandPage() {
  const commandAgents = ATLAS_AGENTS.filter((a) => a.domain === "Command");
  const liveCommand = commandAgents.filter((a) => EXECUTABLE(a.execution_status));
  const ceo = getPack("swarm.ceo_command");

  return (
    <AtlasShell
      title="Command"
      subtitle={`${ATLAS_COPY.what}. The owner cockpit — one evidence-backed view of what changed and what needs a decision today.`}
      active="/command"
    >
      <SafetyNote />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="Command agents" value={String(commandAgents.length)} />
        <Stat label="Live now" value={String(liveCommand.length)} sub="evidence-gated" />
        <Stat label="Owner Briefing" value="Live · Limited" sub="proven surface" />
        <Stat label="Auto-execute" value="0" sub="humans approve risk" />
      </div>

      {ceo && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-ai)", marginBottom: 4 }}>SPINE PACK</div>
          <Link href={`/packs/${ceo.id}`} style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{ceo.name} →</Link>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>{ceo.business_problem}</p>
        </div>
      )}

      <ProofLegend />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "8px 0 14px" }}>Command agents</h2>
      <Grid>{commandAgents.map((a) => <AgentCard key={a.id} agent={a} />)}</Grid>
    </AtlasShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--faint)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

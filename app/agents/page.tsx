"use client";

import { useMemo, useState } from "react";
import { ATLAS_AGENTS, STATUS_META, type ExecutionStatus, type AtlasAgent } from "@/lib/atlas";
import { AtlasShell, AgentCard, Grid, ProofLegend, SafetyNote } from "@/components/atlas/AtlasUI";

export default function AgentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ExecutionStatus | "all">("all");
  const [domain, setDomain] = useState("all");

  const domains = useMemo(() => Array.from(new Set(ATLAS_AGENTS.map((a) => a.domain))).sort(), []);

  const filtered = useMemo<AtlasAgent[]>(() => {
    const ql = q.toLowerCase();
    return ATLAS_AGENTS.filter((a) =>
      (status === "all" || a.execution_status === status) &&
      (domain === "all" || a.domain === domain) &&
      (!ql || a.name.toLowerCase().includes(ql) || a.job_to_be_done.toLowerCase().includes(ql) || a.id.includes(ql)),
    );
  }, [q, status, domain]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ATLAS_AGENTS.forEach((a) => { c[a.execution_status] = (c[a.execution_status] || 0) + 1; });
    return c;
  }, []);

  return (
    <AtlasShell
      title="Agent Mesh"
      subtitle={`${ATLAS_AGENTS.length} agents organised by domain and swarm. Agent-run business operations — each one proof-gated. ${counts.live_limited || 0} live now; the rest are visible but blocked until proven.`}
      active="/agents"
    >
      <SafetyNote />
      <ProofLegend />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <input
          placeholder="Search agents…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ flex: "1 1 240px", padding: "8px 12px", borderRadius: 8, background: "#000", color: "#fff", border: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 13 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as ExecutionStatus | "all")}
          style={{ padding: "8px 12px", borderRadius: 8, background: "#000", color: "#fff", border: "1px solid var(--line)" }}>
          <option value="all">All statuses ({ATLAS_AGENTS.length})</option>
          {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{STATUS_META[s as ExecutionStatus].label} ({counts[s] || 0})</option>)}
        </select>
        <select value={domain} onChange={(e) => setDomain(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, background: "#000", color: "#fff", border: "1px solid var(--line)" }}>
          <option value="all">All domains</option>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--faint)", marginBottom: 12 }}>
        {filtered.length} agents
      </div>
      <Grid>{filtered.slice(0, 120).map((a) => <AgentCard key={a.id} agent={a} />)}</Grid>
      {filtered.length > 120 && (
        <p style={{ color: "var(--faint)", fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 16 }}>
          Showing first 120 of {filtered.length}. Narrow with search / filters.
        </p>
      )}
    </AtlasShell>
  );
}

"use client";

// MISSIONS: everything Starlane is handling, in one list. A mission is
// either a decision you told Starlane to handle or a workflow you deployed.
// Its state and outcome come from the backend (GET /api/os/missions), which
// derives them from the decision, its contract and its action runs, or from
// the workflow's runs and items. "Steps ran" is never shown as "it worked":
// the outcome is only verified from the ledger.

import React, { useState } from "react";
import Link from "next/link";
import { Mission, MissionState, MISSION_STATE_LABEL, MISSION_OUTCOME_LABEL } from "@/lib/os";
import { V, SkeletonRows, EmptyLine, ErrorBanner, ago } from "@/components/v32/ui";
import { errorText } from "./shared";

export type MissionFilter = "active" | "at_risk" | "completed";
const FILTERS: { key: MissionFilter; label: string; states: MissionState[] }[] = [
  { key: "active", label: "Active", states: ["PLANNING", "RUNNING", "VERIFYING", "BLOCKED", "WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION"] },
  { key: "at_risk", label: "At risk", states: ["WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION", "BLOCKED", "FAILED"] },
  { key: "completed", label: "Completed", states: ["COMPLETED", "FAILED", "STOPPED"] },
];

/** Agent display name: from GET /api/os/agents when loaded, else readable from its key. */
export function agentLabel(key: string, names?: Record<string, string>): string {
  if (names?.[key]) return names[key];
  const s = key.replace(/^starlane\./, "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tools a mission's steps run through (decision adapters), in plain words. */
export function missionTools(m: Mission): string[] {
  const out = new Set<string>();
  for (const s of m.steps) if (s.adapter) out.add(s.adapter.replace(/^[a-z_]+\./, "").replace(/_/g, " "));
  return [...out];
}

export function missionCount(all: Mission[], k: MissionFilter): number {
  const f = FILTERS.find((x) => x.key === k)!;
  return all.filter((m) => f.states.includes(m.state)).length;
}

// Status pill colours (handoff §5): outlined, 11px, radius 20.
function stateColor(s: MissionState): string {
  if (s === "COMPLETED") return V.positive;
  if (s === "BLOCKED" || s === "FAILED") return V.critical;
  if (s === "WAITING_FOR_APPROVAL" || s === "WAITING_FOR_INFORMATION") return V.warning;
  if (s === "RUNNING" || s === "VERIFYING") return V.accent;
  return V.secondary;
}

function outcomeColor(o: string): string {
  if (o === "VERIFIED_SUCCESS") return V.positive;
  if (o === "VERIFIED_FAILURE") return V.critical;
  if (o === "OUTCOME_UNKNOWN") return V.warning;
  return V.tertiary;
}

/** Mission cards for one subnav tab. The list is loaded by the page. */
export function MissionsList({ all, filter, loading, error, agentNames }: { all: Mission[]; filter: MissionFilter; loading: boolean; error: unknown; agentNames?: Record<string, string> }) {
  const f = FILTERS.find((x) => x.key === filter)!;
  const list = all.filter((m) => f.states.includes(m.state));

  if (loading) return <SkeletonRows rows={3} />;
  if (error) return <ErrorBanner>Missions could not be loaded: {errorText(error)} Nothing has been changed.</ErrorBanner>;
  if (all.length === 0) {
    return (
      <EmptyLine
        title="Nothing is being handled yet."
        body={<>Open a decision in <Link className="underline" href="/prepared">Prepared</Link> and choose Handle it, or deploy a proposed workflow. Starlane runs it in shadow mode first.</>}
      />
    );
  }
  if (list.length === 0) return <EmptyLine title={filter === "at_risk" ? "No mission is at risk." : filter === "completed" ? "No mission has finished yet." : "No active mission."} />;
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {list.map((m) => <MissionCard key={m.id} m={m} agentNames={agentNames} />)}
    </div>
  );
}

// decision_action_runs statuses that count as a finished step (060_decision_core.sql).
const STEP_DONE = new Set(["SUCCEEDED", "SHADOWED", "PREPARED"]);

function MissionCard({ m, agentNames }: { m: Mission; agentNames?: Record<string, string> }) {
  const tools = missionTools(m);
  const total = m.steps.length;
  const done = m.steps.filter((s) => STEP_DONE.has((s.status || "").toUpperCase())).length;
  const pct = m.state === "COMPLETED" ? 100 : total ? Math.round((done / total) * 100) : 0;
  const blockers = m.steps.filter((s) => s.error).length + (m.state === "BLOCKED" ? 1 : 0);
  const color = stateColor(m.state);
  const body = (
    <>
      <div>
        <span className="inline-block" style={{ fontSize: 11, letterSpacing: 0, color, border: `1px solid ${color}`, borderRadius: 20, padding: "3px 10px", whiteSpace: "nowrap", marginBottom: 10 }}>
          {MISSION_STATE_LABEL[m.state]}
        </span>
        <div style={{ fontFamily: V.serif, fontSize: 15, lineHeight: 1.35, color: V.ink, marginBottom: 4 , fontWeight: 600, letterSpacing: "-0.01em"}}>{m.title}</div>
        {m.objective && <div style={{ fontSize: 12.5, color: V.secondary }}>{m.source === "DECISION" ? "Chosen option: " : ""}{m.objective}</div>}
      </div>
      {(m.stateReason || m.outcome.detail) && (
        <div style={{ fontSize: 13, color: V.body, lineHeight: 1.55 }}>{m.stateReason || m.outcome.detail}</div>
      )}
      {m.assigned && (
        <div style={{ fontSize: 12, color: V.secondary, lineHeight: 1.5 }}>
          Agent: <span style={{ color: V.body }}>{agentLabel(m.assigned.agent, agentNames)}</span>
          {tools.length ? <> · Tools: <span style={{ color: V.body }}>{tools.join(", ")}</span></> : null}
          {" "}· You approve
        </div>
      )}
      <div>
        <div style={{ height: 5, background: "rgb(var(--c-ink) / 0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: V.ink }} />
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 6, fontSize: 11.5, color: V.tertiary }}>
          <span>{total ? `${done} of ${total} steps` : "No step has run yet"}</span>
          <span style={{ color: outcomeColor(m.outcome.status) }}>{MISSION_OUTCOME_LABEL[m.outcome.status]}</span>
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: "auto", fontSize: 12, color: V.secondary }}>
        <span>{blockers > 0 ? `${blockers} blocker${blockers === 1 ? "" : "s"}` : m.source === "DECISION" ? "From a decision" : m.source === "COLLECTION" ? "Collection mission" : "Deployed workflow"}</span>
        <span style={{ color: V.tertiary }}>
          {m.mode === "SHADOW" ? "Shadow" : m.mode === "WITH_APPROVAL" ? "Waits for approval" : m.mode ? "Live" : ""}
          {m.updatedAt ? `${m.mode ? " · " : ""}${ago(m.updatedAt)}` : ""}
        </span>
      </div>
    </>
  );
  const cls = "card-in hover-lift flex flex-col";
  const style: React.CSSProperties = { boxSizing: "border-box", background: "var(--bg-elevated)", border: `1px solid ${V.card}`, borderRadius: 8, padding: 20, gap: 12, minHeight: 200 };
  if (m.source !== "WORKFLOW") return <Link href={m.href} className={cls} style={style}>{body}</Link>;
  return <div className={cls} style={style}>{body}</div>;
}

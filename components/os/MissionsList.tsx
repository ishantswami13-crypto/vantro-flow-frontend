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
import { StepPips } from "@/components/hv/Pieces";

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

// Status colours (handoff §5): a square marker and a mono label.
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
  if (error) return <ErrorBanner>Tasks could not be loaded: {errorText(error)} Nothing has been changed.</ErrorBanner>;
  if (all.length === 0) {
    return (
      <EmptyLine
        title="Nothing is being handled yet."
        body={<>Open a decision in <Link className="underline" href="/prepared">Approvals</Link> and choose Handle it, or deploy a proposed workflow. Starlane runs it in shadow mode first.</>}
      />
    );
  }
  if (list.length === 0) return <EmptyLine title={filter === "at_risk" ? "No task is at risk." : filter === "completed" ? "No task has finished yet." : "No active task."} />;
  // A review table, like the receivables review on the public site.
  return (
    <div className="sp-table">
      <div className="sp-tr sp-th sp-tr-task"><span>Task</span><span>Status</span><span>Agent</span><span>Progress</span><span className="sp-right">Updated</span></div>
      {list.map((m) => <MissionRow key={m.id} m={m} agentNames={agentNames} />)}
    </div>
  );
}

// decision_action_runs statuses that count as a finished step (060_decision_core.sql).
const STEP_DONE = new Set(["SUCCEEDED", "SHADOWED", "PREPARED"]);

function MissionRow({ m, agentNames }: { m: Mission; agentNames?: Record<string, string> }) {
  const total = m.steps.length;
  const done = m.steps.filter((s) => STEP_DONE.has((s.status || "").toUpperCase())).length;
  const color = stateColor(m.state);
  const sub = m.stateReason || m.outcome.detail || (m.objective ? `${m.source === "DECISION" ? "Chosen option: " : ""}${m.objective}` : null);
  const body = (
    <>
      <span className="sp-td-main">
        <span className="sp-doc"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="M5.3 8.2l1.8 1.8 3.6-3.8" /></svg></span>
        <span className="min-w-0"><span className="block truncate" style={{ fontWeight: 500 }}>{m.title}</span>{sub && <span className="sp-td-sub">{sub}</span>}</span>
      </span>
      <span className="sp-td"><span className="inline-flex items-center" style={{ gap: 6, color }}><span className="sq" aria-hidden="true" />{MISSION_STATE_LABEL[m.state]}</span></span>
      <span className="sp-td truncate">{m.assigned ? agentLabel(m.assigned.agent, agentNames) : "—"}</span>
      <span className="sp-td">
        {total ? <StepPips done={m.state === "COMPLETED" ? total : done} total={total} failed={m.state === "FAILED"} /> : null}
        <span className="block" style={{ marginTop: 5, fontSize: 11.5, color: outcomeColor(m.outcome.status) }}>{total ? `${done} of ${total} steps` : "Not started"} · {MISSION_OUTCOME_LABEL[m.outcome.status]}</span>
      </span>
      <span className="sp-td sp-right">{m.mode === "SHADOW" ? "Shadow" : m.mode === "WITH_APPROVAL" ? "Waits for you" : m.mode ? "Live" : ""}{m.updatedAt ? `${m.mode ? " · " : ""}${ago(m.updatedAt)}` : ""}</span>
    </>
  );
  if (m.source !== "WORKFLOW") return <Link href={m.href} className="sp-tr sp-tr-task">{body}</Link>;
  return <div className="sp-tr sp-tr-task">{body}</div>;
}

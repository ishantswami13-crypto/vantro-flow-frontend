"use client";

// MISSIONS: everything Starlane is handling, in one list. A mission is
// either a decision you told Starlane to handle, a workflow you deployed or
// a collections mission. Its state and outcome come from the backend
// (GET /api/os/missions), which derives them from the decision, its contract
// and its action runs, or from the workflow's runs and items. "Steps ran" is
// never shown as "it worked": the outcome is only verified from the ledger.

import React from "react";
import Link from "next/link";
import { Mission, MissionState, MISSION_STATE_LABEL } from "@/lib/os";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Chevron } from "@/components/v32/ui";
import { formatRelative, formatDateTime } from "@/lib/format";
import { cleanTitle, humanDates, humaneError, missionTone, outcomeColor, Meter, OUTCOME_SHORT, NETWORK_ERROR } from "./missions/ui";

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

// decision_action_runs statuses that count as a finished step (060_decision_core.sql).
const STEP_DONE = new Set(["SUCCEEDED", "SHADOWED", "PREPARED"]);

// Mission, status, progress, outcome, updated. One template for the header
// and every row so the columns share their alignment lines.
const COLS = "minmax(0,1fr) 168px 132px 164px 84px";

/** Mission rows for one subnav tab. The list is loaded by the page. */
export function MissionsList({ all, filter, loading, error, agentNames, onRetry, onOpenWorkflows }: {
  all: Mission[]; filter: MissionFilter; loading: boolean; error: unknown; agentNames?: Record<string, string>;
  onRetry?: () => void; onOpenWorkflows?: () => void;
}) {
  const f = FILTERS.find((x) => x.key === filter)!;
  const list = all.filter((m) => f.states.includes(m.state));

  if (loading) return <MissionsSkeleton />;
  if (error) {
    const msg = humaneError(error, NETWORK_ERROR);
    return <ErrorState title="Missions didn't load" message={`${msg} Nothing has been changed.`} onRetry={onRetry} />;
  }
  if (all.length === 0) {
    return (
      <p className="wk-empty">
        Nothing is being handled yet. Start a collections mission, or open a decision in <Link className="underline" href="/prepared">Prepared</Link> and choose Handle it.
      </p>
    );
  }
  if (list.length === 0) {
    return (
      <p className="wk-empty">
        {filter === "at_risk" ? "No mission is at risk. Nothing is blocked or waiting on you." : filter === "completed" ? "No mission has finished yet. Finished missions show here with their verified outcome." : "No mission is active."}
      </p>
    );
  }
  return (
    <div className="wk-list" role="table" aria-label="Missions">
      <div className="wk-head" role="row" style={{ gridTemplateColumns: COLS }}>
        <span role="columnheader">Mission</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Progress</span>
        <span role="columnheader">Outcome</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Updated</span>
      </div>
      {list.map((m) => <MissionRow key={m.id} m={m} agentNames={agentNames} onOpenWorkflows={onOpenWorkflows} />)}
    </div>
  );
}

/** Progress from what the backend reports: steps that ran for a decision,
 *  items waiting for a workflow. Collections progress lives on the mission
 *  page (measured from the books), so the list says nothing it can't show. */
function progressOf(m: Mission): { text: string; ratio: number | null; tone: "critical" | null; title?: string } | null {
  if (m.source === "DECISION" && m.steps.length) {
    const total = m.steps.length;
    const done = m.steps.filter((s) => STEP_DONE.has((s.status || "").toUpperCase())).length;
    const failed = m.steps.some((s) => (s.status || "").toUpperCase() === "FAILED");
    const tools = missionTools(m);
    return { text: `${done} of ${total} steps`, ratio: done / total, tone: failed ? "critical" : null, title: tools.length ? `Tools: ${tools.join(", ")}` : undefined };
  }
  const waiting = m.counts?.awaitingApproval;
  if (m.source === "WORKFLOW" && waiting != null) return { text: waiting ? `${waiting} waiting for you` : "Nothing waiting", ratio: null, tone: null };
  return null;
}

function MissionRow({ m, agentNames, onOpenWorkflows }: { m: Mission; agentNames?: Record<string, string>; onOpenWorkflows?: () => void }) {
  const mode = m.mode === "SHADOW" ? "Shadow mode" : m.mode === "WITH_APPROVAL" ? "With your approval" : m.mode ? "Live" : null;
  const source = m.source === "DECISION" ? "Decision" : m.source === "COLLECTION" ? "Collections" : "Workflow";
  const meta = [source, m.assigned ? agentLabel(m.assigned.agent, agentNames) : null, mode].filter(Boolean) as string[];
  const outcome = m.outcome.status;
  const outcomeExtra = m.outcome.met != null && m.outcome.notMet != null && (m.outcome.met + m.outcome.notMet) > 0
    ? `${m.outcome.met} of ${m.outcome.met + m.outcome.notMet} paid after`
    : null;
  const p = progressOf(m);
  const reason = m.stateReason || m.objective;

  const inner = (
    <>
      <div className="min-w-0" role="cell">
        <div className="wk-title md:truncate">{cleanTitle(m.title)}</div>
        {reason && <div className="wk-sub line-clamp-2 md:truncate">{humanDates(reason)}</div>}
        <div className="wk-meta" style={{ marginTop: 3 }}>{meta.join(" · ")}</div>
      </div>
      <div className="wk-cells md:contents">
        <div role="cell"><StatusChip tone={missionTone(m.state)}>{MISSION_STATE_LABEL[m.state]}</StatusChip></div>
        <div role="cell" className="min-w-0" title={p?.title}>
          {p ? (
            <>
              <div className="tabular-nums" style={{ fontSize: 12.5, color: p.tone ? "var(--critical)" : "var(--ink-2)" }}>{p.text}</div>
              {p.ratio != null && <div className="hidden md:block" style={{ marginTop: 5, maxWidth: 96 }}><Meter ratio={p.ratio} tone={p.tone ? "critical" : "ink"} label={p.text} /></div>}
            </>
          ) : <span className="hidden md:inline" style={{ fontSize: 12, color: "var(--ink-3)" }}>—</span>}
        </div>
        <div role="cell" className="min-w-0">
          <div style={{ fontSize: 12.5, color: outcomeColor(outcome) }}>{OUTCOME_SHORT[outcome]}</div>
          {outcomeExtra && <div className="tabular-nums hidden md:block" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{outcomeExtra}</div>}
        </div>
        <div role="cell" className="ml-auto md:ml-0 md:text-right" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          <span className="inline-flex items-center" style={{ gap: 6 }} title={m.updatedAt ? formatDateTime(m.updatedAt) : undefined}>
            {m.updatedAt ? formatRelative(m.updatedAt) : "Not yet"}
            <Chevron size={13} />
          </span>
        </div>
      </div>
    </>
  );
  const style: React.CSSProperties = { gridTemplateColumns: COLS };
  return m.source === "WORKFLOW"
    ? <button type="button" role="row" onClick={onOpenWorkflows} className="wk-row" style={style} aria-label={`${cleanTitle(m.title)}: open in Workflows`}>{inner}</button>
    : <Link href={m.href} role="row" className="wk-row" style={style}>{inner}</Link>;
}

function MissionsSkeleton() {
  return (
    <div className="wk-list" role="status" aria-busy="true" aria-label="Loading missions">
      <div className="wk-head" style={{ gridTemplateColumns: COLS }}><span>Mission</span><span>Status</span><span>Progress</span><span>Outcome</span><span /></div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="wk-row" style={{ gridTemplateColumns: COLS }}>
          <div style={{ display: "grid", gap: 7 }}>
            <div className="skeleton" style={{ height: 11, width: "46%" }} />
            <div className="skeleton" style={{ height: 9, width: "64%" }} />
          </div>
          <div className="skeleton hidden md:block" style={{ height: 9, width: 84 }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: 64 }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: 96 }} />
          <div />
        </div>
      ))}
    </div>
  );
}

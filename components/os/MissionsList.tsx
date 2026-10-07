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
import { EmptyLine } from "@/components/v32/ui";
import { IconMissions, IconArrowRight } from "@/components/v32/icons";
import { formatRelative } from "@/lib/format";
import { cleanTitle, humanDates, humaneError, missionTone, outcomeColor, OUTCOME_SHORT, NETWORK_ERROR } from "./missions/ui";

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

const GRID = "md:grid md:grid-cols-[minmax(0,1fr)_172px_176px_84px] md:items-center";

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
    return <ErrorState title="Missions didn't load" message={`${msg} Nothing has been changed.`} onRetry={onRetry} className="ui-panel" />;
  }
  if (all.length === 0) {
    return (
      <EmptyLine
        icon={<IconMissions size={17} />}
        title="Nothing is being handled yet"
        body={<>Start a collections mission, or open a decision in <Link className="underline" href="/prepared">Prepared</Link> and choose Handle it. Workflows you deploy appear here too, running in shadow mode first.</>}
      />
    );
  }
  if (list.length === 0) {
    return (
      <EmptyLine
        icon={<IconMissions size={17} />}
        title={filter === "at_risk" ? "No mission is at risk" : filter === "completed" ? "No mission has finished yet" : "No active mission"}
        body={filter === "at_risk" ? "Nothing is blocked or waiting on you right now." : filter === "completed" ? "Finished missions show here with their verified outcome." : undefined}
      />
    );
  }
  return (
    <div className="ui-panel overflow-hidden" style={{ borderRadius: "var(--radius-lg)" }}>
      <div className={`hidden ${GRID}`} style={{ padding: "0 18px", columnGap: 20, height: 36, fontSize: 12, color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
        <span>Mission</span>
        <span>State</span>
        <span>Outcome</span>
        <span style={{ textAlign: "right" }}>Updated</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {list.map((m, i) => <MissionRow key={m.id} m={m} first={i === 0} agentNames={agentNames} onOpenWorkflows={onOpenWorkflows} />)}
      </ul>
    </div>
  );
}

function MissionRow({ m, first, agentNames, onOpenWorkflows }: { m: Mission; first: boolean; agentNames?: Record<string, string>; onOpenWorkflows?: () => void }) {
  const tools = missionTools(m);
  const total = m.steps.length;
  const done = m.steps.filter((s) => STEP_DONE.has((s.status || "").toUpperCase())).length;
  const showSteps = m.source === "DECISION" && total > 0;
  const mode = m.mode === "SHADOW" ? "Shadow mode" : m.mode === "WITH_APPROVAL" ? "Waits for your approval" : m.mode ? "Live" : null;
  const source = m.source === "DECISION" ? "Decision" : m.source === "COLLECTION" ? "Collections" : "Workflow";
  const meta = [
    source,
    m.assigned ? agentLabel(m.assigned.agent, agentNames) : null,
    tools.length ? `Tools: ${tools.join(", ")}` : null,
    showSteps ? `${done} of ${total} steps ran` : null,
    mode,
  ].filter(Boolean) as string[];
  const outcome = m.outcome.status;
  const outcomeExtra = m.outcome.met != null && m.outcome.notMet != null && (m.outcome.met + m.outcome.notMet) > 0
    ? `${m.outcome.met} of ${m.outcome.met + m.outcome.notMet} paid after`
    : null;

  const inner = (
    <>
      <div className="min-w-0">
        <div className="md:truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", lineHeight: 1.4 }}>{cleanTitle(m.title)}</div>
        {(m.stateReason || m.objective) && (
          <div className="line-clamp-2 md:truncate" style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>
            {humanDates(m.stateReason || m.objective || "")}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.6 }}>{meta.join("  ·  ")}</div>
      </div>
      <div className="flex flex-wrap items-center mt-3 md:contents" style={{ columnGap: 10, rowGap: 6 }}>
        <div><StatusChip tone={missionTone(m.state)}>{MISSION_STATE_LABEL[m.state]}</StatusChip></div>
        <div className="min-w-0">
          <div style={{ fontSize: 13, color: outcomeColor(outcome) }}>{OUTCOME_SHORT[outcome]}</div>
          {outcomeExtra && <div className="tabular-nums hidden md:block" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{outcomeExtra}</div>}
        </div>
        <div className="ml-auto md:ml-0 md:text-right" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          <span className="tabular-nums inline-flex items-center" style={{ gap: 6 }}>
            {m.updatedAt ? formatRelative(m.updatedAt) : "Not yet"}
            <IconArrowRight size={12} className="row-chevron hidden md:inline" style={{ color: "var(--ink-3)" }} />
          </span>
        </div>
      </div>
    </>
  );
  const cls = `row-hover block w-full text-left ${GRID}`;
  const style: React.CSSProperties = { padding: "14px 18px", columnGap: 20, borderTop: first ? 0 : "1px solid var(--line)", color: "inherit", background: "transparent" };
  return (
    <li>
      {m.source === "WORKFLOW"
        ? <button type="button" onClick={onOpenWorkflows} className={cls} style={style} aria-label={`${cleanTitle(m.title)}: open in Workflows`}>{inner}</button>
        : <Link href={m.href} className={cls} style={style}>{inner}</Link>}
    </li>
  );
}

function MissionsSkeleton() {
  return (
    <div className="ui-panel" role="status" aria-busy="true" aria-label="Loading missions" style={{ borderRadius: "var(--radius-lg)" }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center" style={{ gap: 20, padding: "18px 18px", borderTop: i ? "1px solid var(--line)" : 0 }}>
          <div className="flex-1 min-w-0" style={{ display: "grid", gap: 8 }}>
            <div className="skeleton" style={{ height: 12, width: "46%" }} />
            <div className="skeleton" style={{ height: 10, width: "70%" }} />
          </div>
          <div className="skeleton hidden md:block" style={{ height: 18, width: 96, borderRadius: 999 }} />
          <div className="skeleton hidden md:block" style={{ height: 10, width: 110 }} />
        </div>
      ))}
    </div>
  );
}

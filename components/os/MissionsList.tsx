"use client";

// MISSIONS: everything Starlane is handling, in one list. A mission is
// either a decision you told Starlane to handle or a workflow you deployed.
// Its state and outcome come from the backend (GET /api/os/missions), which
// derives them from the decision, its contract and its action runs, or from
// the workflow's runs and items. "Steps ran" is never shown as "it worked":
// the outcome is only verified from the ledger.

import React, { useState } from "react";
import Link from "next/link";
import { C, Pill, Skeleton } from "@/components/decisions/ui";
import { osApi, Mission, MissionState, MISSION_STATE_LABEL, MISSION_OUTCOME_LABEL } from "@/lib/os";
import { relTime } from "@/lib/decisions";
import { Panel, Row, Muted, ErrorLine, errorText, useLoad } from "./shared";

type Filter = "active" | "needs_you" | "finished";
const FILTERS: { key: Filter; label: string; states: MissionState[] }[] = [
  { key: "active", label: "Active", states: ["PLANNING", "RUNNING", "VERIFYING", "BLOCKED", "WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION"] },
  { key: "needs_you", label: "Needs you", states: ["WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION", "BLOCKED", "FAILED"] },
  { key: "finished", label: "Finished", states: ["COMPLETED", "FAILED", "STOPPED"] },
];

function stateTone(s: MissionState): "good" | "warn" | "bad" | "neutral" | "accent" {
  if (s === "COMPLETED") return "good";
  if (s === "BLOCKED" || s === "FAILED") return "bad";
  if (s === "WAITING_FOR_APPROVAL" || s === "WAITING_FOR_INFORMATION") return "warn";
  if (s === "RUNNING" || s === "VERIFYING") return "accent";
  return "neutral";
}

function outcomeTone(o: string): "good" | "bad" | "neutral" | "warn" {
  if (o === "VERIFIED_SUCCESS") return "good";
  if (o === "VERIFIED_FAILURE") return "bad";
  if (o === "OUTCOME_UNKNOWN") return "warn";
  return "neutral";
}

export function MissionsList() {
  const { data, error, loading, reload } = useLoad(() => osApi.missions());
  const [filter, setFilter] = useState<Filter>("active");
  const all = data?.missions || [];
  const f = FILTERS.find((x) => x.key === filter)!;
  const list = all.filter((m) => f.states.includes(m.state));
  const count = (k: Filter) => all.filter((m) => FILTERS.find((x) => x.key === k)!.states.includes(m.state)).length;

  return (
    <Panel
      title="What Starlane is handling"
      subtitle="Decisions you told Starlane to handle and workflows you deployed. A mission finishes only when its outcome has been checked against your ledger."
      right={<button type="button" onClick={reload} className="text-[12.5px] hover-dim" style={{ color: C.muted }}>Refresh</button>}
    >
      <div role="tablist" aria-label="Filter missions" className="flex gap-5 mb-2" style={{ borderBottom: `1px solid ${C.line}` }}>
        {FILTERS.map((x) => (
          <button
            key={x.key}
            role="tab"
            aria-selected={x.key === filter}
            type="button"
            onClick={() => setFilter(x.key)}
            className="text-[13px] py-2"
            style={{ color: x.key === filter ? C.ink : C.muted, fontWeight: x.key === filter ? 600 : 400, borderBottom: `2px solid ${x.key === filter ? C.accent : "transparent"}`, background: "none" }}
          >
            {x.label}{data ? ` (${count(x.key)})` : ""}
          </button>
        ))}
      </div>
      {loading && <Skeleton rows={3} />}
      <ErrorLine error={error ? `Missions could not be loaded: ${errorText(error)} Nothing has been changed; try Refresh.` : null} />
      {!loading && !error && all.length === 0 && (
        <Muted>
          Nothing is being handled yet. Open a decision in <Link className="underline" href="/prepared">Prepared</Link> and choose Handle it, or deploy a proposed workflow. Starlane runs it in shadow mode first.
        </Muted>
      )}
      {!loading && !error && all.length > 0 && list.length === 0 && <Muted>No mission in this group.</Muted>}
      {list.map((m) => <MissionRow key={m.id} m={m} />)}
    </Panel>
  );
}

function MissionRow({ m }: { m: Mission }) {
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>
            {m.source !== "WORKFLOW" ? <Link className="hover-dim" href={m.href}>{m.title}</Link> : m.title}
          </p>
          {m.objective && <p className="text-[12.5px] mt-0.5" style={{ color: C.body }}>{m.source === "DECISION" ? "Chosen option: " : "Goal: "}{m.objective}</p>}
          <p className="text-[12px] mt-1" style={{ color: C.faint }}>
            {m.source === "DECISION" ? "From a decision" : m.source === "COLLECTION" ? "Collection mission" : "Deployed workflow"}
            {m.mode ? ` · ${m.mode === "SHADOW" ? "Shadow (nothing changes outside Starlane)" : m.mode === "WITH_APPROVAL" ? "Each step waits for your approval" : "Live"}` : ""}
            {m.updatedAt ? ` · updated ${relTime(m.updatedAt)}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Pill tone={stateTone(m.state)}>{MISSION_STATE_LABEL[m.state]}</Pill>
          <Pill tone={outcomeTone(m.outcome.status)}>{MISSION_OUTCOME_LABEL[m.outcome.status]}</Pill>
        </div>
      </div>
      {m.stateReason && <p className="text-[12.5px] mt-2 leading-[1.55]" style={{ color: C.body }}>{m.stateReason}</p>}
      {m.outcome.detail && <p className="text-[12.5px] mt-1 leading-[1.55]" style={{ color: C.body }}>{m.outcome.detail}</p>}
      {m.outcome.attributionNote && <p className="text-[12px] mt-1 leading-[1.55]" style={{ color: C.muted }}>{m.outcome.attributionNote}</p>}
      <details className="mt-2">
        <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>Steps, who does them, and what ran</summary>
        <ul className="mt-2 space-y-1">
          {m.steps.length === 0 && <li className="text-[12.5px]" style={{ color: C.muted }}>No step has run yet.</li>}
          {m.steps.map((s) => (
            <li key={`${m.id}-${s.index}`} className="text-[12.5px]" style={{ color: C.body }}>
              {s.index + 1}. {s.label || s.intent}
              {s.performer ? ` · ${s.performer === "HUMAN" ? "you" : s.performer === "AGENT" ? "agent" : "system"}` : ""}
              {s.status ? ` · ${s.status.toLowerCase()}` : ""}
              {s.error ? ` · ${s.error}` : ""}
            </li>
          ))}
        </ul>
        <p className="text-[12px] mt-2" style={{ color: C.faint }}>Worker: {m.assigned.agent} ({m.assigned.model}). Owner: {m.assigned.owner}.</p>
        {m.source === "DECISION" && <p className="text-[12px] mt-1"><Link className="underline" href={m.href} style={{ color: C.muted }}>Open the decision, its evidence and its audit trail</Link></p>}
        {m.source === "COLLECTION" && <p className="text-[12px] mt-1"><Link className="underline" href={m.href} style={{ color: C.muted }}>Open the mission, its progress and blockers</Link></p>}
      </details>
    </Row>
  );
}

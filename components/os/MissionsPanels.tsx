"use client";

// MISSIONS: the workflows Starlane is running. Each shows its automation
// level, agent permissions, budget, stop conditions and recent runs. A new
// workflow can be described in a sentence; the backend parses it
// deterministically and refuses anything it cannot build safely.

import React, { useState } from "react";
import { C, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { osApi, Workflow, WorkflowRun, WORKFLOW_STATUS_LABEL } from "@/lib/os";
import { relTime } from "@/lib/decisions";
import { DecisionApiError } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, useLoad } from "./shared";

export function WorkflowsPanel() {
  const { data, error, loading, reload } = useLoad(() => osApi.workflows("SHADOW,WITH_APPROVAL,PAUSED"));
  const list = data?.workflows || [];
  return (
    <div className="space-y-4">
      <Panel title="Workflows Starlane is running" subtitle="Level 3 records in shadow; level 4 prepares and waits for your approval. Full autonomy is not offered.">
        {loading && <Skeleton rows={2} />}
        <ErrorLine error={error ? errorText(error) : null} />
        {!loading && !error && list.length === 0 && <Muted>No workflow is deployed. Proposals from Scan wait in Prepared.</Muted>}
        {list.map((w) => <WorkflowRow key={w.id} w={w} onChange={reload} />)}
      </Panel>
      <FromSentence onCreated={reload} />
    </div>
  );
}

function WorkflowRow({ w, onChange }: { w: Workflow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);

  const act = async (fn: () => Promise<unknown>, after?: (r: unknown) => void) => {
    setBusy(true); setErr(null); setNote(null);
    try { const r = await fn(); after?.(r); onChange(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const loadRuns = async () => {
    try { setRuns((await osApi.workflow(w.id)).runs); } catch (e) { setErr(errorText(e)); }
  };

  const perms = Object.entries(w.agentPermissions || {});
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div style={{ minWidth: 0 }}>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{w.name}</p>
          <p className="text-[12px]" style={{ color: C.faint }}>Level {w.automationLevel.level}: {w.automationLevel.label} · version {w.version}{w.lastRunAt ? ` · last run ${relTime(w.lastRunAt)}` : ""}</p>
        </div>
        <Pill tone={w.status === "PAUSED" ? "warn" : "good"}>{WORKFLOW_STATUS_LABEL[w.status]}</Pill>
      </div>
      <div className="flex gap-4 mt-2 text-[12.5px] flex-wrap" style={{ color: C.body }}>
        <span><strong style={{ fontWeight: 600 }}>{w.awaiting ?? 0}</strong> waiting for approval</span>
        <span><strong style={{ fontWeight: 600 }}>{w.met ?? 0}</strong> paid after</span>
        <span><strong style={{ fontWeight: 600 }}>{w.notMet ?? 0}</strong> not paid</span>
      </div>
      <details className="mt-2">
        <summary className="text-[12.5px] cursor-pointer" style={{ color: C.accent }}>How it works and what it may do</summary>
        <div className="mt-2 space-y-2 text-[12.5px]" style={{ color: C.body }}>
          <p><span style={{ color: C.faint }}>Trigger:</span> {w.trigger.description}</p>
          <ol className="list-decimal pl-5 space-y-[2px]">
            {w.steps.map((s) => <li key={s.key}>{s.label} <span style={{ color: C.faint }}>({s.performer.toLowerCase()}, {s.capability.replace(/_/g, " ").toLowerCase()})</span></li>)}
          </ol>
          {perms.map(([agent, p]) => <p key={agent}><span style={{ color: C.faint }}>Agent {agent} may:</span> {p.map((x) => x.toLowerCase()).join(", ")}. It may not send, change amounts or mark anything paid.</p>)}
          <p><span style={{ color: C.faint }}>Budget:</span> at most {w.budget.maxActionsPerRun} reminders a run, no paid model calls.</p>
          <ul className="space-y-[2px]">{w.stopConditions.map((s) => <li key={s.key}><span style={{ color: C.faint }}>Stops when:</span> {s.description}</li>)}</ul>
          <ul className="space-y-[2px]">{w.policies.map((p) => <li key={p.key}><span style={{ color: C.faint }}>Rule:</span> {p.description}</li>)}</ul>
        </div>
      </details>
      <div className="flex gap-2 mt-3 flex-wrap">
        {w.status !== "PAUSED" && (
          <Btn primary disabled={busy} onClick={() => act(() => osApi.run(w.id), (r) => {
            const c = (r as { run: WorkflowRun }).run.counts;
            setNote(`${c.created} prepared, ${c.duplicates} already handled, ${c.replanned} re-planned${c.failed ? `, ${c.failed} handed to a person` : ""}.`);
            loadRuns();
          })}>Run now</Btn>
        )}
        {w.status !== "PAUSED"
          ? <Btn disabled={busy} onClick={() => act(() => osApi.transition(w.id, "pause"))}>Pause</Btn>
          : <Btn disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "WITH_APPROVAL"))}>Resume with approval</Btn>}
        <Btn danger disabled={busy} onClick={() => act(() => osApi.transition(w.id, "retire"))}>Retire</Btn>
        {!runs && <Btn onClick={loadRuns}>Show runs</Btn>}
      </div>
      {note && <p className="text-[12.5px] mt-2" style={{ color: C.good }}>{note}</p>}
      <ErrorLine error={err} />
      {runs && (
        <div className="mt-2">
          <SectionLabel>Recent runs</SectionLabel>
          {runs.length === 0 && <Muted>No runs yet.</Muted>}
          {runs.slice(0, 5).map((r) => (
            <p key={r.id} className="text-[12px]" style={{ color: C.body }}>
              {relTime(r.started_at)} · {r.trigger_source.toLowerCase()} · {r.status.toLowerCase()} · {r.counts?.created ?? 0} prepared{r.stopped_reason ? ` · stopped: ${r.stopped_reason}` : ""}
            </p>
          ))}
        </div>
      )}
    </Row>
  );
}

function FromSentence({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<{ understood: string[]; notes: string[] } | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await osApi.fromText(text);
      setOk({ understood: r.understood, notes: r.notes });
      setText("");
      onCreated();
    } catch (e) {
      const understood = e instanceof DecisionApiError && Array.isArray(e.body?.understood) ? (e.body.understood as string[]) : [];
      setErr(`${errorText(e)}${understood.length ? ` Understood so far: ${understood.join("; ")}.` : ""}`);
    } finally { setBusy(false); }
  };
  return (
    <Panel title="Describe a workflow" subtitle="Starlane reads the sentence with fixed rules, not a language model. Today it can build overdue invoice follow-ups; anything else is refused rather than guessed.">
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(); }} className="flex gap-2 flex-col md:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="When a customer is 45 days overdue and owes more than ₹50k, prepare a reminder"
          className="flex-1 text-[13px] rounded-md px-3 py-2"
          style={{ border: `1px solid ${C.line}` }}
          aria-label="Workflow in a sentence"
        />
        <Btn primary type="submit" disabled={busy || !text.trim()}>{busy ? "Reading…" : "Propose"}</Btn>
      </form>
      <ErrorLine error={err} />
      {ok && (
        <div className="mt-2 text-[12.5px]" style={{ color: C.body }}>
          <p style={{ color: C.good }}>Proposed. It is waiting in Prepared for you to deploy.</p>
          <ul className="mt-1 space-y-[2px]">{[...ok.understood, ...ok.notes].map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </Panel>
  );
}

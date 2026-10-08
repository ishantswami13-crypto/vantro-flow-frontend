"use client";

// MISSIONS: the workflows Starlane is running. Each shows its automation
// level, agent permissions, budget, stop conditions and recent runs. A new
// workflow can be described in a sentence; the backend parses it
// deterministically and refuses anything it cannot build safely.

import React, { useState } from "react";
import { osApi, Workflow, WorkflowRun, WORKFLOW_STATUS_LABEL } from "@/lib/os";
import { DecisionApiError } from "@/lib/decisions";
import Button from "@/components/ui/Button";
import { StatusChip, toneForStatus } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { SectionTitle } from "@/components/v32/ui";
import { IconChevronDown } from "@/components/v32/icons";
import { formatRelative, formatCount, formatDateTime } from "@/lib/format";
import { useLoad } from "./shared";
import { humaneError, NETWORK_ERROR, Note } from "./missions/ui";
import { agentLabel } from "./MissionsList";
import { PERMISSION_LABEL } from "@/components/agents/shared";

export function WorkflowsPanel() {
  const { data, error, loading, reload } = useLoad(() => osApi.workflows("SHADOW,WITH_APPROVAL,PAUSED"));
  const list = data?.workflows || [];
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <section>
        <SectionTitle>Workflows running{data ? <span className="wk-count">{list.length}</span> : null}</SectionTitle>
        <p className="meta" style={{ margin: "-4px 0 10px", maxWidth: 680, lineHeight: 1.55 }}>Level 3 records in shadow; level 4 prepares and waits for your approval. Full autonomy is not offered.</p>
        {loading && <div role="status" aria-busy="true" aria-label="Loading workflows" style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}><div className="skeleton" style={{ height: 11, width: "36%" }} /><div className="skeleton" style={{ height: 9, width: "58%", marginTop: 9 }} /></div>}
        {!loading && !!error && <ErrorState title="Workflows didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}
        {!loading && !error && list.length === 0 && (
          <p className="wk-empty">No workflow is deployed. Proposals from Scan wait in Prepared; deploy one there, or describe one below.</p>
        )}
        {list.length > 0 && (
          <div style={{ borderTop: "1px solid var(--line)" }}>
            {list.map((w) => <WorkflowRow key={w.id} w={w} onChange={reload} />)}
          </div>
        )}
      </section>
      <FromSentence onCreated={reload} />
    </div>
  );
}

function Stat({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <span className="inline-flex items-baseline" style={{ gap: 6 }}>
      <span className="num" style={{ fontSize: 13, color: "var(--ink)" }}>{value == null ? "—" : formatCount(value)}</span>
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</span>
    </span>
  );
}

function WorkflowRow({ w, onChange }: { w: Workflow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);

  const act = async (fn: () => Promise<unknown>, after?: (r: unknown) => void) => {
    setBusy(true); setErr(null); setNote(null);
    try { const r = await fn(); after?.(r); onChange(); } catch (e) { setErr(humaneError(e)); } finally { setBusy(false); }
  };
  const loadRuns = async () => {
    try { setRuns((await osApi.workflow(w.id)).runs); } catch (e) { setErr(humaneError(e, NETWORK_ERROR)); }
  };

  const perms = Object.entries(w.agentPermissions || {});
  const paused = w.status === "PAUSED";
  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="min-w-0">
          <div className="wk-title">{w.name}</div>
          <div className="wk-meta" style={{ marginTop: 2 }}>
            Level {w.automationLevel.level}: {w.automationLevel.label} · version {w.version}{w.lastRunAt ? ` · last run ${formatRelative(w.lastRunAt)}` : " · not run yet"}
          </div>
        </div>
        <StatusChip tone={paused ? "attention" : w.status === "SHADOW" ? "info" : "positive"}>{WORKFLOW_STATUS_LABEL[w.status] || w.status}</StatusChip>
      </div>

      <div className="flex flex-wrap" style={{ gap: "6px 20px", marginTop: 10 }}>
        <Stat value={w.awaiting ?? null} label="Waiting for approval" />
        <Stat value={w.met ?? null} label="Paid after" />
        <Stat value={w.notMet ?? null} label="Not paid" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="hover-dim inline-flex items-center"
        style={{ gap: 6, marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", background: "none", border: 0, padding: "4px 0", cursor: "pointer", minHeight: 28 }}
      >
        How it works and what it may do
        <IconChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform var(--dur-fast) var(--ease)" }} />
      </button>
      {open && (
        <dl className="grid" style={{ gridTemplateColumns: "minmax(88px, 120px) minmax(0, 1fr)", gap: "8px 16px", margin: "8px 0 4px", fontSize: 13, color: "var(--body)", lineHeight: 1.55, maxWidth: 820 }}>
          <dt style={{ color: "var(--ink-3)" }}>Trigger</dt>
          <dd style={{ margin: 0 }}>{w.trigger.description}</dd>
          <dt style={{ color: "var(--ink-3)" }}>Steps</dt>
          <dd style={{ margin: 0 }}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {w.steps.map((s) => <li key={s.key}>{s.label} <span style={{ color: "var(--ink-3)" }}>({s.performer.toLowerCase()}, {s.capability.replace(/_/g, " ").toLowerCase()})</span></li>)}
            </ol>
          </dd>
          {perms.map(([agent, p]) => (
            <React.Fragment key={agent}>
              <dt style={{ color: "var(--ink-3)" }}>{agentLabel(agent)}</dt>
              <dd style={{ margin: 0 }}>May {p.map((x) => (PERMISSION_LABEL[x] || x).toLowerCase()).join(", ")}. It may not send, change amounts or mark anything paid.</dd>
            </React.Fragment>
          ))}
          <dt style={{ color: "var(--ink-3)" }}>Budget</dt>
          <dd style={{ margin: 0 }}>At most {w.budget.maxActionsPerRun} reminders a run, no paid model calls.</dd>
          {w.stopConditions.length > 0 && <>
            <dt style={{ color: "var(--ink-3)" }}>Stops when</dt>
            <dd style={{ margin: 0 }}>{w.stopConditions.map((s) => s.description).join("; ")}.</dd>
          </>}
          {w.policies.length > 0 && <>
            <dt style={{ color: "var(--ink-3)" }}>Rules</dt>
            <dd style={{ margin: 0 }}>{w.policies.map((p) => <div key={p.key}>{p.description}</div>)}</dd>
          </>}
        </dl>
      )}

      <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10 }}>
        {!paused && (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(() => osApi.run(w.id), (r) => {
            const c = (r as { run: WorkflowRun }).run.counts;
            setNote(`${c.created} prepared, ${c.duplicates} already handled, ${c.replanned} re-planned${c.failed ? `, ${c.failed} handed to a person` : ""}.`);
            loadRuns();
          })}>Run now</Button>
        )}
        {!paused
          ? <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(() => osApi.transition(w.id, "pause"))}>Pause</Button>
          : <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "WITH_APPROVAL"))}>Resume with approval</Button>}
        {!runs && <Button variant="ghost" size="sm" onClick={loadRuns}>Show runs</Button>}
        <span className="flex-1" />
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmRetire(true)}>Retire</Button>
      </div>
      {(note || err) && <div style={{ marginTop: 10 }}>{note && <Note tone="positive">{note}</Note>}{err && <Note tone="critical">{err}</Note>}</div>}

      {runs && (
        <div style={{ marginTop: 16 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Recent runs</div>
          {runs.length === 0 ? <Note>No runs yet.</Note> : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {runs.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center flex-wrap" style={{ gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--body)" }}>
                  <StatusChip tone={toneForStatus(r.status)}>{r.status.charAt(0) + r.status.slice(1).toLowerCase().replace(/_/g, " ")}</StatusChip>
                  <span className="num" style={{ fontSize: 12 }}>{r.counts?.created ?? 0} prepared</span>
                  <span style={{ color: "var(--ink-3)" }}>{r.trigger_source.toLowerCase()}{r.stopped_reason ? ` · stopped: ${String(r.stopped_reason).replace(/_/g, " ")}` : ""}</span>
                  <span title={formatDateTime(r.started_at)} style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 12 }}>{formatRelative(r.started_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={confirmRetire}
        onClose={() => setConfirmRetire(false)}
        title="Retire this workflow?"
        description={`${w.name} stops running for good. Items it already prepared stay where they are. You can deploy a new workflow later.`}
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setConfirmRetire(false)}>Keep it</Button>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => { setConfirmRetire(false); act(() => osApi.transition(w.id, "retire")); }}>Retire workflow</Button>
        </>}
      />
    </div>
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
      setErr(`${humaneError(e)}${understood.length ? ` Understood so far: ${understood.join("; ")}.` : ""}`);
    } finally { setBusy(false); }
  };
  return (
    <section>
      <SectionTitle>Describe a workflow</SectionTitle>
      <p className="meta" style={{ margin: "-4px 0 12px", maxWidth: 680, lineHeight: 1.55 }}>Starlane reads the sentence with fixed rules, not a language model. Today it can build overdue invoice follow-ups; anything else is refused rather than guessed.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit(); }} className="flex flex-col md:flex-row" style={{ gap: 8, maxWidth: 820 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="When a customer is 45 days overdue and owes more than ₹50,000, prepare a reminder"
          className="ui-input flex-1"
          aria-label="Workflow in a sentence"
        />
        <Button type="submit" variant="secondary" disabled={busy || !text.trim()} loading={busy}>Propose workflow</Button>
      </form>
      {err && <div style={{ marginTop: 8 }}><Note tone="critical">{err}</Note></div>}
      {ok && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--body)" }}>
          <Note tone="positive">Proposed. It is waiting in Prepared for you to deploy.</Note>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>{[...ok.understood, ...ok.notes].map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

"use client";

// PREPARED: what needs a person. Automation proposals (deploy in shadow,
// deploy with approval, reject) and prepared reminders waiting for approval.
// Starlane never sends: in shadow pilot mode an approval records what would
// have gone out; in live mode it marks the reminder ready for a person to send.

import React, { useState } from "react";
import Link from "next/link";
import { C, Pill, Skeleton } from "@/components/decisions/ui";
import { osApi, Workflow, WorkflowItem, ITEM_STATUS_LABEL } from "@/lib/os";
import { money, pct, shortDate } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, useLoad } from "./shared";

export function AutomationProposals() {
  const { data, error, loading, reload } = useLoad(() => osApi.workflows("PROPOSED"));
  const list = data?.workflows || [];
  if (!loading && !error && list.length === 0) return null;
  return (
    <Panel title="Automations Starlane proposes" subtitle="Nothing runs until you choose. Shadow records what it would do without contacting anyone.">
      {loading && <Skeleton rows={2} />}
      <ErrorLine error={error ? errorText(error) : null} />
      {list.map((w) => <ProposalRow key={w.id} w={w} onChange={reload} />)}
    </Panel>
  );
}

function ProposalRow({ w, onChange }: { w: Workflow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChange(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const d = w.discovery;
  const s = w.simulation;
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div style={{ minWidth: 0 }}>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{w.name}</p>
          <p className="text-[13px] mt-1" style={{ color: C.body }}>{w.objective}</p>
        </div>
        {d && <Pill tone="accent">fit {Math.round(d.score * 100)} of 100</Pill>}
      </div>
      <ul className="mt-2 space-y-1 text-[12.5px]" style={{ color: C.body }}>
        <li><span style={{ color: C.faint }}>When:</span> {w.trigger.description}</li>
        {w.conditions.map((c) => <li key={c.key}><span style={{ color: C.faint }}>Only if:</span> {c.description}</li>)}
        {w.approvals.map((a) => <li key={a.rule}><span style={{ color: C.faint }}>Approval:</span> {a.rule}</li>)}
        <li><span style={{ color: C.faint }}>Success:</span> {w.successMetric.description}</li>
        {s && <li><span style={{ color: C.faint }}>Replay:</span> would have fired {s.episodes} times in {s.lookbackDays} days; {s.paidWithinWindowWithoutAction} paid within 7 days anyway ({pct(s.baselineRate)}).</li>}
      </ul>
      <div className="flex flex-wrap gap-1 mt-2">
        {w.steps.map((st) => (
          <Pill key={st.key} tone={st.capability === "EXECUTABLE" ? "good" : st.capability === "BLOCKED" ? "bad" : "warn"} title={st.note || st.capability}>
            {st.label.length > 38 ? `${st.label.slice(0, 36)}…` : st.label} · {st.capability.replace(/_/g, " ").toLowerCase()}
          </Pill>
        ))}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Btn primary disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "SHADOW"))}>Deploy in shadow</Btn>
        <Btn disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "WITH_APPROVAL"))}>Deploy with my approval</Btn>
        <Btn danger disabled={busy} onClick={() => act(() => osApi.transition(w.id, "reject"))}>Reject</Btn>
      </div>
      <ErrorLine error={err} />
    </Row>
  );
}

export function ReminderApprovals() {
  const { data, error, loading, reload } = useLoad(() => osApi.items("AWAITING_APPROVAL"));
  const [done, setDone] = useState<WorkflowItem[]>([]);
  const list = (data?.items || []).filter((i) => !done.some((d) => d.id === i.id));
  if (!loading && !error && list.length === 0 && done.length === 0) return null;
  return (
    <Panel title="Reminders waiting for you" subtitle="Prepared by the overdue follow-up workflow from ledger facts only. Starlane does not send them.">
      {loading && <Skeleton rows={2} />}
      <ErrorLine error={error ? errorText(error) : null} />
      {list.map((i) => <ItemRow key={i.id} item={i} onDone={(x) => { setDone((d) => [...d, x]); }} onStale={reload} />)}
      {done.map((i) => (
        <Row key={i.id}>
          <div className="flex justify-between gap-2 flex-wrap">
            <p className="text-[13px]" style={{ color: C.body }}>{i.target} · {money(i.amount, i.currency)}</p>
            <Pill tone={i.status === "REJECTED" ? "neutral" : "good"}>{ITEM_STATUS_LABEL[i.status] || i.status}</Pill>
          </div>
          {i.verifyAfter && <p className="text-[12px] mt-1" style={{ color: C.muted }}>Starlane checks the ledger for a payment on {shortDate(i.verifyAfter)}.</p>}
        </Row>
      ))}
      {done.length > 0 && <p className="text-[12px] mt-2"><Link href="/memory" className="underline" style={{ color: C.accent }}>Outcomes appear in Memory once checked</Link></p>}
    </Panel>
  );
}

function ItemRow({ item, onDone, onStale }: { item: WorkflowItem; onDone: (i: WorkflowItem) => void; onStale: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (approve: boolean) => {
    setBusy(true); setErr(null);
    try {
      const r = approve ? await osApi.approveItem(item.id) : await osApi.rejectItem(item.id);
      onDone(r.item);
    } catch (e) {
      setErr(errorText(e));
      onStale();
    } finally { setBusy(false); }
  };
  const h = item.context.history;
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{item.target}</p>
          <p className="text-[12px]" style={{ color: C.faint }}>
            {money(item.amount, item.currency)} overdue{item.context.maxAgeDays ? `, oldest ${item.context.maxAgeDays} days` : ""}
            {h && h.paidInvoices ? ` · paid ${h.paidInvoices} invoices before, on time ${pct(h.onTimeRate)}` : ""}
          </p>
        </div>
        <Pill tone="warn">{item.draft.tone.replace(/_/g, " ").toLowerCase()}</Pill>
      </div>
      <pre className="mt-2 text-[12.5px] whitespace-pre-wrap rounded-lg px-3 py-2" style={{ background: C.wash, border: `1px solid ${C.line}`, color: C.body, fontFamily: "inherit" }}>{item.draft.text}</pre>
      <p className="text-[11.5px] mt-1" style={{ color: C.faint }}>
        Drafted by {item.agent.agent}, {item.agent.model} · policy {item.policy.map((p) => `${p.key.replace(/_/g, " ")}: ${p.verdict.toLowerCase().replace(/_/g, " ")}`).join(", ")}
      </p>
      {item.expectedOutcome.baselineProbability != null && (
        <p className="text-[12px] mt-1" style={{ color: C.muted }}>Without a reminder, {pct(item.expectedOutcome.baselineProbability)} chance of a payment within {item.expectedOutcome.withinDays} days.</p>
      )}
      <div className="flex gap-2 mt-2 flex-wrap items-center">
        <Btn primary disabled={busy} onClick={() => decide(true)}>Approve</Btn>
        <Btn disabled={busy} onClick={() => decide(false)}>Reject</Btn>
        {item.expiresAt && <span className="text-[11.5px]" style={{ color: C.faint }}>expires {shortDate(item.expiresAt)}</span>}
      </div>
      <ErrorLine error={err} />
    </Row>
  );
}

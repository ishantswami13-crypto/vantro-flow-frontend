"use client";

// PREPARED: what needs a person. Decisions waiting on a choice, prepared
// reminders waiting for approval, and automation proposals (deploy in
// shadow, deploy with approval, reject). Starlane never sends: in shadow
// pilot mode an approval records what would have gone out; in live mode it
// marks the reminder ready for a person to send.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/decisions/ui";
import { osApi, Workflow, WorkflowItem, ITEM_STATUS_LABEL } from "@/lib/os";
import { pct, daysUntil, decisionsApi, STATUS_LABEL } from "@/lib/decisions";
import { formatDate } from "@/lib/format";
import { SkeletonRows } from "@/components/v32/ui";
import { useLoad, stakeOf } from "./shared";
import { ItemCard, RetryLine, SectionHead, amount, cleanTitle, humaneError, sentence } from "./prepared/kit";

/** Reports how many items a section is showing once it has loaded (null while loading or on error). */
type OnCount = (n: number | null) => void;

function useReport(onCount: OnCount | undefined, n: number | null) {
  useEffect(() => { onCount?.(n); }, [onCount, n]);
}

export function AutomationProposals({ onCount }: { onCount?: OnCount }) {
  const { data, error, loading, reload } = useLoad(() => osApi.workflows("PROPOSED"));
  const list = data?.workflows || [];
  useReport(onCount, loading || error ? null : list.length);
  if (!loading && !error && list.length === 0) return null;
  return (
    <section aria-label="Automations Starlane proposes">
      <SectionHead title="Automations Starlane proposes" count={loading || error ? null : list.length} hint="Nothing runs until you choose. Shadow records what it would do without contacting anyone." />
      {loading && <SkeletonRows rows={2} />}
      {error ? <RetryLine error={error} onRetry={reload} /> : null}
      <div className="flex flex-col" style={{ gap: 12 }}>
        {list.map((w) => <ProposalCard key={w.id} w={w} onChange={reload} />)}
      </div>
    </section>
  );
}

function ProposalCard({ w, onChange }: { w: Workflow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); onChange(); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const d = w.discovery;
  const s = w.simulation;
  const rows: [string, string][] = [
    ["When", w.trigger.description],
    ...w.conditions.map((c) => ["Only if", c.description] as [string, string]),
    ...w.approvals.map((a) => ["Approval", a.rule] as [string, string]),
    ["Success", w.successMetric.description],
  ];
  return (
    <ItemCard
      chip={d ? <Pill tone="accent" title="How well this fits your history">Fit {Math.round(d.score * 100)} of 100</Pill> : undefined}
      title={w.name}
      why={w.objective}
      stake={s ? amount(s.amountTriggered) : undefined}
      stakeNote={s ? `covered in ${s.lookbackDays} days of replays` : undefined}
      actions={
        <>
          <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "SHADOW"))}>Deploy in shadow</button>
          <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={() => act(() => osApi.deploy(w.id, "WITH_APPROVAL"))}>Deploy with my approval</button>
          <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={() => act(() => osApi.transition(w.id, "reject"))} style={{ marginLeft: "auto" }}>Reject</button>
        </>
      }
    >
      <dl className="grid" style={{ gridTemplateColumns: "88px minmax(0,1fr)", rowGap: 4, columnGap: 12, margin: 0, fontSize: 12.5 }}>
        {rows.map(([k, v], i) => (
          <React.Fragment key={`${k}-${i}`}>
            <dt style={{ color: "var(--ink-3)" }}>{k}</dt>
            <dd style={{ margin: 0, color: "var(--body)" }}>{v}</dd>
          </React.Fragment>
        ))}
        {s && (
          <>
            <dt style={{ color: "var(--ink-3)" }}>Replay</dt>
            <dd style={{ margin: 0, color: "var(--body)" }}>Would have fired {s.episodes} times in {s.lookbackDays} days; {s.paidWithinWindowWithoutAction} paid within 7 days anyway ({pct(s.baselineRate)}).</dd>
          </>
        )}
      </dl>
      {w.steps.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
          {w.steps.map((st) => (
            <Pill key={st.key} tone={st.capability === "EXECUTABLE" ? "good" : st.capability === "BLOCKED" ? "bad" : "warn"} title={st.note || st.capability}>
              {st.label.length > 38 ? `${st.label.slice(0, 36)}…` : st.label} · {sentence(st.capability).toLowerCase()}
            </Pill>
          ))}
        </div>
      )}
      {err ? <div style={{ marginTop: 12 }}><RetryLine error={humaneError(err, "That didn't go through. Try again in a moment.")} /></div> : null}
    </ItemCard>
  );
}

export function ReminderApprovals({ onCount }: { onCount?: OnCount }) {
  const { data, error, loading, reload } = useLoad(() => osApi.items("AWAITING_APPROVAL"));
  const [done, setDone] = useState<WorkflowItem[]>([]);
  const list = (data?.items || []).filter((i) => !done.some((d) => d.id === i.id));
  useReport(onCount, loading || error ? null : list.length + done.length);
  if (!loading && !error && list.length === 0 && done.length === 0) return null;
  return (
    <section aria-label="Reminders waiting for you">
      <SectionHead title="Reminders" count={loading || error ? null : list.length} hint="Drafted by the overdue follow-up workflow from ledger facts only. Starlane does not send them." />
      {loading && <SkeletonRows rows={2} />}
      {error ? <RetryLine error={error} onRetry={reload} /> : null}
      <div className="flex flex-col" style={{ gap: 12 }}>
        {list.map((i) => <ReminderCard key={i.id} item={i} onDone={(x) => { setDone((d) => [...d, x]); }} onStale={reload} />)}
        {done.map((i) => (
          <ItemCard
            key={i.id}
            quiet
            chip={<Pill tone={i.status === "REJECTED" ? "neutral" : "good"}>{ITEM_STATUS_LABEL[i.status] || sentence(i.status)}</Pill>}
            title={i.target}
            stake={amount(i.amount, i.currency)}
            why={i.verifyAfter ? `Starlane checks the ledger for a payment on ${formatDate(i.verifyAfter)}.` : undefined}
          />
        ))}
      </div>
      {done.length > 0 && <p style={{ margin: "10px 0 0", fontSize: 12.5 }}><Link href="/memory" className="hover-dim" style={{ color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}>Outcomes appear in Memory once checked</Link></p>}
    </section>
  );
}

function ReminderCard({ item, onDone, onStale }: { item: WorkflowItem; onDone: (i: WorkflowItem) => void; onStale: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (approve: boolean) => {
    setBusy(true); setErr(null);
    try {
      const r = approve ? await osApi.approveItem(item.id) : await osApi.rejectItem(item.id);
      onDone(r.item);
    } catch (e) {
      // 409: someone (another tab, a teammate) already decided this one. Say so,
      // then refresh; any other error stays on screen so it can be read.
      if ((e as { status?: number })?.status === 409) {
        setErr("This reminder was already decided elsewhere. Refreshing the list.");
        setTimeout(onStale, 2500);
      } else setErr(humaneError(e, "That didn't go through. Try again in a moment."));
    } finally { setBusy(false); }
  };
  const h = item.context.history;
  const why = [
    item.context.maxAgeDays ? `Oldest invoice ${item.context.maxAgeDays} days overdue.` : null,
    h && h.paidInvoices ? `Paid ${h.paidInvoices} invoices before, ${pct(h.onTimeRate)} on time.` : null,
    item.expectedOutcome.baselineProbability != null ? `Without a reminder, ${pct(item.expectedOutcome.baselineProbability)} chance of a payment within ${item.expectedOutcome.withinDays} days.` : null,
  ].filter(Boolean).join(" ");
  return (
    <ItemCard
      chip={<Pill>{sentence(item.draft.tone)}</Pill>}
      meta={item.expiresAt ? `Expires ${formatDate(item.expiresAt)}` : undefined}
      title={`Reminder to ${item.target}`}
      why={why || undefined}
      stake={amount(item.amount, item.currency)}
      stakeNote="overdue"
      actions={
        <>
          <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={() => decide(true)}>{busy ? "Working…" : "Approve"}</button>
          <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={() => decide(false)}>Reject</button>
        </>
      }
    >
      <blockquote style={{ margin: 0, padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--body)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {item.draft.text}
      </blockquote>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
        Drafted by {item.agent.agent}, {item.agent.model} · Checks: {item.policy.map((p) => `${sentence(p.key).toLowerCase()} ${p.verdict.toLowerCase().replace(/_/g, " ")}`).join(", ")}
      </p>
      {err && <div style={{ marginTop: 10 }}><RetryLine error={err} /></div>}
    </ItemCard>
  );
}

function windowText(days: number | null): string | null {
  if (days == null) return null;
  if (days < 0) return "Past its latest safe date";
  if (days === 0) return "Act today";
  return `${days} day${days === 1 ? "" : "s"} left to act`;
}

// Decisions waiting on a person: the first thing Prepared shows. Each one
// says what it is, why now, how much money it touches and by when; the
// decision page holds the evidence, unknowns, options and Handle it.
export function DecisionsNeedingYou({ onCount }: { onCount?: OnCount }) {
  const { data, error, loading, reload } = useLoad(() => decisionsApi.list("active"));
  const waiting = (data?.decisions || []).filter((d) => ["OPEN", "NEEDS_INFORMATION", "SELECTED", "APPROVED"].includes(d.status));
  useReport(onCount, loading || error ? null : waiting.length);
  if (!loading && !error && waiting.length === 0) return null;
  return (
    <section aria-label="Decisions">
      <SectionHead
        title="Decisions"
        count={loading || error ? null : waiting.length}
        hint="Each one shows why now, what is at stake, what Starlane doesn't know, and every option against doing nothing."
        right={<Link href="/decisions" className="ui-btn ui-btn-ghost ui-btn-sm">All decisions</Link>}
      />
      {loading && <SkeletonRows rows={2} />}
      {error ? <RetryLine error={error} onRetry={reload} fallback="Starlane couldn't load your decisions just now. Try again in a moment." /> : null}
      <div className="flex flex-col" style={{ gap: 12 }}>
        {waiting.map((d) => {
          const left = daysUntil(d.deadline);
          const stake = stakeOf(d.materiality as Record<string, unknown> | null);
          const w = windowText(left);
          return (
            <ItemCard
              key={d.id}
              chip={<Pill tone={d.status === "NEEDS_INFORMATION" ? "warn" : d.status === "APPROVED" ? "good" : "accent"}>{STATUS_LABEL[d.status] || sentence(d.status)}</Pill>}
              meta={w ? <span style={{ color: left != null && left <= 2 ? "var(--critical)" : left != null && left <= 7 ? "var(--warning)" : undefined }}>{w}</span> : undefined}
              title={cleanTitle(d.title)}
              why={
                <>
                  {d.whyNow && d.whyNow[0] ? <span>{d.whyNow[0]}.</span> : null}
                  {d.recommendation ? <span style={{ display: "block", color: "var(--ink-2)", marginTop: 2 }}>Starlane suggests: {d.recommendation.informationFirst ? "find out first" : d.recommendation.label}</span> : null}
                </>
              }
              stake={stake ? amount(stake, d.currency) : <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-3)" }}>Not known yet</span>}
              stakeNote={stake ? "at stake if ignored" : "amount not estimated"}
              actions={<Link href={`/decisions/${d.id}`} className={`ui-btn ${d.status === "SELECTED" || d.status === "APPROVED" ? "ui-btn-primary" : "ui-btn-secondary"}`}>{d.status === "SELECTED" ? "Review and approve" : d.status === "APPROVED" ? "Review and run" : "Review options"}</Link>}
            />
          );
        })}
      </div>
    </section>
  );
}

"use client";

// One mission on the web (GET /api/client/missions/:id): objective, progress
// measured from the books against the baseline frozen at the start, what it
// is waiting on, the actions it proposed with their lifecycle and the owner's
// decision, a timeline built only from the mission's audit history, and
// start / pause / resume / cancel. Same data and rules as the apps.
import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { osApi } from "@/lib/os";
import { inrWhole, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { agentLabel } from "@/components/os/MissionsList";
import { MissionActionRow } from "@/components/os/missions/ActionRow";
import { PageColumn, BackLink, Fact, Meter, Note, cleanTitle, humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Figure, SectionTitle, Sep } from "@/components/v32/ui";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { IconMissions } from "@/components/v32/icons";
import { LIFECYCLE_LABEL, type Mission, type EvidenceItem } from "../../../packages/contracts/src/features";

const STATUS: Record<string, [string, StatusTone]> = {
  draft: ["Draft", "neutral"], active: ["Running", "info"], paused: ["Paused", "attention"],
  completed: ["Completed", "positive"], failed: ["Missed target", "critical"], cancelled: ["Cancelled", "neutral"],
};
const EVENT: Record<string, string> = {
  draft: "Saved as a draft", active: "Started", paused: "Paused by you", cancelled: "Cancelled by you",
  completed: "Reached its target", failed: "Ended short of its target",
};
const KIND: Record<string, string> = { fact: "From your books", calculated: "Calculated", assumption: "Set by you", estimate: "Estimate", model: "Model" };
const INVOICE_STATUS: Record<string, [string, StatusTone]> = {
  open: ["Open", "neutral"], part_paid: ["Part paid", "info"], paid_or_removed: ["Paid", "positive"], cancelled_in_books: ["Cancelled in books", "unknown"],
};

type Verb = "activate" | "pause" | "cancel";

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<Mission | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [busy, setBusy] = useState<Verb | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [actError, setActError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  useEffect(() => {
    osApi.agents().then((r) => setAgentNames(Object.fromEntries(r.agents.map((a) => [a.key, a.name])))).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoadError(null);
    request<{ mission: Mission }>(`/api/client/missions/${encodeURIComponent(id)}`)
      .then((r) => { setM(r.mission); setLoadError(null); })
      .catch((e: unknown) => setLoadError(e || new Error("load")));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(verb: Verb) {
    setBusy(verb); setNote(null); setActError(null);
    try {
      const out = await request<{ mission: Mission; proposed: { created: number; adopted: number } | null }>(`/api/client/missions/${encodeURIComponent(id)}/${verb}`, { method: "POST", body: "{}" });
      if (out.proposed) setNote(`${out.proposed.created} action${out.proposed.created === 1 ? "" : "s"} proposed for your approval${out.proposed.adopted ? `, ${out.proposed.adopted} existing adopted` : ""}. Nothing has been sent.`);
      load();
    } catch (e) { setActError(humaneError(e)); } finally { setBusy(null); }
  }

  const notFound = (loadError as { status?: number } | null)?.status === 404;

  return (
    <DashboardLayout pageTitle="Mission">
      <PageColumn gap={16}>
        <BackLink href="/missions">Missions</BackLink>
        {loadError && !m ? (
          notFound ? (
            <EmptyState icon={<IconMissions size={17} />} title="This mission isn't here" message="It may have been removed, or the link is from another workspace." action={<Link href="/missions" className="ui-btn ui-btn-secondary ui-btn-sm">All missions</Link>} />
          ) : (
            <ErrorState title="This mission didn't load" message={humaneError(loadError, NETWORK_ERROR)} onRetry={load} />
          )
        ) : null}
        {!m && !loadError ? <DetailSkeleton /> : null}
        {m ? <MissionBody m={m} agentNames={agentNames} busy={busy} note={note} actError={actError} onAct={act} onCancel={() => setConfirmCancel(true)} onDecided={load} /> : null}
      </PageColumn>
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this mission?"
        description="Starlane stops tracking it, and the actions still waiting for your approval are cancelled. Approved actions and payments already recorded are not changed. This can't be undone."
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Keep mission</Button>
          <Button variant="danger" size="sm" onClick={() => { setConfirmCancel(false); void act("cancel"); }}>Cancel mission</Button>
        </>}
      />
    </DashboardLayout>
  );
}

function MissionBody({ m, agentNames, busy, note, actError, onAct, onCancel, onDecided }: {
  m: Mission; agentNames: Record<string, string>; busy: Verb | null; note: string | null; actError: string | null;
  onAct: (v: Verb) => void; onCancel: () => void; onDecided: () => void;
}) {
  const p = m.progress;
  const blockers = Array.isArray(p?.blockers) ? p!.blockers : [];
  const [label, tone] = STATUS[m.status] || [m.status, "neutral" as StatusTone];
  const allowed = m.allowed || [];
  const open = m.status === "active" || m.status === "paused";
  const tracking = !!p && m.status !== "draft" && !!m.baseline;
  const actions = m.actions || [];
  const awaiting = actions.filter((a) => a.canDecide).length;
  const agent = m.assigned ? agentLabel(m.assigned.agent, agentNames) : null;

  // One primary at most: Start / Resume. Pause is secondary, Cancel is quiet.
  const header = (
    <>
      {allowed.includes("cancel") && <Button variant="ghost" size="sm" disabled={!!busy} onClick={onCancel}>Cancel mission</Button>}
      {allowed.includes("pause") && <Button variant="secondary" disabled={!!busy} loading={busy === "pause"} onClick={() => onAct("pause")}>Pause</Button>}
      {allowed.includes("activate") && (
        <Button variant="primary" disabled={!!busy} loading={busy === "activate"} onClick={() => onAct("activate")}>
          {m.status === "paused" ? "Resume mission" : "Start mission"}
        </Button>
      )}
    </>
  );

  return (
    <>
      <div className="flex flex-col" style={{ gap: 10 }}>
        <PageHeader title={cleanTitle(m.title)} subtitle={m.objective} right={allowed.length ? <div className="flex items-center flex-wrap" style={{ gap: 8 }}>{header}</div> : undefined} />
        <div className="flex items-center flex-wrap" style={{ gap: "6px 10px", fontSize: 12, color: "var(--ink-3)" }}>
          <StatusChip tone={tone}>{label}</StatusChip>
          <Sep />
          <span>Collections mission</span>
          {agent && <><Sep /><span>{agent}</span></>}
          <Sep />
          <span>{m.activatedAt ? `Started ${formatDate(m.activatedAt)}` : `Created ${formatDate(m.createdAt)}`}</span>
          {m.updatedAt && <><Sep /><span title={formatDateTime(m.updatedAt)}>Updated {formatRelative(m.updatedAt)}</span></>}
        </div>
        {(note || actError) && <div>{note && <Note tone="positive">{note}</Note>}{actError && <Note tone="critical">{actError}</Note>}</div>}
      </div>

      {tracking && p ? (
        <section aria-label="Progress" style={{ marginTop: 8, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20 }}>
            <Figure value={inrWhole(p.collected)} label="Collected so far" tone={m.status === "completed" ? "var(--positive)" : undefined} />
            <Figure value={inrWhole(p.targetAmount)} label="Target" />
            <Figure value={inrWhole(p.remaining ?? Math.max(0, p.targetAmount - p.collected))} label="Still to collect" />
            <Figure
              value={m.status === "active" && p.daysLeft != null ? String(p.daysLeft) : m.closedAt ? formatDate(m.closedAt) : m.endsAt ? formatDate(m.endsAt) : "—"}
              label={m.status === "active" && p.daysLeft != null ? `Days left, ends ${formatDate(m.endsAt)}` : m.closedAt ? "Closed" : "Ends"}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Meter ratio={p.ratio} tone={m.status === "failed" ? "critical" : m.status === "active" || m.status === "completed" ? "positive" : "ink"} label={`${Math.round(p.ratio * 100)}% of target collected`} />
            <div className="flex justify-between flex-wrap" style={{ gap: 8, marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              <span className="num">{Math.round(p.ratio * 100)}% of target</span>
              {p.evidence?.summary && <span>{p.evidence.summary}</span>}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid min-[1100px]:grid-cols-[minmax(0,1fr)_300px]" style={{ gap: "32px 56px", alignItems: "start", marginTop: 16 }}>
        <div className="flex flex-col min-w-0" style={{ gap: 32 }}>
          {(open || m.status === "draft") && (
            <section>
              <SectionTitle>Waiting on</SectionTitle>
              <div style={{ borderTop: "1px solid var(--line)" }}>
                {m.status === "draft" ? (
                  <WaitRow attention text="You: start the mission. Starting it freezes a baseline from your books and proposes one reminder per customer for your approval." />
                ) : blockers.length ? (
                  blockers.map((b) => <WaitRow key={b.code} attention={b.code === "awaiting_approval" || b.code === "paused"} text={b.text} />)
                ) : (
                  <WaitRow text="Nothing. Starlane is tracking payments on these invoices against the target." />
                )}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Execution</SectionTitle>
            <Timeline m={m} agent={agent} />
          </section>

          <section>
            <SectionTitle>Approvals<span className="wk-count">{actions.length}</span></SectionTitle>
            <p className="meta" style={{ margin: "-4px 0 8px" }}>
              {awaiting ? `${awaiting} waiting for you. ` : ""}Approving records your decision; nothing is sent from here.
            </p>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {actions.length ? actions.map((a, n) => <MissionActionRow key={a.id} a={a} first={n === 0} onDecided={onDecided} />) : (
                <p style={{ margin: 0, padding: "12px 0", fontSize: 13, color: "var(--ink-2)" }}>
                  {m.status === "draft" ? "Nothing proposed yet. Start the mission and Starlane proposes the first reminders." : "This mission has not proposed any action."}
                </p>
              )}
            </div>
          </section>

          <InvoicesSection m={m} />
        </div>

        <aside className="flex flex-col min-w-0" style={{ gap: 32 }}>
          <section>
            <SectionTitle>Outcome</SectionTitle>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              {m.outcome ? (
                <StatusChip tone={m.outcome.result === "completed" ? "positive" : "critical"}>{m.outcome.result === "completed" ? "Verified: target met" : "Verified: target missed"}</StatusChip>
              ) : (
                <StatusChip tone="unknown">Not checked yet</StatusChip>
              )}
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
                {m.outcome
                  ? <>{m.outcome.text} Collected <span className="num">{inrWhole(m.outcome.collected)}</span> of <span className="num">{inrWhole(m.outcome.target)}</span>, decided {formatDate(m.outcome.decidedAt)}.</>
                  : m.status === "draft" ? "Checked against your books once the mission starts." : "Decided from your books: met when collections reach the target, missed if the deadline passes first. Nobody marks it by hand."}
              </p>
              {p?.evidence?.facts?.length ? (
                <div style={{ marginTop: 10 }}>
                  {p.evidence.facts.map((f) => <EvidenceFact key={f.label} f={f} />)}
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <SectionTitle>Rules</SectionTitle>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {agent && <Fact first label="Agent">{agent}</Fact>}
              <Fact first={!agent} label="Approval">Every action</Fact>
              <Fact label="Horizon">{m.horizonDays} days{m.endsAt ? `, ends ${formatDate(m.endsAt)}` : ""}</Fact>
              <Fact label="Escalation">{m.constraints?.allowEscalation ? "Allowed" : "Reminders only"}</Fact>
              <Fact label="Disputed invoices">Always left out</Fact>
              {m.constraints?.minDaysBetweenReminders != null && <Fact label="Between reminders">At least {m.constraints.minDaysBetweenReminders} days</Fact>}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

/** What the mission waits on. Items that need the owner carry the ink rule in the gutter. */
function WaitRow({ text, attention }: { text: string; attention?: boolean }) {
  return (
    <div className={attention ? "wk-attn" : undefined} style={{ padding: "11px 0", borderBottom: "1px solid var(--line)", fontSize: 13, lineHeight: 1.55, color: attention ? "var(--ink)" : "var(--body)" }}>
      {text}
    </div>
  );
}

function EvidenceFact({ f }: { f: EvidenceItem }) {
  const v = typeof f.value === "number" ? (f.unit === "INR" ? inrWhole(f.value) : f.value.toLocaleString("en-IN")) : String(f.value ?? "—");
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 12, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
      <span className="min-w-0">
        <span style={{ fontSize: 12.5, color: "var(--body)" }}>{f.label}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{KIND[f.kind] || f.kind}</span>
      </span>
      <span className="num" style={{ fontSize: 12.5, color: "var(--ink)" }}>{v}</span>
    </div>
  );
}

const STATE_AFTER: Record<string, string> = {
  draft: "Draft", active: "Running", paused: "Paused", cancelled: "Cancelled", completed: "Target met", failed: "Target missed",
};
// Transitions only the owner can make (POST activate / pause / cancel, or
// saving the draft); the end states are decided by Starlane from the books.
const BY_OWNER = new Set(["draft", "active", "paused", "cancelled"]);
const TL_COLS = "104px minmax(0,1fr) 150px 170px";

/**
 * The execution timeline, oldest first: when, what happened, who did it, and
 * the state it left the mission in. Real events only: the mission's audit
 * history, the actions it proposed (grouped by the minute they were
 * proposed), each action's latest lifecycle change, the verified outcome and
 * the scheduled deadline.
 */
function Timeline({ m, agent }: { m: Mission; agent: string | null }) {
  type Item = { at: string; text: string; by: string | null; result: string | null; note?: string | null; future?: boolean };
  const items: Item[] = [];
  let lastStatus: string | null = null;
  for (const h of m.history || []) {
    const text = h.event === "active" && lastStatus === "paused" ? "Resumed" : EVENT[h.event] || h.event.charAt(0).toUpperCase() + h.event.slice(1).replace(/_/g, " ");
    items.push({ at: h.at, text, by: BY_OWNER.has(h.event) ? "You" : "Starlane", result: STATE_AFTER[h.event] || null });
    lastStatus = h.event;
  }
  // Actions proposed together (on start) are one event.
  const byMinute = new Map<string, number>();
  for (const a of m.actions || []) {
    const k = a.createdAt.slice(0, 16);
    byMinute.set(k, (byMinute.get(k) || 0) + 1);
  }
  for (const [k, n] of byMinute) {
    const at = (m.actions || []).find((a) => a.createdAt.startsWith(k))!.createdAt;
    items.push({ at, text: `${n} action${n === 1 ? "" : "s"} proposed`, by: agent, result: "For your approval" });
  }
  for (const a of m.actions || []) {
    if (!a.updatedAt) continue;
    items.push({ at: a.updatedAt, text: a.title, by: null, result: LIFECYCLE_LABEL[a.lifecycle] || a.lifecycle, note: a.lifecycleNote });
  }
  if (m.outcome && !(m.history || []).some((h) => h.event === "completed" || h.event === "failed")) {
    items.push({ at: m.outcome.decidedAt, text: "Outcome checked against your books", by: "Starlane", result: m.outcome.result === "completed" ? "Target met" : "Target missed" });
  }
  items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (m.status === "active" && m.endsAt && Date.parse(m.endsAt) > Date.now()) items.push({ at: m.endsAt, text: "Deadline: outcome checked against your books", by: "Starlane", result: "Scheduled", future: true });

  if (!items.length) return <p className="wk-empty" style={{ borderTop: "1px solid var(--line)" }}>No events recorded yet.</p>;
  return (
    <div role="table" aria-label="Execution timeline">
      <div role="row" className="hidden md:grid" style={{ gridTemplateColumns: TL_COLS, columnGap: 16, padding: "0 0 8px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: "var(--ink-3)" }}>
        <span role="columnheader">Time</span>
        <span role="columnheader">Step</span>
        <span role="columnheader">By</span>
        <span role="columnheader">Result</span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((it, i) => (
          <li key={`${it.at}-${i}`} role="row" className="mis-tl-row md:grid" style={{ gridTemplateColumns: TL_COLS, columnGap: 16, padding: "10px 0", borderBottom: "1px solid var(--line)", alignItems: "baseline" }}>
            <span role="cell" className="num" style={{ fontSize: 12, color: "var(--ink-3)" }} title={formatDateTime(it.at)}>
              {it.future ? formatDate(it.at) : formatDateTime(it.at)}
            </span>
            <span role="cell" className="min-w-0 block" style={{ fontSize: 13, color: it.future ? "var(--ink-2)" : "var(--ink)", lineHeight: 1.5 }}>
              {it.text}
              {it.note && <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)" }}>{it.note}</span>}
            </span>
            <span role="cell" className="mis-tl-by" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{it.by || "—"}</span>
            <span role="cell" className="mis-tl-result" style={{ fontSize: 12.5, color: it.future ? "var(--ink-3)" : "var(--ink-2)" }}>{it.result || "—"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const INV_COLS = "minmax(0,1fr) 128px 120px 120px";

function InvoicesSection({ m }: { m: Mission }) {
  const rows = m.progress?.byInvoice || [];
  const draft = !rows.length ? m.targetInvoices || [] : [];
  if (!rows.length && !draft.length) return null;
  return (
    <section>
      <SectionTitle>{rows.length ? "Invoices" : "Invoices in this mission"}<span className="wk-count">{rows.length || draft.length}</span></SectionTitle>
      <div className="wk-list wk-flat">
        <div className="wk-head" style={{ gridTemplateColumns: INV_COLS }}>
          <span>Customer</span>
          <span>{rows.length ? "Status" : "Overdue"}</span>
          <span style={{ textAlign: "right" }}>{rows.length ? "At start" : ""}</span>
          <span style={{ textAlign: "right" }}>{rows.length ? "Left now" : "Amount"}</span>
        </div>
        {rows.map((i) => {
          const [st, tone] = i.disputed ? ["Disputed", "critical" as StatusTone] : INVOICE_STATUS[i.status] || [i.status, "neutral" as StatusTone];
          return (
            <div key={i.id} className="wk-row" style={{ gridTemplateColumns: INV_COLS, paddingTop: 10, paddingBottom: 10 }}>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 13, color: "var(--ink)" }}>{i.customer}</div>
                <div className={i.invoiceNumber ? "num" : undefined} style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{i.invoiceNumber || "No invoice number"}</div>
              </div>
              <div className="mt-2 md:mt-0"><StatusChip tone={tone}>{st}</StatusChip></div>
              <div className="hidden md:block num" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-3)" }}>{inrWhole(i.baseline)}</div>
              <div className="flex md:block justify-between mt-1 md:mt-0 num" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>
                <span className="md:hidden" style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-3)" }}>Left now, of {inrWhole(i.baseline)}</span>
                {i.status === "paid_or_removed" ? inrWhole(0) : inrWhole(i.now)}
              </div>
            </div>
          );
        })}
        {draft.map((i) => (
          <div key={i.id} className="wk-row" style={{ gridTemplateColumns: INV_COLS, paddingTop: 10, paddingBottom: 10 }}>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13, color: "var(--ink)" }}>{i.customer}</div>
              <div className={i.invoiceNumber ? "num" : undefined} style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{i.invoiceNumber || "No invoice number"}</div>
            </div>
            <div className="num mt-1 md:mt-0" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{i.daysOverdue} days</div>
            <div className="hidden md:block" />
            <div className="num" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{inrWhole(i.amount)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading mission" className="flex flex-col" style={{ gap: 20 }}>
      <div className="skeleton" style={{ height: 20, width: "48%" }} />
      <div className="skeleton" style={{ height: 12, width: "38%" }} />
      <div style={{ paddingTop: 18, marginTop: 12, borderTop: "1px solid var(--line)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20 }}>
          {[0, 1, 2, 3].map((i) => <div key={i}><div className="skeleton" style={{ height: 18, width: "60%" }} /><div className="skeleton" style={{ height: 9, width: "44%", marginTop: 8 }} /></div>)}
        </div>
      </div>
    </div>
  );
}

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
import { PageColumn, BackLink, SectionHead, Panel, Fact, Meter, Note, cleanTitle, humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Figure } from "@/components/v32/ui";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { IconAlert, IconCheck, IconMissions } from "@/components/v32/icons";
import type { Mission, EvidenceItem } from "../../../packages/contracts/src/features";

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
      <PageColumn gap={20}>
        <BackLink href="/missions">Missions</BackLink>
        {loadError && !m ? (
          notFound ? (
            <EmptyState icon={<IconMissions size={17} />} title="This mission isn't here" message="It may have been removed, or the link is from another workspace." action={<Link href="/missions" className="ui-btn ui-btn-secondary ui-btn-sm">All missions</Link>} className="ui-panel" />
          ) : (
            <ErrorState className="ui-panel" title="This mission didn't load" message={humaneError(loadError, NETWORK_ERROR)} onRetry={load} />
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
        <div className="flex items-center flex-wrap" style={{ gap: "6px 10px", fontSize: 12.5, color: "var(--ink-3)" }}>
          <StatusChip tone={tone}>{label}</StatusChip>
          <span>Collections mission</span>
          {agent && <><span aria-hidden="true" style={{ color: "var(--line-strong)" }}>·</span><span>{agent}</span></>}
          <span aria-hidden="true" style={{ color: "var(--line-strong)" }}>·</span>
          <span>{m.activatedAt ? `Started ${formatDate(m.activatedAt)}` : `Created ${formatDate(m.createdAt)}`}</span>
          {m.updatedAt && <><span aria-hidden="true" style={{ color: "var(--line-strong)" }}>·</span><span>Updated {formatRelative(m.updatedAt)}</span></>}
        </div>
        {(note || actError) && <div>{note && <Note tone="positive">{note}</Note>}{actError && <Note tone="critical">{actError}</Note>}</div>}
      </div>

      {tracking && p ? (
        <Panel style={{ padding: "20px 22px" }}>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20 }}>
            <Figure value={inrWhole(p.collected)} label="Collected so far" tone={m.status === "completed" ? "var(--positive)" : undefined} />
            <Figure value={inrWhole(p.targetAmount)} label="Target" />
            <Figure value={inrWhole(p.remaining ?? Math.max(0, p.targetAmount - p.collected))} label="Still to collect" />
            <Figure
              value={m.status === "active" && p.daysLeft != null ? String(p.daysLeft) : m.closedAt ? formatDate(m.closedAt) : m.endsAt ? formatDate(m.endsAt) : "—"}
              label={m.status === "active" && p.daysLeft != null ? `Days left, ends ${formatDate(m.endsAt)}` : m.closedAt ? "Closed" : "Ends"}
            />
          </div>
          <div style={{ marginTop: 18 }}>
            <Meter ratio={p.ratio} tone={m.status === "failed" ? "critical" : m.status === "active" || m.status === "completed" ? "positive" : "ink"} label={`${Math.round(p.ratio * 100)}% of target collected`} />
            <div className="flex justify-between flex-wrap" style={{ gap: 8, marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
              <span className="tabular-nums">{Math.round(p.ratio * 100)}% of target</span>
              {p.evidence?.summary && <span>{p.evidence.summary}</span>}
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid min-[900px]:grid-cols-[minmax(0,1fr)_320px]" style={{ gap: 28, alignItems: "start" }}>
        <div className="flex flex-col min-w-0" style={{ gap: 28 }}>
          {(open || m.status === "draft") && (
            <section>
              <SectionHead title="Waiting on" count={m.status === "draft" ? 1 : blockers.length} />
              <Panel pad={false}>
                {m.status === "draft" ? (
                  <WaitRow first tone="attention" text="You: start the mission. Starting it freezes a baseline from your books and proposes one reminder per customer for your approval." />
                ) : blockers.length ? (
                  blockers.map((b, i) => <WaitRow key={b.code} first={i === 0} tone={b.code === "awaiting_approval" || b.code === "paused" ? "attention" : "neutral"} text={b.text} />)
                ) : (
                  <WaitRow first tone="positive" text="Nothing. Starlane is tracking payments on these invoices against the target." />
                )}
              </Panel>
            </section>
          )}

          <section>
            <SectionHead
              title="Approvals"
              count={actions.length}
              hint={awaiting ? `${awaiting} waiting for you. Approving records your decision; nothing is sent from here.` : "Approving records your decision; nothing is sent from here."}
            />
            <Panel pad={false}>
              {actions.length ? actions.map((a, n) => <MissionActionRow key={a.id} a={a} first={n === 0} onDecided={onDecided} />) : (
                <p style={{ margin: 0, padding: "14px 18px", fontSize: 13, color: "var(--ink-2)" }}>
                  {m.status === "draft" ? "Nothing proposed yet. Start the mission and Starlane proposes the first reminders." : "This mission has not proposed any action."}
                </p>
              )}
            </Panel>
          </section>

          <InvoicesSection m={m} />
        </div>

        <aside className="flex flex-col min-w-0" style={{ gap: 28 }}>
          <section>
            <SectionHead title="Timeline" />
            <Timeline m={m} />
          </section>

          <section>
            <SectionHead title="Outcome" />
            <Panel>
              {m.outcome ? (
                <div className="flex items-start" style={{ gap: 10 }}>
                  <StatusChip tone={m.outcome.result === "completed" ? "positive" : "critical"}>{m.outcome.result === "completed" ? "Verified: target met" : "Verified: target missed"}</StatusChip>
                </div>
              ) : (
                <StatusChip tone="unknown">Not checked yet</StatusChip>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>
                {m.outcome
                  ? <>{m.outcome.text} Collected <span className="tabular-nums">{inrWhole(m.outcome.collected)}</span> of <span className="tabular-nums">{inrWhole(m.outcome.target)}</span>, decided {formatDate(m.outcome.decidedAt)}.</>
                  : m.status === "draft" ? "Checked against your books once the mission starts." : "Starlane decides it from your books: met when collections reach the target, missed if the deadline passes first. Nobody marks it by hand."}
              </p>
              {p?.evidence?.facts?.length ? (
                <div style={{ marginTop: 12 }}>
                  {p.evidence.facts.map((f) => <EvidenceFact key={f.label} f={f} />)}
                </div>
              ) : null}
            </Panel>
          </section>

          <section>
            <SectionHead title="Rules" />
            <Panel style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div>
                {agent && <Fact first label="Agent">{agent}</Fact>}
                <Fact first={!agent} label="Approval">Every action</Fact>
                <Fact label="Horizon">{m.horizonDays} days{m.endsAt ? `, ends ${formatDate(m.endsAt)}` : ""}</Fact>
                <Fact label="Escalation">{m.constraints?.allowEscalation ? "Allowed" : "Reminders only"}</Fact>
                <Fact label="Disputed invoices">Always left out</Fact>
                {m.constraints?.minDaysBetweenReminders != null && <Fact label="Between reminders">At least {m.constraints.minDaysBetweenReminders} days</Fact>}
              </div>
            </Panel>
          </section>
        </aside>
      </div>
    </>
  );
}

function WaitRow({ text, tone, first }: { text: string; tone: "attention" | "neutral" | "positive"; first?: boolean }) {
  const color = tone === "attention" ? "var(--warning)" : tone === "positive" ? "var(--positive)" : "var(--ink-3)";
  return (
    <div className="flex items-start" style={{ gap: 12, padding: "12px 18px", borderTop: first ? 0 : "1px solid var(--line)" }}>
      <span style={{ color, marginTop: 2 }}>{tone === "positive" ? <IconCheck size={15} /> : <IconAlert size={15} />}</span>
      <span style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{text}</span>
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
      <span className="tabular-nums" style={{ fontSize: 13, color: "var(--ink)" }}>{v}</span>
    </div>
  );
}

/** Real events only: the mission's audit history, the actions it proposed, and its scheduled end. */
function Timeline({ m }: { m: Mission }) {
  type Item = { at: string; text: string; future?: boolean };
  const items: Item[] = [];
  let lastStatus: string | null = null;
  for (const h of m.history || []) {
    const text = h.event === "active" && lastStatus === "paused" ? "Resumed" : EVENT[h.event] || h.event.charAt(0).toUpperCase() + h.event.slice(1).replace(/_/g, " ");
    items.push({ at: h.at, text });
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
    items.push({ at, text: `${n} action${n === 1 ? "" : "s"} proposed for your approval` });
  }
  if (m.outcome && !(m.history || []).some((h) => h.event === "completed" || h.event === "failed")) {
    items.push({ at: m.outcome.decidedAt, text: m.outcome.result === "completed" ? EVENT.completed : EVENT.failed });
  }
  items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (m.status === "active" && m.endsAt && Date.parse(m.endsAt) > Date.now()) items.push({ at: m.endsAt, text: "Deadline: outcome checked against your books", future: true });

  if (!items.length) return <Note>No events recorded yet.</Note>;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={`${it.at}-${i}`} className="flex" style={{ gap: 12 }}>
            <div className="flex flex-col items-center" style={{ width: 9, paddingTop: 5 }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 999, boxSizing: "border-box", border: `1.5px ${it.future ? "dashed" : "solid"} ${it.future ? "var(--ink-3)" : "var(--ink-2)"}`, background: it.future ? "transparent" : "var(--bg)" }} />
              {!last && <span aria-hidden="true" style={{ flex: 1, width: 1, background: "var(--line-strong)", marginTop: 3 }} />}
            </div>
            <div className="min-w-0" style={{ paddingBottom: last ? 0 : 16 }}>
              <div style={{ fontSize: 13, color: it.future ? "var(--ink-2)" : "var(--ink)" }}>{it.text}</div>
              <div className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{it.future ? formatDate(it.at) : formatDateTime(it.at)}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const INV_GRID = "md:grid md:grid-cols-[minmax(0,1fr)_128px_120px_120px] md:items-center";

function InvoicesSection({ m }: { m: Mission }) {
  const rows = m.progress?.byInvoice || [];
  const draft = !rows.length ? m.targetInvoices || [] : [];
  if (!rows.length && !draft.length) return null;
  return (
    <section>
      <SectionHead title={rows.length ? "Invoices" : "Invoices in this mission"} count={rows.length || draft.length} />
      <Panel pad={false}>
        <div className={`hidden ${INV_GRID}`} style={{ height: 36, padding: "0 18px", gap: 16, fontSize: 12, color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
          <span>Customer</span>
          <span>{rows.length ? "Status" : "Overdue"}</span>
          <span style={{ textAlign: "right" }}>{rows.length ? "At start" : ""}</span>
          <span style={{ textAlign: "right" }}>{rows.length ? "Left now" : "Amount"}</span>
        </div>
        {rows.map((i, n) => {
          const [st, tone] = i.disputed ? ["Disputed", "critical" as StatusTone] : INVOICE_STATUS[i.status] || [i.status, "neutral" as StatusTone];
          return (
            <div key={i.id} className={`row-hover ${INV_GRID}`} style={{ gap: 16, padding: "12px 18px", minHeight: 48, borderTop: n ? "1px solid var(--line)" : 0 }}>
              <div className="min-w-0">
                <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{i.customer}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{i.invoiceNumber || "No invoice number"}</div>
              </div>
              <div className="mt-2 md:mt-0"><StatusChip tone={tone}>{st}</StatusChip></div>
              <div className="hidden md:block tabular-nums" style={{ textAlign: "right", fontSize: 13, color: "var(--ink-2)" }}>{inrWhole(i.baseline)}</div>
              <div className="flex md:block justify-between mt-1 md:mt-0 tabular-nums" style={{ textAlign: "right", fontSize: 13, color: "var(--ink)" }}>
                <span className="md:hidden" style={{ fontSize: 12, color: "var(--ink-3)" }}>Left now, of {inrWhole(i.baseline)}</span>
                {i.status === "paid_or_removed" ? inrWhole(0) : inrWhole(i.now)}
              </div>
            </div>
          );
        })}
        {draft.map((i, n) => (
          <div key={i.id} className={`row-hover ${INV_GRID}`} style={{ gap: 16, padding: "12px 18px", minHeight: 48, borderTop: n ? "1px solid var(--line)" : 0 }}>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{i.customer}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{i.invoiceNumber || "No invoice number"}</div>
            </div>
            <div className="tabular-nums mt-1 md:mt-0" style={{ fontSize: 13, color: "var(--ink-2)" }}>{i.daysOverdue} days</div>
            <div className="hidden md:block" />
            <div className="tabular-nums" style={{ textAlign: "right", fontSize: 13, color: "var(--ink)" }}>{inrWhole(i.amount)}</div>
          </div>
        ))}
      </Panel>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading mission" className="flex flex-col" style={{ gap: 20 }}>
      <div className="skeleton" style={{ height: 26, width: "52%" }} />
      <div className="skeleton" style={{ height: 12, width: "38%" }} />
      <div className="ui-panel" style={{ padding: 22, borderRadius: "var(--radius-lg)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20 }}>
          {[0, 1, 2, 3].map((i) => <div key={i}><div className="skeleton" style={{ height: 22, width: "70%" }} /><div className="skeleton" style={{ height: 10, width: "50%", marginTop: 8 }} /></div>)}
        </div>
      </div>
    </div>
  );
}

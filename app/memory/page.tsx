"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type AuditEvent } from "@/lib/api";
import { MemoryKnowledge, MemoryOutcomes } from "@/components/os/MemoryPanels";
import { PageHeader, Subnav, SkeletonRows } from "@/components/v32/ui";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDateTime } from "@/lib/format";
import { OFFLINE_LINE } from "@/components/scan/humaneError";

// Memory: what Starlane knows, whether its follow-ups worked, and how each
// record reached its current state.
//
// Knowledge and Outcomes read GET /api/os/memory (components/os/MemoryPanels).
// The other tabs read the real audit trail, GET /api/audit (audit_logs,
// written by lib/services/orchestrator/audit.service.js on every financial
// change), through api.audit.list(); no new endpoint, no new table.
// - Timeline: every recorded change, newest first.
// - Decisions: the subset whose action names imply a decision.
// - Replay: one record's changes, oldest first, picked from records that are
//   actually present in the fetched rows, never a hardcoded demo entity.
// - Turning points: a deterministic classifier over the action string only.
// Every string rendered is a field value or a fixed label attached
// deterministically to one: no invented history, outcomes or reasons.

type TabKey = "knowledge" | "outcomes" | "timeline" | "decisions" | "replay" | "turning-points";

const TABS: { key: TabKey; label: string }[] = [
  { key: "knowledge", label: "Knowledge" },
  { key: "outcomes", label: "Outcomes" },
  { key: "timeline", label: "Timeline" },
  { key: "decisions", label: "Decisions" },
  { key: "replay", label: "Replay" },
  { key: "turning-points", label: "Turning points" },
];
const TAB_KEYS = new Set<string>(TABS.map((t) => t.key));

const DECISION_HINTS = ["approve", "reject", "decline", "status", "confirm", "cancel"];
const TURNING_POINT_RULES: { match: string; outcome: string; tone: StatusTone }[] = [
  { match: "approve", outcome: "Approved", tone: "positive" },
  { match: "reject", outcome: "Rejected", tone: "critical" },
  { match: "decline", outcome: "Declined", tone: "critical" },
  { match: "overdue", outcome: "Went overdue", tone: "critical" },
  { match: "risk", outcome: "Flagged at risk", tone: "attention" },
  { match: "default", outcome: "Defaulted", tone: "critical" },
  { match: "write_off", outcome: "Written off", tone: "critical" },
  { match: "paid", outcome: "Paid", tone: "positive" },
  { match: "cancel", outcome: "Cancelled", tone: "neutral" },
];

function humanize(action: string): string {
  return action.replace(/[_.]+/g, " ").trim().toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function classify(action: string): { outcome: string; tone: StatusTone } | null {
  const lower = action.toLowerCase();
  const rule = TURNING_POINT_RULES.find((r) => lower.includes(r.match));
  return rule ? { outcome: rule.outcome, tone: rule.tone } : null;
}

function entityLabel(type: string | null | undefined, id: string | null | undefined): string {
  const t = type ? humanize(type) : "Record";
  return id ? `${t} ${String(id).slice(0, 8)}` : t;
}


const EMPTY_COPY: Record<"timeline" | "decisions" | "replay" | "turning-points", { title: string; body: string }> = {
  timeline: {
    title: "No changes recorded yet",
    body: "The timeline shows every change Starlane records for your account: approvals, status changes and edits. As soon as something changes, it appears here.",
  },
  decisions: {
    title: "No decisions recorded yet",
    body: "This shows the approvals, rejections and status changes from your timeline. None have been recorded yet.",
  },
  replay: {
    title: "No record has a history to replay yet",
    body: "Replay shows how one customer or invoice got to where it is, step by step, from recorded changes.",
  },
  "turning-points": {
    title: "No turning points yet",
    body: "Turning points are the recorded moments that changed an outcome: an approval, a rejection, an invoice going overdue or getting paid.",
  },
};

const RESULT_TONE: Record<string, StatusTone> = {
  approved: "positive", executed: "positive", verified: "positive", paid: "positive",
  rejected: "critical", declined: "critical", failed: "critical", blocked: "critical",
  proposed: "neutral", cancelled: "neutral",
};

// What a recorded change led to: the backend's own result when it sends
// one, else the deterministic reading of the action name, else nothing.
function outcomeOf(e: AuditEvent): { outcome: string; tone: StatusTone } | null {
  if (e.result) {
    const r = String(e.result).toLowerCase();
    return { outcome: humanize(r), tone: RESULT_TONE[r] || "neutral" };
  }
  return classify(e.action);
}

function kindOf(e: AuditEvent): string {
  if (e.source === "decision") return "Decision";
  return e.entity_type ? humanize(e.entity_type) : "Record";
}

const TL_COLS = "112px 84px minmax(0,1fr) 104px 150px 128px";

/** The organisation's history, one dense row per recorded change: when, what
 *  kind of record, what happened, which record, who acted and what it led
 *  to. Every value is a field of the audit row or a fixed label derived from
 *  one. */
function Timeline({ events, oldestFirst = false }: { events: AuditEvent[]; oldestFirst?: boolean }) {
  return (
    <div role="table" aria-label={oldestFirst ? "Changes, oldest first" : "Changes, newest first"} className="wk-list wk-flat">
      <div className="wk-head" role="row" style={{ gridTemplateColumns: TL_COLS }}>
        <span role="columnheader">When</span>
        <span role="columnheader">Kind</span>
        <span role="columnheader">What happened</span>
        <span role="columnheader">Record</span>
        <span role="columnheader">By</span>
        <span role="columnheader">Outcome</span>
      </div>
      {events.map((e) => {
        const out = outcomeOf(e);
        return (
          <div key={e.id} role="row" className="wk-row mem-row" style={{ gridTemplateColumns: TL_COLS }}>
            <time role="cell" dateTime={e.created_at} title={formatDateTime(e.created_at)} className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{formatDateTime(e.created_at)}</time>
            <span role="cell" className="mem-kind">{kindOf(e)}</span>
            <span role="cell" className="min-w-0" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.45 }}>
              {e.title || humanize(e.action)}
              {e.title && <span className="mem-action">{humanize(e.action)}</span>}
            </span>
            <span role="cell" className="num mem-record truncate" title={e.entity_id ? `${kindOf(e)} ${e.entity_id}` : undefined}>{e.entity_id ? String(e.entity_id).slice(0, 8) : "—"}</span>
            <span role="cell" className="mem-by truncate" title={e.model ? `${e.actor || "Unknown"} · ${e.model}` : undefined}>{e.actor || "—"}</span>
            <span role="cell" className="mem-out">{out ? <StatusChip tone={out.tone}>{out.outcome}</StatusChip> : <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MemoryPage() {
  const [tab, setTab] = useState<TabKey>("knowledge");
  const [replayEntity, setReplayEntity] = useState<string | null>(null);

  // ?tab=outcomes (and so on) opens a tab directly; switching tabs keeps the
  // address in step without a navigation.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TAB_KEYS.has(t)) setTab(t as TabKey);
  }, []);
  const choose = (k: string) => {
    setTab(k as TabKey);
    try {
      const url = new URL(window.location.href);
      if (k === "knowledge") url.searchParams.delete("tab"); else url.searchParams.set("tab", k);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch { /* address bar unchanged; the tab still switches */ }
  };

  const auditTab = tab !== "knowledge" && tab !== "outcomes";
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; events: AuditEvent[] }>({
    queryKey: ["memory-audit"],
    queryFn: () => api.audit.list(undefined, 200),
    staleTime: 15_000,
    enabled: auditTab,
  });

  const events = useMemo(() => data?.events ?? [], [data]);
  const decisions = useMemo(() => events.filter((e) => DECISION_HINTS.some((h) => e.action.toLowerCase().includes(h))), [events]);
  const turningPoints = useMemo(() => events.filter((e) => outcomeOf(e)), [events]);

  // Records present in the real data, most changed first.
  const entities = useMemo(() => {
    const seen = new Map<string, { entity_type: string; entity_id: string; count: number }>();
    for (const e of events) {
      if (!e.entity_type || !e.entity_id) continue;
      const key = `${e.entity_type}:${e.entity_id}`;
      const existing = seen.get(key);
      if (existing) existing.count += 1;
      else seen.set(key, { entity_type: e.entity_type, entity_id: String(e.entity_id), count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => b.count - a.count);
  }, [events]);

  const activeReplayEntity = replayEntity ?? entities[0]?.entity_id ?? null;
  const replaySequence = useMemo(() => {
    if (!activeReplayEntity) return [];
    return events
      .filter((e) => String(e.entity_id) === activeReplayEntity)
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [events, activeReplayEntity]);

  const ready = auditTab && !isLoading && !isError;
  const empty = (k: keyof typeof EMPTY_COPY) => <p className="wk-empty">{EMPTY_COPY[k].title}. {EMPTY_COPY[k].body}</p>;

  return (
    <DashboardLayout pageTitle="Memory">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
        <PageHeader title="Memory" subtitle="What Starlane knows, whether its follow-ups worked, and how each record got here.">
          <div style={{ marginTop: 20 }}>
            <Subnav label="Memory sections" items={TABS} active={tab} onChange={choose} />
          </div>
        </PageHeader>

        {tab === "knowledge" && <MemoryKnowledge />}
        {tab === "outcomes" && <MemoryOutcomes />}

        {auditTab && isLoading && <SkeletonRows rows={5} height={56} />}

        {auditTab && isError && (
          <ErrorState title="Couldn't load the change history" message={OFFLINE_LINE} onRetry={() => refetch()} />
        )}

        {ready && tab === "timeline" && (events.length === 0 ? empty("timeline") : <Timeline events={events} />)}
        {ready && tab === "decisions" && (decisions.length === 0 ? empty("decisions") : <Timeline events={decisions} />)}
        {ready && tab === "turning-points" && (turningPoints.length === 0 ? empty("turning-points") : <Timeline events={turningPoints} />)}

        {ready && tab === "replay" && (
          entities.length === 0 || replaySequence.length === 0 ? empty("replay") : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                <label htmlFor="replay-record" className="meta">
                  Record to replay <span className="num">{entities.length}</span>
                </label>
                <select
                  id="replay-record"
                  value={activeReplayEntity ?? ""}
                  onChange={(e) => setReplayEntity(e.target.value)}
                  className="ui-input"
                  style={{ width: "100%", maxWidth: 320 }}
                >
                  {entities.map((ent) => (
                    <option key={`${ent.entity_type}:${ent.entity_id}`} value={ent.entity_id}>
                      {entityLabel(ent.entity_type, ent.entity_id)} · {ent.count} {ent.count === 1 ? "change" : "changes"}
                    </option>
                  ))}
                </select>
              </div>
              <Timeline events={replaySequence} oldestFirst />
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

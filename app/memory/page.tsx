"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type AuditEvent } from "@/lib/api";
import { MemoryKnowledge, MemoryOutcomes } from "@/components/os/MemoryPanels";
import { PageHeader, Subnav, EmptyLine, SkeletonRows } from "@/components/v32/ui";
import { IconHistory } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate, formatDateTime } from "@/lib/format";
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

function reasonFor(e: AuditEvent): string {
  const parts: string[] = [];
  if (e.entity_type || e.entity_id) parts.push(entityLabel(e.entity_type, e.entity_id));
  else parts.push("No linked record");
  if (e.actor) parts.push(`by ${e.actor}`);
  return parts.join(" · ");
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

// One recorded change: date, a node on a hairline, what happened, which
// record and an outcome chip when the action string implies one.
function TimelineNode({ e, last }: { e: AuditEvent; last: boolean }) {
  const cls = classify(e.action);
  return (
    <li className="card-in memory-node" style={{ display: "grid", gridTemplateColumns: "64px 14px minmax(0, 1fr)", columnGap: 14 }}>
      <time dateTime={e.created_at} title={formatDateTime(e.created_at)} className="tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-3)", paddingTop: 2 }}>
        {formatDate(e.created_at)}
      </time>
      <span aria-hidden="true" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", marginTop: 6, background: "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--ink-3)", zIndex: 1 }} />
        {!last && <span style={{ position: "absolute", top: 16, bottom: -6, width: 1, background: "var(--line-strong)" }} />}
      </span>
      <div className="min-w-0" style={{ paddingBottom: 24 }}>
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 8 }}>
          <span style={{ fontSize: 14, color: "var(--ink)" }}>{e.title || humanize(e.action)}</span>
          {cls && <StatusChip tone={cls.tone}>{cls.outcome}</StatusChip>}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>{reasonFor(e)}</div>
      </div>
    </li>
  );
}

function Timeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: "8px 0 0" }}>
      {events.map((e, i) => <TimelineNode key={e.id} e={e} last={i === events.length - 1} />)}
    </ol>
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
  const turningPoints = useMemo(() => events.filter((e) => classify(e.action)), [events]);

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
  const empty = (k: keyof typeof EMPTY_COPY) => <EmptyLine icon={<IconHistory size={17} />} {...EMPTY_COPY[k]} />;

  return (
    <DashboardLayout pageTitle="Memory">
      <div style={{ width: "100%", maxWidth: "var(--content-max)", display: "flex", flexDirection: "column", gap: 24 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="replay-record" style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>
                  Record to replay <span className="tabular-nums">({entities.length})</span>
                </label>
                <select
                  id="replay-record"
                  value={activeReplayEntity ?? ""}
                  onChange={(e) => setReplayEntity(e.target.value)}
                  className="ui-input"
                  style={{ width: "100%", maxWidth: 360 }}
                >
                  {entities.map((ent) => (
                    <option key={`${ent.entity_type}:${ent.entity_id}`} value={ent.entity_id}>
                      {entityLabel(ent.entity_type, ent.entity_id)} · {ent.count} {ent.count === 1 ? "change" : "changes"}
                    </option>
                  ))}
                </select>
              </div>
              <Timeline events={replaySequence} />
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

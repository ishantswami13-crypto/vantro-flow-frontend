"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type AuditEvent } from "@/lib/api";
import { MemoryLearning } from "@/components/os/MemoryPanels";
import { TeachStarlanePanel } from "@/components/os/BridgePanels";
import { PageHeader, Subnav, EmptyLine } from "@/components/v32/ui";

// Memory — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16.
//
// Audit finding: §16 defines Memory as "an entity-scoped event timeline
// sourced from the real audit trail (date, title, reason, deterministic
// outcome classification), queryable via natural language." Unlike
// Simulate/Watch (capabilities with no reachable backend at all), the
// audit trail IS real and reachable: table audit_logs, written by
// lib/services/orchestrator/audit.service.js on every financial change,
// read via GET /api/audit (server.js ~5579, already live and already
// consumed by app/control/audit/page.tsx). api.audit.list() -> AuditEvent
// { id, action, entity_type, entity_id, old_value_json, new_value_json,
// created_at } is reused as-is here — no new endpoint, no new table.
//
// Checked directly against the real read-only Neon DB for this session's
// test user (4a8d8781-...) and for the audit_logs table as a whole
// (`select count(*) from audit_logs` via the backend's supabase client):
// the table currently has ZERO rows for any user. The write path and read
// path are both real and wired; there is simply no data in them yet in
// this environment. That makes every tab's *current* content an honest
// empty state — but a structurally different one from Simulate's, because
// the underlying capability is real and already reachable, not disconnected
// dead code. The moment audit_logs gets rows, this page renders them for
// real with no further backend work.
//
// Per-tab honesty:
// - Timeline: directly backed. A flat, chronological memory_event list
//   (date + humanized action, entity_type/entity_id as the "reason"
//   context) is exactly what audit_logs rows already are — same technique
//   as Control's audit page, just rendered as connected timeline nodes.
// - Decisions: a real subset filter (action names implying a decision —
//   approve/reject/status-change patterns) over the same real rows. No
//   fabrication, just a narrower slice of the same honest data.
// - Replay (the default tab per the handoff's subnav table — the one page
//   where default isn't the first tab): entity_id/entity_type give a real
//   per-entity ordering (rows for one entity_id, oldest-first, ARE a real
//   "how did we get here" sequence — old_value_json -> new_value_json is
//   real before/after state, not invented narrative). Requires picking an
//   entity, which this page does from the entities actually present in the
//   fetched audit rows — never a hardcoded demo entity.
// - Turning Points: a deterministic classifier over real fields only
//   (e.g. action containing "approve", "reject", "overdue", "risk",
//   "default", "write_off" — outcome and outcome_color derived from the
//   action string itself, never per-row invented commentary).
//
// No fabricated historical narrative, outcomes, or reasons — every string
// rendered below is either a literal field value or a static label
// attached deterministically to a field value.

type TabKey = "timeline" | "decisions" | "replay" | "turning-points" | "learning";

const TABS: { key: TabKey; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "decisions", label: "Decisions" },
  { key: "replay", label: "Replay" },
  { key: "turning-points", label: "Turning Points" },
  { key: "learning", label: "What Starlane learned" },
];

const DECISION_HINTS = ["approve", "reject", "decline", "status", "confirm", "cancel"];
const TURNING_POINT_RULES: { match: string; outcome: string; color: string }[] = [
  { match: "approve", outcome: "Approved", color: "#477054" },
  { match: "reject", outcome: "Rejected", color: "#A64F4B" },
  { match: "decline", outcome: "Declined", color: "#A64F4B" },
  { match: "overdue", outcome: "Went overdue", color: "#A64F4B" },
  { match: "risk", outcome: "Flagged at risk", color: "#A64F4B" },
  { match: "default", outcome: "Defaulted", color: "#A64F4B" },
  { match: "write_off", outcome: "Written off", color: "#A64F4B" },
  { match: "paid", outcome: "Paid", color: "#477054" },
  { match: "cancel", outcome: "Cancelled", color: "#8A8A86" },
];

function humanize(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function classify(action: string): { outcome: string; color: string } | null {
  const lower = action.toLowerCase();
  const rule = TURNING_POINT_RULES.find((r) => lower.includes(r.match));
  return rule ? { outcome: rule.outcome, color: rule.color } : null;
}

function reasonFor(e: AuditEvent): string {
  if (e.entity_type && e.entity_id) return `${e.entity_type} · ${String(e.entity_id).slice(0, 8)}…`;
  if (e.entity_type) return e.entity_type;
  return "No linked entity recorded";
}

const EMPTY_COPY: Record<Exclude<TabKey, "learning">, { title: string; body: string }> = {
  timeline: {
    title: "No audit events yet",
    body: "The timeline shows every change Starlane records for your account: approvals, status changes and edits. Nothing has been recorded yet. As soon as something changes, it appears here.",
  },
  decisions: {
    title: "No decisions recorded yet",
    body: "This tab shows the approvals, rejections and status changes from your timeline. None have been recorded yet.",
  },
  replay: {
    title: "No entity history to replay yet",
    body: "Replay shows how one customer or invoice got to where it is, step by step, from recorded changes. No record has a history yet.",
  },
  "turning-points": {
    title: "No turning points yet",
    body: "Turning points are the recorded moments that changed an outcome: an approval, a rejection, an invoice going overdue or getting paid. None have been recorded yet.",
  },
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-IN", sameYear ? { day: "numeric", month: "short" } : { month: "short", year: "numeric" });
}

// V32 memory_event: date column, a dot on a hairline, title, reason and an
// outlined outcome pill. The outcome comes only from the action string.
function TimelineNode({ e }: { e: AuditEvent }) {
  const cls = classify(e.action);
  return (
    <div className="card-in" style={{ display: "flex", gap: 16 }}>
      <div title={formatDate(e.created_at)} style={{ width: 70, flexShrink: 0, fontSize: 12, color: "#63635F", paddingTop: 2 }}>{shortDate(e.created_at)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <span style={{ width: 1, flex: 1, background: "rgba(25,25,23,0.12)", marginTop: 4 }} />
      </div>
      <div style={{ paddingBottom: 20, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: "#191917", marginBottom: 4 }}>{humanize(e.action)}</div>
        <div style={{ fontSize: 12.5, color: "#63635F", marginBottom: cls ? 6 : 0 }}>{reasonFor(e)}</div>
        {cls && (
          <span style={{ fontSize: 11, color: cls.color, border: `1px solid ${cls.color}`, borderRadius: 20, padding: "3px 9px", display: "inline-block" }}>
            {cls.outcome}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <EmptyLine title={title} body={body} />;
}

export default function MemoryPage() {
  // Replay is the default tab per the handoff's subnav table — the one
  // page where the default isn't the first tab.
  const [tab, setTab] = useState<TabKey>("replay");
  const [replayEntity, setReplayEntity] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; events: AuditEvent[] }>({
    queryKey: ["memory-audit"],
    queryFn: () => api.audit.list(undefined, 200),
    staleTime: 15_000,
  });

  const events = useMemo(() => data?.events ?? [], [data]);

  const decisions = useMemo(
    () => events.filter((e) => DECISION_HINTS.some((h) => e.action.toLowerCase().includes(h))),
    [events]
  );

  const turningPoints = useMemo(
    () => events.map((e) => ({ e, cls: classify(e.action) })).filter((x) => x.cls),
    [events]
  );

  // Entities present in the real data — never a hardcoded demo entity.
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

  return (
    <DashboardLayout pageTitle="Memory">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <PageHeader title="Memory" subtitle="How things reached their current state, from the changes Starlane recorded." />
        <Subnav items={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} />

        {tab === "learning" && (
          <>
            <MemoryLearning />
            <TeachStarlanePanel />
          </>
        )}

        {tab !== "learning" && isLoading && (
          <div className="fade-once v32-body" style={{ color: "#63635F", padding: "24px 0" }}>Loading audit trail…</div>
        )}

        {tab !== "learning" && isError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <EmptyPanel title="Couldn't load the audit trail" body="Check your connection and try again." />
            <button onClick={() => refetch()} className="hover-dim" style={{ fontSize: 12.5, color: "#63635F", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && tab === "timeline" && (
          events.length === 0 ? (
            <EmptyPanel {...EMPTY_COPY.timeline} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {events.map((e) => <TimelineNode key={e.id} e={e} />)}
            </div>
          )
        )}

        {!isLoading && !isError && tab === "decisions" && (
          decisions.length === 0 ? (
            <EmptyPanel {...EMPTY_COPY.decisions} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {decisions.map((e) => <TimelineNode key={e.id} e={e} />)}
            </div>
          )
        )}

        {!isLoading && !isError && tab === "replay" && entities.length > 0 && replaySequence.length > 0 && (
          <div style={{ fontSize: 11, letterSpacing: "1px", color: "#63635F", textTransform: "uppercase" }}>
            Replay · {entities.find((x) => x.entity_id === activeReplayEntity)?.entity_type || "record"}
          </div>
        )}

        {!isLoading && !isError && tab === "replay" && (
          entities.length === 0 || replaySequence.length === 0 ? (
            <EmptyPanel {...EMPTY_COPY.replay} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {entities.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {entities.map((ent) => (
                    <button
                      key={ent.entity_id}
                      onClick={() => setReplayEntity(ent.entity_id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: `1px solid ${ent.entity_id === activeReplayEntity ? "var(--accent)" : "rgba(25,25,23,0.14)"}`,
                        background: "transparent",
                        color: ent.entity_id === activeReplayEntity ? "#191917" : "#63635F",
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      {ent.entity_type} · {ent.entity_id.slice(0, 8)}…
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {replaySequence.map((e) => <TimelineNode key={e.id} e={e} />)}
              </div>
            </div>
          )
        )}

        {!isLoading && !isError && tab === "turning-points" && (
          turningPoints.length === 0 ? (
            <EmptyPanel {...EMPTY_COPY["turning-points"]} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {turningPoints.map(({ e }) => <TimelineNode key={e.id} e={e} />)}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

// The organization's audit trail (admins) or its activity feed (everyone),
// newest first, from platform_audit_events. Older pages load on request.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyLine } from "@/components/v32/ui";
import { platformApi, type AuditEvent } from "@/lib/platform";
import { useWorkspace, PlatformErrorBanner, Loading } from "@/components/platform/ui";

// Plain-language names for the common actions; anything else is shown as
// written, in sentence case, so nothing is hidden or renamed beyond wording.
const ACTION_LABEL: Record<string, string> = {
  "execution.requested": "Run started",
  "execution.failed": "Run failed",
  "execution.completed": "Run completed",
  "execution.cancelled": "Run cancelled",
  "approval.approved": "Approval granted",
  "approval.rejected": "Approval refused",
  "approval.requested": "Approval requested",
  "agent.created": "Agent created",
  "agent.updated": "Agent changed",
  "agent.published": "Agent version published",
  "agent.enabled": "Agent turned on",
  "agent.disabled": "Agent turned off",
  "agent.archived": "Agent archived",
  "knowledge.collection.created": "Knowledge collection created",
  "knowledge.collection.deleted": "Knowledge collection deleted",
  "knowledge.document.added": "Document added to knowledge",
  "knowledge.document.deleted": "Document removed from knowledge",
  "member.added": "Member added",
  "member.removed": "Member removed",
  "member.role_changed": "Member's role changed",
  "invitation.created": "Invitation sent",
  "invitation.revoked": "Invitation revoked",
  "invitation.accepted": "Invitation accepted",
  "policy.updated": "Agent policies changed",
};
function actionLabel(action: string): string {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  const t = action.replace(/[._]/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export default function AuditList({ kind }: { kind: "audit" | "activity" }) {
  const ws = useWorkspace();
  const [pages, setPages] = useState<AuditEvent[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["platform", kind, ws.data?.organization.id, cursor], queryFn: () => (kind === "audit" ? platformApi.audit(cursor) : platformApi.activity(cursor)) });
  useEffect(() => { if (q.data) setPages((p) => (cursor ? [...p, q.data!.events] : [q.data!.events])); }, [q.data, cursor]);
  const events = pages.flat().filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i);
  if (q.isLoading && !events.length) return <Loading rows={5} height={44} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what={kind === "audit" ? "The audit log" : "Activity"} />;
  if (!events.length) return <EmptyLine title="Nothing recorded yet" />;
  return (
    <div className="pf-stack" style={{ maxWidth: 900 }}>
      {Object.entries(events.reduce<Record<string, AuditEvent[]>>((acc, e) => { const k = dayLabel(e.created_at); (acc[k] = acc[k] || []).push(e); return acc; }, {})).map(([day, list]) => (
        <section key={day}>
          <div className="ws-band-title">{day}</div>
          <ol className="ws-feed">
            {list.map((e) => {
              const who = e.actor_email || (e.actor_kind === "user" ? "A former member" : e.actor_kind === "system" ? "Starlane" : e.actor_kind);
              return (
                <li key={e.id} className="ws-feed-item">
                  <span className={`ws-feed-dot ${/failed|rejected|revoked|deleted|removed/.test(e.action) ? "is-bad" : ""}`} aria-hidden />
                  <div className="min-w-0" style={{ flex: 1 }}>
                    <div className="ws-feed-t">{actionLabel(e.action)}{e.detail && typeof e.detail.name === "string" ? <span className="ws-feed-n"> · {e.detail.name}</span> : ""}</div>
                    <div className="ws-feed-s">{who} · {e.resource_type}{e.resource_id ? ` ${e.resource_id.slice(0, 8)}` : ""}</div>
                  </div>
                  <time className="ws-feed-w" dateTime={e.created_at}>{new Date(e.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {q.data?.nextCursor && <div><Button small disabled={q.isFetching} onClick={() => setCursor(q.data!.nextCursor)}>Show older</Button></div>}
    </div>
  );
}

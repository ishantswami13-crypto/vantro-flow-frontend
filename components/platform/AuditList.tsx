"use client";

// The organization's audit trail (admins) or its activity feed (everyone),
// newest first, from platform_audit_events. Older pages load on request.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyLine } from "@/components/v32/ui";
import { platformApi, type AuditEvent } from "@/lib/platform";
import { useWorkspace, PlatformErrorBanner, Loading, when } from "@/components/platform/ui";

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
      <div className="pf-list">
        {events.map((e) => (
          <div key={e.id} className="pf-row" style={{ alignItems: "flex-start" }}>
            <div className="pf-row-main">
              <div className="pf-row-title">{e.action.replace(/[._]/g, " ")}{e.detail && typeof e.detail.name === "string" ? `: ${e.detail.name}` : ""}</div>
              <div className="pf-row-sub">{e.actor_email || (e.actor_kind === "user" ? "A former member" : e.actor_kind)} · {e.resource_type}{e.resource_id ? ` ${e.resource_id.slice(0, 8)}` : ""} · {when(e.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
      {q.data?.nextCursor && <div><Button small disabled={q.isFetching} onClick={() => setCursor(q.data!.nextCursor)}>Show older</Button></div>}
    </div>
  );
}

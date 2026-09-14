"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, type AuditEvent } from "@/lib/api";

// A real, chronological, per-user audit trail — sourced from audit_logs, a
// table that already existed and was already being written to on every
// financial change (see audit.service.js on the backend), but had no read
// path anywhere in the product until this page. Nothing here is invented:
// no severity coloring, no synthetic categorization beyond what the raw
// action/entity_type fields already say.
function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase());
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function EventRow({ event }: { event: AuditEvent }) {
  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{humanizeAction(event.action)}</p>
          {event.entity_type && (
            <p className="text-2xs text-muted mt-0.5 font-mono">
              {event.entity_type}{event.entity_id ? ` · ${event.entity_id.slice(0, 8)}…` : ""}
            </p>
          )}
        </div>
        <span className="text-2xs text-muted shrink-0">{formatWhen(event.created_at)}</span>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; events: AuditEvent[] }>({
    queryKey: ["control-audit"],
    queryFn: () => api.audit.list(),
    staleTime: 15_000,
  });

  return (
    <DashboardLayout pageTitle="Audit">
      <Link href="/control" className="text-2xs text-muted hover:text-primary mb-3 inline-block">← Control</Link>
      <PageHeader
        title="Audit"
        subtitle="A chronological record of financial changes Starlane has made or observed for this account."
      />

      {isLoading && <LoadingState label="Loading audit trail" rows={4} />}

      {isError && (
        <ErrorState title="Couldn't load the audit trail" message="Check your connection and try again." onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && (data?.events.length ?? 0) === 0 && (
        <EmptyState
          title="No audit events yet"
          message="Financial changes Starlane records will appear here as they happen."
        />
      )}

      {!isLoading && !isError && (data?.events.length ?? 0) > 0 && (
        <div className="border-t border-border">
          {data!.events.map(e => <EventRow key={e.id} event={e} />)}
        </div>
      )}
    </DashboardLayout>
  );
}

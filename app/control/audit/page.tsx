"use client";

import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { api, type AuditEvent } from "@/lib/api";
import { HistoryTable } from "@/components/hv/Pieces";
import { auditRows, AUDIT_COLUMNS, AUDIT_TEMPLATE } from "@/components/control/AuditHistory";

// A real, chronological, per-user audit trail from audit_logs and
// decision_events. Nothing here is invented. Shown as a history table
// (components/control/AuditHistory.tsx).
export default function AuditPage() {
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; events: AuditEvent[] }>({
    queryKey: ["control-audit"],
    queryFn: () => api.audit.list(),
    staleTime: 15_000,
  });

  return (
    <DashboardLayout pageTitle="Audit">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "#63635F" }}>
            A chronological record of every decision step and financial change: who acted, through which agent, and what happened.
          </p>
        </div>

        <ControlSubnav active="audit" />

        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {isLoading && <LoadingState label="Loading audit trail" rows={4} />}

          {isError && (
            <ErrorState title="Couldn't load the audit trail" message="Check your connection and try again." onRetry={() => refetch()} />
          )}

          {!isLoading && !isError && (data?.events.length ?? 0) === 0 && (
            <EmptyState
              title="No audit events yet"
              message="Decision steps and financial changes will appear here as they happen."
            />
          )}

          {!isLoading && !isError && (data?.events.length ?? 0) > 0 && (
            <HistoryTable title="History" columns={AUDIT_COLUMNS} template={AUDIT_TEMPLATE} rows={auditRows(data!.events)} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

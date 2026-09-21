"use client";

import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { api, type AuditEvent } from "@/lib/api";

// A real, chronological, per-user audit trail — sourced from audit_logs, a
// table that already existed and was already being written to on every
// financial change (see audit.service.js on the backend), but had no read
// path anywhere in the product until this page. Nothing here is invented:
// no severity coloring, no synthetic categorization beyond what the raw
// action/entity_type fields already say.
//
// Column layout per STARLANE_FRONTEND_HANDOFF.md §17 (audit_row):
// grid-template-columns: 90px 150px 2fr 140px 160px 1fr = Time/Actor/
// Action/Object/Source/Result. The backend has no separate actor/source/
// result columns yet (audit_logs has action/entity_type/entity_id/
// old_value_json/new_value_json/created_at only) — those cells render an
// honest "—" rather than fabricated values.
function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase());
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const GRID_COLS = "90px 150px 2fr 140px 160px 1fr";

function AuditHeaderRow() {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: GRID_COLS, gap: 12, padding: "10px 4px",
        borderBottom: "1px solid #EBEAE6", fontSize: 11, fontWeight: 600, color: "#8A8A86",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}
    >
      <span>Time</span>
      <span>Actor</span>
      <span>Action</span>
      <span>Object</span>
      <span>Source</span>
      <span>Result</span>
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <div
      className="row-hover"
      style={{
        display: "grid", gridTemplateColumns: GRID_COLS, gap: 12, padding: "12px 4px",
        borderBottom: "1px solid #EBEAE6", alignItems: "start",
      }}
    >
      <span className="text-2xs" style={{ color: "#8A8A86" }}>{formatTime(event.created_at)}</span>
      <span className="text-2xs" style={{ color: "#8A8A86" }}>—</span>
      <span className="text-sm font-medium" style={{ color: "#171717" }}>{humanizeAction(event.action)}</span>
      <span className="text-2xs font-mono" style={{ color: "#8A8A86" }}>
        {event.entity_type ? `${event.entity_type}${event.entity_id ? ` · ${event.entity_id.slice(0, 8)}…` : ""}` : "—"}
      </span>
      <span className="text-2xs" style={{ color: "#8A8A86" }}>—</span>
      <span className="text-2xs" style={{ color: "#8A8A86" }}>—</span>
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
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "#63635F" }}>
            A chronological record of financial changes Starlane has made or observed for this account.
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
              message="Financial changes Starlane records will appear here as they happen."
            />
          )}

          {!isLoading && !isError && (data?.events.length ?? 0) > 0 && (
            <div>
              <AuditHeaderRow />
              {data!.events.map(e => <AuditRow key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

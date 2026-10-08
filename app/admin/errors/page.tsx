"use client";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Figure, SkeletonRows } from "@/components/v32/ui";
import { StatusChip, toneForStatus } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { request } from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";

// Error intelligence for admins: today's counts (GET /api/admin/error-summary)
// and the latest error events (GET /api/admin/error-events), each resolvable.

interface ErrorEvent {
  id: string;
  error_id: string;
  type: string;
  severity: string;
  route: string;
  created_at: string;
  resolved_at: string | null;
}

interface ErrorSummary {
  totalErrors: number | null;
  criticalErrors: number | null;
}

const OFFLINE = "Couldn't reach Starlane. Check your connection and try again.";

export default function AdminErrorsDashboard() {
  const notify = useToast();
  const [events, setEvents] = useState<ErrorEvent[] | null>(null);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false); setEvents(null);
    request<{ summary: ErrorSummary }>("/api/admin/error-summary")
      .then(res => setSummary(res.summary)).catch(() => setSummary(null));
    request<{ data: ErrorEvent[] }>("/api/admin/error-events")
      .then(res => setEvents(res.data || [])).catch(() => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string) => {
    setResolving(id);
    try {
      await request(`/api/admin/error-events/${id}/resolve`, { method: "PATCH" });
      setEvents(prev => (prev || []).map(e => e.id === id ? { ...e, resolved_at: new Date().toISOString() } : e));
    } catch {
      notify(`That error wasn't marked resolved. ${OFFLINE}`, "critical");
    } finally { setResolving(null); }
  };

  const fig = (n: number | null | undefined) => (n == null ? "—" : formatCount(n));

  return (
    <DashboardLayout pageTitle="Errors">
      <style>{`
        .err-row { display: grid; align-items: center; gap: 4px 16px; padding: 9px 0; min-height: 42px;
          grid-template-columns: minmax(0, 1fr) auto; font-size: 13px; }
        .err-head { display: none; }
        .err-desk { display: none; }
        @media (min-width: 900px) {
          .err-row { grid-template-columns: 110px minmax(0, 1fr) 96px minmax(0, 1fr) 132px 92px; }
          .err-head { display: grid; min-height: 0; padding-top: 0; padding-bottom: 8px; font-size: 11px; }
          .err-desk { display: block; }
          .err-mob { display: none !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 32 }}>
        <PageHeader title="Errors" subtitle="The latest errors in production, newest first." />

        <div className="ops-figures" style={{ ["--n" as string]: 4 } as React.CSSProperties}>
          <Figure value={fig(summary?.totalErrors)} label="Errors today" />
          <Figure value={fig(summary?.criticalErrors)} label="Critical today" tone={summary?.criticalErrors ? "var(--critical)" : undefined} />
        </div>

        <div>
          {failed && <ErrorState title="Couldn't load error events" message={OFFLINE} onRetry={load} />}
          {!failed && events === null && <SkeletonRows rows={5} />}
          {events && events.length === 0 && <p className="ops-list" style={{ margin: 0, padding: "12px 0", fontSize: 13, color: "var(--ink-2)", borderBottom: "1px solid var(--line)" }}>No errors recorded. Errors captured in production appear here.</p>}
          {events && events.length > 0 && (
            <div>
              <div className="err-row err-head ops-head" aria-hidden="true"><span>Error</span><span>Type</span><span>Severity</span><span>Route</span><span>Time</span><span /></div>
              {events.map(evt => (
                <div key={evt.id} className="err-row ops-row" style={{ opacity: evt.resolved_at ? 0.6 : 1 }}>
                  <span className="min-w-0">
                    <span className="block truncate num" style={{ color: "var(--ink-2)", fontSize: 12 }}>{evt.error_id}</span>
                    <span className="err-mob block truncate" style={{ fontSize: 12, color: "var(--ink-3)" }}>{evt.type} · {evt.route} · {formatDateTime(evt.created_at)}</span>
                  </span>
                  <span className="err-desk min-w-0 truncate" style={{ color: "var(--ink)" }}>{evt.type}</span>
                  <span className="err-desk"><StatusChip tone={toneForStatus(evt.severity)}>{evt.severity.replace(/^./, c => c.toUpperCase())}</StatusChip></span>
                  <span className="err-desk truncate num" style={{ color: "var(--ink-2)", fontSize: 12 }} title={evt.route}>{evt.route}</span>
                  <span className="err-desk tabular-nums" style={{ color: "var(--ink-2)", fontSize: 12.5 }}>{formatDateTime(evt.created_at)}</span>
                  <span style={{ textAlign: "right" }}>
                    {evt.resolved_at
                      ? <StatusChip tone="positive">Resolved</StatusChip>
                      : <Button variant="ghost" size="sm" loading={resolving === evt.id} onClick={() => resolve(evt.id)}>Resolve</Button>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

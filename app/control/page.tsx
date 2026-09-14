"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, type CortexHealthResponse, type DataConnection } from "@/lib/api";

// Control — what Starlane can see, what it's doing, and whether it's
// right. Deliberately built from ONLY two real endpoints that already
// exist (api.connections.list, api.cortexHealth). No "Understanding"
// layer (entity/relationship coverage) is shown, because no backend
// data backs it yet — omitted rather than faked with a placeholder.
const MIN_EVALUATED_FOR_RATE = 3;

function timeSince(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ConnectionSection({ connections }: { connections: DataConnection[] }) {
  if (connections.length === 0) {
    return (
      <EmptyState
        title="No sources connected yet"
        message="Connect a business system so Starlane can reason from real, current data."
      />
    );
  }
  return (
    <div className="divide-y divide-border border-t border-border">
      {connections.map(c => (
        <div key={c.id} className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-primary">{c.source_type}</p>
            {c.last_sync_error && <p className="text-2xs text-danger mt-0.5">{c.last_sync_error}</p>}
          </div>
          <div className="text-right">
            <p className={["text-xs font-medium", c.status === "connected" ? "text-success" : "text-muted"].join(" ")}>
              {c.status === "connected" ? "Connected" : "Not connected"}
            </p>
            <p className="text-2xs text-muted mt-0.5">Last synced {timeSince(c.last_sync_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function IntelligenceSection({ stats }: { stats: CortexHealthResponse["stats"] }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 divide-x divide-border">
      <div>
        <p className="metric-value text-xl text-primary">{stats.pending_actions}</p>
        <p className="text-2xs text-muted mt-0.5">Pending actions</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-danger">{stats.pending_by_priority.urgent}</p>
        <p className="text-2xs text-muted mt-0.5">Urgent</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-warning">{stats.pending_by_priority.high}</p>
        <p className="text-2xs text-muted mt-0.5">High priority</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-primary">{stats.active_plans}</p>
        <p className="text-2xs text-muted mt-0.5">Active plans</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-primary">{stats.memory_entries}</p>
        <p className="text-2xs text-muted mt-0.5">Memory entries</p>
      </div>
    </div>
  );
}

function OutcomesSection({ stats }: { stats: CortexHealthResponse["stats"] }) {
  const enough = stats.evaluated_actions >= MIN_EVALUATED_FOR_RATE;
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-4 divide-x divide-border">
      <div>
        <p className="metric-value text-xl text-primary">{stats.evaluated_actions}</p>
        <p className="text-2xs text-muted mt-0.5">Actions evaluated</p>
      </div>
      <div className="pl-8">
        {enough && stats.effectiveness_rate !== null ? (
          <p className={["metric-value text-xl", stats.effectiveness_rate >= 60 ? "text-success" : stats.effectiveness_rate >= 40 ? "text-warning" : "text-danger"].join(" ")}>
            {stats.effectiveness_rate}%
          </p>
        ) : (
          <p className="text-xl text-muted">—</p>
        )}
        <p className="text-2xs text-muted mt-0.5">{enough ? "Effectiveness rate" : "Not enough data yet"}</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-success">{stats.effective_count}</p>
        <p className="text-2xs text-muted mt-0.5">Verified effective</p>
      </div>
      <div className="pl-8">
        <p className="metric-value text-xl text-danger">{stats.ineffective_count}</p>
        <p className="text-2xs text-muted mt-0.5">Verified ineffective</p>
      </div>
    </div>
  );
}

export default function ControlPage() {
  const health = useQuery<CortexHealthResponse>({
    queryKey: ["control-cortex-health"],
    queryFn: () => api.cortexHealth(),
    staleTime: 25_000,
  });
  const connections = useQuery<{ success: boolean; connections: DataConnection[] }>({
    queryKey: ["control-connections"],
    queryFn: () => api.connections.list(),
    staleTime: 25_000,
  });

  const isLoading = health.isLoading || connections.isLoading;
  const isError = health.isError || connections.isError;

  return (
    <DashboardLayout pageTitle="Control">
      <PageHeader
        title="Control"
        subtitle="What Starlane can see, what it's doing, and whether it's right."
        actions={<Link href="/control/audit" className="text-2xs text-secondary hover:text-primary transition-colors">Audit →</Link>}
      />

      {isLoading && <LoadingState label="Loading operating health" rows={3} />}

      {isError && (
        <ErrorState
          title="Couldn't load operating health"
          message="Check your connection and try again."
          onRetry={() => { health.refetch(); connections.refetch(); }}
        />
      )}

      {!isLoading && !isError && (
        <div className="space-y-8">
          <div>
            <p className="section-label mb-3">Connection</p>
            <ConnectionSection connections={connections.data?.connections || []} />
          </div>

          {health.data?.stats && (
            <div className="border-t border-border pt-6">
              <p className="section-label mb-3">Intelligence</p>
              <IntelligenceSection stats={health.data.stats} />
            </div>
          )}

          {health.data?.stats && (
            <div className="border-t border-border pt-6">
              <p className="section-label mb-3">Outcomes</p>
              <OutcomesSection stats={health.data.stats} />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

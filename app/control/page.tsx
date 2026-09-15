"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
    <div>
      {connections.map(c => (
        <div key={c.id} className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid #E5E5E1" }}>
          <div>
            <p className="text-[14px] font-medium" style={{ color: "#171717" }}>{c.source_type}</p>
            {c.last_sync_error && <p className="text-[12px] mt-0.5" style={{ color: "#C13B3B" }}>{c.last_sync_error}</p>}
          </div>
          <div className="text-right">
            <p className="text-[13px]" style={{ color: c.status === "connected" ? "#171717" : "#8A8A86" }}>
              {c.status === "connected" ? "Connected" : "Not connected"}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#8A8A86" }}>Last synced {timeSince(c.last_sync_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Plain sans, tabular-nums — numbers carry hierarchy through size/weight,
// not monospace (monospace is reserved for genuinely technical values).
function Stat({ value, label, tone }: { value: React.ReactNode; label: string; tone?: "danger" | "warning" | "success" }) {
  const color = tone === "danger" ? "#C13B3B" : tone === "warning" ? "#B8860B" : tone === "success" ? "#1A8F5C" : "#171717";
  return (
    <div>
      <p className="text-[22px] leading-none" style={{ color, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      <p className="text-[12px] mt-1.5" style={{ color: "#8A8A86" }}>{label}</p>
    </div>
  );
}

function IntelligenceSection({ stats }: { stats: CortexHealthResponse["stats"] }) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      <Stat value={stats.pending_actions} label="Pending actions" />
      <Stat value={stats.pending_by_priority.urgent} label="Urgent" tone="danger" />
      <Stat value={stats.pending_by_priority.high} label="High priority" tone="warning" />
      <Stat value={stats.active_plans} label="Active plans" />
      <Stat value={stats.memory_entries} label="Memory entries" />
    </div>
  );
}

function OutcomesSection({ stats }: { stats: CortexHealthResponse["stats"] }) {
  const enough = stats.evaluated_actions >= MIN_EVALUATED_FOR_RATE;
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-5">
      <Stat value={stats.evaluated_actions} label="Actions evaluated" />
      <Stat
        value={enough && stats.effectiveness_rate !== null ? `${stats.effectiveness_rate}%` : "—"}
        label={enough ? "Effectiveness rate" : "Not enough data yet"}
        tone={enough && stats.effectiveness_rate !== null ? (stats.effectiveness_rate >= 60 ? "success" : stats.effectiveness_rate >= 40 ? "warning" : "danger") : undefined}
      />
      <Stat value={stats.effective_count} label="Verified effective" tone="success" />
      <Stat value={stats.ineffective_count} label="Verified ineffective" tone="danger" />
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
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
        <div className="flex items-start justify-between gap-4 mb-9">
          <div>
            <h1 className="text-[28px] lg:text-[32px] leading-[1.15] mb-2" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>
              Control
            </h1>
            <p className="text-[14px] max-w-[700px]" style={{ color: "#686868" }}>
              What Starlane can see, what it's doing, and whether it's right.
            </p>
          </div>
          <Link href="/control/audit" className="text-[13px] font-medium shrink-0 mt-1" style={{ color: "#171717" }}>
            Audit →
          </Link>
        </div>

        {isLoading && <LoadingState label="Loading operating health" rows={3} />}

        {isError && (
          <ErrorState
            title="Couldn't load operating health"
            message="Check your connection and try again."
            onRetry={() => { health.refetch(); connections.refetch(); }}
          />
        )}

        {!isLoading && !isError && (
          <div className="space-y-10">
            <div>
              <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Connection</p>
              <ConnectionSection connections={connections.data?.connections || []} />
            </div>

            {health.data?.stats && (
              <div className="pt-8" style={{ borderTop: "1px solid #E5E5E1" }}>
                <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Intelligence</p>
                <IntelligenceSection stats={health.data.stats} />
              </div>
            )}

            {health.data?.stats && (
              <div className="pt-8" style={{ borderTop: "1px solid #E5E5E1" }}>
                <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Outcomes</p>
                <OutcomesSection stats={health.data.stats} />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ControlSubnav, type ControlTab } from "@/components/control/ControlSubnav";
import { api, type CortexHealthResponse, type DataConnection, type UserSettings } from "@/lib/api";

// Control — what Starlane can see, what it's doing, and whether it's
// right. Overview is built from ONLY two real endpoints that already
// exist (api.connections.list, api.cortexHealth). No "Understanding"
// layer (entity/relationship coverage) is shown, because no backend
// data backs it yet — omitted rather than faked with a placeholder.
//
// Users & Roles: today every business has exactly one owner (no
// team/invite backend exists — confirmed: no team-members endpoint,
// no roles table). The real owner row comes from api.settings.get().
// The "no other users" copy below is STARLANE_FRONTEND_HANDOFF.md §8's
// exact designed copy, not a fabricated feature.
//
// Permissions: the Observe/Prepare/Propose/Execute table is the
// org-wide FIXED product policy per §13/§488 — L1-L3 always granted,
// L4 Execute always requires human approval. This is a genuine,
// permanent product rule (not per-org configurable — no override
// mechanism exists in the backend), so hardcoding it is honest
// content, not fabricated data.
//
// Automation / Monitoring / Security: §8 explicitly flags these tabs
// have NO designed content anywhere in the source. New, honest,
// tone-matched empty-state copy is written below rather than assumed.
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>{children}</p>;
}

function OverviewTab() {
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

  if (isLoading) return <LoadingState label="Loading operating health" rows={3} />;
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load operating health"
        message="Check your connection and try again."
        onRetry={() => { health.refetch(); connections.refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <SectionLabel>Connection</SectionLabel>
        <ConnectionSection connections={connections.data?.connections || []} />
      </div>

      {health.data?.stats && (
        <div className="pt-8" style={{ borderTop: "1px solid #E5E5E1" }}>
          <SectionLabel>Intelligence</SectionLabel>
          <IntelligenceSection stats={health.data.stats} />
        </div>
      )}

      {health.data?.stats && (
        <div className="pt-8" style={{ borderTop: "1px solid #E5E5E1" }}>
          <SectionLabel>Outcomes</SectionLabel>
          <OutcomesSection stats={health.data.stats} />
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const { data, isLoading, isError, refetch } = useQuery<{ settings: UserSettings }>({
    queryKey: ["control-users-settings"],
    queryFn: () => api.settings.get(),
    staleTime: 25_000,
  });

  if (isLoading) return <LoadingState label="Loading users" rows={2} />;
  if (isError) return <ErrorState title="Couldn't load users" message="Check your connection and try again." onRetry={() => refetch()} />;

  const u = data?.settings;

  return (
    <div className="space-y-8">
      <div>
        <SectionLabel>Owner</SectionLabel>
        <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid #E5E5E1" }}>
          <div>
            <p className="text-[14px] font-medium" style={{ color: "#171717" }}>{u?.business_name || "Owner"}</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#8A8A86" }}>{u?.email}</p>
          </div>
          <p className="text-[13px]" style={{ color: "#171717" }}>Owner · full access</p>
        </div>
      </div>
      <div>
        <SectionLabel>Team</SectionLabel>
        <EmptyState
          title="No other users have been added yet"
          message="Invited teammates will appear here with their own role and Agent permissions."
        />
      </div>
    </div>
  );
}

// §13/§488 — org-wide fixed policy, identical for every business, no
// per-org override exists in the backend. L4 Execute always requires
// approval: the core trust mechanism of the product.
const POLICY_LEVELS: { level: string; name: string; description: string; granted: boolean }[] = [
  { level: "L1", name: "Observe", description: "Read business data and surface findings.", granted: true },
  { level: "L2", name: "Prepare", description: "Draft actions and recommendations for review.", granted: true },
  { level: "L3", name: "Propose", description: "Put a specific action in front of you to decide on.", granted: true },
  { level: "L4", name: "Execute", description: "Carry out an action that changes business data.", granted: false },
];

function PermissionsTab() {
  return (
    <div className="space-y-4">
      <SectionLabel>Organization-wide policy</SectionLabel>
      <p className="text-[13px] mb-4" style={{ color: "#63635F", maxWidth: 640 }}>
        This governs every agent in Starlane. It applies the same way to all agents and cannot be changed per agent.
      </p>
      <div style={{ border: "1px solid #EBEAE6", borderRadius: 8, overflow: "hidden" }}>
        {POLICY_LEVELS.map((p, i) => (
          <div
            key={p.level}
            className="row-hover flex items-center justify-between"
            style={{ padding: "14px 16px", borderBottom: i < POLICY_LEVELS.length - 1 ? "1px solid #EBEAE6" : "none" }}
          >
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontSize: 11, fontWeight: 600, color: "#63635F", background: "#F3F2EE",
                  border: "1px solid #EBEAE6", borderRadius: 4, padding: "2px 6px",
                }}
              >
                {p.level}
              </span>
              <div>
                <p className="text-[14px] font-medium" style={{ color: "#171717" }}>{p.name}</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#8A8A86" }}>{p.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: p.granted ? "#1A8F5C" : "#8A8A86",
                  display: "inline-block",
                }}
              />
              <span className="text-[13px]" style={{ color: p.granted ? "#171717" : "#8A8A86" }}>
                {p.granted ? "Allowed" : "Requires approval every time"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, body }: { title: string; body: string }) {
  return <EmptyState title={title} message={body} />;
}

function ControlPageInner() {
  const params = useSearchParams();
  const tabParam = (params.get("tab") || "overview") as ControlTab;
  const validInPageTabs: ControlTab[] = ["overview", "users", "permissions", "automation", "monitoring", "security"];
  const tab: ControlTab = validInPageTabs.includes(tabParam) ? tabParam : "overview";

  return (
    <DashboardLayout pageTitle="Control">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1
            style={{
              margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26,
              color: "#191917",
            }}
          >
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "#63635F" }}>
            What Starlane can see, what it&apos;s doing, and whether it&apos;s right.
          </p>
        </div>

        <ControlSubnav active={tab} />

        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "8px 2px 24px" }}>
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "permissions" && <PermissionsTab />}
          {tab === "automation" && (
            <PlaceholderTab
              title="No automations configured yet"
              body="When Starlane can run a task on a schedule or trigger, on your behalf, that setup will live here."
            />
          )}
          {tab === "monitoring" && (
            <PlaceholderTab
              title="Nothing to monitor yet"
              body="Once Starlane is watching a live process end-to-end, its running status and alerts will appear here."
            />
          )}
          {tab === "security" && (
            <PlaceholderTab
              title="No security settings to show yet"
              body="Session, access, and data-handling controls will appear here as they become configurable."
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ControlPage() {
  return (
    <Suspense fallback={null}>
      <ControlPageInner />
    </Suspense>
  );
}

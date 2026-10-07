"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader, StatusDot, Sep, Lettermark, EmptyLine, Button } from "@/components/v32/ui";
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
// Automation: automations are the workflows deployed from Prepared; their
// runs live on Missions and their stop switches on Control > Decisions, so
// this tab points there instead of keeping a second, empty copy.
// Monitoring and Security had no backend behind them and were removed from
// the subnav; old links to them fall back to Overview.
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
      <EmptyLine title="No sources connected yet." body="Connect a business system so Starlane can reason from real, current data." action={<Button small href="/sources">Open Sources</Button>} />
    );
  }
  return (
    <div>
      {connections.map(c => (
        <div key={c.id} className="flex items-center justify-between" style={{ gap: 14, padding: "12px 10px", borderBottom: "1px solid var(--line)" }}>
          <div className="min-w-0">
            <div style={{ fontSize: 13, color: "var(--ink)" }}>{c.source_type.charAt(0) + c.source_type.slice(1).toLowerCase()}</div>
            {c.last_sync_error && <div style={{ fontSize: 12, color: "var(--critical)", marginTop: 2 }}>{c.last_sync_error}</div>}
          </div>
          <div className="flex items-center shrink-0" style={{ gap: 16 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--body)" }}>{timeSince(c.last_sync_at)}</span>
            <StatusDot label={String(c.status).toUpperCase() === "CONNECTED" ? "Connected" : "Not connected"} color={String(c.status).toUpperCase() === "CONNECTED" ? "var(--positive)" : "rgb(var(--tk-ink) / 0.25)"} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Plain sans, tabular-nums — numbers carry hierarchy through size/weight,
// not monospace (monospace is reserved for genuinely technical values).
function Stat({ value, label, tone }: { value: React.ReactNode; label: string; tone?: "danger" | "warning" | "success" }) {
  // Tone only when there is something to report: a coloured zero is noise.
  const empty = value === 0 || value === null || value === undefined || value === "—";
  const color = empty ? "var(--ink)" : tone === "danger" ? "var(--critical)" : tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--positive)" : "var(--ink)";
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 22, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function IntelligenceSection({ stats }: { stats: CortexHealthResponse["stats"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
  return <div style={{ fontSize: 11, letterSpacing: 0, color: "var(--ink-2)", marginBottom: 8 }}>{children}</div>;
}

function PolicyRows() {
  return (
    <div>
      {POLICY_LEVELS.map((p) => (
        <div key={p.level} className="flex items-start flex-wrap md:flex-nowrap" style={{ gap: 14, padding: "12px 10px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ink-3)", width: 20, paddingTop: 1, flexShrink: 0 }}>{p.level}</span>
          <div style={{ width: 110, flexShrink: 0, fontSize: 13, color: "var(--ink)" }}>{p.name}</div>
          <div style={{ flex: 1, minWidth: 180, fontSize: 12.5, color: "var(--ink-2)" }}>{p.description}</div>
          <div style={{ width: 210, flexShrink: 0 }}>
            <StatusDot label={p.granted ? "Allowed" : "Requires approval every time"} color={p.granted ? "var(--positive)" : "var(--warning)"} />
          </div>
        </div>
      ))}
    </div>
  );
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

  const conns = connections.data?.connections || [];
  const connectedN = conns.filter((c) => String(c.status).toUpperCase() === "CONNECTED").length;
  const pending = health.data?.stats?.pending_actions ?? 0;

  return (
    <div className="flex flex-col" style={{ gap: 26 }}>
      <div className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 13, color: "var(--body)" }}>
        <span>1 user</span><Sep />
        <span>{connectedN} connected source{connectedN === 1 ? "" : "s"}</span><Sep />
        <span style={{ color: pending > 0 ? "var(--warning)" : undefined }}>
          {pending} pending approval{pending === 1 ? "" : "s"}
        </span>
      </div>

      <div>
        <SectionLabel>What Starlane is allowed to do</SectionLabel>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 10 }}>The same four levels used on every agent.</div>
        <PolicyRows />
      </div>

      <div>
        <SectionLabel>Connections</SectionLabel>
        <ConnectionSection connections={conns} />
      </div>

      {health.data?.stats && (
        <div>
          <SectionLabel>Intelligence</SectionLabel>
          <IntelligenceSection stats={health.data.stats} />
        </div>
      )}

      {health.data?.stats && (
        <div>
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
        <div className="flex items-center justify-between" style={{ gap: 14, padding: "14px 10px", borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <Lettermark letter={u?.business_name || u?.email || "O"} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{u?.business_name || "Owner"}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{u?.email}</div>
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: "var(--body)" }}>Owner · full access</span>
        </div>
      </div>
      <div>
        <SectionLabel>Team</SectionLabel>
        <EmptyLine title="No other users have been added yet." body="Invited teammates will appear here with their own role and agent permissions." />
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
    <div>
      <SectionLabel>Organization-wide policy</SectionLabel>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 10, maxWidth: 640 }}>
        This governs every agent in Starlane. It applies the same way to all agents and cannot be changed per agent.
      </div>
      <PolicyRows />
    </div>
  );
}

function AutomationTab() {
  return (
    <div className="max-w-[640px] space-y-3 text-[13.5px]" style={{ color: "var(--ink-2)" }}>
      <p>
        Automations in Starlane are workflows you deploy from a proposal on{" "}
        <Link className="underline" href="/prepared">Prepared</Link>. Each one starts in shadow mode, never sends a message on its own,
        and has an action budget per run.
      </p>
      <p>
        Their runs, what is waiting for you and what was verified are on{" "}
        <Link className="underline" href="/missions">Missions</Link>. To stop everything or one agent, use the switches on{" "}
        <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
      </p>
    </div>
  );
}

function ControlPageInner() {
  const params = useSearchParams();
  const tabParam = (params.get("tab") || "overview") as ControlTab;
  const validInPageTabs: ControlTab[] = ["overview", "users", "permissions", "automation"];
  const tab: ControlTab = validInPageTabs.includes(tabParam) ? tabParam : "overview";

  return (
    <DashboardLayout pageTitle="Control">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <PageHeader title="Control" subtitle="What Starlane may see, prepare and do" />

        <ControlSubnav active={tab} />

        <div className="fade-once">
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "permissions" && <PermissionsTab />}
          {tab === "automation" && <AutomationTab />}
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

"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusChip } from "@/components/ui/Badge";
import { Figure, Lettermark, SkeletonRows, Chevron } from "@/components/v32/ui";
import { ControlHeader, ControlPage, ControlSection as Section, type ControlTab } from "@/components/control/ControlSubnav";
import { OFFLINE } from "@/components/connectors/health";
import { formatCount, formatDateTime, formatRelative } from "@/lib/format";
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

const sourceName = (t: string) => ({ TALLY: "TallyPrime", FILE_IMPORT: "Spreadsheet or CSV" } as Record<string, string>)[t] || humanize(t);
const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function ConnectionSection({ connections }: { connections: DataConnection[] }) {
  if (connections.length === 0) {
    return (
      <div className="ops-list flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>No sources connected. Starlane reasons only from systems you connect.</p>
        <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect a source</Link>
      </div>
    );
  }
  return (
    <div className="ops-list">
      {connections.map((c) => {
        const ok = String(c.status).toUpperCase() === "CONNECTED";
        const err = String(c.status).toUpperCase() === "ERROR" || !!c.last_sync_error;
        return (
          <Link key={c.id} href="/sources" className="ops-row flex items-center justify-between" style={{ gap: 14, padding: "11px 0", minHeight: 46 }}>
            <div className="min-w-0">
              <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{sourceName(c.source_type)}</div>
              {c.last_sync_error && <div className="truncate" style={{ fontSize: 12, color: "var(--critical)", marginTop: 2 }}>{c.last_sync_error}</div>}
            </div>
            <div className="flex items-center shrink-0" style={{ gap: 16 }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }} title={c.last_sync_at ? formatDateTime(c.last_sync_at) : undefined}>
                {c.last_sync_at ? `Synced ${formatRelative(c.last_sync_at)}` : "Never synced"}
              </span>
              <span style={{ minWidth: 104 }}><StatusChip tone={err ? "critical" : ok ? "positive" : "unknown"}>{err ? "Error" : ok ? "Connected" : "Not connected"}</StatusChip></span>
              <Chevron />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Org-wide fixed policy, identical for every business; no per-org override
// exists in the backend. L4 Execute always requires approval: the core
// trust mechanism of the product.
const POLICY_LEVELS: { level: string; name: string; description: string; granted: boolean }[] = [
  { level: "L1", name: "Observe", description: "Read business data and surface findings.", granted: true },
  { level: "L2", name: "Prepare", description: "Draft actions and recommendations for review.", granted: true },
  { level: "L3", name: "Propose", description: "Put a specific action in front of you to decide on.", granted: true },
  { level: "L4", name: "Execute", description: "Carry out an action that changes business data.", granted: false },
];

function PolicyRows() {
  return (
    <div className="ops-list">
      {POLICY_LEVELS.map((p) => (
        <div key={p.level} className="policy-row ops-row ops-static">
          <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.level}</span>
          <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{p.name}</div>
          <div className="policy-desc" style={{ fontSize: 13, color: "var(--ink-2)" }}>{p.description}</div>
          <div className="policy-chip">
            <StatusChip tone={p.granted ? "positive" : "attention"}>{p.granted ? "Allowed" : "Your approval, every time"}</StatusChip>
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

  if (health.isLoading || connections.isLoading) return <SkeletonRows rows={5} />;
  if (health.isError || connections.isError) {
    return (
      <ErrorState
        title="Couldn't load operating health"
        message={OFFLINE}
        onRetry={() => { health.refetch(); connections.refetch(); }}
      />
    );
  }

  const conns = connections.data?.connections || [];
  const connectedN = conns.filter((c) => String(c.status).toUpperCase() === "CONNECTED").length;
  const stats = health.data?.stats;
  const pending = stats?.pending_actions ?? null;
  const enough = !!stats && stats.evaluated_actions >= MIN_EVALUATED_FOR_RATE && stats.effectiveness_rate !== null;

  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <div className="ops-figures">
        <Link href="/control/approvals" className="hover-dim" style={{ display: "block" }}>
          <Figure value={pending == null ? "—" : formatCount(pending)} label="Waiting for your approval" />
        </Link>
        <Figure value={formatCount(connectedN)} label={`Connected source${connectedN === 1 ? "" : "s"}`} />
        <Figure value="1" label="User, the owner" />
        <Figure value={enough ? `${stats!.effectiveness_rate}%` : "—"} label={enough ? "Of evaluated actions worked" : "Effectiveness not known yet"} />
      </div>

      <Section title="What Starlane is allowed to do" hint="The same four levels apply to every agent. Changing business data always needs you.">
        <PolicyRows />
      </Section>

      <Section title="Connections" right={<Link href="/sources" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ marginRight: -9 }}>Open Sources</Link>}>
        <ConnectionSection connections={conns} />
      </Section>

      {stats && (
        <div className="ctl-two">
          <Section title="Work in progress">
            <dl className="ctl-stats">
              <div><dt>Pending actions</dt><dd>{formatCount(stats.pending_actions)}</dd></div>
              <div><dt>Urgent</dt><dd style={{ color: stats.pending_by_priority.urgent ? "var(--critical)" : undefined }}>{formatCount(stats.pending_by_priority.urgent)}</dd></div>
              <div><dt>High priority</dt><dd style={{ color: stats.pending_by_priority.high ? "var(--warning)" : undefined }}>{formatCount(stats.pending_by_priority.high)}</dd></div>
              <div><dt>Active plans</dt><dd>{formatCount(stats.active_plans)}</dd></div>
              <div><dt>Memory entries</dt><dd>{formatCount(stats.memory_entries)}</dd></div>
            </dl>
          </Section>
          <Section title="Outcomes" hint={enough ? undefined : `A rate is shown once ${MIN_EVALUATED_FOR_RATE} or more actions have been evaluated.`}>
            <dl className="ctl-stats">
              <div><dt>Actions evaluated</dt><dd>{formatCount(stats.evaluated_actions)}</dd></div>
              <div><dt>Effectiveness</dt><dd>{enough ? `${stats.effectiveness_rate}%` : <span style={{ color: "var(--ink-3)" }}>Not known yet</span>}</dd></div>
              <div><dt>Verified effective</dt><dd>{formatCount(stats.effective_count)}</dd></div>
              <div><dt>Verified ineffective</dt><dd>{formatCount(stats.ineffective_count)}</dd></div>
            </dl>
          </Section>
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

  if (isLoading) return <SkeletonRows rows={2} />;
  if (isError) return <ErrorState title="Couldn't load users" message={OFFLINE} onRetry={() => refetch()} />;

  const u = data?.settings as (UserSettings & { owner_name?: string }) | undefined;

  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <Section title="Owner">
        <div className="ops-list"><div className="ops-row ops-static flex items-center justify-between flex-wrap" style={{ gap: 14, padding: "12px 0" }}>
          <div className="flex items-center min-w-0" style={{ gap: 12 }}>
            <Lettermark letter={u?.owner_name || u?.business_name || u?.email || "O"} size={32} />
            <div className="min-w-0">
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{u?.owner_name || u?.business_name || "Owner"}</div>
              <div className="truncate" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{u?.email}</div>
            </div>
          </div>
          <StatusChip tone="info">Owner, full access</StatusChip>
        </div></div>
      </Section>
      <Section title="Team">
        <p className="ops-list" style={{ margin: 0, padding: "12px 0", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", borderBottom: "1px solid var(--line)" }}>
          No other users yet. Invited teammates will appear here with their own role and agent permissions; inviting is not available yet.
        </p>
      </Section>
    </div>
  );
}

function PermissionsTab() {
  return (
    <Section title="Organisation-wide policy" hint="This governs every agent in Starlane. It applies the same way to all agents and cannot be changed per agent.">
      <PolicyRows />
    </Section>
  );
}

function AutomationTab() {
  const P = { margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.65 } as const;
  const A = { color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--line-strong)", textUnderlineOffset: 3 } as const;
  return (
    <div className="flex flex-col" style={{ gap: 12, maxWidth: 640 }}>
      <p style={P}>
        Automations in Starlane are workflows you deploy from a proposal on <Link style={A} href="/prepared">Prepared</Link>. Each one starts in shadow mode,
        never sends a message on its own, and has an action budget per run.
      </p>
      <p style={P}>
        Their runs, what is waiting for you and what was verified are on <Link style={A} href="/missions">Missions</Link>. To stop everything or one agent,
        use the switches on <Link style={A} href="/control/decisions">Control, Decisions</Link>.
      </p>
    </div>
  );
}

const SUBTITLE: Partial<Record<ControlTab, string>> = {
  overview: "What Starlane may see, prepare and do, and how that is going.",
  users: "Who can use Starlane for this business.",
  permissions: "The levels of autonomy every agent works within.",
  automation: "Where automations live and how to stop them.",
};

function ControlPageInner() {
  const params = useSearchParams();
  const tabParam = (params.get("tab") || "overview") as ControlTab;
  const validInPageTabs: ControlTab[] = ["overview", "users", "permissions", "automation"];
  const tab: ControlTab = validInPageTabs.includes(tabParam) ? tabParam : "overview";

  return (
    <DashboardLayout pageTitle="Control">
      <style>{`
        .ctl-two { display: grid; gap: 32px 48px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 900px) { .ctl-two { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .ctl-stats { margin: 0; border-top: 1px solid var(--line); }
        .ctl-stats > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
        .ctl-stats dt { color: var(--ink-2); }
        .ctl-stats dd { margin: 0; color: var(--ink); font-family: var(--font-mono); font-size: 12.5px; font-variant-numeric: tabular-nums; }
        .policy-row { display: grid; align-items: center; gap: 4px 16px; padding: 11px 0; min-height: 46px;
          grid-template-columns: 24px minmax(0, 1fr) auto; }
        .policy-desc { grid-column: 2 / 4; grid-row: 2; }
        .policy-chip { grid-column: 3; grid-row: 1; justify-self: end; }
        @media (min-width: 760px) {
          .policy-row { grid-template-columns: 32px 112px minmax(0, 1fr) 200px; }
          .policy-desc { grid-column: auto; grid-row: auto; }
          .policy-chip { grid-column: auto; grid-row: auto; }
        }
      `}</style>
      <ControlPage>
        <ControlHeader active={tab} subtitle={SUBTITLE[tab]} />
        <div className="fade-once">
          {tab === "overview" && <OverviewTab />}
          {tab === "users" && <UsersTab />}
          {tab === "permissions" && <PermissionsTab />}
          {tab === "automation" && <AutomationTab />}
        </div>
      </ControlPage>
    </DashboardLayout>
  );
}

export default function ControlRoute() {
  return (
    <Suspense fallback={null}>
      <ControlPageInner />
    </Suspense>
  );
}

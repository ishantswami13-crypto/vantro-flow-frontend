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
import { AuthorityLadder, PolicyTable, controlStyles as c } from "@/components/control/Authority";
import { decisionsApi } from "@/lib/decisions";
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

function ConnectionRows({ connections }: { connections: DataConnection[] }) {
  if (connections.length === 0) {
    return (
      <div className={c.facts} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>No systems connected. Starlane reasons only from systems you connect.</p>
        <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect a source</Link>
      </div>
    );
  }
  return (
    <div style={{ borderTop: "1px solid var(--line)" }}>
      {connections.map((x) => {
        const ok = String(x.status).toUpperCase() === "CONNECTED";
        const err = String(x.status).toUpperCase() === "ERROR" || !!x.last_sync_error;
        return (
          <Link key={x.id} href="/sources" className={`${c.conn} ops-row`}>
            <div className="min-w-0">
              <div className={`${c.connName} truncate`}>{sourceName(x.source_type)}</div>
              {x.last_sync_error
                ? <div className={`${c.connErr} truncate`} title={x.last_sync_error}>{x.last_sync_error}</div>
                : <div className={c.connMeta} title={x.last_sync_at ? formatDateTime(x.last_sync_at) : undefined}>{x.last_sync_at ? `Synced ${formatRelative(x.last_sync_at)}` : "Never synced"}</div>}
            </div>
            <div className="flex items-center shrink-0" style={{ gap: 10 }}>
              <StatusChip tone={err ? "critical" : ok ? "positive" : "unknown"} className={err ? undefined : "chip-quiet"}>{err ? "Error" : ok ? "Connected" : "Not connected"}</StatusChip>
              <Chevron />
            </div>
          </Link>
        );
      })}
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
  // Same request and cache as Control > Decisions; the band shows its facts
  // only when it answers.
  const controls = useQuery({ queryKey: ["decision-controls"], queryFn: decisionsApi.controls, staleTime: 25_000 });

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
  const connectedN = conns.filter((x) => String(x.status).toUpperCase() === "CONNECTED").length;
  const failingN = conns.filter((x) => String(x.status).toUpperCase() === "ERROR" || !!x.last_sync_error).length;
  const stats = health.data?.stats;
  const pending = stats?.pending_actions ?? null;
  const enough = !!stats && stats.evaluated_actions >= MIN_EVALUATED_FOR_RATE && stats.effectiveness_rate !== null;
  const ctl = controls.data;
  const stoppedClasses = ctl ? ctl.controls.filter((x) => x.scope === "ACTION_CLASS" && x.stopped).length : 0;
  const allStopped = !!ctl && (ctl.globalStop || ctl.controls.some((x) => x.scope === "TENANT" && x.stopped));

  return (
    <div className="flex flex-col" style={{ gap: 36 }}>
      <section className={c.band} aria-labelledby="authority-title">
        <div className={c.bandHead}>
          <h2 id="authority-title" className="section-label section-label-lead">Authority boundary</h2>
          <span className={c.bandNote}>The same for every agent. It cannot be changed per agent.</span>
        </div>
        <AuthorityLadder />
        <dl className={c.bandFacts}>
          {ctl && <div><dt>Pilot mode</dt><dd>{ctl.pilotMode === "SHADOW" ? "Shadow, nothing is changed" : "Live, approved decisions run"}</dd></div>}
          {ctl && <div><dt>Customer messages</dt><dd>{ctl.externalSendEnabled ? "Sent after your approval" : "Drafts only"}</dd></div>}
          {ctl && (allStopped || stoppedClasses > 0) && (
            <div><dt>Stopped</dt><dd><Link href="/control/decisions" className="hover-dim" style={{ color: "var(--critical)" }}>{allStopped ? "Everything" : `${formatCount(stoppedClasses)} action type${stoppedClasses === 1 ? "" : "s"}`}</Link></dd></div>
          )}
          <div><dt>Users</dt><dd>1, the owner</dd></div>
        </dl>
      </section>

      <div className={c.tri}>
        <section className={c.col} aria-labelledby="ctl-approvals">
          <div className={c.colHead}>
            <h2 id="ctl-approvals" className="section-label">Needs your approval</h2>
          </div>
          <div className={c.colFigure}>
            <Link href="/control/approvals" className="hover-dim" style={{ display: "block" }}>
              <Figure value={pending == null ? "—" : formatCount(pending)} label={pending === 1 ? "Action waiting for you" : "Actions waiting for you"} />
            </Link>
          </div>
          {stats && (
            <dl className={c.facts}>
              <div><dt>Urgent</dt><dd className="num" style={{ color: stats.pending_by_priority.urgent ? "var(--critical)" : undefined }}>{formatCount(stats.pending_by_priority.urgent)}</dd></div>
              <div><dt>High priority</dt><dd className="num">{formatCount(stats.pending_by_priority.high)}</dd></div>
              <div><dt>Active plans</dt><dd className="num">{formatCount(stats.active_plans)}</dd></div>
            </dl>
          )}
        </section>

        <section className={c.col} aria-labelledby="ctl-systems">
          <div className={c.colHead}>
            <h2 id="ctl-systems" className="section-label">Connected systems</h2>
            <Link href="/sources" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ marginRight: -10 }}>Open Sources</Link>
          </div>
          <div className={c.colFigure}>
            <Figure value={formatCount(connectedN)} label={failingN ? `Connected, ${formatCount(failingN)} failing` : `Connected system${connectedN === 1 ? "" : "s"}`} tone={failingN ? "var(--critical)" : undefined} />
          </div>
          <ConnectionRows connections={conns} />
        </section>

        <section className={c.col} aria-labelledby="ctl-verified">
          <div className={c.colHead}>
            <h2 id="ctl-verified" className="section-label">Verified actions</h2>
          </div>
          <div className={c.colFigure}>
            <Figure
              value={enough ? `${stats!.effectiveness_rate}%` : <span className="num-quiet" style={{ fontSize: 16, color: "var(--ink-2)" }}>Not known yet</span>}
              label={enough ? "Of evaluated actions worked" : `Shown once ${MIN_EVALUATED_FOR_RATE} or more actions are evaluated`}
            />
          </div>
          {stats && (
            <dl className={c.facts}>
              <div><dt>Actions evaluated</dt><dd className="num">{formatCount(stats.evaluated_actions)}</dd></div>
              <div><dt>Verified effective</dt><dd className="num">{formatCount(stats.effective_count)}</dd></div>
              <div><dt>Verified ineffective</dt><dd className="num">{formatCount(stats.ineffective_count)}</dd></div>
            </dl>
          )}
        </section>
      </div>
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
  const controls = useQuery({ queryKey: ["decision-controls"], queryFn: decisionsApi.controls, staleTime: 25_000 });
  const ctl = controls.data;
  const stoppedClasses = ctl ? ctl.controls.filter((x) => x.scope === "ACTION_CLASS" && x.stopped).length : 0;
  const allStopped = !!ctl && (ctl.globalStop || ctl.controls.some((x) => x.scope === "TENANT" && x.stopped));
  return (
    <div className="flex flex-col" style={{ gap: 36 }}>
      <Section title="Organisation-wide policy" hint="This governs every agent in Starlane. It applies the same way to all agents and cannot be changed per agent.">
        <PolicyTable />
      </Section>
      {ctl && (
        <Section title="Enforced now" hint="Set for this business and enforced by the backend, outside any model." right={<Link href="/control/decisions" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ marginRight: -10 }}>Change in Decisions</Link>}>
          <dl className={c.facts}>
            <div><dt>Autonomy ceiling</dt><dd className="num">{ctl.autonomyCeiling}</dd></div>
            <div><dt>Pilot mode</dt><dd>{ctl.pilotMode === "SHADOW" ? "Shadow, nothing is changed" : "Live, approved decisions run"}</dd></div>
            <div><dt>Customer messages</dt><dd>{ctl.externalSendEnabled ? "Sent after your approval" : "Drafts only, sending is off"}</dd></div>
            <div><dt>Stop switches</dt><dd style={{ color: allStopped || stoppedClasses ? "var(--critical)" : undefined }}>{allStopped ? "Everything is stopped" : stoppedClasses ? `${formatCount(stoppedClasses)} action type${stoppedClasses === 1 ? "" : "s"} stopped` : "None on"}</dd></div>
          </dl>
        </Section>
      )}
    </div>
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
  overview: "What Starlane may do on its own, what needs you, and what it has proven.",
  users: "Who can use Starlane for this business.",
  permissions: "The levels of autonomy every agent works within.",
  automation: "Where automations live and how to stop them.",
};

/** The Overview's one primary action, only while something is waiting. */
function ReviewApprovals() {
  const health = useQuery<CortexHealthResponse>({ queryKey: ["control-cortex-health"], queryFn: () => api.cortexHealth(), staleTime: 25_000 });
  const n = health.data?.stats?.pending_actions ?? 0;
  if (!n) return null;
  return <Link href="/control/approvals" className="ui-btn ui-btn-primary">Review {formatCount(n)} approval{n === 1 ? "" : "s"}</Link>;
}

function ControlPageInner() {
  const params = useSearchParams();
  const tabParam = (params.get("tab") || "overview") as ControlTab;
  const validInPageTabs: ControlTab[] = ["overview", "users", "permissions", "automation"];
  const tab: ControlTab = validInPageTabs.includes(tabParam) ? tabParam : "overview";

  return (
    <DashboardLayout pageTitle="Control">
      <ControlPage>
        <ControlHeader active={tab} subtitle={SUBTITLE[tab]} right={tab === "overview" ? <ReviewApprovals /> : undefined} />
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

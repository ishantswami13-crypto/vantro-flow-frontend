"use client";

// Agents: the workforce that actually runs in Starlane, read from
// GET /api/os/agents. Each one is backed by code that runs today and by rows
// it writes (runs, last activity, measured performance, kill-switch state).
// "Current work" is the open missions assigned to each agent
// (GET /api/os/missions, the same list Missions reads). Agents with no
// behaviour yet are listed separately with the reason, never as live
// workers, and there is no "New agent" button because no such capability
// exists.

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi, MISSION_STATE_LABEL, type AgentInfo, type Mission } from "@/lib/os";
import { useLoad } from "@/components/os/shared";
import { cleanTitle, humaneError, missionTone, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Subnav, Chevron, Figure } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRelative, formatDateTime, formatCount } from "@/lib/format";
import { agentStatus, autonomyOf, openWorkOf, PERMISSION_LABEL } from "@/components/agents/shared";

export default function AgentsPage() {
  const { data, error, loading, reload } = useLoad(() => osApi.agents());
  const missions = useLoad(() => osApi.missions());
  const [tab, setTab] = useState<"running" | "planned">("running");
  const agents = data?.agents || [];
  const allMissions = missions.data?.missions || [];

  return (
    <DashboardLayout pageTitle="Agents">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
        <PageHeader title="Agents" subtitle="What each worker is doing now, how far it may act on its own, and how it has performed.">
          <div style={{ marginTop: 20 }}>
            <Subnav
              label="Agent sections"
              active={tab}
              onChange={(k) => setTab(k as "running" | "planned")}
              items={[
                { key: "running", label: "Workforce", count: data ? agents.length : null },
                { key: "planned", label: "Coming", count: data ? data.notBuilt.length : null },
              ]}
            />
          </div>
        </PageHeader>

        {loading && <TableSkeleton />}
        {!loading && !!error && <ErrorState title="Agents didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}

        {data && tab === "running" && (
          agents.length === 0 ? <p className="wk-empty">No agent is registered for this workspace. Agents appear once the backend registers them; nothing runs in the meantime.</p> : (
            <>
              <WorkforceStrip agents={agents} missions={missions.data ? allMissions : null} />
              <section aria-label="Agents">
                <div className="wk-list ag-list" role="table" aria-label="Agents">
                  <div className="wk-head" role="row" style={{ gridTemplateColumns: COLS }}>
                    <span role="columnheader">Agent</span>
                    <span role="columnheader">Current work</span>
                    <span role="columnheader">Autonomy</span>
                    <span role="columnheader">Reliability</span>
                    <span role="columnheader">Status</span>
                  </div>
                  {agents.map((a) => <AgentRow key={a.key} a={a} missions={missions.data ? allMissions : null} missionsFailed={!!missions.error} />)}
                </div>
              </section>
            </>
          )
        )}

        {data && tab === "planned" && (
          data.notBuilt.length === 0 ? <p className="wk-empty">Nothing is waiting to be built.</p> : (
            <section>
              <p className="wk-lede">Planned workers. None of them runs, and none is shown as working until it does.</p>
              <div className="wk-list wk-flat" role="table" aria-label="Planned agents">
                <div className="wk-head" role="row" style={{ gridTemplateColumns: PLANNED_COLS }}>
                  <span role="columnheader">Agent</span>
                  <span role="columnheader">Why it isn&apos;t running</span>
                  <span role="columnheader">Status</span>
                </div>
                {data.notBuilt.map((n) => (
                  <div key={n.name} role="row" className="wk-row" style={{ gridTemplateColumns: PLANNED_COLS, alignItems: "start" }}>
                    <div role="cell" className="wk-title">{n.name}</div>
                    <div role="cell" className="wk-sub" style={{ lineHeight: 1.55 }}>{n.reason}</div>
                    <div role="cell" className="mt-1.5 md:mt-0"><StatusChip tone="unknown">Not built</StatusChip></div>
                  </div>
                ))}
              </div>
            </section>
          )
        )}

        {data && (
          <p className="meta" style={{ maxWidth: 680, lineHeight: 1.6, marginBottom: 0 }}>
            Each agent is fixed code: none calls a language model or sends a message on its own. Pause or stop one from{" "}
            <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

// Agent, current work, autonomy, reliability, status.
const COLS = "minmax(0,1.25fr) minmax(0,1.25fr) minmax(0,0.85fr) minmax(0,1fr) 112px";
const PLANNED_COLS = "minmax(0,0.6fr) minmax(0,1.4fr) 120px";

/** The workforce at a glance: counts of what the backend reports, nothing estimated. */
function WorkforceStrip({ agents, missions }: { agents: AgentInfo[]; missions: Mission[] | null }) {
  const active = agents.filter((a) => a.status === "ACTIVE").length;
  const stopped = agents.filter((a) => a.status === "STOPPED").length;
  const runs = agents.reduce((n, a) => n + (a.runs || 0), 0);
  const last = agents.map((a) => a.lastRunAt).filter(Boolean).sort().pop() || null;
  const keys = new Set(agents.map((a) => a.key));
  const open = missions ? missions.filter((m) => keys.has(m.assigned?.agent) && OPEN.has(m.state)) : null;
  const waiting = open ? open.filter((m) => m.state === "WAITING_FOR_APPROVAL" || m.state === "WAITING_FOR_INFORMATION" || m.state === "BLOCKED").length : null;
  return (
    <section aria-label="Workforce" className="ag-strip">
      <Figure value={<>{formatCount(active)}<span className="ag-of"> of {formatCount(agents.length)}</span></>} label={stopped ? `Active · ${formatCount(stopped)} stopped` : "Active"} />
      <Figure value={open ? formatCount(open.length) : "—"} label="Missions in hand" />
      <Figure value={waiting == null ? "—" : formatCount(waiting)} label="Waiting on a person" tone={waiting ? "var(--ink)" : undefined} />
      <Figure value={formatCount(runs)} label={last ? `Runs recorded · last ${formatRelative(last)}` : "Runs recorded"} />
    </section>
  );
}

const OPEN = new Set(["BLOCKED", "WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION", "RUNNING", "VERIFYING", "PLANNING"]);

function AgentRow({ a, missions, missionsFailed }: { a: AgentInfo; missions: Mission[] | null; missionsFailed: boolean }) {
  const st = agentStatus(a);
  const auto = autonomyOf(a);
  const work = missions ? openWorkOf(a.key, missions) : [];
  const now = work[0];
  const needsYou = now && (now.state === "WAITING_FOR_APPROVAL" || now.state === "BLOCKED" || now.state === "WAITING_FOR_INFORMATION");
  return (
    <Link href={`/agents/${encodeURIComponent(a.key)}`} role="row" className="wk-row ag-row" style={{ gridTemplateColumns: COLS }} aria-label={`${a.name}, ${st.label}`}>
      <div role="cell" className="min-w-0">
        <div className="ag-name">{a.name}</div>
        <div className="wk-sub line-clamp-2" title={a.purpose}>{a.purpose}</div>
      </div>
      <div role="cell" className="min-w-0 ag-cell">
        <span className="ag-label md:hidden">Now</span>
        {now ? (
          <>
            <div className={`ag-work line-clamp-2${needsYou ? " ag-work-attn" : ""}`} title={cleanTitle(now.title)}>{cleanTitle(now.title)}</div>
            <div className="ag-work-meta">
              <StatusChip tone={missionTone(now.state)}>{MISSION_STATE_LABEL[now.state]}</StatusChip>
              {work.length > 1 && <span className="wk-meta">+{formatCount(work.length - 1)} more</span>}
            </div>
          </>
        ) : (
          <div className="wk-meta">{missions == null ? (missionsFailed ? "Not known: missions didn't load" : "…") : a.status === "STOPPED" ? "Stopped, takes no work" : "No open mission"}</div>
        )}
      </div>
      <div role="cell" className="min-w-0 ag-cell">
        <span className="ag-label md:hidden">Autonomy</span>
        <div className="ag-value" title={auto?.hint}>{auto ? auto.label : "No permission"}</div>
        <div className="wk-meta line-clamp-1" title={a.permissions.map((p) => PERMISSION_LABEL[p] || p).join(", ")}>
          {a.permissions.length ? a.permissions.map((p) => PERMISSION_LABEL[p] || p).join(" · ") : "Nothing granted"}
        </div>
      </div>
      <div role="cell" className="min-w-0 ag-cell">
        <span className="ag-label md:hidden">Reliability</span>
        <div className={a.performance ? "ag-value line-clamp-2" : "wk-meta"} title={a.performance || undefined}>{a.performance || "Not measured yet"}</div>
        <div className="wk-meta"><span className="num-quiet">{formatCount(a.runs)}</span> {a.runs === 1 ? "run" : "runs"}</div>
      </div>
      <div role="cell" className="ag-status">
        <div className="min-w-0">
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
          <div className="wk-meta" style={{ marginTop: 3 }} title={a.lastRunAt ? formatDateTime(a.lastRunAt) : undefined}>
            {a.lastRunAt ? `Ran ${formatRelative(a.lastRunAt)}` : "Never run"}
          </div>
        </div>
        <Chevron size={13} />
      </div>
    </Link>
  );
}

function TableSkeleton() {
  return (
    <div className="wk-list" role="status" aria-busy="true" aria-label="Loading agents">
      <div className="wk-head" style={{ gridTemplateColumns: COLS }}><span>Agent</span><span>Current work</span><span>Autonomy</span><span>Reliability</span><span>Status</span></div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="wk-row" style={{ gridTemplateColumns: COLS }}>
          <div style={{ display: "grid", gap: 7 }}><div className="skeleton" style={{ height: 11, width: 120 }} /><div className="skeleton" style={{ height: 9, width: "80%" }} /></div>
          <div className="skeleton hidden md:block" style={{ height: 9, width: "70%" }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: "60%" }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: "80%" }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: 56 }} />
        </div>
      ))}
    </div>
  );
}

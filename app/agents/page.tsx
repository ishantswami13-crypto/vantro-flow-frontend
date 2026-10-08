"use client";

// Agents: the workers that actually run in Starlane, read from
// GET /api/os/agents. Each one is backed by code that runs today and by rows
// it writes (runs, last activity, measured performance, kill-switch state).
// Agents with no behaviour yet are listed separately with the reason, never
// as live workers, and there is no "New agent" button because no such
// capability exists.

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi } from "@/lib/os";
import { useLoad } from "@/components/os/shared";
import { humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Subnav, Chevron } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatRelative, formatDateTime, formatCount } from "@/lib/format";
import { agentStatus, PERMISSION_LABEL } from "@/components/agents/shared";

export default function AgentsPage() {
  const { data, error, loading, reload } = useLoad(() => osApi.agents());
  const [tab, setTab] = useState<"running" | "planned">("running");
  const agents = data?.agents || [];

  return (
    <DashboardLayout pageTitle="Agents">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
        <PageHeader title="Agents" subtitle="The workers that run on your data, what each may do, and when it last ran.">
          <div style={{ marginTop: 20 }}>
            <Subnav
              label="Agent sections"
              active={tab}
              onChange={(k) => setTab(k as "running" | "planned")}
              items={[
                { key: "running", label: "Ready", count: data ? agents.length : null },
                { key: "planned", label: "Coming", count: data ? data.notBuilt.length : null },
              ]}
            />
          </div>
        </PageHeader>

        <div className="flex flex-col" style={{ gap: 20 }}>
          {loading && <TableSkeleton />}
          {!loading && !!error && <ErrorState title="Agents didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}

          {data && tab === "running" && (
            agents.length === 0 ? <p className="wk-empty">No agent is registered for this workspace. Agents appear once the backend registers them; nothing runs in the meantime.</p> : (
              <div className="wk-list" role="table" aria-label="Agents">
                <div className="wk-head" role="row" style={{ gridTemplateColumns: COLS }}>
                  <span role="columnheader">Agent</span>
                  <span role="columnheader">May</span>
                  <span role="columnheader">Measured</span>
                  <span role="columnheader" style={{ textAlign: "right" }}>Runs</span>
                  <span role="columnheader">Last run</span>
                  <span role="columnheader">Status</span>
                </div>
                {agents.map((a) => {
                  const st = agentStatus(a);
                  return (
                    <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} role="row" className="wk-row" style={{ gridTemplateColumns: COLS }} aria-label={`${a.name}, ${st.label}`}>
                      <div role="cell" className="min-w-0">
                        <div className="wk-title">{a.name}</div>
                        <div className="wk-sub line-clamp-2" title={a.purpose}>{a.purpose}</div>
                      </div>
                      <div role="cell" className="wk-meta mt-1.5 md:mt-0" style={{ color: "var(--ink-2)", fontSize: 12.5 }}>
                        {a.permissions.length ? a.permissions.map((p) => PERMISSION_LABEL[p] || p).join(", ") : "Nothing"}
                      </div>
                      <div role="cell" className="hidden md:block min-w-0" style={{ fontSize: 12.5, color: a.performance ? "var(--ink-2)" : "var(--ink-3)", lineHeight: 1.5 }}>
                        <span className="line-clamp-2" title={a.performance || undefined}>{a.performance || "Not measured yet"}</span>
                      </div>
                      <div role="cell" className="hidden md:block num" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{formatCount(a.runs)}</div>
                      <div role="cell" className="hidden md:block" style={{ fontSize: 12.5, color: "var(--ink-2)" }} title={a.lastRunAt ? formatDateTime(a.lastRunAt) : undefined}>
                        {a.lastRunAt ? formatRelative(a.lastRunAt) : "Not yet"}
                      </div>
                      <div role="cell" className="flex items-center justify-between mt-1.5 md:mt-0" style={{ gap: 8 }}>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        <Chevron size={13} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {data && tab === "planned" && (
            data.notBuilt.length === 0 ? <p className="wk-empty">Nothing is waiting to be built.</p> : (
              <div>
                <p className="meta" style={{ margin: "0 0 10px" }}>Planned workers. None of them runs, and none is shown as working until it does.</p>
                <div className="wk-list wk-flat" role="table" aria-label="Planned agents">
                  <div className="wk-head" role="row" style={{ gridTemplateColumns: PLANNED_COLS }}>
                    <span role="columnheader">Agent</span>
                    <span role="columnheader">Why it isn&apos;t running</span>
                    <span role="columnheader">Status</span>
                  </div>
                  {data.notBuilt.map((n) => (
                    <div key={n.name} role="row" className="wk-row" style={{ gridTemplateColumns: PLANNED_COLS, alignItems: "start" }}>
                      <div role="cell" className="wk-title" style={{ fontWeight: 400, color: "var(--body)" }}>{n.name}</div>
                      <div role="cell" className="wk-sub" style={{ lineHeight: 1.55 }}>{n.reason}</div>
                      <div role="cell" className="mt-1.5 md:mt-0"><StatusChip tone="unknown">Coming</StatusChip></div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {data && (
            <p className="meta" style={{ margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
              Each agent is fixed code: none calls a language model or sends a message on its own. Pause or stop one from{" "}
              <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Agent, permissions, measured performance, runs, last run, status.
const COLS = "minmax(0,1.5fr) minmax(0,0.8fr) minmax(0,1fr) 48px 88px 116px";
const PLANNED_COLS = "minmax(0,0.6fr) minmax(0,1.4fr) 120px";

function TableSkeleton() {
  return (
    <div className="wk-list" role="status" aria-busy="true" aria-label="Loading agents">
      <div className="wk-head" style={{ gridTemplateColumns: COLS }}><span>Agent</span><span>May</span><span>Measured</span><span /><span>Last run</span><span>Status</span></div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="wk-row" style={{ gridTemplateColumns: COLS }}>
          <div style={{ display: "grid", gap: 7 }}><div className="skeleton" style={{ height: 11, width: 120 }} /><div className="skeleton" style={{ height: 9, width: "80%" }} /></div>
          <div className="skeleton hidden md:block" style={{ height: 9, width: "70%" }} />
          <div className="skeleton hidden md:block" style={{ height: 9, width: "80%" }} />
          <div /><div className="skeleton hidden md:block" style={{ height: 9, width: 48 }} /><div className="skeleton hidden md:block" style={{ height: 9, width: 56 }} />
        </div>
      ))}
    </div>
  );
}

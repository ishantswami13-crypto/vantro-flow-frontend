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
import { PageColumn, humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Subnav, Lettermark, EmptyLine } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconAgents, IconArrowRight } from "@/components/v32/icons";
import { formatRelative, formatCount } from "@/lib/format";
import { agentStatus, PERMISSION_LABEL } from "@/components/agents/shared";

export default function AgentsPage() {
  const { data, error, loading, reload } = useLoad(() => osApi.agents());
  const [tab, setTab] = useState<"running" | "planned">("running");
  const agents = data?.agents || [];

  return (
    <DashboardLayout pageTitle="Agents">
      <PageColumn gap={20}>
        <PageHeader title="Agents" subtitle="The workers that run on your data, what each may do, and when it last ran." />
        <Subnav
          label="Agent sections"
          active={tab}
          onChange={(k) => setTab(k as "running" | "planned")}
          items={[
            { key: "running", label: "Ready", count: data ? agents.length : null },
            { key: "planned", label: "Coming", count: data ? data.notBuilt.length : null },
          ]}
        />

        <div className="fade-once flex flex-col" style={{ gap: 20 }}>
          {loading && <GallerySkeleton />}
          {!loading && !!error && <ErrorState className="ui-panel" title="Agents didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}

          {data && tab === "running" && (
            agents.length === 0 ? <EmptyLine icon={<IconAgents size={17} />} title="No agent is registered for this workspace" body="Agents appear here once the backend registers them. Nothing runs in the meantime." /> : (
              <div className="lib-grid agent-grid">
                {agents.map((a, i) => {
                  const st = agentStatus(a);
                  return (
                    <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} className="lib-card agent-card rise-in" style={{ animationDelay: `${i * 40}ms` }} aria-label={`${a.name}, ${st.label}`}>
                      <div className="flex items-center justify-between" style={{ gap: 10 }}>
                        <div className="flex items-center min-w-0" style={{ gap: 12 }}>
                          <Lettermark letter={a.name} size={36} />
                          <div className="agent-name truncate">{a.name}</div>
                        </div>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                      <div className="agent-purpose">{a.purpose}</div>
                      {a.permissions.length > 0 && (
                        <div className="flex flex-wrap" style={{ gap: 6 }}>
                          {a.permissions.map((p) => <span key={p} className="agent-perm">{PERMISSION_LABEL[p] || p}</span>)}
                        </div>
                      )}
                      <div className="agent-foot">
                        <span className="tabular-nums">
                          {a.lastRunAt ? `Last run ${formatRelative(a.lastRunAt)}` : "Has not run yet"}
                          {a.runs > 0 ? ` · ${formatCount(a.runs)} run${a.runs === 1 ? "" : "s"}` : ""}
                        </span>
                        <IconArrowRight size={13} className="row-chevron" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}

          {data && tab === "planned" && (
            data.notBuilt.length === 0 ? <EmptyLine icon={<IconAgents size={17} />} title="Nothing is waiting to be built" /> : (
              <div className="flex flex-col" style={{ gap: 12 }}>
                <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0 }}>Planned workers. None of them runs, and none is shown as working until it does.</p>
                <div className="lib-grid agent-grid">
                  {data.notBuilt.map((n, i) => (
                    <div key={n.name} className="lib-card agent-card agent-card-muted rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-center justify-between" style={{ gap: 10 }}>
                        <div className="flex items-center min-w-0" style={{ gap: 12 }}>
                          <Lettermark letter={n.name} size={36} />
                          <div className="agent-name truncate" style={{ color: "var(--body)" }}>{n.name}</div>
                        </div>
                        <StatusChip tone="unknown">Coming</StatusChip>
                      </div>
                      <div className="agent-purpose agent-purpose-full">{n.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {data && (
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
              Each agent is fixed code: none calls a language model or sends a message on its own. Pause or stop one from{" "}
              <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
            </p>
          )}
        </div>
      </PageColumn>
    </DashboardLayout>
  );
}

function GallerySkeleton() {
  return (
    <div className="lib-grid agent-grid" role="status" aria-busy="true" aria-label="Loading agents">
      {[0, 1, 2].map((i) => (
        <div key={i} className="lib-card agent-card agent-card-muted">
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9 }} />
            <div className="skeleton" style={{ height: 12, width: 120 }} />
          </div>
          <div className="skeleton" style={{ height: 10, width: "90%" }} />
          <div className="skeleton" style={{ height: 10, width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

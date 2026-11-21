"use client";

// Command Center: the organization's agent work at a glance. Every figure is
// counted by the server from executions, approvals and connections
// (GET /api/platform/command-center). Anything the server does not measure
// (cost, outcome quality) says "Not measured" with the reason, never a guess.
// The receivables dashboard that used to live here is the Finance overview
// at /command/finance.

import { Fragment } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, ago } from "@/components/v32/ui";
import { IconAgents } from "@/components/v32/icons";
import { platformApi } from "@/lib/platform";
import { ChartCard, DailyRuns, AgentBars, Legend } from "@/components/platform/Charts";
import { useActiveOrg, useWorkspace, PlatformErrorBanner, Loading, StatBand, AlertList, EmptyState, Section, ExecStatusChip, duration, when, money } from "@/components/platform/ui";

export default function CommandCenterPage() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "command-center", org], queryFn: () => platformApi.commandCenter(), refetchInterval: 15_000 });
  const d = q.data;
  const finance = ws.data?.apps.includes("finance");

  return (
    <DashboardLayout pageTitle="Command Center">
      <PageHeader
        eyebrow="Workspace"
        divider
        title="Command Center"
        subtitle={ws.data?.organization.name ? `What ${ws.data.organization.name}'s agents are doing, measured from their runs` : "What your agents are doing, measured from their runs"}
        right={<>
          {finance && <Button href="/command/finance">Finance overview</Button>}
          <Button primary href="/agents/new">New agent</Button>
        </>}
      />

      <div className="pf-stack fade-once">
        <PlatformErrorBanner error={q.error} what="The Command Center" />
        {q.isLoading && <Loading rows={4} height={70} />}

        {d && (
          <>
            {(d.approvals.pending ?? 0) > 0 && (
              <Link href="/approvals" className="ws-notice"><b aria-hidden="true">S</b>{d.approvals.pending === 1 ? "There is 1 agent action waiting for your approval" : `There are ${d.approvals.pending} agent actions waiting for your approval`}</Link>
            )}
            <AlertList alerts={d.alerts} />

            {d.daily && d.daily.length > 0 && (
              <div className="ws-charts">
                <ChartCard
                  figure={d.executions.last7d.completed + d.executions.last7d.failed + d.executions.last7d.cancelled}
                  figureNote="Runs in the last 7 days"
                  legend={<Legend items={[{ label: "Completed", tone: "ink" }, { label: "Failed", tone: "bad" }, { label: "Other", tone: "light" }]} />}
                >
                  <DailyRuns days={d.daily} />
                </ChartCard>
                <ChartCard title="Runs by agent" sub="The agents that ran most in the last 7 days" legend={<Legend items={[{ label: "Runs", tone: "ink" }, { label: "Of which failed", tone: "bad" }]} />}>
                  {d.byAgent && d.byAgent.length > 0 ? <AgentBars rows={d.byAgent} /> : <p style={{ margin: 0, fontSize: 13, color: "#8F8A81" }}>No agent has run in the last 7 days.</p>}
                </ChartCard>
              </div>
            )}

            <StatBand
              title="Right now"
              cells={[
                { label: "Active agents", value: d.agents.active, href: "/agents?view=active" },
                { label: "Running now", value: d.executions.running },
                { label: "Queued", value: d.executions.queued },
                { label: "Waiting for approval", value: d.approvals.pending ?? d.executions.awaitingApproval, href: "/approvals" },
                { label: "Runs, last 24 hours", value: d.executions.last24h },
              ]}
            />
            <StatBand
              title="Quality and cost"
              aside="last 7 days, from finished runs"
              cells={[
                { label: "Success rate", measured: d.executions.successRate, format: (v: number) => `${Math.round(v * 100)}%` },
                { label: "Median run time", measured: d.executions.medianDurationMs, format: (v: number) => duration(v) },
                { label: "Model cost", measured: d.usage.cost, format: (v: number) => money(v, d.usage.cost.currency) },
                { label: "Business outcomes", measured: d.quality.outcomes, format: (v: unknown) => String(v) },
              ]}
            />

            <div className="hv-detail">
              <Section plain title="Recent runs" aside={<Link href="/agents?view=all">All agents</Link>}>
                {d.recent.length === 0 ? (
                  <EmptyState icon={<IconAgents size={18} />} title="No agent has run yet" body="Create an agent from a template or describe the work in a sentence, test it, then turn it on." action={<Button primary href="/agents/new">Create an agent</Button>} />
                ) : (
                  <div className="pf-list">
                    {d.recent.map((r) => (
                      <Link key={r.id} href={`/command/runs/${r.id}`} className="pf-row">
                        <div className="pf-row-main">
                          <div className="pf-row-title">{r.agentName}</div>
                          <div className="pf-row-sub">
                            {r.mode === "test" ? "Test" : "Live"} · {r.trigger} · {ago(r.createdAt)} · {duration(r.durationMs)} · {r.modelCalls} model call{r.modelCalls === 1 ? "" : "s"}, {r.toolCalls} tool call{r.toolCalls === 1 ? "" : "s"}
                            {r.errorClass ? ` · ${r.errorClass.replace(/_/g, " ").toLowerCase()}` : ""}
                          </div>
                        </div>
                        <ExecStatusChip status={r.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </Section>

              <aside className="hv-side">
                <div className="hv-pane">
                  <div className="hv-pane-head"><h3>Last 7 days</h3></div>
                  <dl className="hv-props">
                    <dt>Completed</dt><dd>{d.executions.last7d.completed}</dd>
                    <dt>Failed</dt><dd>{d.executions.last7d.failed}</dd>
                    <dt>Cancelled</dt><dd>{d.executions.last7d.cancelled}</dd>
                    {Object.entries(d.triggers.last7d).map(([k, n]) => (<Fragment key={k}><dt>From {k}</dt><dd>{n}</dd></Fragment>))}
                  </dl>
                </div>
                <div className="hv-pane">
                  <div className="hv-pane-head"><h3>Agents</h3></div>
                  <dl className="hv-props">
                    <dt>Active</dt><dd>{d.agents.active}</dd>
                    <dt>Published</dt><dd>{d.agents.ready}</dd>
                    <dt>Drafts</dt><dd>{d.agents.draft}</dd>
                    <dt>Disabled</dt><dd>{d.agents.disabled}</dd>
                  </dl>
                </div>
                <div className="hv-pane">
                  <div className="hv-pane-head"><h3>Usage</h3><span>last 7 days</span></div>
                  <dl className="hv-props">
                    <dt>Model calls</dt><dd>{d.usage.modelCalls}</dd>
                    <dt>Tool calls</dt><dd>{d.usage.toolCalls}</dd>
                    <dt>Tokens</dt><dd>{(d.usage.inputTokens + d.usage.outputTokens).toLocaleString()}</dd>
                  </dl>
                </div>
                <div className="hv-pane">
                  <div className="hv-pane-head"><h3>Scheduled next</h3></div>
                  {d.triggers.upcoming.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No scheduled agent is active.</p> : (
                    <dl className="hv-props">
                      {d.triggers.upcoming.map((u) => (<Fragment key={u.agentId}><dt><Link href={`/agents/studio/${u.agentId}`}>{u.agentName}</Link></dt><dd>{when(u.at)}</dd></Fragment>))}
                    </dl>
                  )}
                </div>
                <div className="hv-pane">
                  <div className="hv-pane-head"><h3>AI model</h3></div>
                  <p style={{ fontSize: 12.5, color: "#43433F", margin: 0 }}>
                    {d.model?.configured?.length ? `Configured: ${d.model.configured.join(", ")}` : "No provider key is set on the server. Agents cannot run until one is."}
                  </p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

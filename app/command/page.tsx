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
import { PageHeader, Button, EmptyLine, ago } from "@/components/v32/ui";
import { IconAgents, IconArrowRight } from "@/components/v32/icons";
import { platformApi } from "@/lib/platform";
import { useActiveOrg, useWorkspace, PlatformErrorBanner, Loading, Kpi, MeasuredKpi, Section, ExecStatusChip, Chip, duration, when } from "@/components/platform/ui";

export default function CommandCenterPage() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "command-center", org], queryFn: () => platformApi.commandCenter(), refetchInterval: 15_000 });
  const d = q.data;
  const finance = ws.data?.apps.includes("finance");

  return (
    <DashboardLayout pageTitle="Command Center">
      <PageHeader
        title="Command Center"
        subtitle={ws.data?.organization.name ? `What ${ws.data.organization.name}'s agents are doing, measured from their runs` : "What your agents are doing, measured from their runs"}
        right={<>
          {finance && <Button href="/command/finance">Finance overview</Button>}
          <Button primary href="/agents/new">New agent</Button>
        </>}
      />

      <div className="pf-stack fade-once" style={{ marginTop: 22 }}>
        <PlatformErrorBanner error={q.error} what="The Command Center" />
        {q.isLoading && <Loading rows={4} height={70} />}

        {d && (
          <>
            {d.alerts.length > 0 && (
              <div className="pf-list" role="region" aria-label="Needs attention">
                {d.alerts.map((a, i) => {
                  const inner = (
                    <>
                      <Chip tone={a.severity === "high" ? "bad" : "warn"}>{a.severity === "high" ? "Needs attention" : "Check"}</Chip>
                      <div className="pf-row-main">
                        <div className="pf-row-title">{a.title}</div>
                        {a.detail && <div className="pf-row-sub">{a.detail}</div>}
                      </div>
                      {a.href && <IconArrowRight size={14} />}
                    </>
                  );
                  return a.href ? <Link key={i} href={a.href} className="pf-row">{inner}</Link> : <div key={i} className="pf-row">{inner}</div>;
                })}
              </div>
            )}

            <div className="pf-kpis">
              <Kpi label="Active agents" value={d.agents.active} href="/agents?view=active" />
              <Kpi label="Running now" value={d.executions.running} />
              <Kpi label="Queued" value={d.executions.queued} />
              <Kpi label="Waiting for approval" value={d.approvals.pending ?? d.executions.awaitingApproval} href="/approvals" />
              <Kpi label="Runs in the last 24 hours" value={d.executions.last24h} />
              <MeasuredKpi label="Success rate, last 7 days" m={d.executions.successRate} format={(v) => `${Math.round(v * 100)}%`} />
              <MeasuredKpi label="Median run time, last 7 days" m={d.executions.medianDurationMs} format={(v) => duration(v)} />
              <MeasuredKpi label="Model cost" m={d.usage.cost} format={(v) => String(v)} />
              <MeasuredKpi label="Business outcomes" m={d.quality.outcomes} format={(v) => String(v)} />
            </div>

            <div className="hv-detail">
              <Section title="Recent runs" aside={<Link href="/agents?view=all">All agents</Link>}>
                {d.recent.length === 0 ? (
                  <EmptyLine icon={<IconAgents size={17} />} title="No agent has run yet" body="Create an agent from a template or describe the work in a sentence, test it, then turn it on." action={<Button primary href="/agents/new">Create an agent</Button>} />
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

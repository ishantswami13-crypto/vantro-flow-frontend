"use client";

// Agent detail. Read from the same GET /api/os/agents the gallery uses: an
// agent is one of the workers that really runs in Starlane, addressed by its
// key. Unknown keys say so instead of rendering made-up detail. The backend
// keeps a run count and last run per agent, not a per-run log, so "Recent
// work" lists the missions this agent is assigned to (GET /api/os/missions)
// with their real state. Stopping an agent lives on Control, Decisions.

import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi, MISSION_STATE_LABEL, type AgentInfo, type Mission } from "@/lib/os";
import { useLoad } from "@/components/os/shared";
import { PageColumn, BackLink, SectionHead, Panel, Fact, cleanTitle, humaneError, missionTone, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, Lettermark } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconAgents, IconArrowRight, IconCheck, IconX } from "@/components/v32/icons";
import { formatRelative, formatDateTime, formatCount } from "@/lib/format";
import { agentStatus, modelLabel, PERMISSION_LABEL, PERMISSION_HINT } from "@/components/agents/shared";

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { data, error, loading, reload } = useLoad(() => osApi.agents());
  const missions = useLoad(() => osApi.missions());
  const a = data?.agents.find((x) => x.key === id);

  return (
    <DashboardLayout pageTitle="Agent">
      <PageColumn gap={20}>
        <BackLink href="/agents">Agents</BackLink>
        {loading && <HeaderSkeleton />}
        {!loading && !!error && <ErrorState className="ui-panel" title="This agent didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}
        {data && !a && (
          <EmptyState className="ui-panel" icon={<IconAgents size={17} />} title="This agent isn't running here" message="No agent with this name runs in your workspace. The ones that do are listed on Agents."
            action={<Link href="/agents" className="ui-btn ui-btn-secondary ui-btn-sm">All agents</Link>} />
        )}
        {a && <AgentBody a={a} missions={missions} />}
      </PageColumn>
    </DashboardLayout>
  );
}

type MissionsLoad = { data: { missions: Mission[] } | null; error: unknown; loading: boolean; reload: () => void };

function AgentBody({ a, missions }: { a: AgentInfo; missions: MissionsLoad }) {
  const st = agentStatus(a);
  const version = (a as AgentInfo & { version?: string | null }).version;
  const work = (missions.data?.missions || []).filter((m) => m.assigned?.agent === a.key).slice(0, 6);

  return (
    <>
      <div className="fade-once flex items-start justify-between flex-wrap" style={{ gap: 16 }}>
        <div className="flex items-start min-w-0" style={{ gap: 14 }}>
          <Lettermark letter={a.name} size={44} />
          <div className="min-w-0">
            <PageHeader title={a.name} subtitle={a.purpose} />
            <div className="flex items-center flex-wrap" style={{ gap: "6px 10px", marginTop: 10, fontSize: 12.5, color: "var(--ink-3)" }}>
              <StatusChip tone={st.tone}>{st.label}</StatusChip>
              <span>{modelLabel(a.model)}</span>
              {version && <><span aria-hidden="true" style={{ color: "var(--line-strong)" }}>·</span><span>Version {version}</span></>}
            </div>
          </div>
        </div>
        <Link href="/control/decisions" className="ui-btn ui-btn-secondary">Pause or stop</Link>
      </div>

      {a.status === "STOPPED" && a.stoppedReason && (
        <div role="status" style={{ fontSize: 13, color: "var(--body)", background: "rgb(var(--tk-critical) / 0.08)", border: "1px solid rgb(var(--tk-critical) / 0.22)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
          Stopped: {a.stoppedReason}
        </div>
      )}

      <div className="grid min-[900px]:grid-cols-[minmax(0,1fr)_300px]" style={{ gap: 28, alignItems: "start" }}>
        <div className="flex flex-col min-w-0" style={{ gap: 28 }}>
          <section>
            <SectionHead title="What it does" />
            <Panel pad={false}>
              {a.performs.length ? a.performs.map((x, i) => (
                <div key={x} className="flex items-start" style={{ gap: 12, padding: "11px 18px", borderTop: i ? "1px solid var(--line)" : 0, fontSize: 13.5, color: "var(--body)" }}>
                  <span style={{ color: "var(--ink-3)", marginTop: 2 }}><IconArrowRight size={13} /></span>{x}
                </div>
              )) : <p style={{ margin: 0, padding: "12px 18px", fontSize: 13, color: "var(--ink-3)" }}>None recorded.</p>}
            </Panel>
          </section>

          <section>
            <SectionHead title="Permissions" hint="Granted by Starlane's policy, not by the agent. Nothing it prepares leaves Starlane without a person approving it." />
            <div className="grid md:grid-cols-2" style={{ gap: 12 }}>
              <Panel pad={false}>
                <div style={{ padding: "12px 18px 4px", fontSize: 12, color: "var(--ink-3)" }}>May</div>
                {a.permissions.length ? a.permissions.map((p) => (
                  <div key={p} className="flex items-start" style={{ gap: 10, padding: "9px 18px" }}>
                    <span style={{ color: "var(--positive)", marginTop: 2 }}><IconCheck size={14} /></span>
                    <span className="min-w-0">
                      <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{PERMISSION_LABEL[p] || p}</span>
                      {PERMISSION_HINT[p] && <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginTop: 1, lineHeight: 1.5 }}>{PERMISSION_HINT[p]}</span>}
                    </span>
                  </div>
                )) : <p style={{ margin: 0, padding: "8px 18px", fontSize: 13, color: "var(--ink-3)" }}>No permission granted.</p>}
                <div style={{ height: 8 }} />
              </Panel>
              <Panel pad={false}>
                <div style={{ padding: "12px 18px 4px", fontSize: 12, color: "var(--ink-3)" }}>Cannot</div>
                {a.cannot.length ? a.cannot.map((x) => (
                  <div key={x} className="flex items-start" style={{ gap: 10, padding: "9px 18px", fontSize: 13.5, color: "var(--body)" }}>
                    <span style={{ color: "var(--ink-3)", marginTop: 2 }}><IconX size={14} /></span>{x}
                  </div>
                )) : <p style={{ margin: 0, padding: "8px 18px", fontSize: 13, color: "var(--ink-3)" }}>None recorded.</p>}
                <div style={{ height: 8 }} />
              </Panel>
            </div>
          </section>

          <section>
            <SectionHead title="Recent work" hint="Missions this agent works on, with their current state. Starlane keeps a run count per agent, not a log of each run." />
            {missions.loading ? (
              <Panel><div role="status" aria-busy="true" aria-label="Loading missions" className="grid" style={{ gap: 8 }}><div className="skeleton" style={{ height: 12, width: "60%" }} /><div className="skeleton" style={{ height: 12, width: "40%" }} /></div></Panel>
            ) : missions.error ? (
              <Panel><p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>Missions didn't load. <button type="button" className="underline" style={{ background: "none", border: 0, padding: 0, color: "var(--ink)", cursor: "pointer" }} onClick={() => missions.reload()}>Try again</button></p></Panel>
            ) : work.length === 0 ? (
              <Panel><p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>No mission is assigned to this agent.</p></Panel>
            ) : (
              <Panel pad={false}>
                {work.map((m, i) => {
                  const inner = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{cleanTitle(m.title)}</div>
                        <div className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                          {m.lastRun ? `Last run ${formatRelative(m.lastRun.startedAt)}` : m.updatedAt ? `Updated ${formatRelative(m.updatedAt)}` : "Not started"}
                        </div>
                      </div>
                      <StatusChip tone={missionTone(m.state)}>{MISSION_STATE_LABEL[m.state]}</StatusChip>
                    </>
                  );
                  const style: React.CSSProperties = { gap: 12, padding: "12px 18px", minHeight: 52, borderTop: i ? "1px solid var(--line)" : 0 };
                  return <Link key={m.id} href={m.source === "WORKFLOW" ? "/missions" : m.href} className="row-hover flex items-center" style={style}>{inner}</Link>;
                })}
              </Panel>
            )}
          </section>
        </div>

        <aside className="flex flex-col min-w-0" style={{ gap: 28 }}>
          <section>
            <SectionHead title="Activity" />
            <Panel style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div>
                <Fact first label="Runs">{formatCount(a.runs)}</Fact>
                <Fact label="Last run">{a.lastRunAt ? <span title={formatDateTime(a.lastRunAt)}>{formatRelative(a.lastRunAt)}</span> : "Not yet"}</Fact>
                <Fact label="Budget">{a.budget || "Not known yet"}</Fact>
              </div>
            </Panel>
          </section>
          <section>
            <SectionHead title="Measured performance" />
            <Panel>
              <p style={{ margin: 0, fontSize: 13, color: a.performance ? "var(--body)" : "var(--ink-2)", lineHeight: 1.55 }}>
                {a.performance || (a.runs ? "Not measured yet. Performance is shown once outcomes are checked against your books." : "Not known yet. It has not run on your data.")}
              </p>
            </Panel>
          </section>
          <section>
            <SectionHead title="Approval" />
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
              Nothing leaves Starlane without a person approving it. Approvals wait on <Link className="underline" href="/control/approvals">Control</Link>.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading agent" className="flex items-center" style={{ gap: 14 }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 11 }} />
      <div className="grid flex-1" style={{ gap: 8 }}>
        <div className="skeleton" style={{ height: 18, width: 220 }} />
        <div className="skeleton" style={{ height: 10, width: "50%" }} />
      </div>
    </div>
  );
}

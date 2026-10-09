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
import { PageColumn, BackLink, cleanTitle, humanDates, humaneError, missionTone, NETWORK_ERROR } from "@/components/os/missions/ui";
import { PageHeader, SectionTitle, Figure, Sep, Chevron } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconAgents } from "@/components/v32/icons";
import { formatRelative, formatDateTime, formatCount } from "@/lib/format";
import { agentStatus, autonomyOf, modelLabel, openWorkOf, PERMISSION_LABEL, PERMISSION_HINT } from "@/components/agents/shared";

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { data, error, loading, reload } = useLoad(() => osApi.agents());
  const missions = useLoad(() => osApi.missions());
  const a = data?.agents.find((x) => x.key === id);

  return (
    <DashboardLayout pageTitle="Agent">
      <PageColumn gap={16}>
        <BackLink href="/agents">Agents</BackLink>
        {loading && <HeaderSkeleton />}
        {!loading && !!error && <ErrorState title="This agent didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={reload} />}
        {data && !a && (
          <EmptyState icon={<IconAgents size={17} />} title="This agent isn't running here" message="No agent with this name runs in your workspace. The ones that do are listed on Agents."
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
  const auto = autonomyOf(a);
  const version = (a as AgentInfo & { version?: string | null }).version;
  const all = missions.data?.missions || [];
  const open = openWorkOf(a.key, all);
  const done = all.filter((m) => m.assigned?.agent === a.key && !open.includes(m)).slice(0, 4);

  return (
    <div className="flex flex-col" style={{ maxWidth: 840, gap: 32 }}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        <PageHeader title={a.name} subtitle={a.purpose} right={<Link href="/control/decisions" className="ui-btn ui-btn-secondary">Pause or stop</Link>} />
        <div className="flex items-center flex-wrap" style={{ gap: "6px 10px", fontSize: 12.5, color: "var(--ink-3)" }}>
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
          <Sep />
          <span title={a.lastRunAt ? formatDateTime(a.lastRunAt) : undefined}>{a.lastRunAt ? `Last ran ${formatRelative(a.lastRunAt)}` : "Has not run yet"}</span>
          <Sep />
          <span>{modelLabel(a.model)}</span>
          {version && <><Sep /><span>Version <span className="num">{version}</span></span></>}
        </div>
        {a.status === "STOPPED" && a.stoppedReason && (
          <p role="status" className="wk-attn" style={{ margin: "6px 0 0", padding: "4px 0", fontSize: 13, color: "var(--critical)" }}>
            Stopped: {a.stoppedReason}
          </p>
        )}
      </div>

      <section aria-label="At a glance" className="ag-strip">
        <Figure value={formatCount(a.runs)} label="Runs recorded" />
        <Fact label="Autonomy" value={auto ? auto.label : "No permission"} hint={auto?.hint} />
        <Fact label="Budget" value={a.budget || "Not known yet"} span />
      </section>

      <section>
        <SectionTitle className="section-label-lead">Current work{open.length ? <span className="wk-count">{open.length}</span> : null}</SectionTitle>
        {missions.loading ? (
          <div role="status" aria-busy="true" aria-label="Loading missions" className="grid" style={{ gap: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}><div className="skeleton" style={{ height: 11, width: "60%" }} /><div className="skeleton" style={{ height: 11, width: "40%" }} /></div>
        ) : missions.error ? (
          <p className="wk-empty" style={{ borderTop: "1px solid var(--line)" }}>Missions didn&apos;t load, so its current work isn&apos;t known. <button type="button" className="underline" style={{ background: "none", border: 0, padding: 0, color: "var(--ink)", cursor: "pointer" }} onClick={() => missions.reload()}>Try again</button></p>
        ) : open.length === 0 ? (
          <p className="wk-empty" style={{ borderTop: "1px solid var(--line)" }}>{a.status === "STOPPED" ? "Stopped. It takes no work until it is resumed from Control." : "No open mission. It works again on its next run."}</p>
        ) : (
          <MissionRows list={open} attention />
        )}
        {done.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="wk-lede" style={{ marginBottom: 6, fontSize: 12.5 }}>Finished</div>
            <MissionRows list={done} />
          </div>
        )}
        <p className="meta" style={{ margin: "10px 0 0", lineHeight: 1.55 }}>Starlane keeps a run count per agent, not a log of each run, so its work is shown through the missions it is assigned to.</p>
      </section>

      <section>
        <SectionTitle>Measured reliability</SectionTitle>
        <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <p className="prose-measure" style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: a.performance ? "var(--ink)" : "var(--ink-2)" }}>
            {a.performance || (a.runs ? "Not measured yet. Reliability is shown once outcomes are checked against your books." : "Not known yet. It has not run on your data.")}
          </p>
        </div>
      </section>

      <section>
        <SectionTitle>What it does</SectionTitle>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--line)" }}>
          {a.performs.length ? a.performs.map((x, i) => (
            <li key={x} className="flex items-baseline" style={{ gap: 14, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, color: "var(--ink)" }}>
              <span className="num" style={{ width: 16, fontSize: 12, color: "var(--ink-3)" }}>{i + 1}</span>{x}
            </li>
          )) : <li className="wk-empty">None recorded.</li>}
        </ol>
      </section>

      <section>
        <SectionTitle>Permissions</SectionTitle>
        <p className="meta" style={{ margin: "-4px 0 10px", lineHeight: 1.55 }}>Granted by Starlane&apos;s policy, not by the agent. Nothing it prepares leaves Starlane without a person approving it.</p>
        <div className="grid md:grid-cols-2" style={{ columnGap: 40, borderTop: "1px solid var(--line-strong)" }}>
          <div>
            <div className="ag-perm-head">May</div>
            {a.permissions.length ? a.permissions.map((p) => (
              <div key={p} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{PERMISSION_LABEL[p] || p}</div>
                {PERMISSION_HINT[p] && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 1, lineHeight: 1.5 }}>{PERMISSION_HINT[p]}</div>}
              </div>
            )) : <p style={{ margin: 0, padding: "8px 0", fontSize: 13, color: "var(--ink-3)" }}>No permission granted.</p>}
          </div>
          <div>
            <div className="ag-perm-head">Cannot</div>
            {a.cannot.length ? a.cannot.map((x) => (
              <div key={x} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, color: "var(--ink)" }}>{x}</div>
            )) : <p style={{ margin: 0, padding: "8px 0", fontSize: 13, color: "var(--ink-3)" }}>None recorded.</p>}
          </div>
        </div>
      </section>

      <p className="meta" style={{ margin: 0, lineHeight: 1.6 }}>
        Nothing leaves Starlane without a person approving it. Approvals wait on <Link className="underline" href="/control/approvals">Control</Link>.
      </p>
    </div>
  );
}

/** A text fact in the at-a-glance strip, sized to sit beside a Figure. */
function Fact({ label, value, hint, span }: { label: string; value: string; hint?: string; span?: boolean }) {
  return (
    <div className={`min-w-0${span ? " md:col-span-2" : ""}`}>
      <div title={hint} style={{ fontSize: 14.5, lineHeight: "25px", fontWeight: 500, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MissionRows({ list, attention }: { list: Mission[]; attention?: boolean }) {
  return (
    <div className="wk-list" style={{ borderTop: "1px solid var(--line)" }}>
      {list.map((m) => {
        const waits = attention && (m.state === "WAITING_FOR_APPROVAL" || m.state === "BLOCKED" || m.state === "WAITING_FOR_INFORMATION");
        const why = m.stateReason || m.objective;
        return (
          <Link key={m.id} href={m.source === "WORKFLOW" ? "/missions" : m.href} className={`wk-row${waits ? " wk-attn" : ""}`} style={{ gridTemplateColumns: "minmax(0,1fr) 190px 92px" }}>
            <div className="min-w-0">
              <div className="truncate" style={{ fontSize: 13.5, fontWeight: attention ? 500 : 400, color: "var(--ink)" }}>{cleanTitle(m.title)}</div>
              {attention && why && <div className="wk-sub truncate">{humanDates(why)}</div>}
            </div>
            <div className="mt-1 md:mt-0"><StatusChip tone={missionTone(m.state)}>{MISSION_STATE_LABEL[m.state]}</StatusChip></div>
            <div className="hidden md:flex items-center justify-end" style={{ gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
              <span title={m.lastRun ? formatDateTime(m.lastRun.startedAt) : m.updatedAt ? formatDateTime(m.updatedAt) : undefined}>
                {m.lastRun ? formatRelative(m.lastRun.startedAt) : m.updatedAt ? formatRelative(m.updatedAt) : "Not started"}
              </span>
              <Chevron size={13} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading agent" className="grid" style={{ gap: 8, maxWidth: 840 }}>
      <div className="skeleton" style={{ height: 18, width: 220 }} />
      <div className="skeleton" style={{ height: 10, width: "50%" }} />
    </div>
  );
}

"use client";

// Agent run detail. The backend keeps a run count and the last run time per
// agent (GET /api/os/agents), but no per-run record that a run id could
// resolve to: no step trace and no proposed-action card per run. So this
// page says that plainly and points to what does exist, rather than
// fabricating progress steps or "agent is thinking" activity.

import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi } from "@/lib/os";
import { useLoad } from "@/components/os/shared";
import { PageColumn, BackLink, Panel, Fact } from "@/components/os/missions/ui";
import { PageHeader, IconTile } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { IconHistory } from "@/components/v32/icons";
import { formatRelative, formatCount } from "@/lib/format";
import { agentStatus } from "@/components/agents/shared";

export default function AgentRunDetail() {
  const params = useParams<{ id: string; runId: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { data } = useLoad(() => osApi.agents());
  const a = data?.agents.find((x) => x.key === id);
  const back = a ? `/agents/${encodeURIComponent(a.key)}` : "/agents";

  return (
    <DashboardLayout pageTitle="Agent run">
      <PageColumn gap={20}>
        <BackLink href={back}>{a ? a.name : "Agents"}</BackLink>
        <PageHeader title="Run details aren't recorded" subtitle="Starlane counts each agent's runs, but does not keep a step-by-step log of a single run yet." />
        <div className="grid min-[900px]:grid-cols-[minmax(0,1fr)_300px]" style={{ gap: 28, alignItems: "start" }}>
          <Panel style={{ padding: "18px 20px" }}>
            <div className="flex items-start" style={{ gap: 14 }}>
              <IconTile size={38}><IconHistory size={17} /></IconTile>
              <div className="min-w-0">
                <div style={{ fontSize: 14, color: "var(--ink)" }}>Nothing to show for this run</div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 560 }}>
                  When run logs exist, this page will show each step, the action it proposed with its evidence, and where it stands. Until then, an agent&apos;s work is visible through the missions it is assigned to and the approvals waiting for you.
                </p>
                <div className="flex flex-wrap" style={{ gap: 8, marginTop: 14 }}>
                  <Link href={back} className="ui-btn ui-btn-secondary ui-btn-sm">{a ? `Open ${a.name}` : "All agents"}</Link>
                  <Link href="/missions" className="ui-btn ui-btn-ghost ui-btn-sm">Missions</Link>
                </div>
              </div>
            </div>
          </Panel>
          {a && (
            <Panel style={{ paddingTop: 6, paddingBottom: 6 }}>
              <div>
                <Fact first label="Agent">{a.name}</Fact>
                <Fact label="Status"><StatusChip tone={agentStatus(a).tone}>{agentStatus(a).label}</StatusChip></Fact>
                <Fact label="Runs recorded">{formatCount(a.runs)}</Fact>
                <Fact label="Last run">{a.lastRunAt ? formatRelative(a.lastRunAt) : "Not yet"}</Fact>
              </div>
            </Panel>
          )}
        </div>
      </PageColumn>
    </DashboardLayout>
  );
}

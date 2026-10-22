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
import { PageColumn, BackLink } from "@/components/os/missions/ui";
import { PageHeader, Figure } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
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
      <PageColumn gap={16}>
        <BackLink href={back}>{a ? a.name : "Agents"}</BackLink>
        <div className="flex flex-col" style={{ maxWidth: 840, gap: 32 }}>
          <PageHeader title="Run details aren't recorded" subtitle="Starlane counts each agent's runs, but does not keep a step-by-step log of a single run yet." />
          {a && (
            <section aria-label="Activity" className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <div className="min-w-0"><div style={{ fontSize: 14, color: "var(--ink)", paddingTop: 2 }}>{a.name}</div><div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>Agent</div></div>
              <div className="min-w-0"><div style={{ paddingTop: 3 }}><StatusChip tone={agentStatus(a).tone}>{agentStatus(a).label}</StatusChip></div><div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>Status</div></div>
              <Figure value={formatCount(a.runs)} label="Runs recorded" />
              <Figure value={a.lastRunAt ? formatRelative(a.lastRunAt) : "Not yet"} label="Last run" />
            </section>
          )}
          <section>
            <p className="prose-measure" style={{ margin: 0, fontSize: 13.5 }}>
              When run logs exist, this page will show each step, the action it proposed with its evidence, and where it stands. Until then, an agent&apos;s work is visible through the missions it is assigned to and the approvals waiting for you.
            </p>
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
              <Link href={back} className="ui-btn ui-btn-secondary">{a ? `Open ${a.name}` : "All agents"}</Link>
              <Link href="/missions" className="ui-btn ui-btn-ghost">View missions</Link>
            </div>
          </section>
        </div>
      </PageColumn>
    </DashboardLayout>
  );
}

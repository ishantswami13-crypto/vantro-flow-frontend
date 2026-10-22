"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MissionsList, missionCount, type MissionFilter } from "@/components/os/MissionsList";
import { WorkflowsPanel } from "@/components/os/MissionsPanels";
import { OutreachSummary } from "@/components/outreach/OutreachPanels";
import { PageHeader, Subnav } from "@/components/v32/ui";
import { IconPlus } from "@/components/v32/icons";
import { useLoad } from "@/components/os/shared";
import { osApi } from "@/lib/os";

// Missions answers one question: what is Starlane handling? The rows come
// from GET /api/os/missions (decisions you told Starlane to handle, workflows
// you deployed and collections missions, with state and verified outcome).
// The Workflows tab is where deployed workflows are run, paused or described
// in a sentence.
type Tab = MissionFilter | "workflows";

export default function MissionsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const { data, error, loading, reload } = useLoad(() => osApi.missions());
  // Agent names for each mission's assigned worker; keys still read if this fails.
  const agents = useLoad(() => osApi.agents());
  const agentNames = Object.fromEntries((agents.data?.agents || []).map((a) => [a.key, a.name]));
  const all = data?.missions || [];
  const n = (k: MissionFilter) => (data ? missionCount(all, k) : null);
  return (
    <DashboardLayout pageTitle="Missions">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
        <PageHeader
          title="Missions"
          subtitle="What Starlane is handling for you, where each one stands, and whether it worked."
          right={<Link href="/missions/new" className="ui-btn ui-btn-primary"><IconPlus size={14} />New mission</Link>}
        >
          <div style={{ marginTop: 20 }}>
            <Subnav
              label="Mission views"
              active={tab}
              onChange={(k) => setTab(k as Tab)}
              items={[
                { key: "active", label: "Active", count: n("active") },
                { key: "at_risk", label: "At risk", count: n("at_risk") },
                { key: "completed", label: "Completed", count: n("completed") },
                { key: "workflows", label: "Workflows" },
              ]}
            />
          </div>
        </PageHeader>
        {tab === "workflows" ? (
          <WorkflowsPanel />
        ) : (
          <MissionsList all={all} filter={tab} loading={loading} error={error} agentNames={agentNames} onRetry={reload} onOpenWorkflows={() => setTab("workflows")} />
        )}
        {tab === "active" && (
          <section className="mis-outreach">
            <OutreachSummary context="missions" />
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

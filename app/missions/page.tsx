"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MissionsList, missionCount, type MissionFilter } from "@/components/os/MissionsList";
import { WorkflowsPanel } from "@/components/os/MissionsPanels";
import { OutreachSummary } from "@/components/outreach/OutreachPanels";
import { PageHeader, Subnav, Button } from "@/components/v32/ui";
import { IconPlus } from "@/components/v32/icons";
import { useLoad } from "@/components/os/shared";
import { osApi } from "@/lib/os";

// Missions answers one question: what is Starlane handling? The cards come
// from GET /api/os/missions (decisions you told Starlane to handle and
// workflows you deployed, with state and verified outcome). The Workflows
// tab is where deployed workflows are run, paused or described in a sentence.
type Tab = MissionFilter | "workflows";

export default function MissionsPage() {
  const [tab, setTab] = useState<Tab>("active");
  const { data, error, loading } = useLoad(() => osApi.missions());
  const all = data?.missions || [];
  const n = (k: MissionFilter) => (data ? missionCount(all, k) : null);
  return (
    <DashboardLayout pageTitle="Missions">
      <PageHeader
        title="Missions"
        subtitle="What Starlane is handling, and whether it worked."
        right={<Button primary small href="/missions/new"><IconPlus size={13} />New mission</Button>}
      />
      <Subnav
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        items={[
          { key: "active", label: "Active", count: n("active") },
          { key: "at_risk", label: "At risk", count: n("at_risk") },
          { key: "completed", label: "Completed", count: n("completed") },
          { key: "workflows", label: "Workflows" },
        ]}
      />
      {tab === "workflows" ? (
        <WorkflowsPanel />
      ) : (
        <>
          <MissionsList all={all} filter={tab} loading={loading} error={error} />
          {tab === "active" && <OutreachSummary context="missions" />}
        </>
      )}
    </DashboardLayout>
  );
}

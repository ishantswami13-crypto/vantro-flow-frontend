"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MissionsList, missionCount, type MissionFilter } from "@/components/os/MissionsList";
import { WorkflowsPanel } from "@/components/os/MissionsPanels";
import { OutreachSummary } from "@/components/outreach/OutreachPanels";
import { PageHeader, Button } from "@/components/v32/ui";
import StarlaneMark from "@/components/brand/StarlaneMark";
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
  // Agent names for each mission's assigned worker; keys still read if this fails.
  const agents = useLoad(() => osApi.agents());
  const agentNames = Object.fromEntries((agents.data?.agents || []).map((a) => [a.key, a.name]));
  const all = data?.missions || [];
  const n = (k: MissionFilter) => (data ? missionCount(all, k) : null);
  return (
    <DashboardLayout pageTitle="Tasks">
      <PageHeader
        title="Tasks"
        subtitle="What Starlane is handling, and whether it worked."
        right={<Button primary small href="/missions/new"><IconPlus size={13} />New task</Button>}
      />
      <div className="sp-summary" style={{ margin: "4px 0 0" }}>
        <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
        {loading ? "Loading what Starlane is handling…"
          : all.length === 0 ? "Starlane is not handling anything yet. Choose Handle it on a decision and it shows here."
          : `Starlane is handling ${n("active")} task${n("active") === 1 ? "" : "s"} for you${(n("at_risk") || 0) > 0 ? `; ${n("at_risk")} need${n("at_risk") === 1 ? "s" : ""} you` : ""}.`}
      </div>
      <div className="sp-stats" style={{ marginBottom: 0 }}>
        <div className="sp-stat"><div className="sp-stat-n">{n("active") ?? "—"}</div><div className="sp-stat-l">Active</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{n("at_risk") ?? "—"}</div><div className="sp-stat-l">Need you</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{n("completed") ?? "—"}</div><div className="sp-stat-l">Completed</div></div>
      </div>
      <nav aria-label="Secondary" className="sp-pills" style={{ marginBottom: -6 }}>
        {([["active", "Active"], ["at_risk", "At risk"], ["completed", "Completed"], ["workflows", "Workflows"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={tab === k} className={`sp-pill ${tab === k ? "is-on" : ""}`} onClick={() => setTab(k)}>
            {label}{k !== "workflows" && n(k as MissionFilter) != null ? ` (${n(k as MissionFilter)})` : ""}
          </button>
        ))}
      </nav>
      {tab === "workflows" ? (
        <WorkflowsPanel />
      ) : (
        <>
          <MissionsList all={all} filter={tab} loading={loading} error={error} agentNames={agentNames} />
          {tab === "active" && <OutreachSummary context="missions" />}
        </>
      )}
    </DashboardLayout>
  );
}

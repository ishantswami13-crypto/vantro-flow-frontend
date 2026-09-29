"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { MissionsList } from "@/components/os/MissionsList";
import { WorkflowsPanel } from "@/components/os/MissionsPanels";

// Missions answers one question: what is Starlane handling? The list comes
// from GET /api/os/missions (decisions you told Starlane to handle and
// workflows you deployed, with state and verified outcome). Below it, the
// deployed workflows can be run, paused or described in a sentence.
export default function MissionsPage() {
  return (
    <DashboardLayout pageTitle="Missions">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Missions
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#63635F" }}>What Starlane is handling, and whether it worked.</p>
        </div>
        <MissionsList />
        <WorkflowsPanel />
      </div>
    </DashboardLayout>
  );
}

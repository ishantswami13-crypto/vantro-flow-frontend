"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiUsers } from "react-icons/fi";

// Previously rendered lib/atlas/atlasAgentRegistry.js's 935-line hardcoded
// mock registry as if it were real, live agent state. There is no real
// agent backend yet (no api.agents.* call exists in lib/api.ts), so per
// the hard constraint against fabricated business data, this route now
// shows an honest empty state instead -- following the sentence-case,
// no-invented-numbers empty-state pattern from
// STARLANE_FRONTEND_HANDOFF.md §8 (e.g. Control's "No other users have
// been added yet."). lib/atlas/ itself is left in place, since other
// orphaned routes may still depend on it.
export default function AgentsPage() {
  return (
    <DashboardLayout pageTitle="Agents">
      <div className="max-w-xl mx-auto mt-16 text-center px-4">
        <FiUsers size={28} className="mx-auto mb-4" style={{ color: "#8A8A86" }} />
        <h1 className="v32-page-title mb-3">Agents</h1>
        <p className="v32-body">
          No agents have been configured yet. Once agent configuration is available, agents you create will appear
          here with their objective, scope, owner, and granted permission level — nothing is shown until it's real.
        </p>
      </div>
    </DashboardLayout>
  );
}

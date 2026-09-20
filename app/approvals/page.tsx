"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiCheckSquare } from "react-icons/fi";

// Previously rendered lib/atlas/atlasAgentRegistry.js's hardcoded mock
// agent/workflow counts as if they were a real approvals queue. There is
// no real approvals backend yet, so per the hard constraint against
// fabricated business data this route now shows the honest empty state
// verbatim from STARLANE_FRONTEND_HANDOFF.md §8 (Control — Approvals
// queue): "No other actions are waiting for a decision right now."
// lib/atlas/ itself is left in place for other orphaned routes.
export default function ApprovalsPage() {
  return (
    <DashboardLayout pageTitle="Approvals">
      <div className="max-w-xl mx-auto mt-16 text-center px-4">
        <FiCheckSquare size={28} className="mx-auto mb-4" style={{ color: "#8A8A86" }} />
        <h1 className="v32-page-title mb-3">Approvals</h1>
        <p className="v32-body">No other actions are waiting for a decision right now.</p>
      </div>
    </DashboardLayout>
  );
}

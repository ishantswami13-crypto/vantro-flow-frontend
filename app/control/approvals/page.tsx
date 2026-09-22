"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { FiCheckSquare } from "react-icons/fi";

// Moved here from app/approvals/page.tsx (the wrong, unnested path) to the
// correct route the handoff specifies (§1: ControlApprovals.dc.html →
// /control/approvals). /approvals now redirects here, same pattern as
// /connections → /sources.
//
// There is no real approvals backend yet (no pending-action-approval
// endpoint), so per the hard constraint against fabricated business data
// this route shows the honest empty state verbatim from
// STARLANE_FRONTEND_HANDOFF.md §8 (Control — Approvals queue): "No other
// actions are waiting for a decision right now."
//
// Layout per §6 (ControlApprovals two-column split): left flex:1 queue
// list, right flex:1;max-width:380px detail rail — the widest rail in the
// system. With an empty queue there is nothing to select, so the detail
// rail shows its own honest placeholder rather than a fabricated example.
export default function ControlApprovalsPage() {
  const [hasSelection] = useState(false);

  return (
    <DashboardLayout pageTitle="Approvals">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="fade-once">
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "#63635F" }}>
            Actions waiting on your decision before Starlane carries them out.
          </p>
        </div>

        <ControlSubnav active="approvals" />

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            <EmptyState
              icon={<FiCheckSquare size={28} style={{ color: "#8A8A86" }} />}
              title="No other actions are waiting for a decision right now."
              message=""
            />
          </div>

          <div
            style={{
              flex: 1, maxWidth: 380, minWidth: 280, borderLeft: "1px solid #EBEAE6",
              paddingLeft: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {!hasSelection && (
              <p className="text-[13px] text-center" style={{ color: "#8A8A86", maxWidth: 260 }}>
                Select an item from the queue to see its details here.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

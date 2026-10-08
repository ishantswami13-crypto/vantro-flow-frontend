"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { OutreachBody } from "@/components/outreach/OutreachPanels";

// Outreach: review the campaign, press START, and Starlane handles sending,
// pacing, bounces, opt-outs and follow-ups within policy. Everything here is
// read from /api/outreach; the backend decides what may be sent and when.
export default function OutreachPage() {
  return (
    <DashboardLayout pageTitle="Outreach">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, color: "var(--text-primary)" , letterSpacing: "-0.01em"}}>Outreach</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--text-secondary)" }}>
            Review the campaign, press START. Starlane sends within your limits and stops the moment you say so. It is also listed in{" "}
            <Link href="/missions" className="underline">Missions</Link>.
          </p>
        </div>
        <OutreachBody />
      </div>
    </DashboardLayout>
  );
}

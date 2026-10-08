"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { OutreachBody } from "@/components/outreach/OutreachPanels";
import { PageColumn } from "@/components/os/missions/ui";
import { PageHeader } from "@/components/v32/ui";

// Outreach: review the campaign, press Start, and Starlane handles sending,
// pacing, bounces, opt-outs and follow-ups within policy. Everything here is
// read from /api/outreach; the backend decides what may be sent and when.
export default function OutreachPage() {
  return (
    <DashboardLayout pageTitle="Outreach">
      <PageColumn gap={24}>
        <PageHeader
          title="Outreach"
          subtitle={<>Review the campaign, then press Start. Starlane sends within your limits and stops the moment you say so. It is also listed in <Link href="/missions" className="underline">Missions</Link>.</>}
        />
        <OutreachBody />
      </PageColumn>
    </DashboardLayout>
  );
}

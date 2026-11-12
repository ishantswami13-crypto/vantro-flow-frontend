"use client";

// Activity: what happened in this organization's workspace (agents
// created, published and run, approvals decided, knowledge added, settings
// changed), from the server's audit events. Admins see the full audit log
// in Organization settings.

import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button } from "@/components/v32/ui";
import AuditList from "@/components/platform/AuditList";
import { useWorkspace, can } from "@/components/platform/ui";

export default function ActivityPage() {
  const ws = useWorkspace();
  return (
    <DashboardLayout pageTitle="Activity">
      <PageHeader eyebrow="Organization" divider title="Activity" subtitle="What changed in this organization, newest first" right={can(ws.data, "audit.view") ? <Button href="/organization?tab=audit">Full audit log</Button> : undefined} />
      <div className="fade-once" style={{ marginTop: 18 }}><AuditList kind="activity" /></div>
    </DashboardLayout>
  );
}

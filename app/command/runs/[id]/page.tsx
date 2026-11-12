"use client";

// One agent run, as recorded by the execution engine.

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button } from "@/components/v32/ui";
import { useExecution, RunBody, RunSide } from "@/components/platform/RunView";
import { useWorkspace, can, PlatformErrorBanner, Loading } from "@/components/platform/ui";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const ws = useWorkspace();
  const q = useExecution(id);
  const ex = q.data;
  return (
    <DashboardLayout pageTitle={ex ? `Run of ${ex.agentName}` : "Run"}>
      <PageHeader
        title={ex ? ex.agentName : "Run"}
        subtitle={ex ? `${ex.mode === "test" ? "Test run" : "Live run"} ${id.slice(0, 8)}` : undefined}
        right={<Button href="/command">Command Center</Button>}
      />
      <div style={{ marginTop: 22 }}>
        {q.isLoading && <Loading rows={4} height={64} />}
        <PlatformErrorBanner error={q.error} what="This run" />
        {ex && (
          <div className="hv-detail">
            <RunBody ex={ex} />
            <RunSide ex={ex} canRun={can(ws.data, "agents.run")} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

// Wraps a screen that belongs to an optional application (Finance,
// Procurement, Sales). The server decides through GET /api/platform/apps/:key/access.
// When the platform is not installed yet (503) or the backend predates it
// (404), the screen is shown exactly as before, so nobody loses a page
// during the rollout.

import React from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { platformApi } from "@/lib/platform";
import { useActiveOrg, isPlatformNotReady, messageOf } from "@/components/platform/ui";
import { ErrorBanner, EmptyLine, SkeletonRows, Button } from "@/components/v32/ui";

export default function AppGate({ app, title, children }: { app: string; title: string; children: React.ReactNode }) {
  const org = useActiveOrg();
  const q = useQuery({
    queryKey: ["platform", "app-access", app, org],
    queryFn: () => platformApi.appAccess(app),
    staleTime: 60_000,
    retry: false,
  });
  if (q.isLoading) return <DashboardLayout pageTitle={title}><SkeletonRows rows={4} height={64} /></DashboardLayout>;
  if (q.error) {
    if (isPlatformNotReady(q.error)) return <>{children}</>;
    return <DashboardLayout pageTitle={title}><ErrorBanner>This page could not check its access: {messageOf(q.error)}</ErrorBanner></DashboardLayout>;
  }
  if (q.data?.enabled) return <>{children}</>;
  const name = q.data?.app?.name || app;
  return (
    <DashboardLayout pageTitle={title}>
      <div style={{ padding: "40px 0", maxWidth: 560 }}>
        <EmptyLine
          title={`${name} is not turned on for this organization`}
          body={q.data?.canEnable ? `${title} is part of the ${name} application. Turn it on in Organization settings to use this page.` : `${title} is part of the ${name} application. Ask an admin of this organization to turn it on.`}
          action={q.data?.canEnable ? <Button primary href="/organization?tab=apps">Open applications</Button> : undefined}
        />
      </div>
    </DashboardLayout>
  );
}

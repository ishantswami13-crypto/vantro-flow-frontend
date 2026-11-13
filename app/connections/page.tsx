"use client";

// Connections: every system Starlane can reach, with its real state.
// Connected means a live connection reported healthy; Configuration required
// means the integration exists but needs a credential or setting; Available
// can be connected now; Planned is not built yet and says so. Setting one up
// happens in Data sources (/sources), which this page links to.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Subnav } from "@/components/v32/ui";
import { platformApi, type Connection } from "@/lib/platform";
import { useActiveOrg, PlatformErrorBanner, isPlatformNotReady, Loading, Chip, when, Section } from "@/components/platform/ui";

const STATUS: Record<Connection["status"], { label: string; tone?: "good" | "warn" | "bad" }> = {
  connected: { label: "Connected", tone: "good" },
  configuration_required: { label: "Configuration required", tone: "warn" },
  available: { label: "Available" },
  planned: { label: "Planned" },
};

export default function ConnectionsPage() {
  const org = useActiveOrg();
  const q = useQuery({ queryKey: ["platform", "connections", org], queryFn: () => platformApi.connections(), retry: false });
  const router = useRouter();
  // Before the platform is installed, Data sources is where connections live.
  useEffect(() => { if (isPlatformNotReady(q.error)) router.replace("/sources"); }, [q.error, router]);
  const [filter, setFilter] = useState<"all" | Connection["status"]>("all");
  const list = useMemo(() => q.data?.connections || [], [q.data]);
  const grouped = useMemo(() => {
    const m = new Map<string, Connection[]>();
    for (const c of list.filter((c) => filter === "all" || c.status === filter)) {
      const k = c.categoryLabel || c.category;
      m.set(k, [...(m.get(k) || []), c]);
    }
    return [...m.entries()];
  }, [list, filter]);
  const counts = q.data?.counts || {};

  return (
    <DashboardLayout pageTitle="Connections">
      <PageHeader eyebrow="Organization" divider title="Connections" subtitle="The systems your agents and apps can use, and their real state" right={<Button href="/sources">Set up data sources</Button>} />
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        <PlatformErrorBanner error={q.error} what="Connections" />
        {q.data?.stateError && <div className="pf-note is-warn">Some connection states could not be read just now: {q.data.stateError}</div>}
        {q.isLoading && <Loading rows={5} />}
        {q.data && (
          <>
            <Subnav label="Connection status" active={filter} onChange={(k) => setFilter(k as typeof filter)} items={[
              { key: "all", label: "All", count: list.length },
              { key: "connected", label: "Connected", count: counts.connected ?? null },
              { key: "configuration_required", label: "Configuration required", count: counts.configuration_required ?? null },
              { key: "available", label: "Available", count: counts.available ?? null },
              { key: "planned", label: "Planned", count: counts.planned ?? null },
            ]} />
            {grouped.length === 0 && <p style={{ fontSize: 13, color: "#8F8A81" }}>Nothing in this view.</p>}
            {grouped.map(([cat, items]) => (
              <Section key={cat} title={cat}>
                <div className="pf-list">
                  {items.map((c) => (
                    <div key={c.id} className="pf-row" style={{ alignItems: "flex-start" }}>
                      <div className="pf-row-main">
                        <div className="pf-row-title">{c.name}</div>
                        <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{c.summary}</div>
                        {(c.reason || c.lastError || c.lastSyncAt || c.usedBy.length > 0) && (
                          <div style={{ fontSize: 12, color: c.lastError ? "#A64F4B" : "#77736C", marginTop: 4, lineHeight: 1.5 }}>
                            {c.lastError ? `Last error: ${c.lastError}` : c.reason}
                            {c.lastSyncAt ? `${c.lastError || c.reason ? " · " : ""}Last sync ${when(c.lastSyncAt)}` : ""}
                            {c.usedBy.length > 0 ? ` · Used by ${c.usedBy.join(", ")}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
                        {c.setupHref && c.status !== "planned" && <Button small href={c.setupHref}>{c.status === "connected" ? "Manage" : "Set up"}</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ))}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

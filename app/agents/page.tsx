"use client";

// Agents: the workers that actually run in Starlane, read from
// GET /api/os/agents. Each one is backed by code that runs today and by rows
// it writes (runs, last activity, measured performance, kill-switch state).
// Agents with no behaviour yet are listed separately with the reason, never
// as live workers, and there is no "New agent" button because no such
// capability exists.

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi } from "@/lib/os";
import { useLoad, errorText } from "@/components/os/shared";
import { PageHeader, Subnav, Lettermark, StatusDot, Chevron, EmptyLine, ErrorBanner, SkeletonRows, ago } from "@/components/v32/ui";
import { agentColor, agentStatus, PERMISSION_LABEL } from "@/components/agents/shared";

const COLS = "grid-cols-[30px_1fr_auto] md:grid-cols-[30px_minmax(0,2.2fr)_minmax(0,1.5fr)_110px_minmax(0,1.3fr)_14px]";

export default function AgentsPage() {
  const { data, error, loading } = useLoad(() => osApi.agents());
  const [tab, setTab] = useState<"running" | "planned">("running");
  const agents = data?.agents || [];

  return (
    <DashboardLayout pageTitle="Agents">
      <PageHeader
        title="Agents"
        subtitle="Ongoing responsibilities Starlane carries across your organization."
      />
      <Subnav
        active={tab}
        onChange={(k) => setTab(k as "running" | "planned")}
        items={[
          { key: "running", label: "Running", count: data ? agents.length : null },
          { key: "planned", label: "Not built yet", count: data ? data.notBuilt.length : null },
        ]}
      />

      <div className="fade-once flex flex-col" style={{ gap: 26 }}>
        <div style={{ fontSize: 13, color: "#63635F", maxWidth: 640 }}>
          Every agent here is deterministic code. None calls a language model or sends a message on its own. To stop one, use the switches on{" "}
          <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
        </div>

        {loading && <SkeletonRows rows={4} height={64} />}
        {!!error && <ErrorBanner>Agents could not be loaded: {errorText(error)}</ErrorBanner>}

        {data && tab === "running" && (
          agents.length === 0 ? <EmptyLine title="No agent is registered for this workspace." /> : (
            <div>
              <div style={{ fontSize: 11, letterSpacing: "1px", color: "#63635F", marginBottom: 4 }}>RUNNING IN THIS WORKSPACE</div>
              <div className={`hidden md:grid ${COLS} items-center`} style={{ gap: 14, padding: "8px 12px", fontSize: 11, letterSpacing: "0.5px", color: "#8A8A86" }}>
                <span /><span>AGENT</span><span>MAY</span><span>LAST RUN</span><span>STATUS</span><span />
              </div>
              {agents.map((a) => {
                const st = agentStatus(a);
                return (
                  <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} className={`row-hover grid ${COLS} items-center`} style={{ gap: 14, padding: "14px 12px", minHeight: 64, boxSizing: "border-box", borderBottom: "1px solid #EBEAE6" }}>
                    <Lettermark letter={a.name} color={agentColor(a.key)} />
                    <div className="min-w-0">
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#191917" }}>{a.name}</div>
                      <div className="truncate" style={{ fontSize: 12, color: "#8A8A86" }}>{a.purpose}</div>
                    </div>
                    <div className="hidden md:block truncate" style={{ fontSize: 12.5, color: "#63635F" }}>
                      {a.permissions.map((p) => PERMISSION_LABEL[p] || p).join(", ")}
                    </div>
                    <div className="hidden md:block" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#43433F" }}>{a.lastRunAt ? ago(a.lastRunAt) : "Never"}</div>
                    <div className="hidden md:block"><StatusDot label={st.label} color={st.color} /></div>
                    <Chevron />
                  </Link>
                );
              })}
            </div>
          )
        )}

        {data && tab === "planned" && (
          data.notBuilt.length === 0 ? <EmptyLine title="Nothing planned is waiting to be built." /> : (
            <div>
              <div style={{ fontSize: 11, letterSpacing: "1px", color: "#63635F", marginBottom: 8 }}>PLANNED, NOT SHOWN AS WORKING UNTIL THEY ARE</div>
              {data.notBuilt.map((n) => (
                <div key={n.name} className="row-hover flex items-start" style={{ gap: 14, padding: "16px 12px", borderBottom: "1px solid #EBEAE6", borderRadius: 6 }}>
                  <Lettermark letter={n.name} color={agentColor(n.name)} />
                  <div className="min-w-0">
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#191917" }}>{n.name}</div>
                    <div style={{ fontSize: 12.5, color: "#63635F", marginTop: 2 }}>{n.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}

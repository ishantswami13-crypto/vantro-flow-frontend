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
import { V, PageHeader, Subnav, Lettermark, StatusDot, EmptyLine, ErrorBanner, SkeletonRows, ago } from "@/components/v32/ui";
import { IconAgents, IconArrowRight } from "@/components/v32/icons";
import { agentStatus, PERMISSION_LABEL } from "@/components/agents/shared";

export default function AgentsPage() {
  const { data, error, loading } = useLoad(() => osApi.agents());
  const [tab, setTab] = useState<"running" | "planned">("running");
  const agents = data?.agents || [];

  return (
    <DashboardLayout pageTitle="Agents">
      <PageHeader
        title="Agents"
        subtitle="Ready agents that work on your data, and when each last ran"
      >
        <div style={{ marginTop: 18 }}>
          <Subnav
            label="Agent sections"
            active={tab}
            onChange={(k) => setTab(k as "running" | "planned")}
            items={[
              { key: "running", label: "Ready", count: data ? agents.length : null },
              { key: "planned", label: "Coming", count: data ? data.notBuilt.length : null },
            ]}
          />
        </div>
      </PageHeader>

      <div className="fade-once flex flex-col" style={{ gap: 26, marginTop: 8 }}>
        {loading && <SkeletonRows rows={3} height={150} />}
        {!!error && <ErrorBanner>Agents could not be loaded: {errorText(error)}</ErrorBanner>}

        {data && tab === "running" && (
          agents.length === 0 ? <EmptyLine icon={<IconAgents size={17} />} title="No agent is registered for this workspace" /> : (
            <div className="lib-grid agent-grid">
              {agents.map((a, i) => {
                const st = agentStatus(a);
                return (
                  <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} className="lib-card agent-card rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center justify-between">
                      <Lettermark letter={a.name} size={38} />
                      <span style={{ color: "#8A8A86" }}><IconArrowRight size={14} /></span>
                    </div>
                    <div>
                      <div style={{ fontFamily: V.serif, fontSize: 18, color: "#191917", letterSpacing: "-0.01em" }}>{a.name}</div>
                      <div className="agent-purpose">{a.purpose}</div>
                    </div>
                    {a.permissions.length > 0 && (
                      <div className="flex flex-wrap" style={{ gap: 6 }}>
                        {a.permissions.map((p) => <span key={p} className="agent-perm">{PERMISSION_LABEL[p] || p}</span>)}
                      </div>
                    )}
                    <div className="agent-foot">
                      <span>{a.lastRunAt ? `Last run ${ago(a.lastRunAt)}` : "Fixed code, no model"}</span>
                      <StatusDot label={st.label} color={st.color} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {data && tab === "planned" && (
          data.notBuilt.length === 0 ? <EmptyLine icon={<IconAgents size={17} />} title="Nothing is waiting to be built" /> : (
            <div>
              <p style={{ fontSize: 12.5, color: "#8A8A86", margin: "0 0 12px" }}>Not shown as working until they are.</p>
              <div className="lib-grid agent-grid">
                {data.notBuilt.map((n, i) => (
                  <div key={n.name} className="lib-card agent-card agent-card-muted rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <Lettermark letter={n.name} size={38} />
                    <div>
                      <div style={{ fontFamily: V.serif, fontSize: 18, color: "#43433F", letterSpacing: "-0.01em" }}>{n.name}</div>
                      <div className="agent-purpose">{n.reason}</div>
                    </div>
                    <div className="agent-foot"><span>Coming</span></div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
        <p style={{ fontSize: 12, color: "#8A8A86", margin: 0, maxWidth: 640 }}>
          Each agent is fixed code: none calls a language model or sends a message on its own. Stop one from{" "}
          <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
        </p>
      </div>
    </DashboardLayout>
  );
}

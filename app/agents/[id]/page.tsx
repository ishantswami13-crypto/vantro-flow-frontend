"use client";

// Agent detail (V32 AgentDetail). Read from the same GET /api/os/agents the
// list uses: an agent is one of the workers that really runs in Starlane,
// addressed by its key. Unknown keys say so instead of rendering made-up
// detail. Stopping an agent lives on Control, Decisions. Agents that are safe
// to run on demand (POST /api/os/agents/:key/run) get a box to give them work,
// which opens the live run; recent runs come from GET /api/os/agents/:key/runs.

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi } from "@/lib/os";
import { useLoad, errorText } from "@/components/os/shared";
import { Subnav, Lettermark, StatusDot, Sep, Button, EmptyLine, ErrorBanner, SkeletonRows, ago } from "@/components/v32/ui";
import { agentStatus, PERMISSION_LABEL } from "@/components/agents/shared";
import GiveWork from "@/components/agents/GiveWork";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 0, color: "#63635F", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (!items.length) return <div style={{ fontSize: 13, color: "#6E6E69" }}>None recorded.</div>;
  return (
    <div>
      {items.map((x) => (
        <div key={x} style={{ fontSize: 13, color: "#43433F", padding: "7px 0", borderBottom: "1px solid #EBEAE6" }}>{x}</div>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 12, padding: "7px 0", borderBottom: "1px solid #EBEAE6" }}>
      <span style={{ fontSize: 12.5, color: "#63635F" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "#191917", fontFamily: "'Inter', system-ui, sans-serif", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const { data, error, loading } = useLoad(() => osApi.agents());
  const runs = useLoad(() => osApi.agentRuns(id));
  const [tab, setTab] = useState<"overview" | "rules">("overview");
  const a = data?.agents.find((x) => x.key === id);

  return (
    <DashboardLayout pageTitle="Agent">
      <Link href="/agents" className="hover-dim flex items-center" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
        <FiChevronLeft size={13} /> Agents
      </Link>

      {loading && <SkeletonRows rows={3} />}
      {!!error && <ErrorBanner>This agent could not be loaded: {errorText(error)}</ErrorBanner>}
      {data && !a && (
        <EmptyLine title="Agent not found." body={`No agent "${id}" runs in this workspace. The agents that do are listed on Agents.`} />
      )}

      {a && (() => {
        const st = agentStatus(a);
        return (
          <>
            <div className="fade-once flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <Lettermark letter={a.name} size={44} />
                <div>
                  <h1 style={{ margin: "0 0 2px", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 26, letterSpacing: "-0.01em", color: "#191917" }}>{a.name}</h1>
                  <div className="flex items-center flex-wrap" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
                    {a.model} <Sep /> <StatusDot label={st.label} color={st.color} />
                  </div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <Button small href="/control/decisions">Pause or stop</Button>
              </div>
            </div>

            {a.runnable ? (
              <GiveWork agents={data!.agents} fixedKey={a.key} title={`Give the ${a.name.toLowerCase()} work`} />
            ) : (
              <p style={{ fontSize: 12.5, color: "#63635F", margin: 0, maxWidth: 640, lineHeight: 1.6 }}>
                This agent runs inside its own flow, so it cannot be given work from here.{" "}
                {a.key === "starlane.collections_agent" ? <>It drafts follow-ups on <Link className="underline" href="/missions">Missions</Link>, and each one waits for your approval.</> : <>It checks outcomes after their waiting period on its own.</>}
              </p>
            )}

            <Subnav
              active={tab}
              onChange={(k) => setTab(k as "overview" | "rules")}
              items={[{ key: "overview", label: "Overview" }, { key: "rules", label: "Rules" }]}
            />

            <div className="fade-once flex flex-col lg:flex-row" style={{ gap: 32 }}>
              <div className="flex flex-col" style={{ flex: 1.3, minWidth: 0, gap: 22 }}>
                {tab === "overview" ? (
                  <>
                    <Section label="Objective">
                      <div style={{ fontSize: 13.5, color: "#43433F", lineHeight: 1.6 }}>{a.purpose}</div>
                    </Section>
                    <Section label="Current state">
                      <div style={{ fontSize: 13.5, color: "#43433F", lineHeight: 1.6 }}>
                        {a.stoppedReason ? `Stopped: ${a.stoppedReason}` : a.performance || (a.runs ? `${a.runs} run${a.runs === 1 ? "" : "s"} so far.` : "It has not run on your data yet.")}
                      </div>
                    </Section>
                    <Section label="What it does">
                      <List items={a.performs} />
                    </Section>
                  </>
                ) : (
                  <>
                    <Section label="May">
                      <List items={a.permissions.map((p) => PERMISSION_LABEL[p] || p)} />
                    </Section>
                    <Section label="Cannot">
                      <List items={a.cannot} />
                    </Section>
                  </>
                )}
              </div>
              <div className="flex flex-col" style={{ flex: 1, maxWidth: 300, minWidth: 0, gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10.5, letterSpacing: 0, color: "#6E6E69", marginBottom: 6 }}>Activity</div>
                  <Fact label="Runs" value={String(a.runs)} />
                  <Fact label="Last run" value={a.lastRunAt ? ago(a.lastRunAt) : "Never"} />
                  {a.budget && <Fact label="Budget" value={a.budget} />}
                </div>
                {runs.data?.tracked && (
                  <div>
                    <div style={{ fontSize: 10.5, letterSpacing: 0, color: "#6E6E69", marginBottom: 6 }}>Recent runs</div>
                    {runs.data.runs.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: "#6E6E69" }}>No runs recorded yet.</div>
                    ) : runs.data.runs.slice(0, 8).map((r) => (
                      <Link key={r.id} href={`/agents/${encodeURIComponent(a.key)}/run/${r.id}`} className="hover-dim flex items-baseline justify-between" style={{ gap: 12, padding: "7px 0", borderBottom: "1px solid #EBEAE6", fontSize: 12.5 }}>
                        <span style={{ color: "#191917" }}>{r.startedAt ? ago(r.startedAt) : "Unknown time"}</span>
                        <span style={{ color: r.status === "failed" ? "#A64F4B" : "#63635F" }}>{r.status === "completed" ? "Completed" : r.status === "failed" ? "Failed" : "Running"}</span>
                      </Link>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 10.5, letterSpacing: 0, color: "#6E6E69", marginBottom: 6 }}>Approval</div>
                  <div style={{ fontSize: 12.5, color: "#43433F", lineHeight: 1.6 }}>Nothing leaves Starlane without a person approving it. Approvals wait on Control.</div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </DashboardLayout>
  );
}

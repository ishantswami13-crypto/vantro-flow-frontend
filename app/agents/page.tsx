"use client";

// Agents: the workers that actually run in Starlane, read from
// GET /api/os/agents. Each one is backed by code that runs today and by rows
// it writes (runs, last activity, measured performance, kill-switch state).
// Agents with no behaviour yet are listed separately with the reason, never
// as live workers, and there is no "create agent" button because no such
// capability exists.

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { C, Pill, Skeleton } from "@/components/decisions/ui";
import { osApi, AgentInfo } from "@/lib/os";
import { relTime } from "@/lib/decisions";
import { Panel, Row, Muted, ErrorLine, errorText, useLoad } from "@/components/os/shared";

const PERMISSION_LABEL: Record<string, string> = {
  READ: "Read",
  ANALYZE: "Analyse",
  PROPOSE: "Propose",
  PREPARE: "Prepare",
  EXECUTE_APPROVED_INTERNAL: "Run approved internal steps",
  RECORD_OUTCOME: "Record outcomes",
};

function statusTone(s: AgentInfo["status"]): "good" | "bad" | "neutral" {
  if (s === "ACTIVE") return "good";
  if (s === "STOPPED") return "bad";
  return "neutral";
}

export default function AgentsPage() {
  const { data, error, loading, reload } = useLoad(() => osApi.agents());

  return (
    <DashboardLayout pageTitle="Agents">
      <div className="max-w-[900px] space-y-6">
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>Agents</h1>
          <p style={{ fontSize: 13.5, color: "#63635F", maxWidth: 640, marginTop: 6 }}>
            The workers that run inside Starlane, what each is allowed to do and what it cannot, and how it has performed on your data.
            To stop one, use the switches on <Link className="underline" href="/control/decisions">Control, Decisions</Link>.
          </p>
        </div>

        <Panel
          title="Running in this workspace"
          subtitle="All four are deterministic code. None of them calls a language model or sends a message on its own."
          right={<button type="button" onClick={reload} className="text-[12.5px] hover-dim" style={{ color: C.muted }}>Refresh</button>}
        >
          {loading && <Skeleton rows={4} />}
          <ErrorLine error={error ? `Agents could not be loaded: ${errorText(error)} Try Refresh.` : null} />
          {data?.agents.map((a) => (
            <Row key={a.key}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{a.name}</p>
                  <p className="text-[12.5px] mt-1 leading-[1.55]" style={{ color: C.body }}>{a.purpose}</p>
                </div>
                <Pill tone={statusTone(a.status)}>{a.status === "ACTIVE" ? "Active" : a.status === "STOPPED" ? "Stopped" : "Not run yet"}</Pill>
              </div>
              {a.stoppedReason && <p className="text-[12.5px] mt-2" style={{ color: C.bad }}>Stopped: {a.stoppedReason}</p>}
              <p className="text-[12px] mt-2" style={{ color: C.faint }}>
                {a.runs} {a.runs === 1 ? "run" : "runs"}
                {a.lastRunAt ? ` · last ${relTime(a.lastRunAt)}` : ""} · {a.model}
                {a.budget ? ` · ${a.budget}` : ""}
              </p>
              {a.performance && <p className="text-[12.5px] mt-1" style={{ color: C.body }}>{a.performance}</p>}
              <details className="mt-2">
                <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>What it does, what it may do, what it cannot do</summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2 text-[12.5px]" style={{ color: C.body }}>
                  <div>
                    <p style={{ color: C.faint }}>Does</p>
                    <ul className="mt-1 space-y-0.5">{a.performs.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <p style={{ color: C.faint }}>Permissions</p>
                    <ul className="mt-1 space-y-0.5">{a.permissions.map((x) => <li key={x}>{PERMISSION_LABEL[x] || x}</li>)}</ul>
                  </div>
                  <div>
                    <p style={{ color: C.faint }}>Cannot</p>
                    <ul className="mt-1 space-y-0.5">{a.cannot.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
              </details>
            </Row>
          ))}
        </Panel>

        {data && data.notBuilt.length > 0 && (
          <Panel title="Not built yet" subtitle="These are planned. Starlane does not show them as working until they are.">
            {data.notBuilt.map((n) => (
              <Row key={n.name}>
                <p className="text-[13.5px]" style={{ color: C.ink, fontWeight: 500 }}>{n.name}</p>
                <p className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{n.reason}</p>
              </Row>
            ))}
          </Panel>
        )}
        {data && data.agents.length === 0 && <Muted>No agent is registered for this workspace.</Muted>}
      </div>
    </DashboardLayout>
  );
}

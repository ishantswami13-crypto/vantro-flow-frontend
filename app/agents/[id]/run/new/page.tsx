"use client";

// Starting an agent with the work a person gave it. Same frame as a finished
// run (/agents/:key/run/:runId): the work as a bubble, the agent's steps in
// the Progress panel, Properties. It starts the run once (POST
// /api/os/agents/:key/run with the instruction), shows the agent working,
// and then replaces itself with the recorded run, so Back and Share point at
// a real run.
//
// The work comes from a one-time token in sessionStorage (lib/agentWork), so
// a reload here never starts a second run. Steps are not ticked until the run
// is recorded: while it works, the spinner only shows the agent is busy.

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { osApi } from "@/lib/os";
import { useLoad, errorText } from "@/components/os/shared";
import { takeAgentWork, queueAgentWork, type QueuedWork } from "@/lib/agentWork";

const back = <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>;

type Phase = "starting" | "working" | "failed" | "missing";

export default function AgentRunStartPage() {
  return <Suspense fallback={null}><AgentRunStart /></Suspense>;
}

function AgentRunStart() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const agents = useLoad(() => osApi.agents());
  const agent = agents.data?.agents.find((a) => a.key === id) || null;
  const steps = agent?.performs || [];

  const [work, setWork] = useState<QueuedWork | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const started = useRef(false);

  // Take the queued work exactly once (React strict mode mounts twice in dev).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const w = takeAgentWork(search?.get("t") || null);
    if (!w || w.agentKey !== id) { setPhase("missing"); return; }
    setWork(w);
    setPhase("working");
    const t0 = Date.now();
    osApi.runAgent(id, w.instruction)
      .then(async (res) => {
        // Let the start register on screen before the result replaces it.
        const wait = Math.max(0, 900 - (Date.now() - t0));
        await new Promise((r) => setTimeout(r, wait));
        if (res.runId) router.replace(`/agents/${encodeURIComponent(id)}/run/${encodeURIComponent(String(res.runId))}`);
        else { setErr("The agent finished but its run could not be recorded, so there is nothing to open. Try again."); setPhase("failed"); }
      })
      .catch((e) => {
        const status = (e as { status?: number }).status;
        setErr(status === 423 ? "This agent is stopped on Control, so it did not start." : status === 409 ? "This agent runs inside its own flow and cannot be started from here." : errorText(e));
        setPhase("failed");
      });
  }, [id, router, search]);

  // Moves the "busy" marker down the steps while the agent works.
  useEffect(() => {
    if (phase !== "working") return;
    const t = setInterval(() => setTick((n) => n + 1), 650);
    return () => clearInterval(t);
  }, [phase]);
  const active = steps.length ? Math.min(tick, steps.length - 1) : -1;

  const retry = () => {
    if (!work) return;
    const token = queueAgentWork(work.agentKey, work.instruction);
    started.current = false;
    setErr(null); setTick(0); setPhase("starting");
    router.replace(`/agents/${encodeURIComponent(id)}/run/new?t=${encodeURIComponent(token)}`);
  };

  const name = agent?.name || "Agent";

  return (
    <DashboardLayout pageTitle="Agent run" slimRail bare>
      <div className="ar has-panel">
        <div className="ar-main">
          <header className="ar-bar">
            <Link href={`/agents/${encodeURIComponent(id)}`} className="ar-back" aria-label="Back to the agent">{back}</Link>
            <span className="ar-name">{name}</span>
            <span className="ar-meta">{phase === "working" ? "Working…" : phase === "failed" ? "Did not finish" : ""}</span>
            <span className="flex-1" />
          </header>

          <div className="ar-scroll">
            <div className="ar-thread" aria-live="polite">
              {phase === "missing" ? (
                <>
                  <p className="ar-text">There is no work waiting to start here. It may already have run: recent runs are listed on the agent&rsquo;s page.</p>
                  <p className="ar-text"><Link className="underline" href={`/agents/${encodeURIComponent(id)}`}>Open {name.toLowerCase()}</Link></p>
                </>
              ) : (
                <>
                  {work && <div className="ar-bubble">{work.instruction}</div>}
                  {phase === "working" && (
                    <p className="ar-text"><span className="ar-working">{`${name} is working on your data`}<i /><i /><i /></span></p>
                  )}
                  {phase === "failed" && (
                    <>
                      <p className="ar-text" role="alert" style={{ color: "#A3392E" }}>{err || "The run did not finish."}</p>
                      <p className="ar-text"><button type="button" className="ar-btn ar-btn-box" style={{ padding: "0 14px" }} onClick={retry}>Try again</button></p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <aside className="ar-panel" aria-label="Run details">
          <section className="ar-sec">
            <div className="ar-sec-head" style={{ cursor: "default" }}>
              <span>Progress</span>
              <span className="ar-sec-aside">{steps.length ? (phase === "working" ? `Working · ${steps.length} steps` : `0 of ${steps.length} steps`) : ""}</span>
            </div>
            <div className="ar-sec-body">
              {steps.length === 0 ? <p className="ar-note">{agents.loading ? "Loading steps…" : "This agent doesn't list its steps."}</p> : (
                <ol className="ar-steps">
                  {steps.map((s, i) => (
                    <li key={s} className={phase === "working" && i === active ? "is-active" : phase === "failed" ? "is-failed" : ""} style={{ animationDelay: `${i * 110}ms` }}>
                      <span className="ar-step-dot" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
          <section className="ar-sec">
            <div className="ar-sec-head" style={{ cursor: "default" }}><span>Properties</span></div>
            <div className="ar-sec-body">
              <dl className="ar-props">
                <dt>Agent</dt>
                <dd><span className="ar-chip"><span className="ar-chip-mark"><StarlaneMark variant="glyph" size={8} /></span>{name}</span></dd>
                <dt>Model</dt>
                <dd><span className="ar-model">✳</span>{agent?.model || "…"}</dd>
                <dt>Status</dt>
                <dd style={{ color: phase === "failed" ? "#A3392E" : "#57534D" }}>{phase === "failed" ? "Failed" : phase === "missing" ? "Not started" : "Running"}</dd>
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}

"use client";

// One mission on the web (GET /api/client/missions/:id): objective, progress
// measured from the books against the baseline frozen at the start, the
// actions it proposed with their lifecycle and the owner's decision, blockers,
// and start / pause / resume / cancel. Same data and rules as the apps.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { request } from "@/lib/api";
import { FeatureActionRow } from "@/components/features/FeatureActionRow";
import { agentLabel } from "@/components/os/MissionsList";
import { osApi } from "@/lib/os";
import type { Mission } from "../../../packages/contracts/src/features";
import { formatMoney, formatDate } from "@/lib/locale";
import { StepRail, PanelSection, Properties, StatusText, railCount, type RailStep, type Tone } from "@/components/hv/Pieces";
import { Lettermark } from "@/components/v32/ui";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const STATUS: Record<string, [string, string, Tone]> = {
  active: ["Active", "#4B5170", "info"], paused: ["Paused", "#8A5A12", "warning"], draft: ["Draft", GRAPHITE, "neutral"],
  completed: ["Completed", "#477054", "positive"], failed: ["Missed target", "#A23B3B", "critical"], cancelled: ["Cancelled", GRAPHITE, "neutral"],
};

// The task's steps, read from its own record: set up, started, actions
// prepared, your approvals, and the result measured from the books. Nothing
// is shown done before the record says so.
function missionSteps(m: Mission): RailStep[] {
  const actions = m.actions || [];
  const pending = actions.filter((a) => a.canDecide).length;
  const started = m.status !== "draft";
  const closed = m.status === "completed" || m.status === "failed" || m.status === "cancelled";
  const when = (ev: string) => { const h = m.history?.find((x) => x.event === ev); return h ? formatDate(h.at, { day: "numeric", month: "short" }) : null; };
  const steps: RailStep[] = [
    { key: "set", label: "Set the target", detail: `${formatMoney(m.target.amount)} within ${m.horizonDays} days`, state: "done" },
    { key: "start", label: "Start the task", detail: started ? (when("active") ? `Started ${when("active")}` : null) : "Waiting for you to start it", state: started ? "done" : "active" },
    { key: "prep", label: "Prepare reminders for approval", detail: actions.length ? `${actions.length} prepared` : null, state: actions.length ? "done" : started && !closed ? "active" : "waiting" },
    { key: "approve", label: "You approve each one", detail: actions.length ? (pending ? `${pending} waiting for you` : "All decided") : null, state: !actions.length ? "waiting" : pending ? "active" : "done" },
    { key: "measure", label: "Measure payments from your books", detail: m.progress ? `${formatMoney(m.progress.collected)} collected so far` : null, state: closed ? "done" : started && actions.length && !pending ? "active" : "waiting" },
  ];
  if (m.status === "completed") steps.push({ key: "end", label: "Target reached", detail: m.outcome?.text, state: "done" });
  else if (m.status === "failed") steps.push({ key: "end", label: "Target missed", detail: m.outcome?.text, state: "failed" });
  else if (m.status === "cancelled") steps.push({ key: "end", label: "Cancelled", state: "failed" });
  else steps.push({ key: "end", label: "Check the target on the last day", detail: m.endsAt ? formatDate(m.endsAt, { day: "numeric", month: "short" }) : null, state: "waiting" });
  return steps;
}
const inr = (v: number) => formatMoney(v);
const btn: React.CSSProperties = { fontSize: 13, padding: "6px 12px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" };
const panel: React.CSSProperties = { background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8 };

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<Mission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  useEffect(() => {
    osApi.agents().then((r) => setAgentNames(Object.fromEntries(r.agents.map((a) => [a.key, a.name])))).catch(() => {});
  }, []);

  const load = useCallback(() => {
    request<{ mission: Mission }>(`/api/client/missions/${encodeURIComponent(id)}`)
      .then((r) => { setM(r.mission); setError(null); })
      .catch((e: Error) => setError(e.message || "Could not load this mission"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(verb: "activate" | "pause" | "cancel") {
    setBusy(verb); setNote(null); setError(null);
    try {
      const out = await request<{ mission: Mission; proposed: { created: number; adopted: number } | null }>(`/api/client/missions/${encodeURIComponent(id)}/${verb}`, { method: "POST", body: "{}" });
      if (out.proposed) setNote(`${out.proposed.created} action${out.proposed.created === 1 ? "" : "s"} proposed for your approval${out.proposed.adopted ? `, ${out.proposed.adopted} existing adopted` : ""}.`);
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const p = m?.progress;
  const blockers = Array.isArray(p?.blockers) ? p!.blockers : [];
  const [label, color, tone] = m ? STATUS[m.status] || [m.status, GRAPHITE, "neutral" as Tone] : ["", GRAPHITE, "neutral" as Tone];
  const steps = m ? missionSteps(m) : [];
  const invoices = p?.byInvoice?.length ? p.byInvoice.map((i) => ({ id: i.id, name: `${i.customer}${i.invoiceNumber ? ` · ${i.invoiceNumber}` : ""}${i.disputed ? " · disputed" : ""}`, right: i.status === "paid_or_removed" ? "Paid" : `${inr(i.now)} left`, sub: null as string | null }))
    : (m?.targetInvoices || []).map((i) => ({ id: i.id, name: `${i.customer} · ${i.invoiceNumber || "No number"}`, right: inr(i.amount), sub: `${i.daysOverdue} days overdue` }));
  const agentName = m?.assigned ? agentLabel(m.assigned.agent, agentNames) : null;
  return (
    <DashboardLayout pageTitle="Task">
      <div className="hv-page" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 28px 56px", display: "grid", gap: 22 }}>
        <Link href="/missions" className="inline-flex items-center" style={{ gap: 6, fontSize: 13, color: GRAPHITE }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>Tasks
        </Link>
        {error && !m ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!m && !error ? <div className="skeleton" style={{ height: 160, borderRadius: 12 }} /> : null}
        {m ? (
          <>
            <header>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12, color: GRAPHITE }}>
                <span>Task · Collections</span><StatusText label={label} tone={tone} />
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 32, fontWeight: 400, letterSpacing: "-0.01em", color: "#191917", margin: "8px 0 0" }}>{m.title}</h1>
              <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "70ch", margin: "6px 0 0" }}>{m.objective}</p>
              {m.outcome ? <p style={{ margin: "8px 0 0", color }}>{m.outcome.text} Collected {inr(m.outcome.collected)} of {inr(m.outcome.target)}.</p> : null}
            </header>
            <div className="hv-detail">
              <section style={{ display: "grid", gap: 26, minWidth: 0 }}>
                {p && m.status !== "draft" ? (
                  <div className="hv-stat" style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 30, color: "#191917" }}>{inr(p.collected)}</span>
                      <span style={{ color: GRAPHITE, fontSize: 13 }}>of {inr(p.targetAmount)} collected</span>
                      {m.status === "active" && p.daysLeft != null ? <span style={{ marginLeft: "auto", fontSize: 12.5, color: GRAPHITE }}>{p.daysLeft} days left</span> : null}
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(25,25,23,0.08)", overflow: "hidden" }} role="img" aria-label={`${Math.round(p.ratio * 100)}% of target collected`}>
                      <div style={{ height: "100%", width: `${Math.round(p.ratio * 100)}%`, background: m.status === "failed" ? "#A23B3B" : "#2E7D6B" }} />
                    </div>
                    {p.evidence ? <p style={{ margin: 0, fontSize: 12, color: GRAPHITE }}>{p.evidence.summary}{p.evidence.method ? ` ${p.evidence.method}` : ""}</p> : null}
                  </div>
                ) : null}
                {invoices.length ? (
                  <div className="ag-runs">
                    <div className="ag-runs-head"><h2>Invoices in this task</h2><span style={{ fontSize: 12, color: GRAPHITE }}>{invoices.length}</span></div>
                    <div className="ag-row is-head" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><span>Invoice</span><span style={{ textAlign: "right" }}>{p ? "Left to collect" : "Owed"}</span></div>
                    {invoices.map((i) => (
                      <div key={i.id} className="ag-row" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                        <span className="ag-task">{i.name}{i.sub ? <span style={{ color: GRAPHITE }}> · {i.sub}</span> : null}</span>
                        <span style={{ textAlign: "right", color: i.right === "Paid" ? "#2F6B45" : "#191917", fontVariantNumeric: "tabular-nums" }}>{i.right}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div>
                  <div className="ag-runs-head"><h2 className="hv-block-title" style={{ margin: 0 }}>Actions</h2><span style={{ fontSize: 12, color: GRAPHITE }}>{m.actions?.length || 0}</span></div>
                  <div style={panel}>
                    {m.actions?.length ? m.actions.map((a, n) => <FeatureActionRow key={a.id} a={a} first={n === 0} onDecided={load} />) : (
                      <p style={{ margin: 0, padding: "14px 16px", color: GRAPHITE }}>{m.status === "draft" ? "Start the task and Starlane proposes the first steps." : "No actions."}</p>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: GRAPHITE, margin: "8px 0 0" }}>Approving records your decision. Sending messages to customers is switched off, so nothing is sent from here: send the drafted message yourself.</p>
                </div>
              </section>
              <aside className="hv-side" aria-label="Task details">
                {m.allowed?.length ? (
                  <div className="hv-pane" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {m.allowed.includes("activate") ? <button className="gw-start" disabled={!!busy} onClick={() => void act("activate")}>{busy === "activate" ? "Starting…" : m.status === "paused" ? "Resume" : "Start task"}</button> : null}
                    {m.allowed.includes("pause") ? <button style={btn} disabled={!!busy} onClick={() => void act("pause")}>Pause</button> : null}
                    {m.allowed.includes("cancel") ? <button style={btn} disabled={!!busy} onClick={() => void act("cancel")}>Cancel task</button> : null}
                    {note ? <p role="status" style={{ margin: 0, fontSize: 12.5, flexBasis: "100%" }}>{note}</p> : null}
                    {error ? <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "#A23B3B", flexBasis: "100%" }}>{error}</p> : null}
                  </div>
                ) : null}
                <PanelSection title="Progress" aside={railCount(steps)}>
                  <StepRail steps={steps} label="Task progress" />
                </PanelSection>
                <PanelSection title="Properties">
                  <Properties rows={[
                    ...(agentName ? [["Agent", <span key="a" className="hv-tag"><Lettermark letter={agentName} size={16} />{agentName}</span>]] as [React.ReactNode, React.ReactNode][] : []),
                    ["Horizon", `${m.horizonDays} days${m.endsAt ? ` · ends ${formatDate(m.endsAt, { day: "numeric", month: "short" })}` : ""}`],
                    ["Escalation", m.constraints.allowEscalation ? "Allowed" : "Reminders only"],
                    ["Disputed", "Always left out"],
                    ["Status", <StatusText key="s" label={label} tone={tone} />],
                  ]} />
                </PanelSection>
                {blockers.length ? (
                  <PanelSection title="Blockers" aside={blockers.length}>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                      {blockers.map((b) => <li key={b.code} style={{ fontSize: 12.5, lineHeight: 1.5, color: "#3F3D39", paddingLeft: 10, borderLeft: "2px solid #E4E1DA" }}>{b.text}</li>)}
                    </ul>
                  </PanelSection>
                ) : null}
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

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
import type { Mission } from "../../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const STATUS: Record<string, [string, string]> = {
  active: ["Active", "#4B5170"], paused: ["Paused", "#8A5A12"], draft: ["Draft", GRAPHITE],
  completed: ["Completed", "#477054"], failed: ["Missed target", "#A23B3B"], cancelled: ["Cancelled", GRAPHITE],
};
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const btn: React.CSSProperties = { fontSize: 13, padding: "6px 12px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" };
const panel: React.CSSProperties = { background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8 };
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 600, margin: "0 0 8px" };

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const [m, setM] = useState<Mission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

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
  const [label, color] = m ? STATUS[m.status] || [m.status, GRAPHITE] : ["", GRAPHITE];
  return (
    <DashboardLayout pageTitle="Mission">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 20 }}>
        <Link href="/missions" style={{ fontSize: 13, color: GRAPHITE }}>‹ Missions</Link>
        {error && !m ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!m && !error ? <p style={{ color: GRAPHITE }}>Loading…</p> : null}
        {m ? (
          <>
            <div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 11, color: GRAPHITE }}>Mission · Collections</span>
                <span style={{ fontSize: 12, fontWeight: 600, color, background: "#F1F0EC", borderRadius: 999, padding: "3px 9px" }}>{label}</span>
              </div>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: "10px 0 0" }}>{m.title}</h1>
              <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "70ch", marginTop: 8 }}>{m.objective}</p>
              {m.outcome ? <p style={{ margin: "8px 0 0", color }}>{m.outcome.text} Collected {inr(m.outcome.collected)} of {inr(m.outcome.target)}.</p> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
              <section style={{ display: "grid", gap: 18 }}>
                {p && m.status !== "draft" ? (
                  <div>
                    <h2 style={h2}>Progress</h2>
                    <div style={{ ...panel, padding: "14px 16px", display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 20 }}>{inr(p.collected)}</span>
                        <span style={{ color: GRAPHITE }}>of {inr(p.targetAmount)} collected</span>
                        {m.status === "active" && p.daysLeft != null ? <span style={{ marginLeft: "auto", fontSize: 13, color: GRAPHITE }}>{p.daysLeft} days left</span> : null}
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(25,25,23,0.08)", overflow: "hidden" }} role="img" aria-label={`${Math.round(p.ratio * 100)}% of target collected`}>
                        <div style={{ height: "100%", width: `${Math.round(p.ratio * 100)}%`, background: m.status === "failed" ? "#A23B3B" : "#477054" }} />
                      </div>
                      {p.byInvoice?.map((i) => (
                        <div key={i.id} style={{ display: "flex", gap: 10, fontSize: 13.5, borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
                          <span style={{ flex: 1 }}>{i.customer}{i.invoiceNumber ? ` · ${i.invoiceNumber}` : ""}{i.disputed ? " · disputed" : ""}</span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{i.status === "paid_or_removed" ? "Paid" : `${inr(i.now)} left`}</span>
                        </div>
                      ))}
                      {p.evidence ? <p style={{ margin: 0, fontSize: 12.5, color: GRAPHITE }}>{p.evidence.summary}{p.evidence.method ? ` ${p.evidence.method}` : ""}</p> : null}
                    </div>
                  </div>
                ) : m.targetInvoices?.length ? (
                  <div>
                    <h2 style={h2}>Invoices in this mission</h2>
                    <div style={panel}>
                      {m.targetInvoices.map((i, n) => (
                        <div key={i.id} style={{ display: "flex", gap: 10, padding: "10px 16px", borderTop: n ? `1px solid ${RULE}` : 0, fontSize: 13.5 }}>
                          <span style={{ flex: 1 }}>{i.customer} · {i.invoiceNumber || "No number"} · {i.daysOverdue} days overdue</span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{inr(i.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <h2 style={h2}>Actions <span style={{ color: GRAPHITE, fontWeight: 400 }}>{m.actions?.length || 0}</span></h2>
                  <div style={panel}>
                    {m.actions?.length ? m.actions.map((a, n) => <FeatureActionRow key={a.id} a={a} first={n === 0} onDecided={load} />) : (
                      <p style={{ margin: 0, padding: "14px 16px", color: GRAPHITE }}>{m.status === "draft" ? "Start the mission and Starlane proposes the first steps." : "No actions."}</p>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: GRAPHITE, margin: "8px 0 0" }}>Approving records your decision. Sending messages to customers is switched off, so nothing is sent from here — send the drafted message yourself.</p>
                </div>
              </section>
              <section style={{ display: "grid", gap: 18 }}>
                <div style={{ ...panel, padding: "14px 16px", display: "grid", gap: 10 }}>
                  {m.allowed?.length || m.status === "active" || m.status === "paused" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {m.allowed?.includes("activate") ? <button style={{ ...btn, background: "#191917", color: "#fff" }} disabled={!!busy} onClick={() => void act("activate")}>{busy === "activate" ? "Starting…" : m.status === "paused" ? "Resume" : "Start mission"}</button> : null}
                      {m.allowed?.includes("pause") ? <button style={btn} disabled={!!busy} onClick={() => void act("pause")}>Pause</button> : null}
                      {m.allowed?.includes("cancel") ? <button style={btn} disabled={!!busy} onClick={() => void act("cancel")}>Cancel mission</button> : null}
                      
                    </div>
                  ) : null}
                  {note ? <p role="status" style={{ margin: 0, fontSize: 13 }}>{note}</p> : null}
                  {error ? <p role="alert" style={{ margin: 0, fontSize: 13, color: "#A23B3B" }}>{error}</p> : null}
                  <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", fontSize: 13 }}>
                    <dt style={{ color: GRAPHITE }}>Horizon</dt><dd style={{ margin: 0 }}>{m.horizonDays} days{m.endsAt ? ` · ends ${new Date(m.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</dd>
                    <dt style={{ color: GRAPHITE }}>Escalation</dt><dd style={{ margin: 0 }}>{m.constraints.allowEscalation ? "Allowed" : "Reminders only"}</dd>
                    <dt style={{ color: GRAPHITE }}>Disputed</dt><dd style={{ margin: 0 }}>Always left out</dd>
                  </dl>
                </div>
                {blockers.length ? (
                  <div>
                    <h2 style={h2}>Blockers</h2>
                    <div style={panel}>{blockers.map((b, n) => <p key={b.code} style={{ margin: 0, padding: "10px 16px", borderTop: n ? `1px solid ${RULE}` : 0, fontSize: 13.5 }}>{b.text}</p>)}</div>
                  </div>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

"use client";

// Simulate on the web — the same model as the desktop and phone apps
// (POST /api/client/simulate): expected collection over a horizon, from facts
// in the books and assumptions the owner can change, each figure labelled
// fact / assumption / estimate. Starlane's starting assumptions are marked as
// such; the company's own payment history replaces them when there is enough.
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import type { BandId, Mission, Simulation } from "../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const SOURCE: Record<string, string> = { you: "Set by you", your_history: "From your paid invoices", starting_assumption: "Starlane’s starting assumption" };
const KIND_BG: Record<string, [string, string]> = { fact: ["#E9F2EC", "#2F6B4F"], assumption: ["#F7EFDF", "#8A5A12"], estimate: ["#EEE9F6", "#5B4A86"] };
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const Kind = ({ k }: { k: string }) => <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, background: KIND_BG[k]?.[0], color: KIND_BG[k]?.[1] }}>{k}</span>;

export default function SimulatePage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionId, setMissionId] = useState("");
  const [horizon, setHorizon] = useState(30);
  const [rates, setRates] = useState<Partial<Record<BandId, number>>>({});
  const [out, setOut] = useState<{ simulation: Simulation | null; emptyReason: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ?mission=<id> (from a mission's page) opens the simulation for that mission.
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("mission"); if (q) setMissionId(q); }, []);
  useEffect(() => { request<{ missions: Mission[] }>("/api/client/missions").then((r) => setMissions(r.missions.filter((m) => m.status === "active" || m.status === "paused"))).catch(() => {}); }, []);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      request<{ simulation: Simulation | null; emptyReason: string | null }>("/api/client/simulate", { method: "POST", body: JSON.stringify({ horizonDays: horizon, rates, ...(missionId ? { missionId } : {}) }) })
        .then((r) => { if (live) { setOut(r); setError(null); } }).catch((e: Error) => live && setError(e.message));
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [horizon, rates, missionId]);
  const sim = out?.simulation;

  return (
    <DashboardLayout pageTitle="Simulate">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: 0 }}>Simulate</h1>
          <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "66ch", marginTop: 8 }}>What is likely to be collected, and how that changes if customers pay better or worse than assumed. Nothing here touches your books.</p>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, color: GRAPHITE }}>What to simulate
            <select value={missionId} onChange={(e) => { setMissionId(e.target.value); setRates({}); }} style={{ padding: "7px 10px", border: `1px solid ${RULE}`, borderRadius: 6, font: "inherit", minWidth: 240 }}>
              <option value="">Everything you are owed</option>
              {missions.map((m) => <option key={m.id} value={m.id}>Mission: {m.title}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, color: GRAPHITE, minWidth: 240 }}>Over the next {horizon} days
            <input type="range" min={7} max={90} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} style={{ accentColor: "#191917" }} />
          </label>
          {Object.keys(rates).length ? <button onClick={() => setRates({})} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" }}>Reset assumptions</button> : null}
        </div>
        {error ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {out && !sim ? <p style={{ color: GRAPHITE }}>{out.emptyReason}</p> : null}
        {sim ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
            <section style={{ display: "grid", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Estimate <Kind k="estimate" /></h2>
                <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {[[sim.estimate.expected.label, sim.estimate.expected.value, `range ${inr(sim.estimate.range.low)} – ${inr(sim.estimate.range.high)}`], [sim.estimate.stillOwed.label, sim.estimate.stillOwed.value, "if the assumptions hold"]].map(([l, v, s], i) => (
                    <div key={i} style={{ padding: "14px 16px", borderLeft: i ? `1px solid ${RULE}` : 0 }}>
                      <div style={{ fontSize: 12, color: GRAPHITE }}>{l}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, marginTop: 4 }}>{inr(Number(v))}</div>
                      <div style={{ fontSize: 12.5, color: GRAPHITE }}>{s}</div>
                    </div>
                  ))}
                </div>
                {sim.target ? <p style={{ margin: "10px 0 0", color: sim.target.reach === "unlikely" ? "#A23B3B" : sim.target.reach === "possible" ? "#8A5A12" : "#2F6B4F" }}>Target {inr(sim.target.amount)} (what is left to collect): {sim.target.text}</p> : null}
                <p style={{ fontSize: 12.5, color: GRAPHITE, marginTop: 8 }}>{sim.method}</p>
              </div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>From your books <Kind k="fact" /></h2>
                <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8 }}>
                  {sim.facts.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 16px", borderTop: i ? `1px solid ${RULE}` : 0, fontSize: 13.5 }}>
                      <span>{f.label}{f.note ? <span style={{ color: GRAPHITE }}> · {f.note}</span> : null}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inr(Number(f.value))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Assumptions <Kind k="assumption" /></h2>
              <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8 }}>
                {sim.assumptions.map((a, i) => {
                  const band = sim.bands.find((b) => b.band === a.band);
                  return (
                    <div key={a.band} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 140px 42px", gap: 10, alignItems: "center", padding: "10px 16px", borderTop: i ? `1px solid ${RULE}` : 0, fontSize: 13.5 }}>
                      <span>Paid within {sim.horizonDays} days if {a.label.toLowerCase()}<br /><span style={{ fontSize: 12, color: GRAPHITE }}>{SOURCE[a.source]}{a.sample ? ` (${a.sample} invoices)` : ""}{band?.count ? ` · ${inr(band.expected)} of ${inr(band.amount)}` : ""}</span></span>
                      <input type="range" min={0} max={100} value={Math.round(a.rate * 100)} aria-label={`Assumed rate for ${a.label}`} style={{ accentColor: "#191917" }}
                        onChange={(e) => setRates((r) => ({ ...r, [a.band]: Number(e.target.value) / 100 }))} />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(a.rate * 100)}%</span>
                    </div>
                  );
                })}
              </div>
              {sim.caveat ? <p style={{ fontSize: 12.5, color: GRAPHITE, marginTop: 8 }}>{sim.caveat}</p> : null}
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

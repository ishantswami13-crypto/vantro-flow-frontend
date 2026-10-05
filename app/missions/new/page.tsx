"use client";

// Start a collections mission on the web — the same flow as the apps:
// POST /api/client/missions/preview works out the objective, what is left
// out (disputed, recently contacted) and a simulated estimate while the owner
// edits; POST /api/client/missions saves it, and /activate starts it, which
// proposes one reminder per customer for approval. Nothing is sent from here.
// ?customer=<name> or ?invoice=<id> pre-fills who the mission is about.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import { request } from "@/lib/api";
import type { Mission, MissionDraft, MissionInput, Simulation } from "../../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const field: React.CSSProperties = { padding: "8px 10px", border: `1px solid ${RULE}`, borderRadius: 6, font: "inherit", background: "#fff" };
const btn: React.CSSProperties = { fontSize: 13.5, padding: "8px 14px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" };
type Preview = { errors: string[]; draft: MissionDraft; simulation: Simulation | null };

export default function NewMissionPage() {
  const router = useRouter();
  const [input, setInput] = useState<MissionInput | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const invoice = q.get("invoice"), customer = q.get("customer");
    setInput({ horizonDays: 14, ...(invoice ? { invoiceIds: [invoice] } : {}), ...(customer ? { customer } : {}) });
  }, []);

  useEffect(() => {
    if (!input) return;
    let live = true;
    const t = setTimeout(() => {
      request<Preview>("/api/client/missions/preview", { method: "POST", body: JSON.stringify(input) })
        .then((p) => { if (live) { setPreview(p); setErr(null); } })
        .catch((e: Error) => live && setErr(e.message));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [input]);

  // Once created, a retry (say activation failed) reuses the same mission
  // instead of creating a second one.
  const createdId = useRef<string | null>(null);
  async function create(activate: boolean) {
    if (!input || busy) return;
    setBusy(true); setErr(null);
    try {
      if (!createdId.current) {
        const { mission } = await request<{ mission: Mission }>("/api/client/missions", { method: "POST", body: JSON.stringify({ type: "collections", ...input }) });
        createdId.current = mission.id;
      }
      if (activate) await request(`/api/client/missions/${createdId.current}/activate`, { method: "POST", body: "{}" });
      router.push(`/missions/${createdId.current}`);
    } catch (e) {
      setErr(createdId.current ? `The mission was saved as a draft but not started: ${(e as Error).message}` : (e as Error).message);
      setBusy(false);
    }
  }

  const d = preview?.draft, sim = preview?.simulation;
  const owed = sim?.facts[0]?.value as number | undefined;
  const blocked = busy || !preview || !!preview.errors.length;
  return (
    <DashboardLayout pageTitle="New mission">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 20 }}>
        <div>
          <Link href="/missions" style={{ fontSize: 13, color: GRAPHITE }}>‹ Missions</Link>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: "8px 0 0" }}>{d?.title || "New collections mission"}</h1>
          <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "66ch", marginTop: 8 }}>One objective with a deadline, measured against your books. Starting it proposes one reminder per customer for your approval — nothing is sent until you approve it.</p>
        </div>
        {input ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
            <section style={{ display: "grid", gap: 14 }}>
              <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "18px 20px", display: "grid", gap: 14 }}>
                <label style={{ display: "grid", gap: 4, fontSize: 13, color: GRAPHITE }}>Who
                  <input style={field} placeholder="Everyone overdue" disabled={!!input.invoiceIds} value={input.invoiceIds ? "The invoice you chose" : input.customer || ""}
                    onChange={(e) => setInput((i) => ({ ...i!, customer: e.target.value || undefined }))} />
                </label>
                {input.invoiceIds ? <button style={{ ...btn, justifySelf: "start", padding: "4px 10px", fontSize: 12.5 }} onClick={() => setInput((i) => { if (!i) return i; const { invoiceIds: _drop, ...rest } = i; return rest; })}>Use everyone overdue instead</button> : null}
                <label style={{ display: "grid", gap: 4, fontSize: 13, color: GRAPHITE }}>Collect (₹)
                  <input style={field} inputMode="numeric" placeholder={owed ? `Up to ${Math.round(owed).toLocaleString("en-IN")}` : ""} value={input.targetAmount ?? ""}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setInput((i) => ({ ...i!, targetAmount: v ? Number(v) : undefined })); }} />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 13, color: GRAPHITE }}>Within {input.horizonDays} days
                  <input type="range" min={3} max={60} value={input.horizonDays} style={{ accentColor: "#191917" }} onChange={(e) => setInput((i) => ({ ...i!, horizonDays: Number(e.target.value) }))} />
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
                  <input type="checkbox" checked={!!input.constraints?.allowEscalation} onChange={(e) => setInput((i) => ({ ...i!, constraints: { ...i!.constraints, allowEscalation: e.target.checked } }))} />
                  Allow escalation beyond a firm reminder (calls, bad-debt review)
                </label>
                <p style={{ margin: 0, fontSize: 12.5, color: GRAPHITE }}>Disputed invoices are always left out. Customers contacted in the last 3 days are not proposed again.</p>
              </div>
              {preview?.errors.length ? <p role="alert" style={{ margin: 0, color: "#A23B3B" }}>{preview.errors.join(" · ")}</p> : null}
              {err ? <p role="alert" style={{ margin: 0, color: "#A23B3B" }}>{err}</p> : null}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...btn, background: "#191917", color: "#fff", opacity: blocked ? 0.4 : 1 }} disabled={blocked} onClick={() => void create(true)}>{busy ? "Starting…" : "Start mission"}</button>
                <button style={btn} disabled={blocked} onClick={() => void create(false)}>Save as draft</button>
              </div>
            </section>
            <section style={{ display: "grid", gap: 16 }}>
              {!preview ? <p style={{ color: GRAPHITE }}>Working it out…</p> : null}
              {d ? (
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Objective</h2>
                  <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "14px 16px", fontSize: 14.5 }}>
                    {d.objective}
                    {d.excluded.length ? <p style={{ margin: "8px 0 0", fontSize: 13, color: GRAPHITE }}>Left out: {d.excluded.map((x) => `${x.customer} (${x.reason})`).join("; ")}</p> : null}
                  </div>
                </div>
              ) : null}
              {sim ? (
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>Simulated <span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 10.5, padding: "2px 6px", borderRadius: 4, background: "#EEE9F6", color: "#5B4A86" }}>estimate</span></h2>
                  <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "14px 16px", display: "grid", gap: 6, fontSize: 14 }}>
                    <div><span style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{inr(sim.estimate.expected.value)}</span> expected within {sim.horizonDays} days</div>
                    <div style={{ fontSize: 13, color: GRAPHITE }}>Range {inr(sim.estimate.range.low)} – {inr(sim.estimate.range.high)}</div>
                    {sim.target ? <div style={{ color: sim.target.reach === "unlikely" ? "#A23B3B" : sim.target.reach === "possible" ? "#8A5A12" : "#477054" }}>{sim.target.text}</div> : null}
                    {sim.caveat ? <div style={{ fontSize: 12.5, color: GRAPHITE }}>{sim.caveat}</div> : null}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

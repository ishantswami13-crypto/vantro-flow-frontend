"use client";

// Missions on the web: follow the company's missions — objective, progress
// measured from the books, status and blockers — from the same API the
// desktop and phone apps use (GET /api/client/missions). Creating, starting
// and pausing missions, and approving their actions, happen in the apps.
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import type { Mission } from "../../packages/contracts/src/features";

const STATUS: Record<string, [string, string]> = {
  active: ["Active", "#4B5170"], paused: ["Paused", "#8A5A12"], draft: ["Draft", "#63635F"],
  completed: ["Completed", "#2F6B4F"], failed: ["Missed target", "#A23B3B"], cancelled: ["Cancelled", "#63635F"],
};
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    request<{ missions: Mission[] }>("/api/client/missions")
      .then((r) => setMissions(r.missions))
      .catch((e: Error) => setError(e.message || "Could not load missions"));
  }, []);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: 0 }}>Missions</h1>
          <p className="v32-body" style={{ color: "#63635F", maxWidth: "64ch", marginTop: 8 }}>
            One objective with a deadline, measured against your books. Start, pause and approve missions in Starlane for Windows or the phone app; follow them here.
          </p>
        </div>
        {error ? <p style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!missions && !error ? <p style={{ color: "#63635F" }}>Loading…</p> : null}
        {missions && missions.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: "28px 24px" }}>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, color: "#191917", margin: 0 }}>No missions yet.</p>
            <p className="v32-body" style={{ color: "#63635F", marginTop: 6 }}>Start one from an overdue invoice in Watch, in the desktop or phone app. Nothing here is an example.</p>
          </div>
        ) : null}
        {missions?.map((m) => {
          const p = m.progress;
          const [label, color] = STATUS[m.status] || [m.status, "#63635F"];
          return (
            <article key={m.id} style={{ background: "#fff", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: "18px 20px", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{m.title}</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color, background: "#F1F0EC", borderRadius: 999, padding: "3px 9px" }}>{label}</span>
              </div>
              <p className="v32-body" style={{ color: "#63635F", margin: 0 }}>{m.objective}</p>
              {m.status !== "draft" ? (
                <>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(25,25,23,0.08)", overflow: "hidden" }} role="img" aria-label={`${Math.round((p?.ratio || 0) * 100)}% of target collected`}>
                    <div style={{ height: "100%", width: `${Math.round((p?.ratio || 0) * 100)}%`, background: m.status === "failed" ? "#A23B3B" : "#2F6B4F" }} />
                  </div>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#191917", margin: 0 }}>
                    {inr(p?.collected || 0)} of {inr(m.target.amount)} collected{m.status === "active" && p?.daysLeft != null ? ` · ${p.daysLeft} days left` : ""}
                    {typeof p?.blockers === "number" && p.blockers > 0 ? ` · ${p.blockers} blocker${p.blockers > 1 ? "s" : ""}` : ""}
                  </p>
                </>
              ) : null}
              {m.outcome ? <p style={{ margin: 0, color }}>{m.outcome.text}</p> : null}
            </article>
          );
        })}
      </div>
    </DashboardLayout>
  );
}

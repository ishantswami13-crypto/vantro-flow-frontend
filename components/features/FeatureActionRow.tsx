"use client";

// One proposed action on the web, with the same lifecycle as the apps and the
// owner's decision (POST /api/client/actions/:id/decision). Approving only
// records the decision and runs the shared executor on the server — with
// external sending switched off, nothing reaches a customer. A high-risk
// action needs a deliberate confirmation here, and the server refuses it
// without one (428); a mission that is not active holds approvals (409).
import { useState } from "react";
import { request } from "@/lib/api";
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type FeatureAction } from "../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const TONE: Record<string, [string, string]> = {
  accent: ["#ECEEF6", "#4B5170"], ok: ["#E9F2EC", "#2F6B4F"], warn: ["#F7EFDF", "#8A5A12"], bad: ["#F6E6E6", "#A23B3B"], muted: ["#F1F0EC", GRAPHITE],
};
const btn: React.CSSProperties = { fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" };

export function LifecycleChip({ a }: { a: Pick<FeatureAction, "lifecycle"> }) {
  const [bg, fg] = TONE[LIFECYCLE_TONE[a.lifecycle] || "muted"];
  return <span style={{ fontSize: 12, fontWeight: 600, color: fg, background: bg, borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>{LIFECYCLE_LABEL[a.lifecycle] || a.lifecycle}</span>;
}

export function FeatureActionRow({ a, first, onDecided }: { a: FeatureAction; first?: boolean; onDecided: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const high = a.riskLevel === "high";

  async function decide(decision: "approve" | "reject") {
    setBusy(decision); setErr(null); setNote(null);
    try {
      const r = await request<{ status: string; message?: string }>(`/api/client/actions/${encodeURIComponent(a.id)}/decision`, {
        method: "POST", body: JSON.stringify({ decision, confirmHighRisk: high ? confirm : undefined, via: "web" }),
      });
      setNote(r.message || (r.status === "rejected" ? "Declined." : "Approved."));
      onDecided();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  return (
    <div style={{ padding: "12px 16px", borderTop: first ? 0 : `1px solid ${RULE}`, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontWeight: 500, flex: "1 1 240px" }}>{a.title}</strong>
        {high ? <span style={{ fontSize: 12, color: "#A23B3B" }}>High risk</span> : null}
        <LifecycleChip a={a} />
      </div>
      {a.description ? <span style={{ fontSize: 13, color: GRAPHITE }}>{a.description}</span> : null}
      {a.lifecycleNote ? <span style={{ fontSize: 13, color: GRAPHITE }}>{a.lifecycleNote}</span> : null}
      {a.draft ? (
        <blockquote style={{ margin: 0, padding: "8px 12px", background: "#F7F6F2", borderRadius: 6, fontSize: 13.5, whiteSpace: "pre-wrap" }}>
          <span style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: GRAPHITE, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>Drafted message</span>
          {a.draft}
        </blockquote>
      ) : null}
      {a.canDecide ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {high ? (
            <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              I have checked this high-risk action
            </label>
          ) : null}
          <button style={{ ...btn, background: "#191917", color: "#fff", opacity: high && !confirm ? 0.4 : 1 }} disabled={!!busy || (high && !confirm)} onClick={() => void decide("approve")}>
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
          <button style={btn} disabled={!!busy} onClick={() => void decide("reject")}>{busy === "reject" ? "Declining…" : "Decline"}</button>
        </div>
      ) : null}
      {note ? <p role="status" style={{ margin: 0, fontSize: 13 }}>{note}</p> : null}
      {err ? <p role="alert" style={{ margin: 0, fontSize: 13, color: "#A23B3B" }}>{err}</p> : null}
    </div>
  );
}

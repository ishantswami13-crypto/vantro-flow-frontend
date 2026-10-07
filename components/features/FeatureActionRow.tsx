"use client";

// One proposed action on the web, with the same lifecycle as the apps and the
// owner's decision (POST /api/client/actions/:id/decision). Approving only
// records the decision and runs the shared executor on the server — with
// external sending switched off, nothing reaches a customer. A high-risk
// action needs a deliberate confirmation here, and the server refuses it
// without one (428); a mission that is not active holds approvals (409).
import { useState } from "react";
import { request } from "@/lib/api";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { humaneError } from "@/components/os/prepared/kit";
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type FeatureAction } from "../../packages/contracts/src/features";

const RULE = "var(--line)", GRAPHITE = "var(--ink-2)";
// Lifecycle tones map onto the one status chip language.
const TONE: Record<string, StatusTone> = { accent: "info", ok: "positive", warn: "attention", bad: "critical", muted: "neutral" };

export function LifecycleChip({ a }: { a: Pick<FeatureAction, "lifecycle"> }) {
  return <StatusChip tone={TONE[LIFECYCLE_TONE[a.lifecycle] || "muted"] || "neutral"} className="whitespace-nowrap">{LIFECYCLE_LABEL[a.lifecycle] || a.lifecycle}</StatusChip>;
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
    } catch (e) { setErr(humaneError(e, "That didn't go through. Nothing was changed. Try again in a moment.")); } finally { setBusy(null); }
  }

  return (
    <div style={{ padding: "12px 16px", borderTop: first ? 0 : `1px solid ${RULE}`, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontWeight: 500, flex: "1 1 240px", color: "var(--ink)" }}>{a.title}</strong>
        {high ? <span style={{ fontSize: 12, color: "var(--critical)" }}>High risk</span> : null}
        <LifecycleChip a={a} />
      </div>
      {a.description ? <span style={{ fontSize: 13, color: GRAPHITE }}>{a.description}</span> : null}
      {a.lifecycleNote ? <span style={{ fontSize: 13, color: GRAPHITE }}>{a.lifecycleNote}</span> : null}
      {a.draft ? (
        <blockquote style={{ margin: 0, padding: "8px 12px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13.5, color: "var(--body)", whiteSpace: "pre-wrap" }}>
          <span style={{ display: "block", fontSize: 11, color: GRAPHITE, marginBottom: 4, fontFamily: "var(--font-sans)" }}>Drafted message</span>
          {a.draft}
        </blockquote>
      ) : null}
      {a.canDecide ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {high ? (
            <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              I have checked this high-risk action
            </label>
          ) : null}
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={!!busy || (high && !confirm)} onClick={() => void decide("approve")}>
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={!!busy} onClick={() => void decide("reject")}>{busy === "reject" ? "Declining…" : "Decline"}</button>
        </div>
      ) : null}
      {note ? <p role="status" style={{ margin: 0, fontSize: 13 }}>{note}</p> : null}
      {err ? <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--critical)" }}>{err}</p> : null}
    </div>
  );
}

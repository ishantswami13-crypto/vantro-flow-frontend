"use client";

// One action a mission proposed, with its lifecycle and the owner's decision
// (POST /api/client/actions/:id/decision, the same call and rules as
// components/features/FeatureActionRow). Approving only records the decision
// and runs the shared executor on the server; with external sending switched
// off, nothing reaches a customer. A high-risk action needs a deliberate
// confirmation, and the server refuses it without one (428); a mission that
// is not active holds approvals (409).

import { useState } from "react";
import { request } from "@/lib/api";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type FeatureAction } from "../../../packages/contracts/src/features";
import { humaneError, Note } from "./ui";

const TONE: Record<string, StatusTone> = { accent: "info", ok: "positive", warn: "attention", bad: "critical", muted: "neutral" };

export function lifecycleTone(a: Pick<FeatureAction, "lifecycle">): StatusTone {
  if (a.lifecycle === "APPROVAL_REQUIRED" || a.lifecycle === "VALIDATED") return "attention";
  return TONE[LIFECYCLE_TONE[a.lifecycle] || "muted"] || "neutral";
}

export function MissionActionRow({ a, first, onDecided }: { a: FeatureAction; first?: boolean; onDecided: () => void }) {
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
    } catch (e) { setErr(humaneError(e)); } finally { setBusy(null); }
  }

  return (
    <div style={{ padding: "14px 18px", borderTop: first ? 0 : "1px solid var(--line)", display: "grid", gap: 8 }}>
      <div className="flex items-start flex-wrap" style={{ gap: "6px 12px" }}>
        <div className="min-w-0" style={{ flex: "1 1 240px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{a.title}</div>
          {a.description && <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>{a.description}</div>}
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          {high && <StatusChip tone="critical">High risk</StatusChip>}
          <StatusChip tone={lifecycleTone(a)}>{LIFECYCLE_LABEL[a.lifecycle] || a.lifecycle}</StatusChip>
        </div>
      </div>
      {a.lifecycleNote && <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{a.lifecycleNote}</div>}
      {a.draft && (
        <figure style={{ margin: 0, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)" }}>
          <figcaption style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>Drafted message, not sent</figcaption>
          <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{a.draft}</div>
        </figure>
      )}
      {a.canDecide && (
        <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 2 }}>
          {high && (
            <label className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: "var(--body)", minHeight: 32 }}>
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              I have checked this high-risk action
            </label>
          )}
          <Button variant="secondary" size="sm" disabled={!!busy || (high && !confirm)} loading={busy === "approve"} onClick={() => void decide("approve")}>Approve</Button>
          <Button variant="ghost" size="sm" disabled={!!busy} loading={busy === "reject"} onClick={() => void decide("reject")}>Decline</Button>
        </div>
      )}
      {note && <Note>{note}</Note>}
      {err && <Note tone="critical">{err}</Note>}
    </div>
  );
}

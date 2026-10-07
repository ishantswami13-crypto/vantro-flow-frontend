"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine } from "@/components/v32/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type RankedAction } from "@/lib/api";

// Priority 5 — Control Approvals. Real pending ai_actions for this tenant,
// same two-column layout the honest-empty shell already had (§6:
// ControlApprovals — left flex:1 queue list, right flex:1;max-width:380px
// detail rail, the widest rail in the system). Approve/Reject reuse the
// same api.aiActions.updateStatus() → PATCH /api/ai-actions/:id pathway
// already proven from the Bridge Lens drawer (commit 3ad513f) — no parallel
// approval system. The list itself comes from the existing, now-fixed
// GET /api/ai-actions route (server.js) — see that route's comment for the
// pgSupabaseShim embedded-join bug fixed alongside this page.
function priorityLabel(priority: RankedAction["priority"]): string {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Medium priority";
  return "Low priority";
}

function priorityColor(priority: RankedAction["priority"]): string {
  if (priority === "urgent" || priority === "high") return "var(--status-danger)";
  return "var(--text-tertiary)";
}

function actorLabel(action: RankedAction): string {
  if (action.customers?.name) return action.customers.name;
  if (action.customer?.name) return action.customer.name;
  return "Starlane";
}

function ApprovalRow({
  action,
  selected,
  onSelect,
}: {
  action: RankedAction;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="row-hover"
      style={{
        display: "flex", flexDirection: "column", gap: 4, width: "100%", textAlign: "left",
        padding: "12px 14px", borderRadius: 10, border: "1px solid",
        borderColor: selected ? "var(--accent-primary)" : "var(--border-default)",
        background: selected ? "#F4F6FE" : "transparent",
        cursor: "pointer", marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{action.title}</span>
        <span className="text-2xs" style={{ color: priorityColor(action.priority), fontWeight: 600, whiteSpace: "nowrap" }}>
          {priorityLabel(action.priority)}
        </span>
      </div>
      <div className="text-2xs" style={{ color: "var(--text-tertiary)" }}>
        {actorLabel(action)} · {formatDateTime(action.created_at)}
      </div>
    </button>
  );
}

export default function ControlApprovalsPage() {
  const [actions, setActions] = useState<RankedAction[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionPending, setDecisionPending] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    // ?id=<action id> (from Prepared's Review) opens with that action selected.
    let linkedId: string | null = null;
    try { linkedId = new URLSearchParams(window.location.search).get("id"); } catch { /* no window */ }
    api.aiActions.list("pending")
      .then(res => {
        const list = res.actions || [];
        setActions(list);
        setSelectedId(prev => {
          if (prev && list.some(a => a.id === prev)) return prev;
          return linkedId && list.some(a => a.id === linkedId) ? linkedId : null;
        });
      })
      .catch(() => {
        setActions(null);
        setLoadError("Couldn't reach Starlane's intelligence backend — try again.");
      });
  };

  useEffect(() => { load(); }, []);

  const selected = actions?.find(a => a.id === selectedId) || null;

  const decide = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setDecisionPending(true);
    setDecisionError(null);
    try {
      await api.aiActions.updateStatus(selected.id, status);
      setActions(prev => (prev || []).filter(a => a.id !== selected.id));
      setSelectedId(null);
    } catch {
      setDecisionError("Couldn't save that decision. Try again.");
    } finally {
      setDecisionPending(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Approvals">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="fade-once">
          <h1 style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 20, color: "var(--text-primary)" , letterSpacing: "-0.015em"}}>
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "var(--text-secondary)" }}>
            Actions waiting on your decision before Starlane carries them out.
          </p>
        </div>

        <ControlSubnav active="approvals" />

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            {actions === null && !loadError && <LoadingState label="Loading approvals" rows={4} />}

            {loadError && (
              <ErrorState title="Couldn't load approvals" message={loadError} onRetry={load} />
            )}

            {actions !== null && !loadError && actions.length === 0 && (
              <EmptyLine
                title="No other actions are waiting for a decision right now."
                body={<>Decisions Starlane raises wait on <Link className="underline" href="/prepared">Prepared</Link>.</>}
              />
            )}

            {actions !== null && !loadError && actions.length > 0 && (
              <div>
                {actions.map(a => (
                  <ApprovalRow
                    key={a.id}
                    action={a}
                    selected={a.id === selectedId}
                    onSelect={() => { setSelectedId(a.id); setDecisionError(null); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1, maxWidth: 380, minWidth: 280, borderLeft: "1px solid var(--border-default)",
              paddingLeft: 20, display: "flex", flexDirection: selected ? "column" : "row",
              alignItems: selected ? "stretch" : "center", justifyContent: selected ? "flex-start" : "center",
              gap: 14, overflow: "auto",
            }}
          >
            {!selected && (
              <p className="text-[13px] text-center" style={{ color: "var(--text-tertiary)", maxWidth: 260 }}>
                Select an item from the queue to see its details here.
              </p>
            )}

            {selected && (
              <>
                <div>
                  <div className="text-2xs" style={{ color: priorityColor(selected.priority), fontWeight: 600, letterSpacing: "0.04em" }}>
                    {priorityLabel(selected.priority)}
                  </div>
                  <h2 style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>{selected.title}</h2>
                </div>

                {selected.description && (
                  <p className="text-sm" style={{ color: "var(--text-body)", lineHeight: 1.5 }}>{selected.description}</p>
                )}

                {selected.recommended_message && (
                  <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border-default)" }}>
                    <div className="text-2xs" style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>Recommended message</div>
                    <p className="text-sm" style={{ color: "var(--text-body)" }}>{selected.recommended_message}</p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="text-2xs" style={{ color: "var(--text-tertiary)" }}>
                    Actor: <span style={{ color: "var(--text-body)" }}>{actorLabel(selected)}</span>
                  </div>
                  <div className="text-2xs" style={{ color: "var(--text-tertiary)" }}>
                    Action type: <span style={{ color: "var(--text-body)" }}>{selected.action_type}</span>
                  </div>
                  <div className="text-2xs" style={{ color: "var(--text-tertiary)" }}>
                    Created: <span style={{ color: "var(--text-body)" }}>{formatDateTime(selected.created_at)}</span>
                  </div>
                  {selected.risk_level && (
                    <div className="text-2xs" style={{ color: "var(--text-tertiary)" }}>
                      Risk: <span style={{ color: "var(--text-body)" }}>{selected.risk_level}</span>
                    </div>
                  )}
                </div>

                {decisionError && (
                  <p className="text-2xs" style={{ color: "var(--status-danger)" }}>{decisionError}</p>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => decide("approved")}
                    disabled={decisionPending}
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 8, border: "none",
                      background: "var(--bg-inverse)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600,
                      cursor: decisionPending ? "default" : "pointer", opacity: decisionPending ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide("rejected")}
                    disabled={decisionPending}
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-default)",
                      background: "transparent", color: "var(--text-body)", fontSize: 13, fontWeight: 600,
                      cursor: decisionPending ? "default" : "pointer", opacity: decisionPending ? 0.6 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

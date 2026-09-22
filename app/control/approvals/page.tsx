"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type RankedAction } from "@/lib/api";
import { FiCheckSquare } from "react-icons/fi";

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
  if (priority === "urgent" || priority === "high") return "#A64F4B";
  return "#8A8A86";
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
        borderColor: selected ? "#4F6EF7" : "#EBEAE6",
        background: selected ? "#F4F6FE" : "transparent",
        cursor: "pointer", marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span className="text-sm font-medium" style={{ color: "#171717" }}>{action.title}</span>
        <span className="text-2xs" style={{ color: priorityColor(action.priority), fontWeight: 600, whiteSpace: "nowrap" }}>
          {priorityLabel(action.priority)}
        </span>
      </div>
      <div className="text-2xs" style={{ color: "#8A8A86" }}>
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
    api.aiActions.list("pending")
      .then(res => {
        setActions(res.actions || []);
        setSelectedId(prev => (prev && (res.actions || []).some(a => a.id === prev) ? prev : null));
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
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Control
          </h1>
          <p className="text-[13.5px] mt-2 max-w-[640px]" style={{ color: "#63635F" }}>
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
              <EmptyState
                icon={<FiCheckSquare size={28} style={{ color: "#8A8A86" }} />}
                title="No other actions are waiting for a decision right now."
                message=""
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
              flex: 1, maxWidth: 380, minWidth: 280, borderLeft: "1px solid #EBEAE6",
              paddingLeft: 20, display: "flex", flexDirection: selected ? "column" : "row",
              alignItems: selected ? "stretch" : "center", justifyContent: selected ? "flex-start" : "center",
              gap: 14, overflow: "auto",
            }}
          >
            {!selected && (
              <p className="text-[13px] text-center" style={{ color: "#8A8A86", maxWidth: 260 }}>
                Select an item from the queue to see its details here.
              </p>
            )}

            {selected && (
              <>
                <div>
                  <div className="text-2xs" style={{ color: priorityColor(selected.priority), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {priorityLabel(selected.priority)}
                  </div>
                  <h2 style={{ margin: "6px 0 0", fontSize: 17, fontWeight: 600, color: "#191917" }}>{selected.title}</h2>
                </div>

                {selected.description && (
                  <p className="text-sm" style={{ color: "#3A3A36", lineHeight: 1.5 }}>{selected.description}</p>
                )}

                {selected.recommended_message && (
                  <div style={{ padding: 12, borderRadius: 8, background: "#F7F7F5", border: "1px solid #EBEAE6" }}>
                    <div className="text-2xs" style={{ color: "#8A8A86", marginBottom: 4 }}>Recommended message</div>
                    <p className="text-sm" style={{ color: "#3A3A36" }}>{selected.recommended_message}</p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="text-2xs" style={{ color: "#8A8A86" }}>
                    Actor: <span style={{ color: "#3A3A36" }}>{actorLabel(selected)}</span>
                  </div>
                  <div className="text-2xs" style={{ color: "#8A8A86" }}>
                    Action type: <span style={{ color: "#3A3A36" }}>{selected.action_type}</span>
                  </div>
                  <div className="text-2xs" style={{ color: "#8A8A86" }}>
                    Created: <span style={{ color: "#3A3A36" }}>{formatDateTime(selected.created_at)}</span>
                  </div>
                  {selected.risk_level && (
                    <div className="text-2xs" style={{ color: "#8A8A86" }}>
                      Risk: <span style={{ color: "#3A3A36" }}>{selected.risk_level}</span>
                    </div>
                  )}
                </div>

                {decisionError && (
                  <p className="text-2xs" style={{ color: "#A64F4B" }}>{decisionError}</p>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button
                    onClick={() => decide("approved")}
                    disabled={decisionPending}
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 8, border: "none",
                      background: "#191917", color: "#FAFAF8", fontSize: 13, fontWeight: 600,
                      cursor: decisionPending ? "default" : "pointer", opacity: decisionPending ? 0.6 : 1,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide("rejected")}
                    disabled={decisionPending}
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid #EBEAE6",
                      background: "transparent", color: "#3A3A36", fontSize: 13, fontWeight: 600,
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

"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, type RankedAction, type CashRiskNarrative } from "@/lib/api";
import { posthog } from "@/lib/posthog";

const PRIORITY_VARIANT: Record<RankedAction["priority"], "danger" | "warning" | "accent" | "muted"> = {
  urgent: "danger", high: "warning", medium: "accent", low: "muted",
};

// Day 7 Part 3/4 — evidence UX for the cash-risk narrative. Rendered only
// when cashRiskNarrative is present and its evidence honestly cleared the
// bar (insufficientEvidence rows never reach this — see businessState.js's
// enrichRowsWithDay7Intelligence). "Why?" expands inline rather than a new
// drawer type, matching this card's existing density.
function CashRiskEvidence({ narrative, actionId }: { narrative: CashRiskNarrative; actionId: string }) {
  const [expanded, setExpanded] = useState(false);

  if (narrative.insufficientEvidence) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {narrative.observation && (
        <p className="text-2xs text-secondary leading-relaxed">{narrative.observation}</p>
      )}

      {narrative.confidence_components?.trajectory_confidence === 0 && (
        <p className="text-2xs text-muted italic mt-1">Limited history — based on a single prior data point.</p>
      )}

      <button
        type="button"
        onClick={() => {
          const next = !expanded;
          setExpanded(next);
          if (next) posthog.capture("evidence_why_opened", { action_id: actionId });
        }}
        className="text-2xs text-accent underline-offset-2 hover:underline mt-2 focus-ring rounded"
      >
        {expanded ? "Hide why" : "Why?"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {narrative.evidence && narrative.evidence.length > 0 && (
            <ul className="list-disc pl-4 space-y-1">
              {narrative.evidence.map((item, i) => (
                <li key={i} className="text-2xs text-secondary leading-relaxed">
                  {item.claim}
                  {item.honestyNote && <span className="block text-muted italic">{item.honestyNote}</span>}
                </li>
              ))}
            </ul>
          )}
          {narrative.relationship_context && (
            <p className="text-2xs text-secondary leading-relaxed">{narrative.relationship_context}</p>
          )}
          {narrative.why_it_matters && (
            <p className="text-2xs text-secondary leading-relaxed"><span className="font-semibold">Why it matters: </span>{narrative.why_it_matters}</p>
          )}
          {narrative.likely_consequence && (
            <p className="text-2xs text-muted leading-relaxed">{narrative.likely_consequence}</p>
          )}
          {narrative.recommended_action && (
            <p className="text-2xs text-secondary leading-relaxed"><span className="font-semibold">Suggested: </span>{narrative.recommended_action}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Displays ONE recommended action with Approve/Reject only. Approving here
// changes ai_actions.status via the existing PATCH endpoint — it does NOT
// execute anything (sending/executing is a separate, decoupled pathway per
// the backend audit). Recommendation is never conflated with execution.
export function ActionCard({ action, onOpenCustomer }: { action: RankedAction; onOpenCustomer?: (customerId: string, name: string, phone?: string) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") => api.aiActions.updateStatus(action.id, status),
    onSuccess: (_data, status) => {
      setError(null);
      posthog.capture("action_status_changed", { action_id: action.id, action_type: action.action_type, status });
      queryClient.invalidateQueries({ queryKey: ["business-state"] });
    },
    onError: () => setError("Couldn't update this action — try again."),
  });

  const rationale = action.customer?.score_reason || action.description;

  return (
    <div className="card-premium p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-primary">{action.title}</p>
        <Badge variant={PRIORITY_VARIANT[action.priority]}>{action.priority}</Badge>
      </div>
      {rationale && <p className="text-2xs text-secondary leading-relaxed mb-3">{rationale}</p>}
      {action.customer?.name && (
        onOpenCustomer ? (
          <button
            type="button"
            onClick={() => {
              posthog.capture("action_card_opened", { action_id: action.id, action_type: action.action_type });
              onOpenCustomer(action.customer!.id, action.customer!.name!, action.customer!.phone);
            }}
            className="block text-2xs text-accent underline-offset-2 hover:underline mb-3 focus-ring rounded"
          >
            Customer: {action.customer.name}
          </button>
        ) : (
          <p className="text-2xs text-muted mb-3">Customer: {action.customer.name}</p>
        )
      )}

      {action.cashRiskNarrative && <CashRiskEvidence narrative={action.cashRiskNarrative} actionId={action.id} />}

      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="success"
          size="sm"
          loading={mutation.isPending && mutation.variables === "approved"}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("approved")}
        >
          Approve
        </Button>
        <Button
          variant="ghost"
          size="sm"
          loading={mutation.isPending && mutation.variables === "rejected"}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("rejected")}
        >
          Reject
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { api, type RankedAction } from "@/lib/api";

const PRIORITY_VARIANT: Record<RankedAction["priority"], "danger" | "warning" | "accent" | "muted"> = {
  urgent: "danger", high: "warning", medium: "accent", low: "muted",
};

// Displays ONE recommended action with Approve/Reject only. Approving here
// changes ai_actions.status via the existing PATCH endpoint — it does NOT
// execute anything (sending/executing is a separate, decoupled pathway per
// the backend audit). Recommendation is never conflated with execution.
export function ActionCard({ action, onOpenCustomer }: { action: RankedAction; onOpenCustomer?: (customerId: string, name: string, phone?: string) => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") => api.aiActions.updateStatus(action.id, status),
    onSuccess: () => {
      setError(null);
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
            onClick={() => onOpenCustomer(action.customer!.id, action.customer!.name!, action.customer!.phone)}
            className="block text-2xs text-accent underline-offset-2 hover:underline mb-3 focus-ring rounded"
          >
            Customer: {action.customer.name}
          </button>
        ) : (
          <p className="text-2xs text-muted mb-3">Customer: {action.customer.name}</p>
        )
      )}

      <div className="flex items-center gap-2">
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

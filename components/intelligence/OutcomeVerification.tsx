"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FiRefreshCw } from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDate } from "./format";
import { api, type IntelligenceVerifyOutcomeResponse } from "@/lib/api";

// Calls the real POST /api/intelligence/signals/:id/verify-outcome — never
// a hardcoded "Awaiting observation" label. Before the first check, the
// honest state is "not yet checked", not a guess at what the result will be.
export function OutcomeVerification({ signalId }: { signalId: string }) {
  const [result, setResult] = useState<IntelligenceVerifyOutcomeResponse | null>(null);
  const mutation = useMutation({
    mutationFn: () => api.intelligence.verifyOutcome(signalId),
    onSuccess: setResult,
  });

  return (
    <div className="card-premium p-4 mb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Outcome verification</p>
        <Button
          variant="ghost"
          size="xs"
          icon={<FiRefreshCw size={12} className={mutation.isPending ? "animate-spin" : ""} />}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Check now
        </Button>
      </div>

      {!result && !mutation.isPending && (
        <p className="text-2xs text-muted">
          Not yet checked. Checking compares each prediction's horizon against real, current inventory and order
          data — nothing here is guessed.
        </p>
      )}

      {result && result.status === "VERIFIED" && (
        <div className="space-y-2">
          {result.updatedActions.map((a) => (
            <div key={a.actionId} className="flex items-center gap-2">
              <Badge variant={a.outcome === "effective" ? "success" : "danger"}>
                {a.outcome === "effective" ? "Verified effective" : "Verified ineffective"}
              </Badge>
              <p className="text-2xs text-muted font-mono">action {a.actionId.slice(0, 8)}…</p>
            </div>
          ))}
          <p className="text-2xs text-muted">
            Resolved against real data: {result.resolvedPredictions.map((p) => `${p.target.replace(/_/g, " ")} @ ${p.horizonDays}d`).join(", ")}.
          </p>
        </div>
      )}

      {result && result.status === "AWAITING_OBSERVATION" && (
        <div className="space-y-2">
          <Badge variant="muted">Awaiting observation</Badge>
          <p className="text-2xs text-muted">
            {result.awaitingPredictions.length} prediction{result.awaitingPredictions.length === 1 ? "" : "s"} still
            awaiting {result.awaitingPredictions.length === 1 ? "its horizon" : "their horizons"} — next resolves{" "}
            {formatDate(result.awaitingPredictions.sort((a, b) => a.horizonDays - b.horizonDays)[0]?.horizonDate)}.
            Starlane also checks this automatically once a day.
          </p>
        </div>
      )}

      {result && result.status === "NO_ACTION_TO_VERIFY" && (
        <Badge variant="muted">No executed action to verify yet</Badge>
      )}

      {mutation.isError && <p className="text-2xs text-danger mt-2">Couldn't check — try again.</p>}
    </div>
  );
}

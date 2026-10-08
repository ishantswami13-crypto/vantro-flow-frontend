"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatusChip } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { IconRefresh } from "@/components/v32/icons";
import { formatDate } from "./format";
import { api, type IntelligenceVerifyOutcomeResponse } from "@/lib/api";

// Calls the real POST /api/intelligence/signals/:id/verify-outcome, never a
// hardcoded "Awaiting observation" label. Before the first check, the honest
// state is "not yet checked", not a guess at what the result will be.
export function OutcomeVerification({ signalId }: { signalId: string }) {
  const [result, setResult] = useState<IntelligenceVerifyOutcomeResponse | null>(null);
  const mutation = useMutation({
    mutationFn: () => api.intelligence.verifyOutcome(signalId),
    onSuccess: setResult,
  });

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 6 }}>
        <h2 className="section-label" style={{ margin: 0 }}>Outcome check</h2>
        <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Check now
        </Button>
      </div>

      {!result && !mutation.isPending && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: "68ch" }}>
          Not checked yet. A check compares each prediction&rsquo;s horizon with real, current inventory and order data; nothing here is guessed.
        </p>
      )}

      {result && result.status === "VERIFIED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {result.updatedActions.map((a) => (
            <div key={a.actionId} className="flex items-center" style={{ gap: 8 }}>
              <StatusChip tone={a.outcome === "effective" ? "positive" : "critical"}>
                {a.outcome === "effective" ? "Verified effective" : "Verified ineffective"}
              </StatusChip>
              <span className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)" }}>Action {a.actionId.slice(0, 8)}</span>
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>
            Resolved against real data: {result.resolvedPredictions.map((p) => `${p.target.replace(/_/g, " ")} at ${p.horizonDays} days`).join(", ")}.
          </p>
        </div>
      )}

      {result && result.status === "AWAITING_OBSERVATION" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <StatusChip tone="info">Waiting for the horizon</StatusChip>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
            {result.awaitingPredictions.length} prediction{result.awaitingPredictions.length === 1 ? " is" : "s are"} still waiting; the next resolves{" "}
            {formatDate([...result.awaitingPredictions].sort((a, b) => a.horizonDays - b.horizonDays)[0]?.horizonDate)}.
            Starlane also checks this once a day.
          </p>
        </div>
      )}

      {result && result.status === "NO_ACTION_TO_VERIFY" && (
        <StatusChip tone="unknown">No approved action to check yet</StatusChip>
      )}

      {mutation.isError && <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>Couldn&rsquo;t check just now. Try again in a moment.</p>}
    </div>
  );
}

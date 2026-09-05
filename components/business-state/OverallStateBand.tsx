import React from "react";
import { StateIndicator } from "@/components/ui/StateIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import type { OverallState } from "@/lib/api";

interface OverallStateBandProps {
  overallState: OverallState | null;
}

// overallState is null when the backend genuinely doesn't have enough data
// to classify honestly (see lib/domain/intelligence/overallState.js) — that
// is rendered as an explicit EmptyState, never defaulted to "Healthy".
export function OverallStateBand({ overallState }: OverallStateBandProps) {
  if (!overallState) {
    return (
      <EmptyState
        title="Not enough data yet to assess your business state"
        message="This fills in once you have some invoices, purchases, or cashflow activity recorded."
      />
    );
  }

  return <StateIndicator state={overallState.state} reasons={overallState.reasons} />;
}

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { api, type CortexHealthActionTypeBreakdown, type CortexHealthResponse } from "@/lib/api";

// Floor below which a per-type rate is too noisy to show honestly (mission
// spec: "fewer than 3 evaluated actions" → "Not enough data yet").
const MIN_EVALUATED_FOR_RATE = 3;

// Turns "CREDIT_RISK_ALERT" into "Credit risk alert" for display, since the
// backend only ever returns raw action_type identifiers.
function humanizeActionType(type: string): string {
  const words = type.toLowerCase().split("_");
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

function totalFor(t: CortexHealthActionTypeBreakdown): number {
  return t.effective + t.ineffective + t.unknown;
}

function TrackRecordRow({ type, data }: { type: string; data: CortexHealthActionTypeBreakdown }) {
  const total = totalFor(data);
  const enough = total >= MIN_EVALUATED_FOR_RATE;

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{humanizeActionType(type)}</p>
        <p className="text-2xs text-muted">
          {data.effective} effective · {data.ineffective} ineffective
          {data.unknown > 0 ? ` · ${data.unknown} unknown` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {enough && data.rate !== null ? (
          <span
            className={[
              "text-sm font-bold font-mono",
              data.rate >= 60 ? "text-success" : data.rate >= 40 ? "text-warning" : "text-danger",
            ].join(" ")}
          >
            {data.rate}%
          </span>
        ) : (
          <span className="text-2xs text-muted">Not enough data yet</span>
        )}
      </div>
    </div>
  );
}

// "Track Record" — has STARLANE's past recommendations actually worked? Sourced
// entirely from ai_actions.outcome via GET /api/cortex/health's by_action_type
// breakdown (evaluationAgent.js populates outcome; nothing here computes a new
// verdict). Any type with fewer than 3 evaluated actions shows "Not enough
// data yet" instead of a noisy single-sample percentage.
export function TrackRecordCard() {
  const { data, isLoading, isError } = useQuery<CortexHealthResponse>({
    queryKey: ["cortex-health"],
    queryFn: () => api.cortexHealth(),
    staleTime: 25_000,
  });

  if (isLoading) {
    return (
      <Card>
        <p className="text-sm font-bold text-primary mb-3">Track Record</p>
        <p className="text-2xs text-muted">Loading…</p>
      </Card>
    );
  }

  if (isError || !data?.stats) {
    return (
      <EmptyState
        title="Track Record is temporarily unavailable"
        message="This will come back automatically once it's reachable again."
      />
    );
  }

  const byType = data.stats.by_action_type || {};
  const types = Object.keys(byType);

  if (types.length === 0) {
    return (
      <EmptyState
        title="No recommendations evaluated yet"
        message="Once STARLANE's alerts and reminders have had time to play out, their track record will show up here."
      />
    );
  }

  return (
    <Card>
      <p className="text-sm font-bold text-primary mb-1">Track Record</p>
      <p className="text-2xs text-muted mb-3">
        How past recommendations actually turned out, by type — {data.stats.evaluated_actions} evaluated so far.
      </p>
      <div>
        {types.map(type => (
          <TrackRecordRow key={type} type={type} data={byType[type]} />
        ))}
      </div>
    </Card>
  );
}

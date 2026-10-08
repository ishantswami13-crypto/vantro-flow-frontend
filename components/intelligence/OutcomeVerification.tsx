"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatusChip } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { IconRefresh } from "@/components/v32/icons";
import { formatDate } from "./format";
import { formatCount } from "@/lib/format";
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
        <h2 className="section-label" style={{ margin: 0 }}>Forecast against what happened</h2>
        <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Check now
        </Button>
      </div>

      {!result && !mutation.isPending && (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", maxWidth: "68ch" }}>
          Not checked yet. A check compares each prediction&rsquo;s horizon with real, current inventory and order data; nothing here is guessed.
        </p>
      )}

      {result && result.status === "VERIFIED" && <Verified result={result} />}

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

/** A stockout flag reads as words; any other target keeps its number. */
function valueText(target: string, v: number | null | undefined): string {
  if (v == null) return "Not known";
  if (/stockout/i.test(target)) return v >= 1 ? "Stockout" : "No stockout";
  return formatCount(v);
}

/** Each resolved prediction beside what the ledger showed. The backend's own
 *  coverageHit decides whether the observation agrees with the forecast:
 *  false is a contradiction, null is "can't tell", never a guess. */
function Verified({ result }: { result: IntelligenceVerifyOutcomeResponse }) {
  const contradicted = result.resolvedPredictions.filter((p) => p.coverageHit === false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {contradicted.length > 0 && (
        <p role="status" className="wk-attn int-contradiction">
          What happened contradicts the forecast{contradicted.length === 1 ? ` at ${contradicted[0].horizonDays} days` : ` at ${contradicted.length} horizons`}: Starlane expected {valueText(contradicted[0].target, contradicted[0].predicted).toLowerCase()}, and the ledger shows {valueText(contradicted[0].target, contradicted[0].actualValue).toLowerCase()}.
        </p>
      )}
      {result.resolvedPredictions.length > 0 && (
        <div role="table" aria-label="Forecast against what happened" className="wk-list wk-flat">
          <div role="row" className="wk-head" style={{ gridTemplateColumns: COLS }}>
            <span role="columnheader">Horizon</span>
            <span role="columnheader">Forecast</span>
            <span role="columnheader">Observed</span>
            <span role="columnheader">Result</span>
          </div>
          {result.resolvedPredictions.map((p) => (
            <div key={p.predictionId} role="row" className="wk-row" style={{ gridTemplateColumns: COLS, paddingTop: 10, paddingBottom: 10 }}>
              <span role="cell" style={{ fontSize: 13, color: "var(--ink)" }}>Day <span className="num">{p.horizonDays}</span></span>
              <span role="cell" style={{ fontSize: 13, color: "var(--ink-2)" }}>{valueText(p.target, p.predicted)}</span>
              <span role="cell" style={{ fontSize: 13, color: "var(--ink)" }}>{valueText(p.target, p.actualValue)}</span>
              <span role="cell">
                {p.coverageHit === false ? <StatusChip tone="critical">Contradicts the forecast</StatusChip>
                  : p.coverageHit === true ? <StatusChip tone="positive">Within the forecast</StatusChip>
                  : <StatusChip tone="unknown">Can&rsquo;t tell</StatusChip>}
              </span>
            </div>
          ))}
        </div>
      )}
      {result.updatedActions.length > 0 && (
        <div className="flex flex-col" style={{ gap: 6 }}>
          {result.updatedActions.map((a) => (
            <div key={a.actionId} className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <StatusChip tone={a.outcome === "effective" ? "positive" : "critical"}>
                {a.outcome === "effective" ? "Action verified: it worked" : "Action verified: it did not work"}
              </StatusChip>
              <span className="num" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{a.actionId.slice(0, 8)}</span>
            </div>
          ))}
        </div>
      )}
      {result.awaitingPredictions.length > 0 && (
        <p className="meta" style={{ margin: 0 }}>
          {result.awaitingPredictions.length} more {result.awaitingPredictions.length === 1 ? "horizon resolves" : "horizons resolve"} later; the next on {formatDate([...result.awaitingPredictions].sort((x, y) => x.horizonDays - y.horizonDays)[0]?.horizonDate)}.
        </p>
      )}
    </div>
  );
}

const COLS = "96px minmax(0,1fr) minmax(0,1fr) 190px";

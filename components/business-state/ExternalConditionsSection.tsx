"use client";

import React, { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { posthog } from "@/lib/posthog";
import type { ExternalConditions, IntelligenceReadiness } from "@/lib/api";

// Day 7 Part 6/10 — world-exposure + intelligence-readiness UX. Deliberately
// uses LOCATION/EXPOSURE language only ("supplier in [country]") — never
// "FX"/"currency risk"/"exchange rate", since this tenant data reflects
// LOCATED_IN/OPERATES_IN exposure, not currency-denominated risk (no such
// real rows exist today). DATA_INCOMPLETE and NO_MATERIAL_SIGNALS are
// rendered as genuinely different, equally calm messages — never conflated.
function isReadiness(r: IntelligenceReadiness | { error: string } | undefined): r is IntelligenceReadiness {
  return !!r && !("error" in r);
}

function ReadinessIndicator({ readiness }: { readiness?: IntelligenceReadiness | { error: string; message: string } }) {
  const [open, setOpen] = useState(false);
  if (!isReadiness(readiness)) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) posthog.capture("missing_context_indicator_opened");
        }}
        className="text-2xs text-muted underline-offset-2 hover:underline focus-ring rounded"
      >
        {open ? "Hide data coverage" : "Data coverage"}
      </button>
      {open && (
        <ul className="mt-2 text-2xs text-muted space-y-0.5">
          <li>Organization country: {readiness.organization_country}</li>
          <li>Base currency: {readiness.base_currency}</li>
          <li>Supplier geography known: {readiness.suppliers_with_country}</li>
          <li>Customer geography known: {readiness.customers_with_country}</li>
        </ul>
      )}
    </div>
  );
}

export function ExternalConditionsSection({ externalConditions }: { externalConditions?: ExternalConditions }) {
  if (!externalConditions) return null;

  if (externalConditions.world_exposure_status === "DATA_INCOMPLETE") {
    return (
      <div className="card-premium p-4">
        <EmptyState
          title="Not enough context yet to assess outside exposure"
          message="We don't yet know whether your suppliers or customers are located somewhere that could affect your business — this isn't a finding of 'no risk', just not enough recorded geography yet."
        />
        <ReadinessIndicator readiness={externalConditions.intelligence_readiness} />
      </div>
    );
  }

  if (externalConditions.world_exposure_status === "NO_MATERIAL_SIGNALS") {
    return (
      <div className="card-premium p-4">
        <EmptyState
          title="Nothing affecting your business from the outside right now"
          message="Your recorded supplier/customer locations are being watched, and nothing material is active at the moment."
        />
        <ReadinessIndicator readiness={externalConditions.intelligence_readiness} />
      </div>
    );
  }

  return (
    <div className="card-premium p-4">
      <ul className="space-y-2">
        {externalConditions.signals.map(s => (
          <li key={s.signalId} className="text-2xs text-secondary leading-relaxed border-b border-border last:border-0 pb-2 last:pb-0">
            {s.whyExists}
          </li>
        ))}
      </ul>
      <ReadinessIndicator readiness={externalConditions.intelligence_readiness} />
    </div>
  );
}

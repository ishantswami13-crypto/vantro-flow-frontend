"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowUp, FiChevronRight, FiFileText, FiLoader } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { CausalChain } from "@/components/intelligence/CausalChain";
import { ForecastTimeline } from "@/components/intelligence/ForecastTimeline";
import { DecisionSection } from "@/components/intelligence/DecisionSection";
import { OutcomeVerification } from "@/components/intelligence/OutcomeVerification";
import { SourcesRail } from "@/components/intelligence/SourcesRail";
import { Cite } from "@/components/intelligence/Cite";
import { buildCitations } from "@/components/intelligence/citations";
import { formatINR, formatDate, formatDateTime, confidenceLabel, humanizeCode } from "@/components/intelligence/format";
import { api, type IntelligencePrediction, type IntelligenceAction, type ImpactComponent } from "@/lib/api";

function humanReason(signal: { event_type?: string | null; channel_code?: string | null }, supplierName?: string | null): string {
  const event = humanizeCode(signal.event_type).toLowerCase() || "external event";
  const channel = humanizeCode(signal.channel_code).toLowerCase();
  const via = channel ? ` (${channel})` : "";
  if (supplierName) return `This ${event} affects ${supplierName}, one of your suppliers${via}.`;
  return `This ${event} matches a recorded exposure in your business${via}.`;
}

// Earliest stockout across every affected component — the header must not
// silently report only the first component when a supplier provides several.
function earliestStockout(components: ImpactComponent[]): { component: ImpactComponent; days: number } | null {
  let best: { component: ImpactComponent; days: number } | null = null;
  for (const c of components) {
    if (!c.stockout.sufficientData) continue;
    const days = c.stockout.alreadyBelowSafetyStock ? 0 : c.stockout.daysUntilStockout;
    if (days == null || !Number.isFinite(days)) continue;
    if (!best || days < best.days) best = { component: c, days };
  }
  return best;
}

// Breadcrumb doubles as back-navigation — one line, no separate button,
// matching the AppHeader's own quiet breadcrumb language.
function Breadcrumb({ router, title }: { router: ReturnType<typeof useRouter>; title: string }) {
  return (
    <button
      type="button"
      onClick={() => router.push("/intelligence")}
      className="block text-left text-[12px] mb-2 hover:underline"
      style={{ color: "var(--text-tertiary)" }}
    >
      Intelligence / {title}
    </button>
  );
}

// One "turn" of the answer thread — a small Starlane mark and label, then
// the content indented under it, the way an assistant reply reads.
function Turn({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px]"
          style={{ background: "var(--bg-inverse)", color: "var(--text-primary)", fontFamily: "var(--font-sans)" , fontWeight: 600, letterSpacing: "-0.015em"}}
        >
          S
        </span>
        <span className="text-[12.5px] font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <div className="sm:pl-8">{children}</div>
    </div>
  );
}

function Fact({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "danger" }) {
  return (
    <div className="px-4 py-3.5 [&:not(:last-child)]:border-r border-b sm:border-b-0" style={{ borderColor: "var(--border-default)" }}>
      <dt className="text-[11.5px]" style={{ color: "var(--text-tertiary)" }}>{label}</dt>
      <dd className="text-[19px] leading-tight mt-1" style={{ color: tone === "danger" ? "var(--status-danger)" : "var(--text-primary)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{value}</dd>
      {sub && <dd className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{sub}</dd>}
    </div>
  );
}

export default function SignalImpactPage() {
  const params = useParams<{ signalId: string }>();
  const router = useRouter();
  const signalId = params.signalId;
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [predictions, setPredictions] = useState<IntelligencePrediction[] | null>(null);
  const [actions, setActions] = useState<IntelligenceAction[] | null>(null);
  const [componentIndex, setComponentIndex] = useState(0);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["intelligence-impact", signalId],
    queryFn: () => api.intelligence.impact(signalId),
    staleTime: 15_000,
    enabled: !!signalId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const [forecastRes, actionsRes] = await Promise.all([
        api.intelligence.forecast(signalId),
        api.intelligence.actions(signalId),
      ]);
      return { forecastRes, actionsRes };
    },
    onSuccess: ({ forecastRes, actionsRes }) => {
      setPredictions(forecastRes.predictions);
      setActions(actionsRes.actions);
    },
  });

  const impact = data?.impact;
  const components = impact?.components ?? [];
  const primaryComponent = components[Math.min(componentIndex, components.length - 1)];
  const soonest = earliestStockout(components);
  const affectedOrderCount = new Set(components.flatMap(c => c.affectedDemand.affectedOrderIds)).size;
  // Forecast rows and actions are written per component; show only the
  // selected component's rows. Fall back to everything if the backend
  // didn't tag them (keeps older rows visible rather than hiding them).
  const componentPredictions = predictions && primaryComponent
    ? (predictions.some(p => p.entity_id === primaryComponent.component.id) ? predictions.filter(p => p.entity_id === primaryComponent.component.id) : predictions)
    : predictions;
  const componentActions = actions && primaryComponent
    ? (actions.some(a => a.reason_json?.componentId === primaryComponent.component.id) ? actions.filter(a => a.reason_json?.componentId === primaryComponent.component.id) : actions)
    : actions;

  const citations = useMemo(() => buildCitations(impact?.evidence ?? [], impact?.components ?? []), [impact]);

  // Desktop: point at the numbered item in the Sources rail. Mobile (no
  // rail on screen): open the evidence drawer instead.
  const onCite = useCallback((n: number) => {
    const el = typeof document !== "undefined" ? document.getElementById(`source-${n}`) : null;
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setHighlighted(n);
      window.setTimeout(() => setHighlighted(h => (h === n ? null : h)), 2400);
    } else {
      setEvidenceOpen(true);
    }
  }, []);

  // Recents (sidebar) records whatever pageTitle DashboardLayout receives -
  // "Impact" would mean every investigation shows up with the same
  // meaningless label. Use the real detected event's title once it's
  // loaded; fall back to a plain generic label only while loading, so a
  // recorded Recents entry is either the true title or nothing yet.
  const pageTitle = impact?.signal.event_title || "Investigation";

  return (
    <DashboardLayout pageTitle={pageTitle}>
      {isLoading && (
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
          <LoadingState label="Loading impact analysis" rows={3} />
        </div>
      )}

      {isError && (
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
          <button
            type="button"
            onClick={() => router.push("/intelligence")}
            className="inline-flex items-center gap-1.5 text-[12px] mb-4 focus-ring rounded"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiArrowLeft size={12} /> Back to Intelligence
          </button>
          <ErrorState title="Couldn't load this signal" message="It may have been removed, or your account may not have access to it." onRetry={() => refetch()} />
        </div>
      )}

      {!isLoading && !isError && impact && !impact.sufficientDataForQuantification && (
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
          <Breadcrumb router={router} title={impact.signal.event_title || "External signal"} />
          <h1 className="text-[26px] lg:text-[32px] leading-[1.15] mb-6" style={{ color: "var(--text-primary)", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {impact.signal.event_title || "External signal"}
          </h1>
          <EmptyState
            title="Not enough data to quantify business impact"
            message={impact.reason || "Starlane detected relevance but does not have enough recorded data to calculate a dollar impact — this is shown honestly rather than guessed."}
          />
        </div>
      )}

      {!isLoading && !isError && impact && impact.sufficientDataForQuantification && primaryComponent && (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          {/* READING COLUMN — one centered column that reads top to bottom
              like an answer: the question, Starlane's answer with inline
              citations, the reasoning behind it, then the decision. */}
          <div className="min-w-0 max-w-[700px]">
            <Breadcrumb router={router} title={impact.signal.event_title || "Investigation"} />
            <h1 className="text-[24px] lg:text-[30px] leading-[1.2] mb-2" style={{ color: "var(--text-primary)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              {impact.signal.event_title || "External signal"}
            </h1>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              {impact.supplier?.name}{impact.supplier?.country ? ` · ${impact.supplier.country}` : ""} · Detected {formatDateTime(impact.signal.first_detected_at)} · {confidenceLabel(impact.signal.event_confidence)} confidence
            </p>

            <Turn label="Starlane" className="mt-8">
              <p className="text-[17px] leading-[1.55]" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                {formatINR(impact.totalRevenueExposure)} in open orders is at risk
                <Cite n={components.length === 1 ? citations.byComponent[primaryComponent.component.id]?.revenue : undefined} onCite={onCite} />
                {soonest && (
                  <>
                    {soonest.days === 0
                      ? `, and ${soonest.component.component.name} is already below safety stock`
                      : `, and ${soonest.component.component.name} falls below safety stock in ${soonest.days} day${soonest.days === 1 ? "" : "s"}`}
                    <Cite n={citations.byComponent[soonest.component.component.id]?.stockout} onCite={onCite} />
                  </>
                )}
                .
              </p>
              <p className="text-[14.5px] leading-[1.65] mt-3" style={{ color: "var(--text-body)" }}>
                {humanReason(impact.signal, impact.supplier?.name)}
                <Cite n={citations.event} onCite={onCite} />
                {impact.signal.event_summary && <> {impact.signal.event_summary}</>}
                {impact.signal.event_source_url && (
                  <>
                    {" "}
                    <a href={impact.signal.event_source_url} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--text-secondary)" }}>
                      Source record
                    </a>
                  </>
                )}
              </p>

              <dl className="grid grid-cols-2 sm:grid-cols-4 mt-6 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
                <Fact label="Revenue exposed" value={formatINR(impact.totalRevenueExposure)} sub={components.length > 1 ? `Across ${components.length} parts` : undefined} tone="danger" />
                <Fact
                  label="Time to stockout"
                  value={soonest ? (soonest.days === 0 ? "Now" : `${soonest.days}d`) : "—"}
                  sub={soonest ? (soonest.days === 0 ? "Below safety stock" : formatDate(soonest.component.stockout.stockoutDate)) : undefined}
                />
                <Fact label="Affected orders" value={String(affectedOrderCount)} />
                <Fact label="Confidence" value={confidenceLabel(impact.signal.event_confidence)} sub={humanizeCode(impact.signal.channel_code) || undefined} />
              </dl>

              {/* Mobile has no rail — sources live behind this button. */}
              <button
                type="button"
                onClick={() => setEvidenceOpen(true)}
                className="lg:hidden inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium rounded-full px-3 py-1.5 focus-ring"
                style={{ color: "var(--text-primary)", border: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}
              >
                <FiFileText size={13} /> Sources · {impact.evidence.length}
              </button>
            </Turn>

            {/* REASONING — collapsible like a model's working, open by default. */}
            <details open className="group mt-10">
              <summary className="list-none cursor-pointer select-none inline-flex items-center gap-1.5 text-[13px] font-medium focus-ring rounded" style={{ color: "var(--text-secondary)" }}>
                <FiChevronRight size={14} className="transition-transform group-open:rotate-90" />
                How Starlane got here
              </summary>
              <div className="mt-5">
                {components.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Affected parts">
                    {components.map((c, i) => {
                      const selected = c === primaryComponent;
                      return (
                        <button
                          key={c.component.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setComponentIndex(i)}
                          className="text-left rounded-full px-3.5 py-1.5 text-[12.5px] focus-ring"
                          style={{ border: `1px solid ${selected ? "var(--text-primary)" : "var(--border-default)"}`, color: "var(--text-primary)", background: selected ? "var(--bg-elevated)" : "transparent" }}
                        >
                          <span className="font-medium">{c.component.name}</span>
                          <span className="ml-2" style={{ color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{formatINR(c.revenueExposure.totalRevenueExposure)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <CausalChain impact={impact} component={primaryComponent} citations={citations} onCite={onCite} />
                {impact.signal.rule_explanation && (
                  <p className="text-[12.5px] mt-5 pl-9 italic" style={{ color: "var(--text-tertiary)" }}>Rule applied: {impact.signal.rule_explanation}</p>
                )}
              </div>
            </details>

            {/* NEXT STEP — offered like a suggested follow-up, generated on
                demand so we never silently write duplicate prediction/action
                rows on every page view. */}
            {!actions && !predictions && (
              <div className="mt-10">
                <p className="text-[12px] mb-2.5" style={{ color: "var(--text-tertiary)" }}>Next step</p>
                <button
                  type="button"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                  className="w-full text-left rounded-2xl px-5 py-4 flex items-center justify-between gap-4 focus-ring transition-colors hover:bg-elevated disabled:opacity-70"
                  style={{ border: "1px solid var(--border-strong)", background: "#FBFBF9" }}
                >
                  <span>
                    <span className="block text-[14.5px] font-medium" style={{ color: "var(--text-primary)" }}>
                      {analyzeMutation.isPending ? "Forecasting and ranking options…" : "Forecast this and recommend what to do"}
                    </span>
                    <span className="block text-[12.5px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Runs Starlane's deterministic forecast and ranks interventions for {components.length > 1 ? "each part" : primaryComponent.component.name}.
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full id-gradient" style={{ color: "var(--text-on-inverse)", boxShadow: "inset 0 0 0 1px rgb(var(--c-ink) / 0.25)" }}>
                    {analyzeMutation.isPending ? <FiLoader size={15} className="animate-spin" /> : <FiArrowUp size={16} />}
                  </span>
                </button>
                {analyzeMutation.isError && <p className="text-[12px] mt-2" style={{ color: "var(--status-danger)" }}>Analysis failed. Try again, or check the backend log.</p>}
              </div>
            )}

            {(componentPredictions || componentActions) && (
              <Turn label={components.length > 1 ? `Starlane · ${primaryComponent.component.name}` : "Starlane"} className="mt-12">
                {componentPredictions && (
                  <section className="mb-10">
                    <p className="text-[14.5px] mb-4" style={{ color: "var(--text-primary)", fontWeight: 500 }}>Here's what happens if nothing changes.</p>
                    <ForecastTimeline predictions={componentPredictions} component={primaryComponent} />
                  </section>
                )}
                {componentActions && componentActions.length > 0 && (
                  <section className="mb-10">
                    <p className="text-[14.5px] mb-4" style={{ color: "var(--text-primary)", fontWeight: 500 }}>Here's what I'd do, ranked by benefit to cost.</p>
                    <DecisionSection actions={componentActions} component={primaryComponent} />
                  </section>
                )}
                {componentActions && componentActions.length === 0 && (
                  <p className="text-[14px] mb-10" style={{ color: "var(--text-secondary)" }}>No intervention is recommended for this part right now.</p>
                )}
              </Turn>
            )}

            {/* Always available once actions exist, not gated on local action
                status (which never reflects execution that happened inside
                DecisionSection's own state) — the backend itself reports
                NO_ACTION_TO_VERIFY honestly when nothing has executed yet. */}
            {actions && actions.length > 0 && (
              <section className="sm:pl-8">
                <OutcomeVerification signalId={signalId} />
              </section>
            )}
          </div>

          {/* SOURCES RAIL — every citation above points here. */}
          <aside className="hidden lg:block" aria-label="Sources">
            <div className="sticky top-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 -mr-1">
              <SourcesRail evidence={impact.evidence} highlighted={highlighted} />
            </div>
          </aside>
        </div>
      )}

      {evidenceOpen && impact && <EvidenceDrawer evidence={impact.evidence} onClose={() => setEvidenceOpen(false)} />}
    </DashboardLayout>
  );
}

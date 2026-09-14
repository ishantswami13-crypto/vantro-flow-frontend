"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiFileText, FiClock } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { CausalChain } from "@/components/intelligence/CausalChain";
import { ForecastTimeline } from "@/components/intelligence/ForecastTimeline";
import { DecisionSection } from "@/components/intelligence/DecisionSection";
import { OutcomeVerification } from "@/components/intelligence/OutcomeVerification";
import { formatINR, formatDateTime, confidenceFromScore } from "@/components/intelligence/format";
import { api, type IntelligencePrediction, type IntelligenceAction } from "@/lib/api";

function humanReason(signal: { why_exists?: string | null; event_type?: string | null }, supplierName?: string | null): string {
  if (supplierName) return `This ${signal.event_type?.replace(/_/g, " ").toLowerCase() || "external event"} was matched to ${supplierName}'s verified location exposure through the recorded transmission rule.`;
  return "This external event matched a recorded business exposure through the transmission rules.";
}

export default function SignalImpactPage() {
  const params = useParams<{ signalId: string }>();
  const router = useRouter();
  const signalId = params.signalId;
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [predictions, setPredictions] = useState<IntelligencePrediction[] | null>(null);
  const [actions, setActions] = useState<IntelligenceAction[] | null>(null);

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
  const primaryComponent = impact?.components?.[0];

  return (
    <DashboardLayout pageTitle="Impact">
      <button
        type="button"
        onClick={() => router.push("/intelligence")}
        className="inline-flex items-center gap-1.5 text-2xs text-muted hover:text-primary mb-3 focus-ring rounded"
      >
        <FiArrowLeft size={12} /> Back to Intelligence
      </button>

      {isLoading && <LoadingState label="Loading impact analysis" rows={3} />}

      {isError && (
        <ErrorState title="Couldn't load this signal" message="It may not exist, or it may belong to a different tenant." onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && impact && !impact.sufficientDataForQuantification && (
        <>
          <PageHeader title={impact.signal.event_title || "External signal"} subtitle="Why Starlane flagged this" />
          <EmptyState
            title="Not enough data to quantify business impact"
            message={impact.reason || "Starlane detected relevance but does not have enough recorded data to calculate a dollar impact — this is shown honestly rather than guessed."}
          />
        </>
      )}

      {!isLoading && !isError && impact && impact.sufficientDataForQuantification && primaryComponent && (
        <>
          <PageHeader
            title={impact.signal.event_title || "External signal"}
            subtitle={`${impact.supplier?.name} · ${impact.supplier?.country} · detected ${formatDateTime(impact.signal.first_detected_at)}`}
            actions={
              <Button variant="ghost" size="sm" icon={<FiFileText size={13} />} onClick={() => setEvidenceOpen(true)}>
                View evidence
              </Button>
            }
          />

          {/* Top metrics — the four numbers that matter, nothing more */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Revenue exposed" value={formatINR(impact.totalRevenueExposure)} accent="danger" />
            <MetricCard
              label="Time to stockout"
              value={primaryComponent.stockout.sufficientData
                ? primaryComponent.stockout.alreadyBelowSafetyStock ? "Now" : `${primaryComponent.stockout.daysUntilStockout}d`
                : "—"}
              sub={primaryComponent.stockout.sufficientData && !primaryComponent.stockout.alreadyBelowSafetyStock ? primaryComponent.stockout.stockoutDate : undefined}
              accent="warning"
            />
            <MetricCard label="Affected orders" value={String(primaryComponent.affectedDemand.affectedOrderCount)} accent="default" />
            <MetricCard
              label="Confidence"
              value={confidenceFromScore(impact.signal.event_confidence)}
              sub={impact.signal.channel_code || undefined}
              accent={confidenceFromScore(impact.signal.event_confidence) === "HIGH" ? "success" : "warning"}
            />
          </div>

          {/* What happened / why it matters — open composition with a thin
              divider, not two bordered cards side by side for two short
              paragraphs. */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 mb-10 lg:divide-x lg:divide-border">
            <div>
              <p className="section-label mb-2">What happened</p>
              <p className="text-sm text-primary font-semibold">{impact.signal.event_title}</p>
              {impact.signal.event_summary && <p className="text-2xs text-secondary mt-1.5 leading-relaxed">{impact.signal.event_summary}</p>}
              {impact.signal.event_source_url && (
                <a href={impact.signal.event_source_url} target="_blank" rel="noreferrer" className="text-2xs text-accent underline mt-2 inline-block">
                  Source record
                </a>
              )}
            </div>
            <div className="lg:pl-8">
              <p className="section-label mb-2">Why it matters to this business</p>
              <p className="text-2xs text-secondary leading-relaxed">{humanReason(impact.signal, impact.supplier?.name)}</p>
              {impact.signal.rule_explanation && (
                <p className="text-2xs text-muted mt-2 italic">{impact.signal.rule_explanation}</p>
              )}
            </div>
          </div>

          {/* Causal chain — Starlane's signature trace, not a boxed card */}
          <div className="mb-10">
            <p className="section-label mb-4">Dependency chain</p>
            <CausalChain impact={impact} component={primaryComponent} />
          </div>

          {/* Forecast + Decision — generated on demand so we never silently
              write duplicate prediction/action rows on every page view */}
          {!actions && !predictions && (
            <div className="card-premium p-6 text-center mb-8">
              <FiClock className="mx-auto text-muted mb-2" size={20} />
              <p className="text-sm font-semibold text-primary">Run forecast &amp; recommended actions</p>
              <p className="text-2xs text-muted mt-1 mb-4">Calls Starlane's deterministic forecasting and ranking engine against this signal.</p>
              <Button variant="primary" size="md" loading={analyzeMutation.isPending} onClick={() => analyzeMutation.mutate()}>
                Analyze impact
              </Button>
              {analyzeMutation.isError && <p className="text-2xs text-danger mt-2">Analysis failed — check the backend log.</p>}
            </div>
          )}

          {predictions && (
            <div className="mb-8">
              <p className="section-label mb-3">Forecast</p>
              <div className="card-premium p-4">
                <ForecastTimeline predictions={predictions} component={primaryComponent} />
              </div>
            </div>
          )}

          {actions && (
            <div className="mb-8">
              <DecisionSection actions={actions} component={primaryComponent} />
            </div>
          )}

          {/* Always available once actions exist, not gated on local action
              status (which never reflects execution that happened inside
              DecisionSection's own state) — the backend itself reports
              NO_ACTION_TO_VERIFY honestly when nothing has executed yet. */}
          {actions && actions.length > 0 && (
            <OutcomeVerification signalId={signalId} />
          )}
        </>
      )}

      {evidenceOpen && impact && <EvidenceDrawer evidence={impact.evidence} onClose={() => setEvidenceOpen(false)} />}
    </DashboardLayout>
  );
}

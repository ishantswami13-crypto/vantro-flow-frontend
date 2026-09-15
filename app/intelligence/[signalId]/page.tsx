"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiArrowLeft, FiFileText, FiClock } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { CausalChain } from "@/components/intelligence/CausalChain";
import { ForecastTimeline } from "@/components/intelligence/ForecastTimeline";
import { DecisionSection } from "@/components/intelligence/DecisionSection";
import { OutcomeVerification } from "@/components/intelligence/OutcomeVerification";
import { formatINR, formatDateTime, confidenceFromScore } from "@/components/intelligence/format";
import { api, type IntelligencePrediction, type IntelligenceAction, type IntelligenceEvidenceItem } from "@/lib/api";

// Real counts from the real evidence array — not a fabricated coverage
// score. Groups by the same kind vocabulary EvidenceDrawer already uses.
function evidenceSummary(evidence: IntelligenceEvidenceItem[]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of evidence) counts.set(e.kind, (counts.get(e.kind) || 0) + 1);
  return Array.from(counts.entries()).map(([kind, count]) => ({ kind, count }));
}
function kindLabel(kind: string): string {
  return kind.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase());
}

function humanReason(signal: { why_exists?: string | null; event_type?: string | null }, supplierName?: string | null): string {
  if (supplierName) return `This ${signal.event_type?.replace(/_/g, " ").toLowerCase() || "external event"} was matched to ${supplierName}'s verified location exposure through the recorded transmission rule.`;
  return "This external event matched a recorded business exposure through the transmission rules.";
}

// Breadcrumb doubles as back-navigation — one line, no separate button,
// matching the AppHeader's own quiet breadcrumb language.
function Breadcrumb({ router, title }: { router: ReturnType<typeof useRouter>; title: string }) {
  return (
    <button
      type="button"
      onClick={() => router.push("/intelligence")}
      className="text-[12px] mb-2 hover:underline"
      style={{ color: "#8A8A86" }}
    >
      Intelligence / {title}
    </button>
  );
}

// Open exposure figure — no colored box, no icon chip. The number itself
// (large, tabular) carries the hierarchy; label sits quietly underneath.
function Exposure({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone?: "danger" }) {
  return (
    <div>
      <p
        className="text-[28px] leading-none"
        style={{ color: tone === "danger" ? "#C13B3B" : "#171717", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </p>
      <p className="text-[12px] mt-1.5" style={{ color: "#8A8A86" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "#B5B5B0" }}>{sub}</p>}
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
            style={{ color: "#8A8A86" }}
          >
            <FiArrowLeft size={12} /> Back to Intelligence
          </button>
          <ErrorState title="Couldn't load this signal" message="It may not exist, or it may belong to a different tenant." onRetry={() => refetch()} />
        </div>
      )}

      {!isLoading && !isError && impact && !impact.sufficientDataForQuantification && (
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
          <Breadcrumb router={router} title={impact.signal.event_title || "External signal"} />
          <h1 className="text-[26px] lg:text-[32px] leading-[1.15] mb-6" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {impact.signal.event_title || "External signal"}
          </h1>
          <EmptyState
            title="Not enough data to quantify business impact"
            message={impact.reason || "Starlane detected relevance but does not have enough recorded data to calculate a dollar impact — this is shown honestly rather than guessed."}
          />
        </div>
      )}

      {!isLoading && !isError && impact && impact.sufficientDataForQuantification && primaryComponent && (
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
          {/* HEADER — breadcrumb, editorial title, quiet metadata row. No hero,
              no giant badges: the investigation title itself carries weight. */}
          <Breadcrumb router={router} title={impact.signal.event_title || "Investigation"} />
          <h1 className="text-[26px] lg:text-[32px] leading-[1.15] mb-2" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {impact.signal.event_title || "External signal"}
          </h1>
          <p className="text-[13px] mb-10" style={{ color: "#686868" }}>
            {impact.supplier?.name}{impact.supplier?.country ? ` · ${impact.supplier.country}` : ""} · Detected {formatDateTime(impact.signal.first_detected_at)} · {confidenceFromScore(impact.signal.event_confidence).charAt(0)}{confidenceFromScore(impact.signal.event_confidence).slice(1).toLowerCase()} confidence
          </p>

          {/* SITUATION — the "what happened / why it matters" summary,
              immediately below the header, in prose rather than cards. */}
          <section className="mb-12">
            <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Situation</p>
            <p className="text-[14px] leading-[1.6] max-w-[700px]" style={{ color: "#171717" }}>{humanReason(impact.signal, impact.supplier?.name)}</p>
            {impact.signal.event_summary && (
              <p className="text-[13px] leading-[1.55] max-w-[700px] mt-2" style={{ color: "#686868" }}>{impact.signal.event_summary}</p>
            )}
            {impact.signal.event_source_url && (
              <a href={impact.signal.event_source_url} target="_blank" rel="noreferrer" className="text-[12px] underline mt-2 inline-block" style={{ color: "#4F6EF7" }}>
                Source record
              </a>
            )}

            {/* Open exposure row — no per-metric boxes, no rainbow colors.
                Numbers themselves carry the hierarchy. */}
            <div className="flex flex-wrap gap-x-12 gap-y-6 mt-8 pt-8" style={{ borderTop: "1px solid #E5E5E1" }}>
              <Exposure value={formatINR(impact.totalRevenueExposure)} label="Revenue exposed" tone="danger" />
              <Exposure
                value={primaryComponent.stockout.sufficientData
                  ? primaryComponent.stockout.alreadyBelowSafetyStock ? "Now" : `${primaryComponent.stockout.daysUntilStockout}d`
                  : "—"}
                label="Time to stockout"
                sub={primaryComponent.stockout.sufficientData && !primaryComponent.stockout.alreadyBelowSafetyStock ? primaryComponent.stockout.stockoutDate : undefined}
              />
              <Exposure value={String(primaryComponent.affectedDemand.affectedOrderCount)} label="Affected orders" />
              <Exposure
                value={confidenceFromScore(impact.signal.event_confidence)}
                label="Confidence"
                sub={impact.signal.channel_code || undefined}
              />
            </div>
          </section>

          {/* EVIDENCE — real count, link to the full drawer. Kept as a quiet
              inline row, not a boxed card, per the same "reasoning, not
              decoration" treatment as the drawer itself. */}
          {impact.evidence.length > 0 && (
            <section className="mb-12">
              <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Evidence</p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {evidenceSummary(impact.evidence).map(({ kind, count }) => (
                  <span key={kind} className="text-[13px]" style={{ color: "#686868" }}>
                    {kindLabel(kind)} <span style={{ color: "#171717", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                  </span>
                ))}
                <button
                  onClick={() => setEvidenceOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium"
                  style={{ color: "#171717" }}
                >
                  <FiFileText size={13} /> View all evidence
                </button>
              </div>
              {impact.signal.rule_explanation && (
                <p className="text-[12px] mt-3 italic" style={{ color: "#8A8A86" }}>{impact.signal.rule_explanation}</p>
              )}
            </section>
          )}

          {/* CAUSAL CHAIN — Starlane's signature trace */}
          <section className="mb-12">
            <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Dependency chain</p>
            <CausalChain impact={impact} component={primaryComponent} />
          </section>

          {/* FORECAST + DECISION — generated on demand so we never silently
              write duplicate prediction/action rows on every page view */}
          {!actions && !predictions && (
            <section className="mb-12 max-w-[520px]">
              <div className="p-6 text-center rounded-lg" style={{ border: "1px solid #E5E5E1" }}>
                <FiClock className="mx-auto mb-2" size={18} style={{ color: "#8A8A86" }} />
                <p className="text-[14px] font-medium" style={{ color: "#171717" }}>Run forecast &amp; recommended actions</p>
                <p className="text-[12px] mt-1 mb-4" style={{ color: "#8A8A86" }}>Calls Starlane's deterministic forecasting and ranking engine against this signal.</p>
                <Button variant="primary" size="md" loading={analyzeMutation.isPending} onClick={() => analyzeMutation.mutate()}>
                  Analyze impact
                </Button>
                {analyzeMutation.isError && <p className="text-[12px] mt-2" style={{ color: "#C13B3B" }}>Analysis failed — check the backend log.</p>}
              </div>
            </section>
          )}

          {predictions && (
            <section className="mb-12">
              <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Forecast</p>
              <ForecastTimeline predictions={predictions} component={primaryComponent} />
            </section>
          )}

          {actions && (
            <section className="mb-12">
              <DecisionSection actions={actions} component={primaryComponent} />
            </section>
          )}

          {/* Always available once actions exist, not gated on local action
              status (which never reflects execution that happened inside
              DecisionSection's own state) — the backend itself reports
              NO_ACTION_TO_VERIFY honestly when nothing has executed yet. */}
          {actions && actions.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase mb-4" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Verification</p>
              <OutcomeVerification signalId={signalId} />
            </section>
          )}
        </div>
      )}

      {evidenceOpen && impact && <EvidenceDrawer evidence={impact.evidence} onClose={() => setEvidenceOpen(false)} />}
    </DashboardLayout>
  );
}

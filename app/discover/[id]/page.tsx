"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { LensDrawer, type LensSection } from "@/components/ui/LensDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type SignalImpact, type IntelligenceEvidenceItem, type ImpactComponent } from "@/lib/api";
import { FiChevronLeft } from "react-icons/fi";

// Discover detail — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§16.
//
// Real backing: api.intelligence.impact(signalId) — the same call Bridge's
// evidence mark uses, here shown as a full detail page instead of a drawer.
// Layout per §6 "DiscoverDetail two-column split": left flex:1.4 (finding +
// Known/Unknown transparency), right flex:1;max-width:300px (rail).
//
// Known/Unknown transparency (§16 "detail view with Known/Unknown
// transparency fields") is built directly from the real
// `sufficientDataForQuantification` flag and `reason` string the backend
// already returns (supplyChainOrchestrator.js) — never invented. When
// quantification is insufficient, the real `reason` string IS the honest
// "Unknown" explanation; when it's sufficient, the real components/revenue
// numbers ARE the "Known" facts. Affected-entity links only render for the
// real supplier record returned in `impact.supplier` (id/name/country) —
// no entity ID is ever fabricated.

export default function DiscoverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const signalId = params.id;

  const [impact, setImpact] = useState<SignalImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showSupplierLens, setShowSupplierLens] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.intelligence.impact(signalId)
      .then(res => { if (!cancelled) setImpact(res.impact); })
      .catch(() => { if (!cancelled) setError("Couldn't load this finding — it may no longer exist."); });
    return () => { cancelled = true; };
  }, [signalId]);

  const loading = impact === null && !error;

  return (
    <DashboardLayout pageTitle="Discover">
      <button
        onClick={() => router.push("/discover")}
        className="hover-dim flex items-center gap-1 mb-4"
        style={{ fontSize: 12.5, color: "#63635F", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <FiChevronLeft size={13} /> Discover
      </button>

      {loading && <p className="v32-body">Loading this finding…</p>}
      {error && <p className="v32-body" style={{ color: "#A64F4B" }}>{error}</p>}

      {impact && (
        <div className="flex fade-once" style={{ gap: 32 }}>
          {/* Left column — the finding itself (flex:1.4) */}
          <div style={{ flex: 1.4, minWidth: 0 }}>
            <p className="v32-section-label mb-2">
              {impact.signal.related_entity_type || impact.signal.event_type || "Signal"}
            </p>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 21, color: "#191917" }} className="mb-2">
              {impact.signal.event_title || impact.signal.why_exists}
            </h1>
            {impact.signal.event_title && (
              <p className="v32-body mb-1" style={{ color: "#43433F" }}>{impact.signal.why_exists}</p>
            )}
            {impact.signal.rule_explanation && (
              <p className="v32-body mb-4" style={{ color: "#63635F" }}>{impact.signal.rule_explanation}</p>
            )}

            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setShowEvidence(true)}
                className="hover-dim"
                style={{
                  fontSize: 11, fontFamily: "'IBM Plex Mono', Menlo, monospace",
                  padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(25,25,23,0.14)",
                  color: "#63635F", background: "none", cursor: "pointer",
                }}
              >
                ev View evidence
              </button>
              <span className="v32-meta">
                {impact.signal.impact_status ? impact.signal.impact_status.replace(/_/g, " ").toLowerCase() : impact.signal.status.toLowerCase()}
                {" · "}
                {formatDateTime(impact.signal.last_updated_at || impact.signal.first_detected_at)}
              </span>
            </div>

            {/* Known / Unknown transparency block — real, from the backend's
                own sufficientDataForQuantification + reason fields. */}
            <div className="mb-6">
              <p className="v32-section-label mb-3">What Starlane knows vs. doesn't</p>
              {impact.sufficientDataForQuantification ? (
                <div className="space-y-3">
                  <KVLine label="Known" value={`Quantified downstream impact across ${impact.components?.length || 0} component${(impact.components?.length || 0) === 1 ? "" : "s"}.`} tone="known" />
                  {impact.totalRevenueExposure != null && (
                    <KVLine label="Known" value={`Total revenue exposure: ₹${(impact.totalRevenueExposure / 100000).toFixed(1)}L`} tone="known" />
                  )}
                  <KVLine label="Unknown" value="Anything outside the traced component/order chain below is not covered by this calculation." tone="unknown" />
                </div>
              ) : (
                <div className="space-y-3">
                  <KVLine label="Unknown" value={impact.reason || "Not enough real data to quantify downstream impact for this signal yet."} tone="unknown" />
                </div>
              )}
            </div>

            {/* Affected components / entities — entity_row family, real data only */}
            {impact.components && impact.components.length > 0 && (
              <div>
                <p className="v32-section-label mb-3">Affected components</p>
                <div>
                  {impact.components.map((c) => (
                    <ComponentRow key={c.component.id} component={c} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right rail — flex:1; max-width:300px */}
          <div style={{ flex: 1, maxWidth: 300, minWidth: 0 }} className="space-y-6">
            <div>
              <p className="v32-section-label mb-2">Source</p>
              <RailRow text={impact.evidence[0]?.source || "Starlane detection pipeline"} />
              {impact.signal.event_observed_at && (
                <RailRow text={`Observed ${formatDateTime(impact.signal.event_observed_at)}`} />
              )}
            </div>

            {impact.supplier && (
              <div>
                <p className="v32-section-label mb-2">Related entity</p>
                <div
                  className="row-hover -mx-2 px-2 py-1.5 cursor-pointer"
                  onClick={() => setShowSupplierLens(true)}
                  role="button"
                  tabIndex={0}
                >
                  <p style={{ fontSize: 12.5, color: "#191917" }}>{impact.supplier.name}</p>
                  <p className="v32-meta">Supplier · {impact.supplier.country}</p>
                </div>
              </div>
            )}

            <div>
              <p className="v32-section-label mb-2">Confidence</p>
              <RailRow text={
                impact.signal.plausibility_confidence != null
                  ? `${Math.round(impact.signal.plausibility_confidence * 100)}% plausibility`
                  : "Not scored"
              } />
              {impact.signal.event_confidence != null && (
                <RailRow text={`Event confidence: ${Math.round(impact.signal.event_confidence * 100)}%`} />
              )}
            </div>
          </div>
        </div>
      )}

      {showEvidence && impact && (
        <EvidenceDrawer
          evidence={impact.evidence}
          title={impact.signal.event_title || "Why Starlane flagged this"}
          onClose={() => setShowEvidence(false)}
        />
      )}

      {showSupplierLens && impact?.supplier && (
        <LensDrawer
          entityType="Supplier"
          name={impact.supplier.name}
          sections={buildSupplierLensSections(impact)}
          onClose={() => setShowSupplierLens(false)}
        />
      )}
    </DashboardLayout>
  );
}

function buildSupplierLensSections(impact: SignalImpact): LensSection[] {
  const supplier = impact.supplier!;
  const rows = [
    { label: "Name", value: supplier.name },
    { label: "Country", value: supplier.country || "—" },
  ];
  return [{ label: "Snapshot", rows }];
}

function KVLine({ label, value, tone }: { label: string; value: string; tone: "known" | "unknown" }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0"
        style={{
          fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 500,
          color: tone === "known" ? "#477054" : "#8A8A86",
          minWidth: 56,
        }}
      >
        {label}
      </span>
      <span className="v32-body" style={{ color: "#43433F" }}>{value}</span>
    </div>
  );
}

function RailRow({ text }: { text: string }) {
  return (
    <p className="v32-body py-1.5" style={{ color: "#43433F", borderBottom: "1px solid #EBEAE6" }}>{text}</p>
  );
}

function ComponentRow({ component }: { component: ImpactComponent }) {
  const relevance = component.stockout.sufficientData
    ? component.stockout.alreadyBelowSafetyStock
      ? "Already below safety stock"
      : component.stockout.daysUntilStockout != null
        ? `Stockout in ${component.stockout.daysUntilStockout}d`
        : "Stockout timing unknown"
    : component.stockout.reason || "Insufficient data";
  return (
    <div className="row-hover py-2.5 px-2 -mx-2" style={{ borderBottom: "1px solid #EBEAE6" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p style={{ fontSize: 13, color: "#191917" }}>{component.component.name}</p>
          <p className="v32-meta">{relevance}</p>
        </div>
        {component.revenueExposure.sufficientData && (
          <span style={{ fontFamily: "'IBM Plex Mono', Menlo, monospace", fontSize: 12.5, color: "#191917" }}>
            ₹{(component.revenueExposure.totalRevenueExposure / 100000).toFixed(1)}L
          </span>
        )}
      </div>
    </div>
  );
}

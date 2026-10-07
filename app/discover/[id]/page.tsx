"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { LensDrawer, type LensSection } from "@/components/ui/LensDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type SignalImpact, type IntelligenceEvidenceItem, type ImpactComponent } from "@/lib/api";
import { FiChevronLeft } from "react-icons/fi";
import { Button, Mono } from "@/components/v32/ui";

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
        style={{ fontSize: 12.5, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <FiChevronLeft size={13} /> Discover
      </button>

      {loading && <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading this finding…</p>}
      {error && <p className="v32-body" style={{ color: "var(--status-danger)" }}>{error}</p>}

      {impact && (
        <div className="flex flex-col lg:flex-row fade-once" style={{ gap: 32 }}>
          {/* Left column — the finding itself (flex:1.4) */}
          <div style={{ flex: 1.4, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.6px", color: RISKY.has(impact.signal.impact_status) ? "var(--status-danger)" : "var(--text-secondary)", marginBottom: 6 }}>
              {(impact.signal.related_entity_type || impact.signal.event_type || "Signal").replace(/_/g, " ")}
            </div>
            <h1 style={{ margin: "0 0 16px", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 21, color: "var(--text-primary)", lineHeight: 1.4 , letterSpacing: "-0.015em"}}>
              {impact.signal.event_title || impact.signal.why_exists}
            </h1>
            {impact.signal.event_title && impact.signal.why_exists && (
              <Block label="Why it is unusual">{impact.signal.why_exists}</Block>
            )}
            {impact.signal.rule_explanation && (
              <Block label="Why it matters">{impact.signal.rule_explanation}</Block>
            )}
            {impact.totalRevenueExposure != null && (
              <Block label="Magnitude / impact">Revenue exposure of <Mono size={13}>₹{(impact.totalRevenueExposure / 100000).toFixed(1)}L</Mono> across {impact.components?.length || 0} traced component{(impact.components?.length || 0) === 1 ? "" : "s"}.</Block>
            )}

            {/* Known / Unknown transparency block — real, from the backend's
                own sufficientDataForQuantification + reason fields. */}
            <div className="mb-6">
              <SectionLabel>What Starlane knows / does not know</SectionLabel>
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
                <SectionLabel>Affected entities</SectionLabel>
                <div>
                  {impact.components.map((c) => (
                    <ComponentRow key={c.component.id} component={c} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap" style={{ gap: 10, paddingTop: 12 }}>
              <Button primary small href="/simulate">Simulate</Button>
              <Button small href="/watch?new=1">Watch this</Button>
              <Button small href={`/scan?q=${encodeURIComponent(`Tell me more about: ${impact.signal.event_title || impact.signal.why_exists || "this finding"}`)}`}>Ask about this</Button>
            </div>
          </div>

          {/* Right rail — flex:1; max-width:300px */}
          <div style={{ flex: 1, maxWidth: 300, minWidth: 0 }} className="space-y-5">
            <div>
              <RailLabel>Evidence</RailLabel>
              <RailRow text={impact.evidence[0]?.source || "Starlane detection pipeline"} />
              {impact.signal.event_observed_at && (
                <RailRow text={`Observed ${formatDateTime(impact.signal.event_observed_at)}`} />
              )}
            </div>

            {impact.supplier && (
              <div>
                <RailLabel>Entities</RailLabel>
                <div
                  className="row-hover -mx-2 px-2 py-1.5 cursor-pointer"
                  onClick={() => setShowSupplierLens(true)}
                  role="button"
                  tabIndex={0}
                >
                  <p style={{ fontSize: 12.5, color: "var(--text-primary)" }}>{impact.supplier.name}</p>
                  <p className="v32-meta">Supplier · {impact.supplier.country}</p>
                </div>
              </div>
            )}

            <div>
              <RailLabel>Confidence</RailLabel>
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

const RISKY = new Set(["EXPOSED", "OBSERVED_IMPACT"]);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: 0, color: "var(--text-secondary)", marginBottom: 8 }}>{children}</div>;
}

function RailLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, letterSpacing: 0, color: "var(--text-tertiary)", marginBottom: 6 }}>{children}</div>;
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 0, color: "var(--text-secondary)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-body)" }}>{children}</div>
    </div>
  );
}

function KVLine({ label, value, tone }: { label: string; value: string; tone: "known" | "unknown" }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0"
        style={{
          fontSize: 11, color: tone === "known" ? "var(--status-success)" : "var(--text-tertiary)",
          width: 62,
        }}
      >
        {label}
      </span>
      <span className="v32-body" style={{ color: "var(--text-body)" }}>{value}</span>
    </div>
  );
}

function RailRow({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12.5, color: "var(--text-body)", padding: "7px 0", borderBottom: "1px solid var(--border-default)" }}>{text}</div>
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
    <div className="row-hover py-2.5 px-2 -mx-2" style={{ borderBottom: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{component.component.name}</p>
          <p className="v32-meta">{relevance}</p>
        </div>
        {component.revenueExposure.sufficientData && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-primary)" }}>
            ₹{(component.revenueExposure.totalRevenueExposure / 100000).toFixed(1)}L
          </span>
        )}
      </div>
    </div>
  );
}

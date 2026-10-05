"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import { api, getUser, type IntelligenceSignal, type IntelligenceEvidenceItem, type IntelligenceOpportunity } from "@/lib/api";
import { IconDiscover, IconSparkle } from "@/components/v32/icons";
import { PageHeader, Subnav, Sep, IconTile, Mono, Chevron, EvMark, EmptyLine, ErrorBanner } from "@/components/v32/ui";

// Discover — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16.
//
// Real backing: the SAME feed Bridge's "what changed" column reads —
// api.intelligence.signals() (business_signals rows joined to world_events).
// Every signal already carries a real deterministic explanation (why_exists),
// a real evidence trail (api.intelligence.impact -> evidence[]), a real
// severity dot (status/impact_status), and a real confidence signal
// (plausibility_confidence). discovery_row below is intel_row's shape plus a
// "why matters" line (why_exists, same field Bridge already renders) and an
// evidence mark that opens the same EvidenceDrawer Bridge uses.
//
// Of the 7 subnav tabs (§14), four have a genuine, honest predicate over
// real data:
//   - Overview: all signals.
//   - Opportunities: api.intelligence.opportunities(userId) — real
//     BOUNDED_OPPORTUNITY chains from lib/domain/intelligence/
//     opportunityPropagation.js (demand-rising AND supplier-stable, both
//     computed from real sales/supplier rows; see lib/routes/opportunities.js
//     on the backend). Rendered with the same discovery_row styling as the
//     other tabs; its own evidence drawer is built from the chain's real
//     step-level evidence rather than api.intelligence.impact.
//   - Changes: status === 'UPDATED' (mirrors Bridge's definition of "changed").
//   - Risks: impact_status is EXPOSED or OBSERVED_IMPACT (real DB check
//     constraint values from migrations/017_business_exposure_phase2.sql —
//     these are the only real "this is a risk" classifications the schema has).
// Leakage, Patterns, and Saved still have NO real backing: there is no
// margin-leakage computation, no cross-signal pattern-clustering output, and
// no save/bookmark endpoint anywhere in the backend. Those three tabs render
// the honest V32 empty-state pattern (§8) rather than forcing real signals
// into categories the data doesn't support.

type TabKey = "overview" | "opportunities" | "leakage" | "changes" | "risks" | "patterns" | "saved";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "opportunities", label: "Opportunities" },
  { key: "leakage", label: "Leakage" },
  { key: "changes", label: "Changes" },
  { key: "risks", label: "Risks" },
  { key: "patterns", label: "Patterns" },
  { key: "saved", label: "Saved" },
];

const RISK_STATUSES = new Set(["EXPOSED", "OBSERVED_IMPACT"]);

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return formatDateTime(iso);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function confidenceLabel(p: number | null): string | null {
  if (p == null) return null;
  if (p >= 0.75) return "High confidence";
  if (p >= 0.4) return "Medium confidence";
  return "Low confidence";
}

export default function DiscoverPage() {
  const router = useRouter();
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const [opportunities, setOpportunities] = useState<IntelligenceOpportunity[] | null>(null);
  const [opportunitiesSummary, setOpportunitiesSummary] = useState<{ suppliersEvaluated: number; boundedOpportunities: number; noSignal: number; insufficientData: number } | null>(null);
  const [opportunitiesError, setOpportunitiesError] = useState<string | null>(null);

  const [evidenceSignalId, setEvidenceSignalId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<IntelligenceEvidenceItem[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.intelligence.signals()
      .then(res => { if (!cancelled) setSignals(res.signals || []); })
      .catch(() => { if (!cancelled) { setSignals([]); setLoadError("Couldn't reach Starlane's intelligence backend."); } });

    const user = getUser();
    if (user?.id) {
      api.intelligence.opportunities(user.id)
        .then(res => {
          if (cancelled) return;
          setOpportunities(res.opportunities || []);
          setOpportunitiesSummary(res.summary || null);
        })
        .catch(() => {
          if (cancelled) return;
          setOpportunities([]);
          setOpportunitiesError("Couldn't reach Starlane's opportunity engine.");
        });
    } else {
      setOpportunities([]);
    }
    return () => { cancelled = true; };
  }, []);

  const openEvidence = async (signalId: string) => {
    setEvidenceSignalId(signalId);
    setEvidence(null);
    setEvidenceLoading(true);
    try {
      const res = await api.intelligence.impact(signalId);
      setEvidence(res.impact.evidence || []);
    } catch {
      setEvidence([]);
    } finally {
      setEvidenceLoading(false);
    }
  };

  // Opportunity chain steps -> IntelligenceEvidenceItem shape, so the same
  // EvidenceDrawer Bridge/Overview/Risks use can render them without a
  // second drawer component. Every field traces to a real chain step from
  // opportunityPropagation.js — nothing synthesized here.
  const openOpportunityEvidence = (opp: IntelligenceOpportunity) => {
    setEvidenceSignalId(`opportunity:${opp.affectedEntities.supplierId}:${opp.timestamp}`);
    const items: IntelligenceEvidenceItem[] = opp.evidence.map((step) => ({
      kind: step.label === "OBSERVED" ? "OBSERVED_FACT" : step.label === "DERIVED" ? "CALCULATED_FACT" : "ASSUMPTION",
      label: step.step.replace(/_/g, " "),
      detail: step.reason,
      source: "opportunityPropagation.js",
      timestamp: opp.timestamp,
      confidence: step.supported ? "HIGH" : "MEDIUM",
    }));
    setEvidence(items);
    setEvidenceLoading(false);
  };

  const loading = signals === null;
  const all = signals || [];
  const changed = all.filter(s => s.status === "UPDATED");
  const risks = all.filter(s => RISK_STATUSES.has(s.impact_status));

  const opportunitiesLoading = opportunities === null;

  let visible: IntelligenceSignal[] = [];
  let hasRealBacking = true;
  if (tab === "overview") visible = all;
  else if (tab === "changes") visible = changed;
  else if (tab === "risks") visible = risks;
  else if (tab === "opportunities") { /* rendered separately below */ }
  else hasRealBacking = false;

  const latest = all.reduce<string | null>((m, x) => {
    const t = x.last_updated_at || x.first_detected_at;
    return t && (!m || t > m) ? t : m;
  }, null);
  const oppCount = opportunitiesSummary?.boundedOpportunities ?? (opportunities || []).length;

  return (
    <DashboardLayout pageTitle="Discover">
      <PageHeader
        title="Discover"
        subtitle="Things Starlane found that may be worth your attention."
        right={latest ? (
          <span style={{ fontSize: 12, color: "#8A8A86" }}>Last signal {relativeTime(latest)}</span>
        ) : undefined}
      />

      {!loading && (all.length > 0 || oppCount > 0) && (
        <div className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 13, color: "#43433F", paddingBottom: 4 }}>
          <span>{all.length} worth investigating</span>
          <Sep />
          <span>{oppCount} opportunit{oppCount === 1 ? "y" : "ies"}</span>
          <Sep />
          <span style={{ color: risks.length ? "#A64F4B" : undefined }}>{risks.length} risk{risks.length === 1 ? "" : "s"}</span>
          <Sep />
          <span style={{ color: "#63635F" }}>{changed.length} changed</span>
        </div>
      )}
      {loadError && <ErrorBanner>{loadError}</ErrorBanner>}

      <Subnav
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
        active={tab}
        onChange={(k) => setTab(k as TabKey)}
      />

      {tab === "opportunities" && !opportunitiesLoading && opportunitiesError && (
        <p className="v32-meta mt-1 mb-3" style={{ color: "#A64F4B" }}>{opportunitiesError}</p>
      )}

      {tab === "opportunities" && !opportunitiesLoading && (opportunities || []).length === 0 && !opportunitiesError && (
        <EmptyLine
          title={`No opportunity found from ${opportunitiesSummary?.suppliersEvaluated ?? 0} supplier${(opportunitiesSummary?.suppliersEvaluated ?? 0) === 1 ? "" : "s"} checked.`}
          body={(opportunitiesSummary?.suppliersEvaluated ?? 0) === 0
            ? "No suppliers are on file yet, so there is nothing to check against."
            : "Starlane checked demand and supplier stability for every supplier and found no bounded opportunity right now."}
        />
      )}

      {tab === "opportunities" && !opportunitiesLoading && (opportunities || []).length > 0 && (
        <div className="fade-once">
          {(opportunities || []).map((opp, i) => (
            <OpportunityRow
              key={`${opp.affectedEntities.supplierId}-${i}`}
              opportunity={opp}
              onOpenEvidence={(e) => { e.stopPropagation(); openOpportunityEvidence(opp); }}
            />
          ))}
        </div>
      )}

      {tab !== "opportunities" && !loading && hasRealBacking && visible.length === 0 && (
        <EmptyLine
          title="Nothing here yet."
          body={tab === "changes" ? "No signal has changed since it was first detected." : "No signal currently meets this bar."}
        />
      )}

      {tab !== "opportunities" && !loading && hasRealBacking && visible.length > 0 && (
        <div className="fade-once">
          {visible.map(sig => (
            <DiscoveryRow
              key={sig.id}
              signal={sig}
              onOpen={() => router.push(`/discover/${sig.id}`)}
              onOpenEvidence={(e) => { e.stopPropagation(); openEvidence(sig.id); }}
            />
          ))}
        </div>
      )}

      {tab !== "opportunities" && !loading && !hasRealBacking && (
        <EmptyTabState tab={tab} />
      )}

      {evidenceSignalId && (
        evidenceLoading || evidence === null ? (
          <EvidenceLoadingPlaceholder onClose={() => setEvidenceSignalId(null)} />
        ) : (
          <EvidenceDrawer
            evidence={evidence}
            title="Why Starlane flagged this"
            onClose={() => { setEvidenceSignalId(null); setEvidence(null); }}
          />
        )
      )}
    </DashboardLayout>
  );
}

function DiscoveryRow({
  signal, onOpen, onOpenEvidence,
}: { signal: IntelligenceSignal; onOpen: () => void; onOpenEvidence: (e: React.MouseEvent) => void }) {
  const conf = confidenceLabel(signal.plausibility_confidence);
  return (
    <div
      className="row-hover flex items-start cursor-pointer"
      style={{ gap: 14, padding: "16px 10px", borderBottom: "1px solid #EBEAE6", borderRadius: 6 }}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      role="button"
      tabIndex={0}
    >
      <IconTile tone={signal.status === "ACTIVE" ? "critical" : signal.status === "UPDATED" ? "warning" : undefined}><IconDiscover size={16} /></IconTile>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 11, letterSpacing: "0.6px", color: "#63635F", marginBottom: 4 }}>
          {(signal.related_entity_type || signal.event_type || "Signal").replace(/_/g, " ")}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: "#191917", marginBottom: 4 }}>
          {signal.event_title || signal.why_exists}
        </div>
        {signal.event_title && signal.why_exists && (
          <div style={{ fontSize: 13, color: "#43433F", marginBottom: 6 }}>
            {signal.why_exists}
            <EvMark onClick={onOpenEvidence} />
          </div>
        )}
        <div className="flex items-center flex-wrap" style={{ gap: 8, fontSize: 11.5, color: "#8A8A86" }}>
          <span>{signal.impact_status ? signal.impact_status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : signal.status.toLowerCase()}</span>
          <Sep />
          <span>{relativeTime(signal.last_updated_at || signal.first_detected_at)}</span>
          {conf && <><Sep /><span>{conf}</span></>}
          {!(signal.event_title && signal.why_exists) && <EvMark onClick={onOpenEvidence} />}
        </div>
      </div>
      <Chevron />
    </div>
  );
}

function OpportunityRow({
  opportunity, onOpenEvidence,
}: { opportunity: IntelligenceOpportunity; onOpenEvidence: (e: React.MouseEvent) => void }) {
  return (
    <div className="row-hover flex items-start" style={{ gap: 14, padding: "16px 10px", borderBottom: "1px solid #EBEAE6", borderRadius: 6 }}>
      <IconTile tone="positive"><IconSparkle size={16} /></IconTile>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 11, letterSpacing: "0.6px", color: "#63635F", marginBottom: 4 }}>
          Opportunity · {opportunity.affectedEntities.supplierName}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: "#191917", marginBottom: 4 }}>{opportunity.opportunity}</div>
        <div style={{ fontSize: 13, color: "#43433F", marginBottom: 6 }}>
          {opportunity.reasoning}
          <EvMark onClick={onOpenEvidence} />
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          {opportunity.materiality != null && <><Mono size={13}>+{opportunity.materiality}% demand</Mono><Sep /></>}
          <span style={{ fontSize: 11.5, color: "#8A8A86" }}>Bounded opportunity</span>
          <Sep />
          <span style={{ fontSize: 11.5, color: "#8A8A86" }}>{relativeTime(opportunity.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyTabState({ tab }: { tab: TabKey }) {
  const copy: Record<string, { title: string; body: string }> = {
    opportunities: {
      title: "No opportunity detection yet",
      body: "Starlane doesn't yet compute upside opportunities from your connected data — only risk and change signals are detected today. This tab will populate once opportunity detection is built.",
    },
    leakage: {
      title: "No leakage detection yet",
      body: "Starlane doesn't yet compute margin or revenue leakage from your connected data. This tab will populate once a real leakage-detection engine is connected.",
    },
    patterns: {
      title: "No pattern detection yet",
      body: "Starlane doesn't yet cluster signals into recurring patterns across time. This tab will populate once cross-signal pattern detection is built.",
    },
    saved: {
      title: "Nothing saved yet",
      body: "Starlane doesn't yet support saving a discovery for later — this tab will populate once that's built.",
    },
  };
  const c = copy[tab] || copy.patterns;
  return <EmptyLine title={c.title} body={c.body} />;
}

function EvidenceLoadingPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <EvidenceDrawer
      evidence={[]}
      title="Loading evidence…"
      onClose={onClose}
    />
  );
}

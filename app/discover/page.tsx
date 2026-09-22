"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import { api, getUser, type IntelligenceSignal, type IntelligenceEvidenceItem, type IntelligenceOpportunity } from "@/lib/api";
import { FiSearch } from "react-icons/fi";

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

function dotColorForStatus(status: string): string {
  if (status === "ACTIVE") return "#A64F4B";
  if (status === "UPDATED") return "#4F6EF7";
  return "#8A8A86";
}

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

  return (
    <DashboardLayout pageTitle="Discover">
      <div className="mb-4">
        <h1 className="v32-page-title mb-1">Discover</h1>
        <p className="v32-body">
          {loading
            ? "Loading what Starlane has found…"
            : tab === "opportunities"
              ? (opportunitiesLoading
                  ? "Checking suppliers for bounded opportunities…"
                  : `${opportunitiesSummary?.boundedOpportunities ?? 0} bounded opportunit${(opportunitiesSummary?.boundedOpportunities ?? 0) === 1 ? "y" : "ies"} from ${opportunitiesSummary?.suppliersEvaluated ?? 0} supplier${(opportunitiesSummary?.suppliersEvaluated ?? 0) === 1 ? "" : "s"} checked`)
              : `${all.length} tracked signal${all.length === 1 ? "" : "s"} · ${risks.length} flagged as risk`}
        </p>
        {loadError && <p className="v32-meta mt-1" style={{ color: "#A64F4B" }}>{loadError}</p>}
      </div>

      <div className="flex mb-4" style={{ gap: 22, borderBottom: "1px solid #EBEAE6" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={t.key === tab ? "" : "hover-dim"}
            style={{
              padding: "0 0 10px 0",
              fontSize: 13,
              fontWeight: t.key === tab ? 500 : 400,
              color: t.key === tab ? "#191917" : "#63635F",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              borderBottomColor: t.key === tab ? "#696D86" : "transparent",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "opportunities" && !opportunitiesLoading && opportunitiesError && (
        <p className="v32-meta mt-1 mb-3" style={{ color: "#A64F4B" }}>{opportunitiesError}</p>
      )}

      {tab === "opportunities" && !opportunitiesLoading && (opportunities || []).length === 0 && !opportunitiesError && (
        <div className="fade-once py-8 text-center">
          <FiSearch size={20} style={{ color: "#8A8A86", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917" }} className="mb-1.5">
            0 opportunities found from {opportunitiesSummary?.suppliersEvaluated ?? 0} supplier{(opportunitiesSummary?.suppliersEvaluated ?? 0) === 1 ? "" : "s"} checked
          </p>
          <p className="v32-body" style={{ color: "#63635F" }}>
            {(opportunitiesSummary?.suppliersEvaluated ?? 0) === 0
              ? "No suppliers on file yet — the opportunity engine has nothing to check against."
              : "Starlane checked real demand and supplier-stability data for every supplier and found no bounded opportunity right now. This is a real, current result — not a missing feature."}
          </p>
        </div>
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
        <div className="fade-once py-8 text-center">
          <FiSearch size={20} style={{ color: "#8A8A86", margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917" }} className="mb-1.5">
            Nothing here yet
          </p>
          <p className="v32-body" style={{ color: "#63635F" }}>
            {tab === "changes"
              ? "No signal has changed since it was first detected."
              : "No signal currently meets this bar."}
          </p>
        </div>
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
      className="row-hover py-3 px-2 -mx-2 cursor-pointer"
      style={{ borderBottom: "1px solid #EDEDE9" }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.5 shrink-0 rounded-full"
          style={{ width: 6, height: 6, background: dotColorForStatus(signal.status) }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="v32-meta uppercase tracking-wide mb-0.5">
            {signal.related_entity_type || signal.event_type || "Signal"}
          </p>
          <p style={{ fontSize: 13.5, color: "#191917" }}>
            {signal.event_title || signal.why_exists}
          </p>
          {signal.event_title && signal.why_exists && (
            <p className="v32-body mt-0.5" style={{ color: "#63635F" }}>
              {signal.why_exists}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="v32-meta">
              {signal.impact_status ? signal.impact_status.replace(/_/g, " ").toLowerCase() : signal.status.toLowerCase()}
              {" · "}
              {relativeTime(signal.last_updated_at || signal.first_detected_at)}
              {conf ? ` · ${conf}` : ""}
            </span>
            <button
              onClick={onOpenEvidence}
              className="hover-dim"
              style={{
                fontSize: 10.5, fontFamily: "'IBM Plex Mono', Menlo, monospace",
                padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(25,25,23,0.14)",
                color: "#63635F", background: "none", cursor: "pointer",
              }}
            >
              ev
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpportunityRow({
  opportunity, onOpenEvidence,
}: { opportunity: IntelligenceOpportunity; onOpenEvidence: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="row-hover py-3 px-2 -mx-2"
      style={{ borderBottom: "1px solid #EDEDE9" }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-1.5 shrink-0 rounded-full"
          style={{ width: 6, height: 6, background: "#4F9E63" }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="v32-meta uppercase tracking-wide mb-0.5">
            Supplier · {opportunity.affectedEntities.supplierName}
          </p>
          <p style={{ fontSize: 13.5, color: "#191917" }}>
            {opportunity.opportunity}
          </p>
          <p className="v32-body mt-0.5" style={{ color: "#63635F" }}>
            {opportunity.reasoning}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="v32-meta">
              bounded opportunity
              {" · "}
              {relativeTime(opportunity.timestamp)}
              {opportunity.materiality != null ? ` · +${opportunity.materiality}% demand` : ""}
            </span>
            <button
              onClick={onOpenEvidence}
              className="hover-dim"
              style={{
                fontSize: 10.5, fontFamily: "'IBM Plex Mono', Menlo, monospace",
                padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(25,25,23,0.14)",
                color: "#63635F", background: "none", cursor: "pointer",
              }}
            >
              ev
            </button>
          </div>
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
  return (
    <div className="fade-once py-8 text-center">
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917" }} className="mb-1.5">
        {c.title}
      </p>
      <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>{c.body}</p>
    </div>
  );
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

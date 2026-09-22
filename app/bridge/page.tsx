"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LensDrawer, type LensSection } from "@/components/ui/LensDrawer";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import {
  api,
  type IntelligenceSignal,
  type RankedAction,
  type DataConnection,
  type WorldSourceHealth,
  type IntelligenceEvidenceItem,
} from "@/lib/api";
import { FiActivity, FiCheckCircle, FiFileText, FiCalendar } from "react-icons/fi";

// The Bridge — STARLANE_FRONTEND_HANDOFF.md §1/§4/§6/§16. Real data only:
// left column ("what changed") reads api.intelligence.signals(), right
// column reads api.businessState() for the needs-you decision queue and
// api.connections.list() + api.world.health() for source freshness. There
// is no real "prepared work" queue or calendar integration anywhere in the
// backend yet (grepped lib/api.ts in full — no such endpoint exists), so
// those two sections render the honest empty-state pattern from §8 rather
// than fabricated content. Every entity mention opens the real LensDrawer;
// every signal's evidence mark opens the real EvidenceDrawer fed by
// api.intelligence.impact() — nothing here is demo copy (§15).

function dotColorForStatus(status: string): string {
  if (status === "ACTIVE") return "#A64F4B"; // critical
  if (status === "UPDATED") return "#4F6EF7"; // accent
  return "#8A8A86"; // CANDIDATE / neutral
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

function priorityMeta(priority: RankedAction["priority"]): { label: string; emphasized: boolean } {
  if (priority === "urgent") return { label: "Urgent", emphasized: true };
  if (priority === "high") return { label: "High priority", emphasized: true };
  if (priority === "medium") return { label: "Medium priority", emphasized: false };
  return { label: "Low priority", emphasized: false };
}

export default function BridgePage() {
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const [needsYou, setNeedsYou] = useState<RankedAction[] | null>(null);
  const [connections, setConnections] = useState<DataConnection[] | null>(null);
  const [worldSources, setWorldSources] = useState<WorldSourceHealth[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Lens / Evidence drawer state
  const [lensAction, setLensAction] = useState<RankedAction | null>(null);
  const [evidenceSignalId, setEvidenceSignalId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<IntelligenceEvidenceItem[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);

  // Approve/reject a "needs you" action from the Lens drawer. This is the
  // same real PATCH /api/ai-actions/:id pathway ActionCard.tsx uses on
  // business-state — recommendation only, never execution (see api.aiActions
  // doc comment in lib/api.ts).
  const decideAction = async (status: "approved" | "rejected") => {
    if (!lensAction) return;
    setDecisionPending(true);
    try {
      await api.aiActions.updateStatus(lensAction.id, status);
      setNeedsYou(prev => (prev || []).filter(a => a.id !== lensAction.id));
      setLensAction(null);
    } catch {
      // leave the drawer open so the person can retry
    } finally {
      setDecisionPending(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      api.intelligence.signals(),
      api.businessState(),
      api.connections.list(),
      api.world.health(),
    ]).then(([signalsRes, stateRes, connRes, worldRes]) => {
      if (cancelled) return;
      if (signalsRes.status === "fulfilled") setSignals(signalsRes.value.signals || []);
      else setSignals([]);

      if (stateRes.status === "fulfilled") {
        setNeedsYou((stateRes.value.businessState.rankedActions || []).filter(a => a.requires_approval));
      } else {
        setNeedsYou([]);
      }

      if (connRes.status === "fulfilled") setConnections(connRes.value.connections || []);
      else setConnections([]);

      if (worldRes.status === "fulfilled") setWorldSources(worldRes.value.sources || []);
      else setWorldSources([]);

      if (signalsRes.status === "rejected" && stateRes.status === "rejected") {
        setLoadError("Couldn't reach Starlane's intelligence backend — showing what's cached, if anything.");
      }
    });
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

  const loading = signals === null || needsYou === null || connections === null || worldSources === null;

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="mb-5 fade-once">
        <h1 className="v32-page-title mb-1">The Bridge</h1>
        <p className="v32-body">
          {loading
            ? "Loading what changed since your last visit…"
            : `${signals!.length} tracked signal${signals!.length === 1 ? "" : "s"} · ${needsYou!.length} need${needsYou!.length === 1 ? "s" : ""} a decision`}
        </p>
        {loadError && <p className="v32-meta mt-1" style={{ color: "#A64F4B" }}>{loadError}</p>}
      </div>

      <div className="flex" style={{ gap: 32 }}>
        {/* Left column — What changed (flex:1.2) */}
        <div style={{ flex: 1.2, minWidth: 0 }}>
          <p className="v32-section-label mb-3">What changed</p>
          {!loading && signals!.length === 0 && (
            <EmptyPanel
              icon={<FiActivity size={20} style={{ color: "#8A8A86" }} />}
              title="No changes detected yet"
              body="Starlane watches your connected data for meaningful shifts — payment behavior, pricing signals, delivery risk — and lists them here as soon as it's confident enough to say something happened. Nothing has cleared that bar yet."
            />
          )}
          {!loading && signals!.length > 0 && (
            <div>
              {signals!.map(sig => (
                <IntelRow
                  key={sig.id}
                  signal={sig}
                  onOpenEvidence={() => openEvidence(sig.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column — Needs you / Prepared / Upcoming (flex:1, max-width 320) */}
        <div style={{ flex: 1, maxWidth: 320, minWidth: 0 }} className="space-y-6">
          <div>
            <p className="v32-section-label mb-3">Needs you</p>
            {!loading && needsYou!.length === 0 && (
              <p className="v32-body" style={{ color: "#63635F" }}>
                No other actions are waiting for a decision right now.
              </p>
            )}
            {!loading && needsYou!.map(action => {
              const meta = priorityMeta(action.priority);
              return (
                <NeedsYouRow
                  key={action.id}
                  action={action}
                  emphasized={meta.emphasized}
                  metaLabel={meta.label}
                  onClick={() => setLensAction(action)}
                />
              );
            })}
          </div>

          <div>
            <p className="v32-section-label mb-3">Prepared</p>
            <EmptyPanel
              compact
              icon={<FiFileText size={18} style={{ color: "#8A8A86" }} />}
              title="Nothing prepared yet"
              body="Starlane hasn't drafted any work for your review yet. Once an agent prepares something — a note, a revised term, a summary — it will show up here before it's sent anywhere."
            />
          </div>

          <div>
            <p className="v32-section-label mb-3">Upcoming</p>
            <EmptyPanel
              compact
              icon={<FiCalendar size={18} style={{ color: "#8A8A86" }} />}
              title="No calendar connected"
              body="Starlane isn't connected to a calendar yet, so it can't show what's coming up or link prepared work to it."
            />
          </div>

          <div>
            <p className="v32-section-label mb-3">Sources</p>
            <SourceStatusList connections={connections} worldSources={worldSources} loading={loading} />
          </div>
        </div>
      </div>

      {lensAction && (
        <LensDrawer
          entityType={lensAction.related_entity_type || "Action"}
          name={lensAction.customer?.name || lensAction.title}
          statusLabel={priorityMeta(lensAction.priority).label}
          statusColor={lensAction.priority === "urgent" || lensAction.priority === "high" ? "#A64F4B" : undefined}
          sections={buildActionLensSections(lensAction)}
          actions={[
            { label: decisionPending ? "Approving…" : "Approve", onClick: () => decideAction("approved") },
            { label: decisionPending ? "Rejecting…" : "Reject", onClick: () => decideAction("rejected") },
          ]}
          onClose={() => setLensAction(null)}
        />
      )}

      {evidenceSignalId && (
        evidenceLoading || evidence === null ? (
          <LoadingEvidencePlaceholder onClose={() => setEvidenceSignalId(null)} />
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

function buildActionLensSections(action: RankedAction): LensSection[] {
  const sections: LensSection[] = [
    {
      label: "Recommended action",
      rows: [
        { label: "Type", value: action.action_type },
        { label: "Priority", value: priorityMeta(action.priority).label },
        ...(action.risk_level ? [{ label: "Risk level", value: action.risk_level }] : []),
        { label: "Detected", value: relativeTime(action.created_at) },
      ],
    },
  ];
  if (action.customer) {
    sections.push({
      label: "Customer",
      rows: [
        { label: "Name", value: action.customer.name || "—" },
        ...(action.customer.phone ? [{ label: "Phone", value: action.customer.phone }] : []),
        ...(action.customer.credit_risk_score != null
          ? [{ label: "Credit risk score", value: String(action.customer.credit_risk_score) }]
          : []),
        ...(action.customer.collection_priority_score != null
          ? [{ label: "Collection priority", value: String(action.customer.collection_priority_score) }]
          : []),
      ],
    });
  }
  return sections;
}

function IntelRow({ signal, onOpenEvidence }: { signal: IntelligenceSignal; onOpenEvidence: () => void }) {
  return (
    <div
      className="row-hover py-3 px-2 -mx-2 cursor-pointer"
      style={{ borderBottom: "1px solid #EDEDE9" }}
      onClick={onOpenEvidence}
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
            <p className="v32-body mt-0.5" style={{ color: "#63635F" }}>{signal.why_exists}</p>
          )}
          <p className="v32-meta mt-1">
            {signal.impact_status} · {relativeTime(signal.last_updated_at || signal.first_detected_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

function NeedsYouRow({
  action, emphasized, metaLabel, onClick,
}: { action: RankedAction; emphasized: boolean; metaLabel: string; onClick: () => void }) {
  return (
    <div
      className="row-hover py-2.5 px-3 -mx-1 mb-2 rounded-lg cursor-pointer"
      style={{ border: emphasized ? "1px solid rgba(25,25,23,0.16)" : "1px solid transparent" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <p style={{ fontSize: 13, color: "#191917" }}>{action.title}</p>
      <p className="v32-body mt-0.5" style={{ color: "#63635F" }}>{action.description}</p>
      <p className="v32-meta mt-1">{metaLabel}{action.customer?.name ? ` · ${action.customer.name}` : ""}</p>
    </div>
  );
}

function SourceStatusList({
  connections, worldSources, loading,
}: { connections: DataConnection[] | null; worldSources: WorldSourceHealth[] | null; loading: boolean }) {
  if (loading) return <p className="v32-meta">Checking source status…</p>;
  const hasAny = (connections && connections.length > 0) || (worldSources && worldSources.length > 0);
  if (!hasAny) {
    return (
      <p className="v32-body" style={{ color: "#63635F" }}>
        Starlane hasn't connected any data or world-intelligence sources yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {connections?.map(c => (
        <div key={c.id} className="flex items-center justify-between gap-2">
          <span className="v32-body truncate" style={{ color: "#191917" }}>{c.source_type}</span>
          <span className="v32-meta shrink-0">
            {c.status === "connected" ? <FiCheckCircle size={11} style={{ display: "inline", marginRight: 3, color: "#1FB870" }} /> : null}
            {c.last_sync_at ? `Synced ${relativeTime(c.last_sync_at)}` : c.status}
          </span>
        </div>
      ))}
      {worldSources?.map(s => (
        <div key={s.source_id} className="flex items-center justify-between gap-2">
          <span className="v32-body truncate" style={{ color: "#191917" }}>{s.provider}</span>
          <span className="v32-meta shrink-0" style={{ color: s.status === "FRESH" ? "#8A8A86" : "#A64F4B" }}>
            {s.status === "FRESH" ? `Synced ${relativeTime(s.last_success)}` : s.status.replace(/_/g, " ").toLowerCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyPanel({
  icon, title, body, compact,
}: { icon: React.ReactNode; title: string; body: string; compact?: boolean }) {
  return (
    <div className={compact ? "py-3" : "py-8 text-center"}>
      {!compact && <div className="mb-3 flex justify-center">{icon}</div>}
      {compact && <div className="mb-1.5">{icon}</div>}
      <p style={{ fontFamily: compact ? undefined : "'Fraunces', Georgia, serif", fontSize: compact ? 13 : 16, color: "#191917" }} className={compact ? "" : "mb-1.5"}>
        {title}
      </p>
      <p className="v32-body" style={{ color: "#63635F" }}>{body}</p>
    </div>
  );
}

function LoadingEvidencePlaceholder({ onClose }: { onClose: () => void }) {
  // Reuses the Drawer shell indirectly by rendering EvidenceDrawer with an
  // empty evidence array while the real fetch is in flight, rather than a
  // fifth ad-hoc overlay — the drawer's own copy already reads sensibly
  // with zero items ("nothing to trace yet") for the brief loading window.
  return <EvidenceDrawer evidence={[]} title="Loading evidence…" onClose={onClose} />;
}

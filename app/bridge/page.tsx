"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { BridgeHealthPanel, TeachStarlanePanel } from "@/components/os/BridgePanels";
import { EvidenceDrawer } from "@/components/intelligence/EvidenceDrawer";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type IntelligenceSignal, type IntelligenceEvidenceItem } from "@/lib/api";
import { FiActivity } from "react-icons/fi";

// The Bridge answers one question: what is connected? It shows each
// connector's real health and what Starlane may do with it (from
// GET /api/os/bridge via BridgeHealthPanel), how to bring in data, and what
// a person can teach Starlane. Decisions and prepared work live on Prepared,
// and what is changing lives on Watch, so they are not repeated here.
// External signals from connected world sources are listed last, with
// their evidence, because they come from a connection.

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

export default function BridgePage() {
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [evidenceSignalId, setEvidenceSignalId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<IntelligenceEvidenceItem[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.intelligence.signals()
      .then((r) => { if (!cancelled) setSignals(r.signals || []); })
      .catch((e) => { if (!cancelled) { setSignals([]); setSignalsError(e?.message || "External signals could not be loaded."); } });
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

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="mb-6">
        <h1 className="v32-page-title">The Bridge</h1>
        <p className="v32-meta mt-1">What is connected, how fresh it is, and what Starlane may do with each source.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <BridgeHealthPanel />
        <div className="space-y-4">
          <Link
            href="/decisions/import"
            className="block rounded-2xl hover-dim"
            style={{ border: "1px solid #E7E5DF", padding: "18px 20px", background: "#FFFFFF" }}
          >
            <span className="v32-body" style={{ color: "#1A1A18", fontWeight: 600 }}>Upload a receivables file</span>
            <span className="v32-meta block mt-1" style={{ color: "#63635F" }}>
              CSV or Excel export of invoices (Tally, Busy or any ledger). Starlane shows what it read and what it rejected before anything is used.
            </span>
          </Link>
          <Link
            href="/sources"
            className="block rounded-2xl hover-dim"
            style={{ border: "1px solid #E7E5DF", padding: "18px 20px", background: "#FFFFFF" }}
          >
            <span className="v32-body" style={{ color: "#1A1A18", fontWeight: 600 }}>Connect Tally or see every source</span>
            <span className="v32-meta block mt-1" style={{ color: "#63635F" }}>
              Tally connects through the desktop connector and is read-only. Sources also shows sync activity and data quality.
            </span>
          </Link>
          <TeachStarlanePanel />
        </div>
      </div>

      <div className="mt-8">
        <p className="v32-section-label mb-3">External signals from connected world sources</p>
        {signals === null && <p className="v32-body" style={{ color: "#63635F" }}>Loading…</p>}
        {signalsError && <p className="v32-meta" style={{ color: "#A64F4B" }}>{signalsError}</p>}
        {signals !== null && !signalsError && signals.length === 0 && (
          <EmptyPanel
            compact
            icon={<FiActivity size={18} style={{ color: "#8A8A86" }} />}
            title="No external signals yet"
            body="When a connected world source (exchange rates, earthquakes) produces a signal Starlane is confident about, it is listed here with its evidence."
          />
        )}
        {signals !== null && signals.length > 0 && signals.map((sig) => (
          <IntelRow key={sig.id} signal={sig} onOpenEvidence={() => openEvidence(sig.id)} />
        ))}
      </div>

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

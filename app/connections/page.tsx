"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { api, type DataConnection } from "@/lib/api";
import { FiCheckCircle, FiAlertCircle, FiUploadCloud, FiClock } from "react-icons/fi";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

/** Turn a raw DB status + connection row into plain-language copy. */
function describeTally(conn: DataConnection | undefined): { text: string; tone: "ok" | "warn" | "muted" } {
  if (!conn) return { text: "Not connected yet", tone: "muted" };
  if (conn.status === "CONNECTED") {
    const ago = timeAgo(conn.last_sync_at);
    return { text: ago ? `Connected · last updated ${ago}` : "Connected", tone: "ok" };
  }
  if (conn.status === "ERROR") {
    return { text: `Having trouble connecting${conn.last_sync_error ? ` — ${conn.last_sync_error}` : ""}`, tone: "warn" };
  }
  return { text: "Not connected yet", tone: "muted" };
}

const TONE_STYLE: Record<string, { bg: string; border: string; color: string; icon: React.ElementType }> = {
  ok:    { bg: "rgba(16,217,138,0.1)", border: "1px solid rgba(16,217,138,0.25)", color: "#10D98A", icon: FiCheckCircle },
  warn:  { bg: "rgba(245,66,77,0.1)",  border: "1px solid rgba(245,66,77,0.25)",  color: "#F5424D", icon: FiAlertCircle },
  muted: { bg: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94A3B8", icon: FiClock },
};

function StatusPill({ tone, text }: { tone: "ok" | "warn" | "muted"; text: string }) {
  const s = TONE_STYLE[tone];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
      style={{ background: s.bg, border: s.border, color: s.color }}>
      <Icon size={11} /> {text}
    </div>
  );
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTallySetup, setShowTallySetup] = useState(false);
  const [connectingTally, setConnectingTally] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.connections.list()
      .then((res) => { if (!cancelled) setConnections(res.connections || []); })
      .catch((e) => { if (!cancelled) setLoadError(e?.message || "Could not load connections."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tally = connections.find((c) => c.source_type === "TALLY");
  const tallyStatus = describeTally(tally);

  async function connectTally() {
    setConnectingTally(true); setConnectError(null);
    try {
      const enrollment = await api.connections.enrollTally();
      const protocolUrl = `vantro-tally://pair?enrollment=${encodeURIComponent(enrollment.enrollmentCode)}`;
      window.location.assign(protocolUrl);
      setShowTallySetup(true);
    } catch (error: any) {
      setConnectError(error?.message || 'Could not start Tally connection. Please try again.');
    } finally { setConnectingTally(false); }
  }

  return (
    <DashboardLayout pageTitle="Connections">
      <div className="space-y-5 max-w-2xl">
        <div>
          <p className="text-base font-black text-primary">Connections</p>
          <p className="text-sm text-secondary mt-0.5">Where Vantro gets your business data from.</p>
        </div>

        {loadError && (
          <Card>
            <p className="text-sm text-danger">{loadError}</p>
          </Card>
        )}

        <Card>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">Accounting Software</p>
          <div className="space-y-4">
            {/* Tally */}
            <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center shrink-0 text-lg font-black text-accent">
                T
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">Tally</p>
                <p className="text-2xs text-muted">
                  {loading ? "Checking..." : "Read-only — Vantro never changes anything in Tally"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={connectTally}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-colors"
                >
                  {connectingTally ? "Connecting…" : "Connect Tally"}
                </button>
                {!loading && <StatusPill tone={tallyStatus.tone} text={tallyStatus.text} />}
              </div>
            </div>

            {/* Upload a file */}
            <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0">
                <FiUploadCloud size={16} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">Upload a File</p>
                <p className="text-2xs text-muted">Bring in a spreadsheet or CSV export any time — no setup needed</p>
              </div>
              <Link href="/collections"
                className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-colors">
                Upload
              </Link>
            </div>

            {/* Coming soon */}
            {[
              { name: "QuickBooks", letter: "Q" },
              { name: "Zoho Books", letter: "Z" },
              { name: "Xero", letter: "X" },
            ].map((s) => (
              <div key={s.name}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border opacity-50">
                <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border flex items-center justify-center shrink-0 text-lg font-black text-muted">
                  {s.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">{s.name}</p>
                  <p className="text-2xs text-muted">We're working on this</p>
                </div>
                <div className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 bg-surface-3 border border-border text-muted">
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </Card>

        {showTallySetup && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Connecting Tally">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-base font-black text-primary">Connecting Tally</p><p className="text-xs text-secondary mt-1">The StarLane Connector is opening on this computer to securely pair and begin background synchronization.</p></div>
                <button type="button" onClick={() => setShowTallySetup(false)} className="text-muted hover:text-primary text-xl leading-none" aria-label="Close connection dialog">×</button>
              </div>
              {connectError ? <p className="rounded-xl bg-danger-dim border border-danger/30 p-3 text-sm text-danger">{connectError}</p> : <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-secondary">If the connector is already installed, Windows will open it and pairing will continue automatically. Your workspace password is never shared with the connector.</div>}
              <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-xs text-success">StarLane reads Tally through local export requests only. It does not alter or delete data in Tally.</div>
              <button type="button" onClick={() => setShowTallySetup(false)} className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition-colors">Continue in connector</button>
            </div>
          </div>
        )}      </div>
    </DashboardLayout>
  );
}



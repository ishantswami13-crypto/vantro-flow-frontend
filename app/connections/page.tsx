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
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center shrink-0 text-lg font-black text-blue-400">
                T
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">Tally</p>
                <p className="text-2xs text-muted">
                  {loading ? "Checking..." : "Read-only — Vantro never changes anything in Tally"}
                </p>
              </div>
              {!loading && <StatusPill tone={tallyStatus.tone} text={tallyStatus.text} />}
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
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type DataConnection, type WorldSourceHealth } from "@/lib/api";
import { FiUploadCloud } from "react-icons/fi";

// World Intelligence Phase 3C: world_sources.is_internal (backend column,
// migration 044) is now the source of truth for "is this a real customer-
// visible connector" — GET /api/world/health excludes is_internal=true rows
// (test fixtures, dev/demo reference sources) by default, so this page no
// longer needs its own hardcoded provider allowlist to hide them.

function describeWorldSource(s: WorldSourceHealth): { text: string; tone: "ok" | "warn" | "muted" } {
  if (s.status === "NEVER_SUCCEEDED") return { text: "Not yet synced", tone: "muted" };
  const ago = s.last_success ? timeAgo(s.last_success) : null;
  if (s.status === "FRESH") return { text: ago ? `Connected · last synced ${ago}` : "Connected", tone: "ok" };
  // STALE: the source has synced before but not recently enough for its own
  // cadence — real, honest signal that ingestion isn't running continuously
  // yet, not an error.
  return { text: ago ? `Last synced ${ago} — sync is overdue` : "Sync overdue", tone: "warn" };
}

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
    return { text: ago ? `Connected · last synced ${ago}` : "Connected", tone: "ok" };
  }
  if (conn.status === "ERROR") {
    return { text: `Having trouble connecting${conn.last_sync_error ? ` — ${conn.last_sync_error}` : ""}`, tone: "warn" };
  }
  return { text: "Not connected yet", tone: "muted" };
}

const TONE_COLOR: Record<"ok" | "warn" | "muted", string> = {
  ok: "#171717",
  warn: "#C13B3B",
  muted: "#8A8A86",
};

// One row style for every source — connected, not-yet-connected, and
// coming-soon are all the same quiet row, distinguished by plain text
// status rather than colored pills or app-store-style tiles.
function SourceRow({ letter, name, status, action, muted }: {
  letter: string;
  name: string;
  status: { text: string; tone: "ok" | "warn" | "muted" };
  action?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-5" style={{ borderBottom: "1px solid #E5E5E1", opacity: muted ? 0.55 : 1 }}>
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-medium"
        style={{ background: "#F2F2EF", border: "1px solid #E5E5E1", color: "#686868" }}
      >
        {letter}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium" style={{ color: "#171717" }}>{name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: TONE_COLOR[status.tone] }}>{status.text}</p>
      </div>
      {action}
    </div>
  );
}

function QuietButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = "text-[13px] font-medium shrink-0 transition-colors";
  const style = { color: "#171717" };
  if (href) return <Link href={href} className={cls} style={style}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls} style={style}>{children}</button>;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showTallySetup, setShowTallySetup] = useState(false);
  const [connectingTally, setConnectingTally] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [worldSources, setWorldSources] = useState<WorldSourceHealth[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.connections.list()
      .then((res) => { if (!cancelled) setConnections(res.connections || []); })
      .catch((e) => { if (!cancelled) setLoadError(e?.message || "Could not load connections."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    // Real-world event sources (USGS, FX) — separate registry, separate
    // failure domain, so a failure here never blocks the business-systems
    // section above.
    api.world.health()
      .then((res) => { if (!cancelled) setWorldSources(res.sources || []); })
      .catch(() => { if (!cancelled) setWorldSources([]); });
    return () => { cancelled = true; };
  }, []);

  const tally = connections.find((c) => c.source_type === "TALLY");
  const tallyStatus = loading ? { text: "Checking…", tone: "muted" as const } : describeTally(tally);

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
    <DashboardLayout pageTitle="Sources">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
        <h1 className="text-[28px] lg:text-[32px] leading-[1.15] mb-2" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>
          Sources
        </h1>
        <p className="text-[14px] max-w-[700px] mb-10" style={{ color: "#686868" }}>
          Systems and external context Starlane uses to understand your organization.
        </p>

        {loadError && (
          <p className="text-[13px] mb-6" style={{ color: "#C13B3B" }}>{loadError}</p>
        )}

        <section>
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>Business systems</p>
          <div>
            <SourceRow
              letter="T"
              name="Tally"
              status={tallyStatus}
              action={<QuietButton onClick={connectTally}>{connectingTally ? "Connecting…" : "Connect Tally"}</QuietButton>}
            />
            <SourceRow
              letter=""
              name="Upload a file"
              status={{ text: "Bring in a spreadsheet or CSV export any time — no setup needed", tone: "muted" }}
              action={<QuietButton href="/collections"><span className="inline-flex items-center gap-1.5"><FiUploadCloud size={13} /> Upload</span></QuietButton>}
            />
            {[
              { name: "QuickBooks", letter: "Q" },
              { name: "Zoho Books", letter: "Z" },
              { name: "Xero", letter: "X" },
            ].map((s) => (
              <SourceRow
                key={s.name}
                letter={s.letter}
                name={s.name}
                status={{ text: "We're working on this", tone: "muted" }}
                action={<span className="text-[12px] shrink-0" style={{ color: "#B5B5B0" }}>Coming soon</span>}
                muted
              />
            ))}
          </div>
        </section>

        {worldSources !== null && worldSources.length > 0 && (
          <section className="mt-10">
            <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>External context</p>
            <p className="text-[12px] mb-1" style={{ color: "#B5B5B0" }}>Real-world events Starlane watches for relevance to your business — not a news feed.</p>
            <div>
              {worldSources.map((s) => (
                <SourceRow
                  key={s.source_id}
                  letter={s.provider.charAt(0)}
                  name={s.dataset === "significant_earthquakes_month" ? "Earthquakes (USGS)" : s.provider === "Frankfurter/ECB" ? "Exchange rates (ECB)" : s.provider}
                  status={describeWorldSource(s)}
                />
              ))}
            </div>
          </section>
        )}

        {showTallySetup && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} role="dialog" aria-modal="true" aria-label="Connecting Tally">
            <div className="w-full max-w-xl rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #E5E5E1", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-medium" style={{ color: "#171717" }}>Connecting Tally</p>
                  <p className="text-[12px] mt-1" style={{ color: "#8A8A86" }}>The Starlane connector is opening on this computer to securely pair and begin background synchronization.</p>
                </div>
                <button type="button" onClick={() => setShowTallySetup(false)} className="text-xl leading-none" style={{ color: "#8A8A86" }} aria-label="Close connection dialog">×</button>
              </div>
              {connectError ? (
                <p className="rounded-lg p-3 text-[13px]" style={{ background: "#FBEFEF", border: "1px solid #F0D5D5", color: "#C13B3B" }}>{connectError}</p>
              ) : (
                <div className="rounded-lg p-4 text-[13px]" style={{ border: "1px solid #E5E5E1", color: "#686868" }}>
                  If the connector is already installed, Windows will open it and pairing will continue automatically. Your workspace password is never shared with the connector.
                </div>
              )}
              <p className="text-[12px]" style={{ color: "#8A8A86" }}>Starlane reads Tally through local export requests only. It does not alter or delete data in Tally.</p>
              <button
                type="button"
                onClick={() => setShowTallySetup(false)}
                className="w-full rounded-lg py-2.5 text-[13px] font-medium transition-colors"
                style={{ background: "#171717", color: "#ffffff" }}
              >
                Continue in connector
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type DataConnection, type WorldSourceHealth } from "@/lib/api";
import { FiUploadCloud } from "react-icons/fi";

// Sources — STARLANE_FRONTEND_HANDOFF.md §1/§3/§4/§5/§6/§8/§14/§16.
//
// Audit finding (this turn): unlike Watch/Missions/Simulate/Memory/Prepared,
// this page was NOT a blank slate. An earlier Phase 1/2 session already
// repurposed app/connections/page.tsx (redirect now lives at /connections)
// into a genuinely real Sources page: api.connections.list() for Tally
// connection status, api.world.health() for real USGS/ECB connector health,
// and inline Tally enrollment via api.connections.enrollTally(). That real
// data logic is preserved as-is below — this turn only re-skins it onto the
// V32 visual system (Fraunces headings, #191917/#63635F text tokens,
// #EBEAE6 borders, .row-hover, subnav()) and adds the `source_row` +
// `subnav` structure the handoff specifies (§5, §14: Connected/Available/
// Sync Activity/Data Quality/Reconciliation, default Connected).
//
// Per-tab honesty (§8, §16):
// - Connected: real — same api.connections.list()/api.world.health() data
//   as before, now rendered as source_row.
// - Available: real — the same "Coming soon" business-system connectors
//   (QuickBooks/Zoho/Xero) plus file upload, already true today.
// - Sync Activity: derived from the same real last_sync_at/status fields
//   already fetched — a real per-source sync log entry per connection,
//   not a separate table. No fabricated events.
// - Data Quality / Reconciliation: no real computation backs these yet
//   (no duplicate-entity detection, no receivables/payables/sales
//   cross-check against Tally exists in the backend). Per §8's exact
//   pre-written designed copy for SourcesTally's panels — reused verbatim
//   here since Sources.dc.html's own subnav references the same concepts
//   and no separate copy was found for the list-level tabs.

type TabKey = "connected" | "available" | "sync" | "quality" | "reconciliation";

const TABS: { key: TabKey; label: string }[] = [
  { key: "connected", label: "Connected" },
  { key: "available", label: "Available" },
  { key: "sync", label: "Sync Activity" },
  { key: "quality", label: "Data Quality" },
  { key: "reconciliation", label: "Reconciliation" },
];

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

function describeWorldSource(s: WorldSourceHealth): { text: string; tone: "ok" | "warn" | "muted" } {
  if (s.status === "NEVER_SUCCEEDED") return { text: "Not yet synced", tone: "muted" };
  const ago = s.last_success ? timeAgo(s.last_success) : null;
  if (s.status === "FRESH") return { text: ago ? `Connected · last synced ${ago}` : "Connected", tone: "ok" };
  return { text: ago ? `Last synced ${ago} — sync is overdue` : "Sync overdue", tone: "warn" };
}

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
  ok: "#191917",
  warn: "#C13B3B",
  muted: "#9A9A94",
};

const EMPTY_COPY: Record<"quality" | "reconciliation", { title: string; body: string }> = {
  reconciliation: {
    title: "Reconciliation data isn't available yet.",
    body: "Once enabled, Starlane will compare receivables, payables, and sales totals directly against Tally and flag any difference before using those numbers elsewhere in the product.",
  },
  quality: {
    title: "No data-quality issues have been surfaced yet.",
    body: "Starlane checks for missing relationships, duplicate entities, and unmapped ledgers as more history syncs.",
  },
};

function SourceRow({ letter, name, status, action, muted, href }: {
  letter: string;
  name: string;
  status: { text: string; tone: "ok" | "warn" | "muted" };
  action?: React.ReactNode;
  muted?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className="row-hover"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 4px",
        borderBottom: "1px solid #EBEAE6",
        opacity: muted ? 0.55 : 1,
        borderRadius: 6,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 500,
          background: "#F3F2EE",
          border: "1px solid #EBEAE6",
          color: "#63635F",
        }}
      >
        {letter}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#191917", margin: 0 }}>{name}</p>
        <p style={{ fontSize: 12, marginTop: 2, color: TONE_COLOR[status.tone] }}>{status.text}</p>
      </div>
      {action}
    </div>
  );
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

function QuietButton({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const style = { color: "#191917", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer" } as const;
  if (href) return <Link href={href} className="hover-dim" style={{ ...style, textDecoration: "none" }}>{children}</Link>;
  return <button type="button" onClick={onClick} className="hover-dim" style={style}>{children}</button>;
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }} className="fade-once">
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>{title}</p>
      <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>{body}</p>
    </div>
  );
}

export default function SourcesPage() {
  const [tab, setTab] = useState<TabKey>("connected");
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
    api.world.health()
      .then((res) => { if (!cancelled) setWorldSources(res.sources || []); })
      .catch(() => { if (!cancelled) setWorldSources([]); });
    return () => { cancelled = true; };
  }, []);

  const tally = connections.find((c) => c.source_type === "TALLY");
  const tallyStatus = loading ? { text: "Checking…", tone: "muted" as const } : describeTally(tally);
  const tallyConnected = tally?.status === "CONNECTED";

  async function connectTally() {
    setConnectingTally(true); setConnectError(null);
    try {
      const enrollment = await api.connections.enrollTally();
      const protocolUrl = `vantro-tally://pair?enrollment=${encodeURIComponent(enrollment.enrollmentCode)}`;
      window.location.assign(protocolUrl);
      setShowTallySetup(true);
    } catch (error: any) {
      setConnectError(error?.message || "Could not start Tally connection. Please try again.");
    } finally { setConnectingTally(false); }
  }

  // Sync Activity: a real per-source log entry derived from the same
  // last_sync_at/status fields already fetched for Connected — not a
  // separate events table, so no fabricated activity feed.
  const syncEntries = [
    ...(tally ? [{ key: "tally", letter: "T", name: "Tally", status: describeTally(tally) }] : []),
    ...((worldSources ?? []).map((s) => ({
      key: s.source_id,
      letter: s.provider.charAt(0),
      name: s.dataset === "significant_earthquakes_month" ? "Earthquakes (USGS)" : s.provider === "Frankfurter/ECB" ? "Exchange rates (ECB)" : s.provider,
      status: describeWorldSource(s),
    }))),
  ];

  return (
    <DashboardLayout pageTitle="Sources">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Sources
          </h1>
        </div>

        <p style={{ fontSize: 13.5, color: "#63635F", maxWidth: 640 }}>
          Systems and external context Starlane uses to understand your organization. Starlane hasn&apos;t connected a banking, inventory, or customer-communication source yet — Reduce inventory 15% and cash-related findings rely on what Tally and Simulate can infer today, not a direct feed.
        </p>

        {loadError && <p style={{ fontSize: 13, color: "#C13B3B" }}>{loadError}</p>}

        <nav
          aria-label="Secondary"
          style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid #EBEAE6", marginBottom: 4 }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="hover-dim"
              style={{
                padding: "8px 2px",
                fontSize: 13,
                fontWeight: t.key === tab ? 500 : 400,
                color: t.key === tab ? "#191917" : "#63635F",
                background: "none",
                border: "none",
                borderBottomColor: t.key === tab ? "#696D86" : "transparent",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 0, boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {tab === "connected" && (
            <div style={{ padding: "8px 20px 20px" }}>
              <SourceRow
                letter="T"
                name="Tally"
                status={tallyStatus}
                href={tallyConnected ? "/sources/tally" : undefined}
                action={
                  tallyConnected ? undefined : (
                    <QuietButton onClick={connectTally}>{connectingTally ? "Connecting…" : "Connect Tally"}</QuietButton>
                  )
                }
              />
              {worldSources !== null && worldSources.length > 0 && worldSources.map((s) => (
                <SourceRow
                  key={s.source_id}
                  letter={s.provider.charAt(0)}
                  name={s.dataset === "significant_earthquakes_month" ? "Earthquakes (USGS)" : s.provider === "Frankfurter/ECB" ? "Exchange rates (ECB)" : s.provider}
                  status={describeWorldSource(s)}
                />
              ))}
            </div>
          )}

          {tab === "available" && (
            <div style={{ padding: "8px 20px 20px" }}>
              <SourceRow
                letter=""
                name="Upload a file"
                status={{ text: "Bring in a spreadsheet or CSV export any time — no setup needed", tone: "muted" }}
                action={<QuietButton href="/collections"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiUploadCloud size={13} /> Upload</span></QuietButton>}
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
                  action={<span style={{ fontSize: 12, color: "#B5B5B0" }}>Coming soon</span>}
                  muted
                />
              ))}
            </div>
          )}

          {tab === "sync" && (
            syncEntries.length > 0 ? (
              <div style={{ padding: "8px 20px 20px" }}>
                {syncEntries.map((e) => (
                  <SourceRow key={e.key} letter={e.letter} name={e.name} status={e.status} />
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="No sync activity yet"
                body="This tab lists the last known sync status per connected source, drawn from the same connection records shown under Connected. Nothing has synced yet."
              />
            )
          )}

          {tab === "quality" && <EmptyPanel {...EMPTY_COPY.quality} />}
          {tab === "reconciliation" && <EmptyPanel {...EMPTY_COPY.reconciliation} />}
        </div>

        {showTallySetup && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} role="dialog" aria-modal="true" aria-label="Connecting Tally">
            <div className="w-full max-w-xl rounded-xl p-6 space-y-5" style={{ background: "#FFFFFF", border: "1px solid #EBEAE6", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p style={{ fontSize: 16, fontFamily: "'Fraunces', Georgia, serif", color: "#191917" }}>Connecting Tally</p>
                  <p style={{ fontSize: 12, marginTop: 4, color: "#63635F" }}>The Starlane connector is opening on this computer to securely pair and begin background synchronization.</p>
                </div>
                <button type="button" onClick={() => setShowTallySetup(false)} className="text-xl leading-none" style={{ color: "#63635F" }} aria-label="Close connection dialog">×</button>
              </div>
              {connectError ? (
                <p style={{ borderRadius: 8, padding: 12, fontSize: 13, background: "#FBEFEF", border: "1px solid #F0D5D5", color: "#C13B3B" }}>{connectError}</p>
              ) : (
                <div style={{ borderRadius: 8, padding: 14, fontSize: 13, border: "1px solid #EBEAE6", color: "#63635F" }}>
                  If the connector is already installed, Windows will open it and pairing will continue automatically. Your workspace password is never shared with the connector.
                </div>
              )}
              <p style={{ fontSize: 12, color: "#63635F" }}>Starlane reads Tally through local export requests only. It does not alter or delete data in Tally.</p>
              <button
                type="button"
                onClick={() => setShowTallySetup(false)}
                className="btn-primary w-full rounded-lg py-2.5 text-[13px] font-medium"
                style={{ background: "#191917", color: "#ffffff" }}
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

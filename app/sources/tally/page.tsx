"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector, type DataConnection } from "@/lib/api";
import { FiChevronLeft } from "react-icons/fi";
import { Button, Sep, StatusDot, ErrorBanner, SkeletonRows } from "@/components/v32/ui";
import { IconSources } from "@/components/v32/icons";

// Sources — Tally detail. STARLANE_FRONTEND_HANDOFF.md §1/§5/§6/§8/§16.
//
// Audit finding: the only real per-connector data available is the
// DataConnection row itself (status, connected_at, last_sync_at,
// last_sync_error) from GET /api/connections — there is no separate
// per-domain sync endpoint. Checked server.js directly: the domain-
// availability concept from SourcesTally.dc.html (Customers/Receivables/
// Sales/Suppliers "Available", Purchases/Inventory "Partial", Payables/
// Banking/Tax "Unavailable") has no backing computation anywhere in the
// backend — no per-entity-type sync-coverage query exists. The handoff
// itself flags this exact case (§16/§8 audit note): "must reflect the real
// state of a real Tally/ERP/CRM integration, never a hardcoded status."
// Since no real per-domain state can be computed, the domain-availability
// panel is an honest empty state rather than invented Available/Partial/
// Unavailable badges. Reconciliation and Data Quality reuse §8's exact
// pre-written designed copy — same panels, same text, as Sources' own
// subnav tabs, because SourcesTally.dc.html is where that copy was
// originally specified.
//
// Overview panel IS real: connection status, connected-since, last sync,
// and last sync error, straight from the same DataConnection row already
// used on /sources.

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function OverviewRow({ label, value, tone, mono = true }: { label: string; value: string; tone?: "warn"; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 16, padding: "8px 0", borderBottom: "1px solid #EBEAE6" }}>
      <span style={{ fontSize: 12.5, color: "#63635F" }}>{label}</span>
      <span style={{ fontSize: 13, color: tone === "warn" ? "#A64F4B" : "#191917", fontFamily: mono ? "'Plus Jakarta Sans', system-ui, sans-serif" : undefined, textAlign: "right", maxWidth: 380 }}>{value}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 0, color: "#63635F", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12.5, color: "#8A8A86", lineHeight: 1.6, paddingTop: 4 }}>{children}</div>;
}

export default function SourcesTallyPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  // Health and last sync come from the latest sync run (GET /api/connectors),
  // not the heartbeat row, so a failed or stuck attempt is not shown as healthy.
  const [bridge, setBridge] = useState<Connector | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.connections.list()
      .then((res) => { if (!cancelled) setConnections(res.connections || []); })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : "Connections could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    api.connectors.list()
      .then((res) => { if (!cancelled) setBridge(res.connectors.find((c) => c.id === "tally") || null); })
      .catch(() => { /* falls back to the connection row */ });
    return () => { cancelled = true; };
  }, []);

  const tally = connections.find((c) => c.source_type === "TALLY");
  const h = bridge?.state.health;
  const status = h && h !== "not_connected" && h !== "unavailable"
    ? (h === "healthy" || h === "syncing" ? { label: h === "syncing" ? "Syncing" : "Healthy", color: "#477054" }
      : h === "error" ? { label: "Needs attention", color: "#A64F4B" }
        : h === "delayed" || h === "stale" || h === "connected" ? { label: h === "connected" ? "Paired, not synced yet" : "Sync delayed", color: "#9B742B" }
          : { label: "Not connected", color: "rgba(25,25,23,0.25)" })
    : !tally ? { label: "Not connected", color: "rgba(25,25,23,0.25)" }
    : tally.status === "CONNECTED" ? { label: "Healthy", color: "#477054" }
      : tally.status === "ERROR" ? { label: "Needs attention", color: "#A64F4B" }
        : { label: "Not connected", color: "rgba(25,25,23,0.25)" };

  return (
    <DashboardLayout pageTitle="Sources">
      <Link href="/sources" className="hover-dim flex items-center" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
        <FiChevronLeft size={13} /> Sources
      </Link>

      <div className="fade-once flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 4 }}>
            <IconSources size={18} style={{ color: "#43433F" }} />
            <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 22, color: "#191917" }}>Tally</h1>
          </div>
          <div className="flex items-center" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
            Accounting / ERP <Sep /> <StatusDot label={loading ? "Checking…" : status.label} color={status.color} />
          </div>
        </div>
        <Button small href="/sources/connect">{tally ? "Pair another computer" : "Connect Tally"}</Button>
      </div>

      {loadError && <ErrorBanner>Tally&apos;s status could not be loaded: {loadError}</ErrorBanner>}

      <div className="fade-once flex flex-col lg:flex-row" style={{ gap: 32 }}>
        <div className="flex flex-col" style={{ flex: 1.3, minWidth: 0, gap: 22 }}>
          <Section label="Overview">
            {loading ? <SkeletonRows rows={3} height={36} /> : !tally ? (
              <Quiet>Tally is not connected yet. Connect it to see its sync history and what Starlane reads from it.</Quiet>
            ) : (
              <>
                {(() => {
                  const lastOk = bridge ? bridge.state.lastSuccessAt ?? null : tally.last_sync_at;
                  const lastErr = bridge ? bridge.state.lastError : tally.last_sync_error;
                  return (
                    <>
                      <OverviewRow label="Last successful sync" value={lastOk ? timeAgo(lastOk) : "Never"} />
                      <OverviewRow label="Connected since" value={formatDate(tally.connected_at)} />
                      {lastErr && <OverviewRow label="Last sync error" value={lastErr} tone="warn" mono={false} />}
                    </>
                  );
                })()}
              </>
            )}
          </Section>
          <Section label="What Starlane understands from Tally">
            <Quiet>
              Per-domain coverage (customers, receivables, sales, suppliers, purchases, stock) is not computed yet,
              so no Available or Partial status is shown here. What Starlane read from your data is under Sources, Data Quality.
            </Quiet>
          </Section>
        </div>
        <div className="flex flex-col" style={{ flex: 1, maxWidth: 320, minWidth: 0, gap: 22 }}>
          <Section label="Reconciliation">
            <Quiet>Once enabled, Starlane compares receivables, payables and sales totals against Tally and flags any difference before those numbers are used.</Quiet>
          </Section>
          <Section label="Access">
            <Quiet>Read only. The bridge never creates, edits or deletes anything in Tally, and its device credential can be revoked from Sources.</Quiet>
          </Section>
        </div>
      </div>
    </DashboardLayout>
  );
}

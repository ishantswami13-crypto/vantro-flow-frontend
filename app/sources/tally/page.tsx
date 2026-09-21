"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type DataConnection } from "@/lib/api";

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

function OverviewRow({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 4px", borderBottom: "1px solid #EBEAE6" }}>
      <span style={{ fontSize: 12.5, color: "#63635F" }}>{label}</span>
      <span style={{ fontSize: 13.5, color: tone === "warn" ? "#C13B3B" : "#191917", fontWeight: 500, textAlign: "right", maxWidth: 360 }}>{value}</span>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "36px 24px", textAlign: "center" }} className="fade-once">
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, color: "#191917", marginBottom: 6 }}>{title}</p>
      <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>{body}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EBEAE6" }}>
        <p style={{ fontSize: 12, letterSpacing: 0.4, color: "#63635F", textTransform: "uppercase", margin: 0 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function SourcesTallyPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.connections.list()
      .then((res) => { if (!cancelled) setConnections(res.connections || []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tally = connections.find((c) => c.source_type === "TALLY");

  return (
    <DashboardLayout pageTitle="Sources">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/sources" className="hover-dim" style={{ fontSize: 12.5, color: "#63635F", textDecoration: "none" }}>
            ← Sources
          </Link>
          <h1 style={{ margin: "6px 0 0", fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Tally
          </h1>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "#63635F" }}>Loading…</p>
        ) : !tally ? (
          <Panel title="Overview">
            <EmptyPanel
              title="Tally isn't connected yet"
              body="Connect Tally from the Sources page to see its connection status, sync history, and data here."
            />
          </Panel>
        ) : (
          <Panel title="Overview">
            <div style={{ padding: "4px 16px" }}>
              <OverviewRow label="Status" value={tally.status === "CONNECTED" ? "Connected" : tally.status === "ERROR" ? "Error" : "Not connected"} tone={tally.status === "ERROR" ? "warn" : undefined} />
              <OverviewRow label="Connected since" value={formatDate(tally.connected_at)} />
              <OverviewRow label="Last synced" value={tally.last_sync_at ? `${formatDate(tally.last_sync_at)} (${timeAgo(tally.last_sync_at)})` : "Never"} />
              {tally.last_sync_error && <OverviewRow label="Last sync error" value={tally.last_sync_error} tone="warn" />}
            </div>
          </Panel>
        )}

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1.3, minWidth: 320 }}>
            <Panel title="Data availability by domain">
              <EmptyPanel
                title="Domain-level availability isn't tracked yet"
                body="Starlane doesn't yet compute per-domain sync coverage (Customers, Receivables, Sales, Suppliers, Purchases, Inventory, Payables, Banking, Tax) from the Tally connection. This panel will show a real Available / Partial / Unavailable status per domain once that computation exists — never a hardcoded one."
              />
            </Panel>
          </div>
          <div style={{ flex: 1, maxWidth: 340, minWidth: 260 }}>
            <Panel title="Reconciliation">
              <EmptyPanel
                title="Reconciliation data isn't available yet."
                body="Once enabled, Starlane will compare receivables, payables, and sales totals directly against Tally and flag any difference before using those numbers elsewhere in the product."
              />
            </Panel>
          </div>
        </div>

        <Panel title="Data quality">
          <EmptyPanel
            title="No data-quality issues have been surfaced yet."
            body="Starlane checks for missing relationships, duplicate entities, and unmapped ledgers as more history syncs."
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector, type DataConnection } from "@/lib/api";
import { PageHeader, SkeletonRows, Sep } from "@/components/v32/ui";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { QuietError } from "@/components/os/bridge/kit";
import { healthOf, OFFLINE } from "@/components/connectors/health";
import { formatDateTime, formatRelative } from "@/lib/format";

// Sources > Tally detail.
//
// The only real per-connector data is the DataConnection row (status,
// connected_at, last_sync_at, last_sync_error) from GET /api/connections and
// the connector state from GET /api/connectors (latest sync run, devices).
// There is no per-domain sync-coverage query in the backend, so the
// domain-availability panel stays an honest note rather than invented
// Available / Partial badges. Health and last sync come from the latest
// sync run, not the heartbeat row, so a failed or stuck attempt is never
// shown as healthy.

function Fact({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "critical" }) {
  return (
    <div className="tally-fact">
      <dt style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{label}</dt>
      <dd className="tabular-nums" style={{ margin: 0, fontSize: 13, color: tone === "critical" ? "var(--critical)" : "var(--ink)", minWidth: 0, overflowWrap: "anywhere" }}>{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="section-label">{title}</h2>
      {children}
    </section>
  );
}

const Quiet = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{children}</p>
);

export default function SourcesTallyPage() {
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [bridge, setBridge] = useState<Connector | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true); setLoadFailed(false);
    api.connections.list()
      .then((res) => { if (!cancelled) setConnections(res.connections || []); })
      .catch(() => { if (!cancelled) setLoadFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    api.connectors.list()
      .then((res) => { if (!cancelled) setBridge(res.connectors.find((c) => c.id === "tally") || null); })
      .catch(() => { /* falls back to the connection row */ });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => load(), [load]);

  const tally = connections.find((c) => c.source_type === "TALLY");
  const h = bridge?.state.health;
  const status: { label: string; tone: StatusTone } = h && h !== "not_connected" && h !== "unavailable"
    ? healthOf(bridge)
    : !tally ? { label: "Not connected", tone: "unknown" }
      : tally.status === "CONNECTED" ? { label: "Healthy", tone: "positive" }
        : tally.status === "ERROR" ? { label: "Error", tone: "critical" }
          : { label: "Not connected", tone: "unknown" };

  const lastOk = bridge ? bridge.state.lastSuccessAt ?? null : tally?.last_sync_at ?? null;
  const lastErr = bridge ? bridge.state.lastError : tally?.last_sync_error ?? null;
  const devices = (bridge?.state.devices || []).filter((d) => d.status === "ACTIVE");

  return (
    <DashboardLayout pageTitle="TallyPrime">
      <style>{`
        .tally-grid { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr); align-items: start; }
        @media (min-width: 1000px) { .tally-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 280px); gap: 56px; } }
        .tally-fact { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
        .tally-fact:first-child { border-top: 1px solid var(--line); }
        @media (max-width: 560px) { .tally-fact { grid-template-columns: minmax(0, 1fr); gap: 2px; } }
      `}</style>
      <div className="page-stack" style={{ maxWidth: 1180 }}>
        <PageHeader
          title="TallyPrime"
          subtitle={
            <span className="inline-flex items-center flex-wrap" style={{ gap: 8 }}>
              Accounting <Sep /> {loading ? <span className="skeleton" style={{ width: 70, height: 12, display: "inline-block" }} /> : <StatusChip tone={status.tone}>{status.label}</StatusChip>}
            </span>
          }
          right={<Link href="/sources/connect" className={`ui-btn ${tally ? "ui-btn-secondary" : "ui-btn-primary"}`}>{tally ? "Pair another computer" : "Connect Tally"}</Link>}
        />

        {loadFailed ? (
          <QuietError message={`Couldn't load Tally's status. ${OFFLINE}`} onRetry={load} />
        ) : (
          <div className="tally-grid fade-once">
            <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
              <Section title="Overview">
                {loading ? <SkeletonRows rows={3} height={44} /> : !tally ? (
                  <Quiet>Tally is not connected yet. Connect it to see its sync history and what Starlane reads from it.</Quiet>
                ) : (
                  <dl style={{ margin: 0 }}>
                    <Fact label="Last successful sync">
                      {lastOk ? <span>{formatRelative(lastOk)} <span style={{ color: "var(--ink-3)" }}>· {formatDateTime(lastOk)}</span></span> : <span style={{ color: "var(--ink-3)" }}>Never</span>}
                    </Fact>
                    <Fact label="Connected since">{formatDateTime(tally.connected_at)}</Fact>
                    {devices.length > 0 && (
                      <Fact label={devices.length === 1 ? "Paired computer" : "Paired computers"}>
                        {devices.map((d) => `${d.name}${d.lastSeenAt ? `, seen ${formatRelative(d.lastSeenAt)}` : ""}`).join(" · ")}
                      </Fact>
                    )}
                    {lastErr && <Fact label="Last sync error" tone="critical">{lastErr}</Fact>}
                  </dl>
                )}
              </Section>
              <Section title="What Starlane understands from Tally">
                <Quiet>
                  Coverage per area (customers, receivables, sales, suppliers, purchases, stock) is not computed yet, so no coverage status is shown here.
                  What Starlane read from your data is on <Link href="/sources?tab=quality" className="underline" style={{ color: "var(--ink)" }}>Sources, under Data quality</Link>.
                </Quiet>
              </Section>
            </div>
            <aside style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
              <Section title="Access">
                <Quiet>Read only. The bridge never creates, edits or deletes anything in Tally, and its device credential can be revoked from Sources at any time.</Quiet>
              </Section>
              <Section title="Reconciliation">
                <Quiet>Not running yet. Once enabled, Starlane compares receivables, payables and sales totals against Tally and flags any difference before those numbers are used.</Quiet>
              </Section>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

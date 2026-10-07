"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector, type ConnectorHealth } from "@/lib/api";
import { FiUploadCloud } from "react-icons/fi";
import { PageHeader, Subnav, StatusDot, Chevron, EmptyLine, ErrorBanner, SkeletonRows } from "@/components/v32/ui";
import { IconSources } from "@/components/v32/icons";
import { BridgeHealthPanel } from "@/components/os/BridgePanels";

// Sources — every system Starlane can connect to, and its live state.
//
// Driven entirely by GET /api/connectors (backend lib/connectors): the
// manifest says what a connector is and what access Starlane receives; the
// state is derived only from rows a real sync or import wrote. Connectors
// that are not built say so and offer no connect action.
//
// Tabs: Connected / Available are real. Sync Activity is the last real sync
// per source (no fabricated feed). Data Quality shows what Starlane understood
// from the connections; Reconciliation has no computation behind it yet and
// says exactly that.

type TabKey = "connected" | "available" | "sync" | "quality" | "reconciliation";
const TABS: { key: TabKey; label: string }[] = [
  { key: "connected", label: "Connected" },
  { key: "available", label: "Available" },
  { key: "sync", label: "Sync Activity" },
  { key: "quality", label: "Data Quality" },
  { key: "reconciliation", label: "Reconciliation" },
];

const INK = "var(--ink)", SOFT = "var(--ink-2)", FAINT = "var(--ink-3)", LINE = "var(--line)", WARN = "var(--critical)";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// V32 status_dot per connector health.
const STATUS: Record<ConnectorHealth, { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "var(--positive)" },
  syncing: { label: "Syncing", color: "var(--positive)" },
  connected: { label: "Paired, not synced yet", color: "var(--warning)" },
  delayed: { label: "Sync delayed", color: "var(--warning)" },
  stale: { label: "Sync overdue", color: "var(--warning)" },
  error: { label: "Needs attention", color: "var(--critical)" },
  disconnected: { label: "Disconnected", color: "rgb(var(--tk-ink) / 0.25)" },
  pairing: { label: "Waiting for pairing", color: "rgb(var(--tk-ink) / 0.25)" },
  revoked: { label: "Device revoked", color: "rgb(var(--tk-ink) / 0.25)" },
  not_connected: { label: "Not connected", color: "rgb(var(--tk-ink) / 0.25)" },
  unavailable: { label: "Not available yet", color: "rgb(var(--tk-ink) / 0.25)" },
};

function noteFor(c: Connector): string {
  if (c.state.health === "error" && c.state.lastError) return c.state.lastError;
  if (c.state.health === "stale" && !c.state.lastSyncAt) return "Paired, but nothing has synced yet";
  if (c.authType === "file_import" && c.state.lastImport?.filename) return `Last import · ${c.state.lastImport.filename}`;
  const active = c.state.devices.filter((x) => x.status === "ACTIVE");
  if (active.length) return active.map((x) => `${x.name}${x.lastSeenAt ? `, seen ${timeAgo(x.lastSeenAt)}` : ""}`).join(" · ");
  if (c.availability !== "available") return c.unavailableReason || c.summary;
  return c.summary;
}

// What the connection lets Starlane do, from the backend's capability label.
const CAPABILITY_TEXT: Record<string, string> = {
  READ_ONLY: "Read only: Starlane reads from it and never writes back",
  WRITE_CAPABLE: "Starlane can write to it",
  EXECUTION_REQUIRES_APPROVAL: "Starlane can act through it, only after you approve each action",
};

const isConnected = (c: Connector) => ["healthy", "syncing", "connected", "delayed", "stale", "error"].includes(c.state.health);

const COLS = "grid-cols-[16px_1fr_auto] md:grid-cols-[16px_160px_130px_110px_1fr_auto]";

function TableHeader() {
  return (
    <div className={`hidden md:grid ${COLS} items-center`} style={{ gap: 14, padding: "8px 12px", fontSize: 11, letterSpacing: 0, color: FAINT }}>
      <span /><span>Source</span><span>Status</span><span>Last sync</span><span>Note</span><span />
    </div>
  );
}

function Row({ c, action }: { c: Connector; action?: React.ReactNode }) {
  const st = STATUS[c.state.health] || { label: c.state.health.replace(/_/g, " "), color: "rgb(var(--tk-ink) / 0.25)" };
  const href = c.authType === "local_bridge" ? "/sources/tally" : undefined;
  const cap = isConnected(c) && c.state.capabilityLabel ? CAPABILITY_TEXT[c.state.capabilityLabel] : undefined;
  const body = (
    <>
      <span aria-hidden className="flex items-center justify-center" style={{ width: 16, height: 16, color: SOFT }}>
        {c.authType === "file_import" ? <FiUploadCloud size={14} /> : <IconSources size={15} />}
      </span>
      <div className="min-w-0">
        <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{c.name}</div>
        <div style={{ fontSize: 12, color: FAINT }}>{c.category.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase())}</div>
        <div className="md:hidden" style={{ marginTop: 4 }}><StatusDot label={st.label} color={st.color} /></div>
      </div>
      <div className="hidden md:block"><StatusDot label={st.label} color={st.color} /></div>
      <div className="hidden md:block" style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--body)" }}>{timeAgo(c.state.lastSyncAt) || "—"}</div>
      <div className="hidden md:block min-w-0 truncate" style={{ fontSize: 12, color: SOFT }} title={cap ? `${noteFor(c)}. ${cap}` : noteFor(c)}>{noteFor(c)}</div>
      <div className="flex items-center justify-end" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
        {action}
        {href && <Chevron />}
      </div>
    </>
  );
  const cls = `row-hover grid ${COLS} items-center`;
  const style: React.CSSProperties = { gap: 14, padding: "14px 12px", minHeight: 58, boxSizing: "border-box", borderBottom: `1px solid ${LINE}`, opacity: c.availability === "available" ? 1 : 0.6 };
  if (href) return <Link href={href} className={cls} style={style}>{body}</Link>;
  return <div className={cls} style={style}>{body}</div>;
}

function Quiet({ children, onClick, href, disabled }: { children: React.ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
  const style = { color: "var(--body)", fontSize: 12.5, background: "none", border: "none", cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap" } as const;
  if (href) return <Link href={href} className="hover-dim" style={{ ...style, textDecoration: "none" }}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} className="hover-dim" style={style}>{children}</button>;
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <EmptyLine title={title} body={body} action={children} />;
}

export default function SourcesPage() {
  const [tab, setTab] = useState<TabKey>("connected");
  const [connectors, setConnectors] = useState<Connector[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try { setConnectors((await api.connectors.list()).connectors); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "Could not load sources."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = async (deviceId: string, name: string) => {
    if (!window.confirm(`Revoke "${name}"? That computer will stop syncing until it is paired again.`)) return;
    setRevoking(deviceId);
    try { await api.connectors.revokeTallyDevice(deviceId); await load(); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "Could not revoke the device."); }
    finally { setRevoking(null); }
  };

  const company = (connectors || []).filter((c) => c.authType !== "public_feed");
  const world = (connectors || []).filter((c) => c.authType === "public_feed");
  const connected = company.filter(isConnected);
  const available = company.filter((c) => !isConnected(c));

  const actionFor = (c: Connector) => {
    if (c.availability !== "available") return null;
    if (c.authType === "local_bridge") {
      const active = c.state.devices.filter((d) => d.status === "ACTIVE");
      return (
        <div style={{ display: "flex", gap: 14 }}>
          {active.map((d) => (
            <Quiet key={d.id} onClick={() => revoke(d.id, d.name)} disabled={revoking === d.id}>{revoking === d.id ? "Revoking…" : active.length > 1 ? `Revoke ${d.name}` : "Revoke device"}</Quiet>
          ))}
          <Quiet href="/sources/connect">{active.length ? "Pair another computer" : "Connect"}</Quiet>
        </div>
      );
    }
    if (c.authType === "file_import") return <Quiet href="/collections?import=1"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiUploadCloud size={13} /> Upload</span></Quiet>;
    return null;
  };

  const syncEntries = [...connected, ...world].filter((c) => c.state.lastSyncAt || c.state.health !== "not_connected");

  const lastSync = [...connected, ...world].map((c) => c.state.lastSyncAt).filter(Boolean).sort().pop() || null;
  const allHealthy = connected.length > 0 && connected.every((c) => c.state.health === "healthy");

  return (
    <DashboardLayout pageTitle="Sources">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <PageHeader
          title="Sources"
          subtitle="Where Starlane gets its data"
          right={connectors ? (
            <span style={{ fontSize: 12, color: connected.length && !allHealthy ? "var(--warning)" : FAINT }}>
              {!connected.length ? "Nothing connected yet" : `${allHealthy ? "All current" : "Needs a look"}${lastSync ? ` · Last sync ${timeAgo(lastSync)}` : ""}`}
            </span>
          ) : undefined}
        />

        {loadError && (
          <ErrorBanner>
            {loadError} <button type="button" onClick={load} className="hover-dim" style={{ background: "none", border: "none", color: INK, textDecoration: "underline", cursor: "pointer" }}>Retry</button>
          </ErrorBanner>
        )}

        <Subnav items={TABS} active={tab} onChange={(k) => setTab(k as TabKey)} />

        <div className="fade-once">
          {connectors === null && !loadError && (
            <div>
              <SkeletonRows rows={3} height={58} />
            </div>
          )}

          {connectors && tab === "connected" && (
            connected.length || world.length ? (
              <div>
                {connected.length > 0 && <TableHeader />}
                {connected.map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}
                {!connected.length && (
                  <Empty title="No company system is connected yet." body="Connect Tally or upload an export to give Starlane your real receivables, payables and stock.">
                    <div style={{ display: "flex", gap: 18 }}>
                      <Quiet href="/sources/connect">Connect Tally</Quiet><Quiet onClick={() => setTab("available")}>See all sources</Quiet>
                    </div>
                  </Empty>
                )}
                {world.length > 0 && (
                  <>
                    <p style={{ fontSize: 11, letterSpacing: 0, color: FAINT, margin: "24px 12px 4px" }}>External signals</p>
                    {world.map((c) => <Row key={c.id} c={c} />)}
                  </>
                )}
              </div>
            ) : <Empty title="Nothing connected yet" body="Connect a source to begin." />
          )}

          {connectors && tab === "available" && (
            <div>
              <TableHeader />
              {available.filter((c) => c.availability === "available").map((c) => (
                <div key={c.id}>
                  <Row c={c} action={actionFor(c)} />
                  {c.access.length > 0 && (
                    <ul style={{ margin: "8px 0 10px 42px", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                      {c.access.map((a) => <li key={a} style={{ fontSize: 12, color: SOFT }}>· {a}</li>)}
                    </ul>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 11, letterSpacing: 0, color: FAINT, margin: "24px 12px 4px" }}>Not built yet</p>
              {available.filter((c) => c.availability !== "available").map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}
            </div>
          )}

          {connectors && tab === "sync" && (
            syncEntries.length ? (
              <div><TableHeader />{syncEntries.map((c) => <Row key={c.id} c={c} />)}</div>
            ) : <Empty title="No sync activity yet" body="The last sync of each connected source appears here. Nothing has synced yet." />
          )}

          {/* What Starlane understood from each connection, likely duplicate
              customers and how it reads the data (GET /api/os/bridge). */}
          {tab === "quality" && <BridgeHealthPanel />}
          {tab === "reconciliation" && <Empty title="Reconciliation isn’t running yet." body="Planned: receivables, payables and sales totals compared against Tally before those numbers are used elsewhere. Nothing is compared today." />}
        </div>
      </div>
    </DashboardLayout>
  );
}

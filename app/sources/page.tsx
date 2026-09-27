"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector, type ConnectorHealth } from "@/lib/api";
import { FiUploadCloud } from "react-icons/fi";

// Sources — every system Starlane can connect to, and its live state.
//
// Driven entirely by GET /api/connectors (backend lib/connectors): the
// manifest says what a connector is and what access Starlane receives; the
// state is derived only from rows a real sync or import wrote. Connectors
// that are not built say so and offer no connect action.
//
// Tabs: Connected / Available are real. Sync Activity is the last real sync
// per source (no fabricated feed). Data Quality and Reconciliation have no
// computation behind them yet and say exactly that.

type TabKey = "connected" | "available" | "sync" | "quality" | "reconciliation";
const TABS: { key: TabKey; label: string }[] = [
  { key: "connected", label: "Connected" },
  { key: "available", label: "Available" },
  { key: "sync", label: "Sync Activity" },
  { key: "quality", label: "Data Quality" },
  { key: "reconciliation", label: "Reconciliation" },
];

const INK = "#191917", SOFT = "#63635F", FAINT = "#9A9A94", LINE = "#EBEAE6", WARN = "#C13B3B", OK = "#2F6B4F";

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

function describe(c: Connector): { text: string; color: string } {
  const ago = timeAgo(c.state.lastSyncAt);
  const map: Record<ConnectorHealth, { text: string; color: string }> = {
    healthy: { text: c.authType === "file_import" ? `Last import ${ago}${c.state.lastImport?.filename ? ` · ${c.state.lastImport.filename}` : ""}` : `Connected · last synced ${ago}`, color: OK },
    stale: { text: c.state.lastSyncAt ? `Last synced ${ago} — sync is overdue` : "Paired, but nothing has synced yet", color: WARN },
    error: { text: `Needs attention${c.state.lastError ? ` — ${c.state.lastError}` : ""}`, color: WARN },
    disconnected: { text: "Disconnected", color: FAINT },
    not_connected: { text: c.authType === "public_feed" ? "No data received yet" : "Not connected", color: FAINT },
    unavailable: { text: c.unavailableReason || "Not available yet", color: FAINT },
  };
  return map[c.state.health];
}

const isConnected = (c: Connector) => ["healthy", "stale", "error"].includes(c.state.health);

function Row({ c, action }: { c: Connector; action?: React.ReactNode }) {
  const d = describe(c);
  return (
    <div className="row-hover" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 4px", borderBottom: `1px solid ${LINE}`, borderRadius: 6, opacity: c.availability === "available" ? 1 : 0.6 }}>
      <div aria-hidden style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 500, background: "#F3F2EE", border: `1px solid ${LINE}`, color: SOFT }}>
        {c.authType === "file_import" ? <FiUploadCloud size={14} /> : c.name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: INK, margin: 0 }}>{c.name}</p>
        <p style={{ fontSize: 12, marginTop: 2, color: d.color }}>{d.text}</p>
        {c.state.devices.filter((x) => x.status === "ACTIVE").length > 0 && (
          <p style={{ fontSize: 11.5, marginTop: 2, color: FAINT }}>
            {c.state.devices.filter((x) => x.status === "ACTIVE").map((x) => `${x.name}${x.lastSeenAt ? ` · seen ${timeAgo(x.lastSeenAt)}` : ""}`).join(" · ")}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function Quiet({ children, onClick, href, disabled }: { children: React.ReactNode; onClick?: () => void; href?: string; disabled?: boolean }) {
  const style = { color: INK, fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap" } as const;
  if (href) return <Link href={href} className="hover-dim" style={{ ...style, textDecoration: "none" }}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} className="hover-dim" style={style}>{children}</button>;
}

function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }} className="fade-once">
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: INK, marginBottom: 6 }}>{title}</p>
      <p className="v32-body max-w-md mx-auto" style={{ color: SOFT }}>{body}</p>
      {children}
    </div>
  );
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
    if (c.availability !== "available") return <span style={{ fontSize: 12, color: "#B5B5B0" }}>Not available yet</span>;
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

  return (
    <DashboardLayout pageTitle="Sources">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: INK }}>Sources</h1>
        <p style={{ fontSize: 13.5, color: SOFT, maxWidth: 640, margin: 0 }}>
          The systems and external signals Starlane uses to understand your company. Each connection states what Starlane receives;
          everything Starlane shows can be traced back to one of these.
        </p>

        {loadError && (
          <p role="alert" style={{ fontSize: 13, color: WARN }}>
            {loadError} <button type="button" onClick={load} className="hover-dim" style={{ background: "none", border: "none", color: INK, textDecoration: "underline", cursor: "pointer" }}>Retry</button>
          </p>
        )}

        <nav aria-label="Secondary" style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: `1px solid ${LINE}`, marginBottom: 4, overflowX: "auto" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className="hover-dim" aria-current={t.key === tab ? "page" : undefined}
              style={{ padding: "8px 2px", fontSize: 13, fontWeight: t.key === tab ? 500 : 400, color: t.key === tab ? INK : SOFT, background: "none", border: "none",
                borderBottomColor: t.key === tab ? "#696D86" : "transparent", borderBottomWidth: 2, borderBottomStyle: "solid", cursor: "pointer", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 0, background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {connectors === null && !loadError && (
            <div style={{ padding: "12px 20px" }} aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 52, margin: "10px 0", borderRadius: 6, background: "#F3F2EE" }} />)}
            </div>
          )}

          {connectors && tab === "connected" && (
            connected.length || world.length ? (
              <div style={{ padding: "8px 20px 20px" }}>
                {connected.map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}
                {!connected.length && (
                  <Empty title="No company system is connected yet." body="Connect Tally or upload an export to give Starlane your real receivables, payables and stock.">
                    <div style={{ marginTop: 14, display: "flex", gap: 18, justifyContent: "center" }}>
                      <Quiet href="/sources/connect">Connect Tally</Quiet><Quiet onClick={() => setTab("available")}>See all sources</Quiet>
                    </div>
                  </Empty>
                )}
                {world.length > 0 && (
                  <>
                    <p className="v32-section-label" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: FAINT, margin: "22px 4px 4px" }}>External signals</p>
                    {world.map((c) => <Row key={c.id} c={c} />)}
                  </>
                )}
              </div>
            ) : <Empty title="Nothing connected yet" body="Connect a source to begin." />
          )}

          {connectors && tab === "available" && (
            <div style={{ padding: "8px 20px 20px" }}>
              {available.filter((c) => c.availability === "available").map((c) => (
                <div key={c.id}>
                  <Row c={c} action={actionFor(c)} />
                  {c.access.length > 0 && (
                    <ul style={{ margin: "8px 0 10px 54px", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                      {c.access.map((a) => <li key={a} style={{ fontSize: 12, color: SOFT }}>· {a}</li>)}
                    </ul>
                  )}
                </div>
              ))}
              <p style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: FAINT, margin: "22px 4px 4px" }}>Not built yet</p>
              {available.filter((c) => c.availability !== "available").map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}
            </div>
          )}

          {connectors && tab === "sync" && (
            syncEntries.length ? (
              <div style={{ padding: "8px 20px 20px" }}>{syncEntries.map((c) => <Row key={c.id} c={c} />)}</div>
            ) : <Empty title="No sync activity yet" body="The last sync of each connected source appears here. Nothing has synced yet." />
          )}

          {tab === "quality" && <Empty title="Data-quality checks aren’t running yet." body="Planned: duplicate customers and suppliers, unmapped ledgers, and missing relationships found as history syncs. Nothing is checked today, so nothing is reported." />}
          {tab === "reconciliation" && <Empty title="Reconciliation isn’t running yet." body="Planned: receivables, payables and sales totals compared against Tally before those numbers are used elsewhere. Nothing is compared today." />}
        </div>
      </div>
    </DashboardLayout>
  );
}

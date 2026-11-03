"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector, type ConnectorHealth } from "@/lib/api";
import { FiUploadCloud } from "react-icons/fi";
import { PageHeader, Subnav, StatusDot, Chevron, EmptyLine, ErrorBanner, SkeletonRows, SearchField } from "@/components/v32/ui";
import { IconSources } from "@/components/v32/icons";
import { BridgeHealthPanel } from "@/components/os/BridgePanels";

// Sources — every system a business runs on that Starlane can connect to,
// and its live state. Accounting, ERP, banks, payments, CRM, e-commerce,
// spreadsheets, email and messaging; Tally is one of many.
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
  { key: "available", label: "Catalog" },
  { key: "sync", label: "Sync Activity" },
  { key: "quality", label: "Data Quality" },
  { key: "reconciliation", label: "Reconciliation" },
];

const INK = "#191917", SOFT = "#63635F", FAINT = "#6E6E69", LINE = "#EBEAE6", WARN = "#A64F4B";

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
  healthy: { label: "Healthy", color: "#477054" },
  syncing: { label: "Syncing", color: "#477054" },
  connected: { label: "Paired, not synced yet", color: "#8C6826" },
  delayed: { label: "Sync delayed", color: "#8C6826" },
  stale: { label: "Sync overdue", color: "#8C6826" },
  error: { label: "Needs attention", color: "#A64F4B" },
  disconnected: { label: "Disconnected", color: "rgba(25,25,23,0.25)" },
  pairing: { label: "Waiting for pairing", color: "rgba(25,25,23,0.25)" },
  revoked: { label: "Device revoked", color: "rgba(25,25,23,0.25)" },
  not_connected: { label: "Not connected", color: "rgba(25,25,23,0.25)" },
  unavailable: { label: "Coming soon", color: "rgba(25,25,23,0.25)" },
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

// Catalog groups, in the order a business owner thinks about their systems.
const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: "accounting", label: "Accounting" },
  { key: "erp", label: "ERP" },
  { key: "banking", label: "Banks" },
  { key: "payments", label: "Payments" },
  { key: "crm", label: "CRM" },
  { key: "ecommerce", label: "E-commerce" },
  { key: "spreadsheets", label: "Spreadsheets and files" },
  { key: "email", label: "Email" },
  { key: "messaging", label: "Messaging" },
  { key: "productivity", label: "Docs and storage" },
  { key: "hr_payroll", label: "Payroll" },
  { key: "support", label: "Support" },
  { key: "logistics", label: "Logistics" },
  { key: "inventory", label: "Inventory" },
  { key: "communication", label: "Communication" },
];

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
  const st = STATUS[c.state.health] || { label: c.state.health.replace(/_/g, " "), color: "rgba(25,25,23,0.25)" };
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
      <div className="hidden md:block" style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12, color: "#43433F" }}>{timeAgo(c.state.lastSyncAt) || "—"}</div>
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
  const style = { color: "#43433F", fontSize: 12.5, background: "none", border: "none", cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap" } as const;
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

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
    if (c.authType === "file_import") return <Quiet href="/decisions/import"><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><FiUploadCloud size={13} /> Upload</span></Quiet>;
    return null;
  };

  const syncEntries = [...connected, ...world].filter((c) => c.state.lastSyncAt || c.state.health !== "not_connected");

  const lastSync = [...connected, ...world].map((c) => c.state.lastSyncAt).filter(Boolean).sort().pop() || null;
  const allHealthy = connected.length > 0 && connected.every((c) => c.state.health === "healthy");

  return (
    <DashboardLayout pageTitle="Data sources">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <PageHeader
          title="Data sources"
          subtitle="Everything your business runs on, connected in one place"
          right={connectors ? (
            <span style={{ fontSize: 12, color: connected.length && !allHealthy ? "#8C6826" : FAINT }}>
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
                  <Empty title="No company system is connected yet." body="Upload an export from your accounting system, ERP or a spreadsheet, or connect TallyPrime, to give Starlane your real receivables, payables and stock.">
                    <div style={{ display: "flex", gap: 18 }}>
                      <Quiet href="/decisions/import">Upload an export</Quiet><Quiet onClick={() => setTab("available")}>Browse the catalog</Quiet>
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

          {connectors && tab === "available" && (() => {
            const q = query.trim().toLowerCase();
            const match = (c: Connector) => (category === "all" || c.category === category)
              && (!q || `${c.name} ${c.provider || ""} ${c.category} ${c.summary}`.toLowerCase().includes(q));
            const ready = available.filter((c) => c.availability === "available" && match(c));
            const soon = available.filter((c) => c.availability !== "available" && match(c));
            const cats = CATEGORY_ORDER.filter((g) => company.some((c) => c.category === g.key));
            const groups = cats.map((g) => ({ ...g, items: soon.filter((c) => c.category === g.key) })).filter((g) => g.items.length);
            return (
              <div>
                <div className="flex flex-wrap items-center" style={{ gap: 10, margin: "0 0 14px" }}>
                  <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
                    <SearchField id="connector-search" value={query} onChange={setQuery} placeholder={`Search ${company.length} systems`} />
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {[{ key: "all", label: "All" }, ...cats].map((g) => (
                      <button key={g.key} type="button" onClick={() => setCategory(g.key)} className="hover-dim"
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${LINE}`, background: category === g.key ? INK : "transparent", color: category === g.key ? "#fff" : SOFT, cursor: "pointer" }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: 11, letterSpacing: 0, color: FAINT, margin: "8px 12px 4px" }}>Works today</p>
                {ready.length ? (
                  <>
                    <TableHeader />
                    {ready.map((c) => (
                      <div key={c.id}>
                        <Row c={c} action={actionFor(c)} />
                        {c.access.length > 0 && (
                          <ul style={{ margin: "8px 0 10px 42px", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                            {c.access.map((a) => <li key={a} style={{ fontSize: 12, color: SOFT }}>· {a}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </>
                ) : <p style={{ fontSize: 12.5, color: SOFT, margin: "4px 12px 12px" }}>Nothing that works today matches. A CSV or Excel export from any system can always be uploaded.</p>}

                <p style={{ fontSize: 11, letterSpacing: 0, color: FAINT, margin: "28px 12px 4px" }}>Coming soon · until then, an export from any of these works through Upload</p>
                {groups.map((g) => (
                  <div key={g.key} style={{ marginTop: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: INK, margin: "0 12px 6px" }}>{g.label}</p>
                    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, padding: "0 12px" }}>
                      {g.items.map((c) => (
                        <div key={c.id} title={c.unavailableReason || c.summary} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 12px 10px", minWidth: 0 }}>
                          <div className="flex items-center justify-between" style={{ gap: 8 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: INK, minWidth: 0 }} className="truncate">{c.name}</span>
                            <span style={{ fontSize: 10.5, color: FAINT, border: `1px solid ${LINE}`, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>Coming soon</span>
                          </div>
                          <p style={{ fontSize: 12, color: SOFT, margin: "6px 0 0", lineHeight: 1.45 }}>{c.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!groups.length && <p style={{ fontSize: 12.5, color: SOFT, margin: "4px 12px" }}>Nothing coming soon matches your search.</p>}
                <p style={{ fontSize: 12, color: FAINT, margin: "24px 12px 0" }}>
                  Use something that is not listed? Starlane connectors share one interface (read, search, subscribe, write and approved actions), so new systems are added without changing the rest of the product.
                </p>
              </div>
            );
          })()}

          {connectors && tab === "sync" && (
            syncEntries.length ? (
              <div><TableHeader />{syncEntries.map((c) => <Row key={c.id} c={c} />)}</div>
            ) : <Empty title="No sync activity yet" body="The last sync of each connected source appears here. Nothing has synced yet." />
          )}

          {/* What Starlane understood from each connection, likely duplicate
              customers and how it reads the data (GET /api/os/bridge). */}
          {tab === "quality" && <BridgeHealthPanel />}
          {tab === "reconciliation" && <Empty title="Reconciliation isn’t running yet." body="Planned: receivables, payables and sales totals compared against your books of record before those numbers are used elsewhere. Nothing is compared today." />}
        </div>
      </div>
    </DashboardLayout>
  );
}

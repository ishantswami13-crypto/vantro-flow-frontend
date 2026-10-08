"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector } from "@/lib/api";
import { PageHeader, Subnav, Chevron, EmptyLine, SkeletonRows, IconTile, Sep } from "@/components/v32/ui";
import { IconSources, IconUpload, IconWatch, IconLink, IconPlus, IconSync } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { DataQuality } from "@/components/connectors/DataQuality";
import { healthOf, isConnected, categoryLabel, CAPABILITY_TEXT, OFFLINE } from "@/components/connectors/health";
import { formatDateTime, formatRelative, formatCount } from "@/lib/format";

// Sources: every system Starlane can connect to, and its live state.
//
// Driven entirely by GET /api/connectors (backend lib/connectors): the
// manifest says what a connector is and what access Starlane receives; the
// state is derived only from rows a real sync or import wrote. Connectors
// that are not built say so and offer no connect action.
//
// Tabs: Connected and Available are real. Sync activity is the latest real
// sync attempt per source (no fabricated feed). Data quality shows what
// Starlane understood from the connections; Reconciliation has no
// computation behind it yet and says exactly that.

type TabKey = "connected" | "available" | "sync" | "quality" | "reconciliation";

function SourceIcon({ c, tone }: { c: Connector; tone?: "critical" | "warning" }) {
  const icon = c.authType === "file_import" ? <IconUpload size={15} />
    : c.authType === "public_feed" ? <IconWatch size={15} />
    : c.authType === "oauth" ? <IconLink size={15} />
    : <IconSources size={15} />;
  return <IconTile size={32} tone={tone}>{icon}</IconTile>;
}

function noteFor(c: Connector): string {
  if (c.state.health === "error" && c.state.lastError) return c.state.lastError;
  if (c.state.health === "stale" && !c.state.lastSyncAt) return "Paired, but nothing has synced yet";
  if (c.authType === "file_import" && c.state.lastImport?.filename) return `Last import: ${c.state.lastImport.filename}`;
  const active = c.state.devices.filter((x) => x.status === "ACTIVE");
  if (active.length) return active.map((x) => `${x.name}${x.lastSeenAt ? `, seen ${formatRelative(x.lastSeenAt)}` : ""}`).join(" · ");
  if (c.availability !== "available") return c.unavailableReason || c.summary;
  return c.summary;
}

const GRID = "src-grid";

function TableHeader({ last = "" }: { last?: string }) {
  return (
    <div className={`${GRID} src-head`} aria-hidden="true">
      <span /><span>Source</span><span>Health</span><span>Last sync</span><span>Note</span><span style={{ textAlign: "right" }}>{last}</span>
    </div>
  );
}

function Row({ c, action }: { c: Connector; action?: React.ReactNode }) {
  const st = healthOf(c);
  const href = c.authType === "local_bridge" ? "/sources/tally" : undefined;
  const cap = isConnected(c) && c.state.capabilityLabel ? CAPABILITY_TEXT[c.state.capabilityLabel] : undefined;
  const note = noteFor(c);
  const errorTone = c.state.health === "error";
  const name = href ? (
    <Link href={href} className="src-name hover-dim">{c.name}</Link>
  ) : <span className="src-name">{c.name}</span>;
  return (
    <div className={`${GRID} src-row row-hover`} style={{ opacity: c.availability === "available" ? 1 : 0.72 }}>
      <SourceIcon c={c} tone={errorTone ? "critical" : undefined} />
      <div className="min-w-0">
        {name}
        <div className="src-meta">
          {categoryLabel(c)}
          {cap && <><Sep /> {cap}</>}
        </div>
        <div className="src-mobile">
          <StatusChip tone={st.tone}>{st.label}</StatusChip>
          {c.state.lastSyncAt && <span title={formatDateTime(c.state.lastSyncAt)}>{formatRelative(c.state.lastSyncAt)}</span>}
        </div>
      </div>
      <div className="src-desk"><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
      <div className="src-desk tabular-nums" style={{ fontSize: 13, color: "var(--body)" }} title={c.state.lastSyncAt ? formatDateTime(c.state.lastSyncAt) : undefined}>
        {c.state.lastSyncAt ? formatRelative(c.state.lastSyncAt) : <span style={{ color: "var(--ink-3)" }}>Never</span>}
      </div>
      <div className="src-desk min-w-0 truncate" style={{ fontSize: 12.5, color: errorTone ? "var(--critical)" : "var(--ink-2)" }} title={note}>{note}</div>
      <div className="src-actions">
        {action}
        {href && <Chevron />}
      </div>
    </div>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <div className="flex items-baseline flex-wrap" style={{ gap: 8, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{title}</h2>
        {hint && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{hint}</span>}
      </div>
      {children}
    </section>
  );
}

// Sync activity: the latest real attempt per source, newest first.
type SyncEntry = { c: Connector; at: string | null; label: string; tone: StatusTone; detail: string };
function syncEntryFor(c: Connector): SyncEntry | null {
  const a = c.state.lastAttempt;
  if (a) {
    const tone: StatusTone = a.status === "succeeded" ? "positive" : a.status === "failed" ? "critical" : "info";
    const label = a.status === "succeeded" ? "Succeeded" : a.status === "failed" ? "Failed" : "Running";
    return { c, at: a.finishedAt || a.startedAt, label, tone, detail: a.error || (a.status === "running" ? "In progress" : "Vouchers received") };
  }
  const imp = c.state.lastImport;
  if (imp) {
    const ok = /complete|success|done/i.test(imp.status);
    const failed = /fail|error/i.test(imp.status);
    return {
      c, at: imp.completedAt, label: ok ? "Imported" : failed ? "Failed" : "In progress", tone: ok ? "positive" : failed ? "critical" : "info",
      detail: `${imp.filename || "File"}: ${formatCount(imp.rowsAccepted)} rows accepted${imp.rowsRejected ? `, ${formatCount(imp.rowsRejected)} rejected` : ""}`,
    };
  }
  if (c.state.lastSyncAt || c.state.lastError) {
    const st = healthOf(c);
    return { c, at: c.state.lastSyncAt, label: c.state.lastError ? "Failed" : "Synced", tone: c.state.lastError ? "critical" : st.tone === "positive" ? "positive" : st.tone, detail: c.state.lastError || c.summary };
  }
  return null;
}

export default function SourcesPage() {
  const [tab, setTab] = useState<TabKey>("connected");
  const [connectors, setConnectors] = useState<Connector[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeFailed, setRevokeFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try { setConnectors((await api.connectors.list()).connectors); }
    catch { setLoadFailed(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = async () => {
    if (!confirmRevoke) return;
    const { id } = confirmRevoke;
    setRevoking(id); setRevokeFailed(false);
    try { await api.connectors.revokeTallyDevice(id); setConfirmRevoke(null); await load(); }
    catch { setRevokeFailed(true); }
    finally { setRevoking(null); }
  };

  const company = (connectors || []).filter((c) => c.authType !== "public_feed");
  const world = (connectors || []).filter((c) => c.authType === "public_feed");
  const connected = company.filter(isConnected);
  const available = company.filter((c) => !isConnected(c));
  const buildable = available.filter((c) => c.availability === "available");
  const notBuilt = available.filter((c) => c.availability !== "available");

  const actionFor = (c: Connector) => {
    if (c.availability !== "available") return null;
    if (c.authType === "local_bridge") {
      const active = c.state.devices.filter((d) => d.status === "ACTIVE");
      return (
        <>
          {active.map((d) => (
            <Button key={d.id} variant="ghost" size="sm" onClick={() => { setRevokeFailed(false); setConfirmRevoke({ id: d.id, name: d.name }); }}>
              {active.length > 1 ? `Revoke ${d.name}` : "Revoke device"}
            </Button>
          ))}
          {!active.length && <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect</Link>}
        </>
      );
    }
    if (c.authType === "file_import") {
      return <Link href="/collections?import=1" className="ui-btn ui-btn-ghost ui-btn-sm"><IconUpload size={13} /> Upload</Link>;
    }
    return null;
  };

  const syncEntries = [...connected, ...world].map(syncEntryFor).filter((x): x is SyncEntry => !!x)
    .sort((a, b) => (b.at ? new Date(b.at).getTime() : 0) - (a.at ? new Date(a.at).getTime() : 0));

  const lastSync = [...connected, ...world].map((c) => c.state.lastSyncAt).filter(Boolean).sort().pop() || null;
  const needsLook = connected.filter((c) => healthOf(c).tone !== "positive" && healthOf(c).tone !== "info").length
    + world.filter((c) => c.state.health === "error").length;

  const tabs = [
    { key: "connected", label: "Connected", count: connectors ? connected.length + world.length : null },
    { key: "available", label: "Available", count: connectors ? buildable.length : null },
    { key: "sync", label: "Sync activity" },
    { key: "quality", label: "Data quality" },
    { key: "reconciliation", label: "Reconciliation" },
  ];

  return (
    <DashboardLayout pageTitle="Sources">
      <style>{`
        .src-wrap { max-width: 1180px; display: flex; flex-direction: column; gap: 20px; }
        .src-grid { display: grid; align-items: center; column-gap: 16px; grid-template-columns: 32px minmax(0, 1fr) auto; }
        .src-head { display: none; }
        .src-row { padding: 12px 10px; min-height: 60px; border-bottom: 1px solid var(--line); border-radius: 0; }
        .src-name { font-size: 13.5px; font-weight: 500; color: var(--ink); }
        .src-meta { font-size: 12px; color: var(--ink-3); margin-top: 2px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .src-desk { display: none; }
        .src-mobile { display: flex; gap: 10px; align-items: center; margin-top: 8px; font-size: 12px; color: var(--ink-3); }
        .src-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        @media (min-width: 900px) {
          .src-grid { grid-template-columns: 32px minmax(170px, 1fr) 150px 110px minmax(0, 1.5fr) 190px; }
          .src-head { display: grid; padding: 0 10px 8px; font-size: 12px; color: var(--ink-3); border-bottom: 1px solid var(--line); }
          .src-desk { display: block; }
          .src-mobile { display: none; }
        }
        .sync-grid { display: grid; column-gap: 16px; align-items: center; grid-template-columns: minmax(0, 1fr) auto; }
        .sync-head { display: none; }
        .sync-row { padding: 12px 10px; border-bottom: 1px solid var(--line); min-height: 52px; }
        .sync-desk { display: none; }
        @media (min-width: 900px) {
          .sync-grid { grid-template-columns: minmax(160px, 1fr) 120px 150px minmax(0, 2fr); }
          .sync-head { display: grid; padding: 0 10px 8px; font-size: 12px; color: var(--ink-3); border-bottom: 1px solid var(--line); }
          .sync-desk { display: block; }
          .sync-mobile { display: none; }
        }
        .avail-grid { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 760px) { .avail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>
      <div className="src-wrap">
        <PageHeader
          title="Sources"
          subtitle={
            connectors && connected.length ? (
              <span className="inline-flex items-center flex-wrap" style={{ gap: 6 }}>
                {connected.length} connected
                {lastSync && <><Sep /> last sync {formatRelative(lastSync)}</>}
                {needsLook > 0 && <><Sep /> <span style={{ color: "var(--warning)" }}>{needsLook} need{needsLook === 1 ? "s" : ""} a look</span></>}
              </span>
            ) : "Where Starlane gets its data. Every connection is read only and can be revoked."
          }
          right={<Link href="/sources/connect" className="ui-btn ui-btn-primary"><IconPlus size={14} /> Connect a source</Link>}
        />

        <Subnav items={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} label="Sources" />

        <div className="fade-once" role="tabpanel">
          {loadFailed && tab !== "quality" && tab !== "reconciliation" && (
            <ErrorState title="Couldn't load your sources" message={OFFLINE} onRetry={load} />
          )}

          {connectors === null && !loadFailed && tab !== "quality" && tab !== "reconciliation" && <SkeletonRows rows={4} height={60} />}

          {connectors && tab === "connected" && (
            <>
              {connected.length > 0 ? (
                <div>
                  <TableHeader />
                  {connected.map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}
                </div>
              ) : (
                <EmptyLine
                  icon={<IconSources size={17} />}
                  title="No company system is connected yet"
                  body="Connect Tally or upload an export so Starlane works from your real receivables, payables and stock."
                  action={
                    <div className="flex flex-wrap" style={{ gap: 8 }}>
                      <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect Tally</Link>
                      <Button variant="ghost" size="sm" onClick={() => setTab("available")}>See all sources</Button>
                    </div>
                  }
                />
              )}
              {world.length > 0 && (
                <Group title="External signals" hint="Public feeds. Nothing about your company is sent to them.">
                  <div>{world.map((c) => <Row key={c.id} c={c} />)}</div>
                </Group>
              )}
            </>
          )}

          {connectors && tab === "available" && (
            <>
              {buildable.length > 0 ? (
                <div className="avail-grid">
                  {buildable.map((c) => (
                    <div key={c.id} className="ui-panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="flex items-start" style={{ gap: 12 }}>
                        <SourceIcon c={c} />
                        <div className="min-w-0 flex-1">
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{c.name}</div>
                          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>{c.summary}</div>
                        </div>
                      </div>
                      {c.access.length > 0 && (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                          {c.access.map((a) => (
                            <li key={a} className="flex" style={{ gap: 8, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 2, background: "var(--ink-3)", marginTop: 8, flexShrink: 0 }} />{a}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex" style={{ gap: 8, marginTop: "auto" }}>
                        {c.authType === "local_bridge"
                          ? <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect {c.name}</Link>
                          : c.authType === "file_import"
                            ? <Link href="/collections?import=1" className="ui-btn ui-btn-secondary ui-btn-sm"><IconUpload size={13} /> Upload a file</Link>
                            : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyLine title="Everything available is connected" body="New connectors appear here as they are built." />
              )}
              {notBuilt.length > 0 && (
                <Group title="Not built yet" hint="A CSV export from any of these works today.">
                  <div>
                    {notBuilt.map((c) => (
                      <div key={c.id} className="src-grid src-row" style={{ gridTemplateColumns: "32px minmax(0, 1fr) auto" }}>
                        <SourceIcon c={c} />
                        <div className="min-w-0">
                          <div className="src-name" style={{ color: "var(--ink-2)" }}>{c.name}</div>
                          <div className="src-meta">{c.unavailableReason || categoryLabel(c)}</div>
                        </div>
                        <StatusChip tone="unknown">Not available yet</StatusChip>
                      </div>
                    ))}
                  </div>
                </Group>
              )}
            </>
          )}

          {connectors && tab === "sync" && (
            syncEntries.length ? (
              <div>
                <div className="sync-grid sync-head" aria-hidden="true"><span>Source</span><span>Result</span><span>When</span><span>Detail</span></div>
                {syncEntries.map((e) => (
                  <div key={e.c.id} className="sync-grid sync-row row-hover">
                    <div className="min-w-0">
                      <div className="src-name">{e.c.name}</div>
                      <div className="sync-mobile" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                        {e.at ? formatDateTime(e.at) : "Time not recorded"} · {e.detail}
                      </div>
                    </div>
                    <div><StatusChip tone={e.tone}>{e.label}</StatusChip></div>
                    <div className="sync-desk tabular-nums" style={{ fontSize: 13, color: "var(--body)" }}>{e.at ? formatDateTime(e.at) : "—"}</div>
                    <div className="sync-desk truncate" style={{ fontSize: 12.5, color: e.tone === "critical" ? "var(--critical)" : "var(--ink-2)" }} title={e.detail}>{e.detail}</div>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "12px 10px 0" }}>The latest attempt for each source. Older runs are not kept here.</p>
              </div>
            ) : (
              <EmptyLine icon={<IconSync size={17} />} title="No sync activity yet" body="Once a source syncs, its latest attempt and result appear here." />
            )
          )}

          {tab === "quality" && <DataQuality />}

          {tab === "reconciliation" && (
            <EmptyLine
              title="Reconciliation isn't running yet"
              body="Planned: receivables, payables and sales totals compared against Tally before those numbers are used anywhere else. Nothing is compared today, so no match or mismatch is shown."
            />
          )}
        </div>
      </div>

      <Modal
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        title={`Revoke ${confirmRevoke?.name ?? "this device"}?`}
        description="That computer stops syncing straight away. You can pair it again at any time with a new code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
            <Button variant="danger" loading={!!revoking} onClick={revoke}>Revoke device</Button>
          </>
        }
      >
        {revokeFailed && <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--critical)" }}>The device was not revoked. {OFFLINE}</p>}
      </Modal>
    </DashboardLayout>
  );
}

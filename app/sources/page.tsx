"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type Connector } from "@/lib/api";
import { PageHeader, Subnav, Chevron, SkeletonRows, Sep } from "@/components/v32/ui";
import { IconUpload, IconPlus } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { QuietError, QuietLine, SectionHead } from "@/components/os/bridge/kit";
import Button from "@/components/ui/Button";
import { DataQuality } from "@/components/connectors/DataQuality";
import { healthOf, isConnected, categoryLabel, objectsLabel, CAPABILITY_TEXT, OFFLINE } from "@/components/connectors/health";
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

function noteFor(c: Connector): string {
  if (c.state.health === "error" && c.state.lastError) return c.state.lastError;
  if (c.state.health === "stale" && !c.state.lastSyncAt) return "Paired, but nothing has synced yet";
  if (c.authType === "file_import" && c.state.lastImport) {
    const imp = c.state.lastImport;
    const rows = `${formatCount(imp.rowsAccepted)} rows${imp.rowsRejected ? `, ${formatCount(imp.rowsRejected)} rejected` : ""}`;
    return imp.filename ? `${imp.filename} · ${rows}` : `Last import: ${rows}`;
  }
  const active = c.state.devices.filter((x) => x.status === "ACTIVE");
  if (active.length) return active.map((x) => `${x.name}${x.lastSeenAt ? `, seen ${formatRelative(x.lastSeenAt)}` : ""}`).join(" · ");
  if (c.availability !== "available") return c.unavailableReason || c.summary;
  return c.summary;
}

const SYNC_COLS = "minmax(0, 1fr) 128px 148px minmax(0, 2fr)";

function TableHeader() {
  return (
    <div className="rf-head rf-src-head" aria-hidden="true">
      <span>Source</span><span>Health</span><span style={{ textAlign: "right" }}>Last sync</span><span>Reads</span><span>Detail</span><span />
    </div>
  );
}

/** How old a sync is, for the eye: fresh syncs in ink, old ones recede. */
function syncAge(at: string | null): "fresh" | "old" | "none" {
  if (!at) return "none";
  return Date.now() - new Date(at).getTime() > 3 * 24 * 3600_000 ? "old" : "fresh";
}

function Row({ c, action }: { c: Connector; action?: React.ReactNode }) {
  const st = healthOf(c);
  const href = c.authType === "local_bridge" ? "/sources/tally" : undefined;
  const cap = isConnected(c) && c.state.capabilityLabel ? CAPABILITY_TEXT[c.state.capabilityLabel] : undefined;
  const note = noteFor(c);
  const errorTone = c.state.health === "error";
  const reads = c.objects.length ? objectsLabel(c) : null;
  const age = syncAge(c.state.lastSyncAt);
  return (
    <li>
      <div className="rf-row rf-hover rf-src" data-health={st.tone}>
        <div className="min-w-0">
          {href ? <Link href={href} className="rf-title hover-dim line-clamp-2" style={{ fontWeight: 500 }} title={c.name}>{c.name}</Link> : <span className="rf-title line-clamp-2" style={{ fontWeight: 500 }} title={c.name}>{c.name}</span>}
          <div className="rf-kind flex items-center flex-wrap" style={{ gap: 6 }}>
            {categoryLabel(c)}
            {cap && <><Sep /> {cap}</>}
          </div>
          <div className="rf-mob">
            <StatusChip tone={st.tone}>{st.label}</StatusChip>
            <span title={c.state.lastSyncAt ? formatDateTime(c.state.lastSyncAt) : undefined}>{c.state.lastSyncAt ? `Synced ${formatRelative(c.state.lastSyncAt)}` : "Never synced"}</span>
            {note && <span className="min-w-0" style={{ flexBasis: "100%", color: errorTone ? "var(--critical)" : "var(--ink-2)", overflowWrap: "anywhere" }}>{note}</span>}
          </div>
        </div>
        <div className="rf-desk"><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
        <div className="rf-desk rf-src-sync" data-age={age} title={c.state.lastSyncAt ? formatDateTime(c.state.lastSyncAt) : undefined}>
          {c.state.lastSyncAt ? formatRelative(c.state.lastSyncAt) : "Never"}
        </div>
        <div className="rf-desk rf-sub min-w-0 truncate" title={reads || undefined}>{reads || <span style={{ color: "var(--ink-3)" }}>—</span>}</div>
        <div className="rf-desk rf-sub min-w-0 truncate" style={{ color: errorTone ? "var(--critical)" : undefined }} title={note}>{note}</div>
        <div className="rf-actions">
          {action}
          {href && <Link href={href} aria-label={`${c.name} details`} className="inline-flex" style={{ padding: 4, marginRight: -4 }}><Chevron size={13} /></Link>}
        </div>
      </div>
    </li>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 32 }}>
      <SectionHead title={title} />
      {hint && <p className="meta" style={{ margin: "-2px 0 8px" }}>{hint}</p>}
      {children}
    </section>
  );
}

/** The unavailable reason without the "Not built yet." its group title already says. */
function notBuiltNote(c: Connector): string {
  return (c.unavailableReason || "").replace(/^not built yet\.?\s*/i, "").trim();
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
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string; choices?: { id: string; name: string }[] } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeFailed, setRevokeFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try { setConnectors((await api.connectors.list()).connectors); }
    catch { setLoadFailed(true); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // ?tab=quality (and the other tab keys) opens that tab directly.
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && ["connected", "available", "sync", "quality", "reconciliation"].includes(t)) setTab(t as TabKey);
    } catch { /* no window */ }
  }, []);

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
          {active.length === 1 && (
            <Button variant="ghost" size="sm" onClick={() => { setRevokeFailed(false); setConfirmRevoke({ id: active[0].id, name: active[0].name }); }}>Revoke device</Button>
          )}
          {active.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => { setRevokeFailed(false); setConfirmRevoke({ id: active[0].id, name: active[0].name, choices: active.map((d) => ({ id: d.id, name: d.name })) }); }}>
              Revoke a device
            </Button>
          )}
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
      <div className="w-full page-stack" style={{ maxWidth: 1180 }}>
        <PageHeader
          title="Sources"
          subtitle={
            connectors && connected.length ? (
              <span className="inline-flex items-center flex-wrap" style={{ gap: 6 }}>
                {formatCount(connected.length)} {connected.length === 1 ? "company system" : "company systems"}
                {world.length > 0 && <><Sep /> {formatCount(world.length)} external {world.length === 1 ? "feed" : "feeds"}</>}
                {lastSync && <><Sep /> <span title={formatDateTime(lastSync)}>last sync {formatRelative(lastSync)}</span></>}
                {needsLook > 0 && <><Sep /> <StatusChip tone="attention">{formatCount(needsLook)} need{needsLook === 1 ? "s" : ""} a look</StatusChip></>}
              </span>
            ) : "Where Starlane gets its data. Every connection is read only and can be revoked."
          }
          right={<Link href="/sources/connect" className="ui-btn ui-btn-primary"><IconPlus size={14} /> Connect a source</Link>}
        />

        <div>
          <Subnav items={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} label="Sources" />

          <div className="fade-once" role="tabpanel" style={{ marginTop: 16 }}>
            {loadFailed && tab !== "quality" && tab !== "reconciliation" && (
              <QuietError message={`Couldn't load your sources. ${OFFLINE}`} onRetry={load} />
            )}

            {connectors === null && !loadFailed && tab !== "quality" && tab !== "reconciliation" && <SkeletonRows rows={4} height={56} />}

            {connectors && tab === "connected" && (
              <>
                {connected.length > 0 ? (
                  <div>
                    <TableHeader />
                    <ul className="rf-list">{connected.map((c) => <Row key={c.id} c={c} action={actionFor(c)} />)}</ul>
                  </div>
                ) : (
                  <div>
                    <QuietLine>No company system is connected yet. Connect Tally or upload an export so Starlane works from your real receivables, payables and stock.</QuietLine>
                    <div className="flex flex-wrap" style={{ gap: 8, marginTop: 4 }}>
                      <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect Tally</Link>
                      <Button variant="ghost" size="sm" onClick={() => setTab("available")}>See all sources</Button>
                    </div>
                  </div>
                )}
                {world.length > 0 && (
                  <Group title="External signals" hint="Public feeds. Nothing about your company is sent to them.">
                    <ul className="rf-list">{world.map((c) => <Row key={c.id} c={c} />)}</ul>
                  </Group>
                )}
              </>
            )}

            {connectors && tab === "available" && (
              <>
                {buildable.length > 0 ? (
                  <ul className="rf-list">
                    {buildable.map((c) => (
                      <li key={c.id}>
                        <div className="rf-row rf-avail">
                          <div className="min-w-0">
                            <div className="rf-title" style={{ fontWeight: 500 }}>{c.name}</div>
                            <div className="rf-sub">{c.summary}</div>
                          </div>
                          {c.access.length > 0 ? (
                            <ul className="min-w-0" style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
                              {c.access.map((a) => <li key={a} className="rf-sub" style={{ fontSize: 12 }}>{a}</li>)}
                            </ul>
                          ) : <span />}
                          <div className="rf-actions" style={{ alignSelf: "start" }}>
                            {c.authType === "local_bridge"
                              ? <Link href="/sources/connect" className="ui-btn ui-btn-secondary ui-btn-sm">Connect {c.name}</Link>
                              : c.authType === "file_import"
                                ? <Link href="/collections?import=1" className="ui-btn ui-btn-secondary ui-btn-sm"><IconUpload size={13} /> Upload a file</Link>
                                : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <QuietLine>Everything available is connected. New connectors appear here as they are built.</QuietLine>
                )}
                {notBuilt.length > 0 && (
                  <Group title="Not built yet" hint="A CSV export from any of these works today.">
                    <ul className="rf-list">
                      {notBuilt.map((c) => (
                        <li key={c.id}>
                          <div className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" }}>
                            <div className="min-w-0">
                              <div className="rf-title" style={{ color: "var(--ink-2)" }}>{c.name}</div>
                              {notBuiltNote(c) && <div className="rf-kind">{notBuiltNote(c)}</div>}
                            </div>
                            <span className="rf-kind">{categoryLabel(c)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Group>
                )}
              </>
            )}

            {connectors && tab === "sync" && (
              syncEntries.length ? (
                <div>
                  <div className="rf-head" style={{ gridTemplateColumns: SYNC_COLS }} aria-hidden="true"><span>Source</span><span>Result</span><span style={{ textAlign: "right" }}>When</span><span>Detail</span></div>
                  <ul className="rf-list">
                    {syncEntries.map((e) => (
                      <li key={e.c.id}>
                        <div className="rf-row rf-hover rf-sync" style={{ alignItems: "center" }}>
                          <div className="min-w-0">
                            <div className="rf-title" style={{ fontWeight: 500 }}>{e.c.name}</div>
                            <div className="rf-mob">{e.at ? formatDateTime(e.at) : "Time not recorded"} · {e.detail}</div>
                          </div>
                          <div><StatusChip tone={e.tone}>{e.label}</StatusChip></div>
                          <div className="rf-desk rf-time" style={{ color: "var(--body)" }} title={e.at ? formatDateTime(e.at) : undefined}>{e.at ? formatDateTime(e.at) : "—"}</div>
                          <div className="rf-desk rf-sub truncate" style={{ color: e.tone === "critical" ? "var(--critical)" : undefined }} title={e.detail}>{e.detail}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="meta" style={{ margin: "10px 0 0" }}>The latest attempt for each source. Older runs are not kept here.</p>
                </div>
              ) : (
                <QuietLine>No sync activity yet. Once a source syncs, its latest attempt and result appear here.</QuietLine>
              )
            )}

            {tab === "quality" && <DataQuality />}

            {tab === "reconciliation" && (
              <QuietLine>
                Reconciliation isn&apos;t running yet. Planned: receivables, payables and sales totals compared against Tally before those numbers are used anywhere else. Nothing is compared today, so no match or mismatch is shown.
              </QuietLine>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        title={confirmRevoke?.choices ? "Revoke a paired computer?" : `Revoke ${confirmRevoke?.name ?? "this device"}?`}
        description="That computer stops syncing straight away. You can pair it again at any time with a new code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
            <Button variant="danger" loading={!!revoking} onClick={revoke}>Revoke device</Button>
          </>
        }
      >
        {confirmRevoke?.choices && (
          <fieldset style={{ margin: "0 0 12px", padding: 0, border: 0 }}>
            <legend className="sr-only">Computer to revoke</legend>
            {confirmRevoke.choices.map((d) => (
              <label key={d.id} className="flex items-center" style={{ gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5, color: "var(--ink)", cursor: "pointer" }}>
                <input type="radio" name="revoke-device" checked={confirmRevoke.id === d.id} onChange={() => setConfirmRevoke({ ...confirmRevoke, id: d.id, name: d.name })} />
                {d.name}
              </label>
            ))}
          </fieldset>
        )}
        {revokeFailed && <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--critical)" }}>The device was not revoked. {OFFLINE}</p>}
      </Modal>
    </DashboardLayout>
  );
}

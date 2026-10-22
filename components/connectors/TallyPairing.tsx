"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Connector } from "@/lib/api";
import { IconCheck, IconCopy } from "@/components/v32/icons";
import { formatClock } from "@/lib/format";
import { OFFLINE } from "./health";

// Pair TallyPrime through the local bridge. Every state shown is real:
//   1. the bridge file comes from the backend (with its SHA-256);
//   2. the pairing code + exact command come from POST /api/connectors/tally/pairing;
//   3. "paired" appears only when an active device exists that was not there
//      when this code was issued (compared by id, so client/server clock skew
//      cannot fake it); "first sync" only when the connection's last_sync_at
//      (server time) moves past that device's paired_at (server time). Polling stops on success, on code
//      expiry without a device, or on unmount.

type Pairing = { code: string; expiresAt: string; command: string; knownDeviceIds: string[] };
const POLL_MS = 4000;

function Step({ n, title, done, active, last, children }: { n: number; title: string; done: boolean; active: boolean; last?: boolean; children?: React.ReactNode }) {
  return (
    <li style={{ display: "grid", gridTemplateColumns: "24px minmax(0, 1fr)", columnGap: 16, position: "relative" }}>
      {!last && <span aria-hidden="true" style={{ position: "absolute", left: 11.5, top: 31, bottom: 4, width: 1, background: "var(--line)" }} />}
      <span aria-hidden="true" className="tabular-nums" style={{
        width: 24, height: 24, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, marginTop: 1,
        background: active ? "var(--inverse)" : "transparent",
        color: done ? "var(--ink)" : active ? "var(--on-inverse)" : "var(--ink-3)",
        boxShadow: active ? "none" : `inset 0 0 0 1px ${done ? "var(--line-emphasis)" : "var(--line-strong)"}`,
      }}>{done ? <IconCheck size={13} /> : n}</span>
      <div style={{ minWidth: 0, paddingBottom: last ? 0 : 24, opacity: active || done ? 1 : 0.55 }}>
        <p style={{ margin: "3px 0 0", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
          {title}<span className="sr-only">{done ? ", done" : active ? ", current step" : ""}</span>
        </p>
        {children && <div style={{ marginTop: 10 }}>{children}</div>}
      </div>
    </li>
  );
}

export function TallyPairing({ onConnected }: { onConnected?: (tally: Connector) => void }) {
  const [downloaded, setDownloaded] = useState<{ filename: string; sha256: string | null } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [tally, setTally] = useState<Connector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const expired = pairing ? new Date(pairing.expiresAt).getTime() <= now : false;
  const newDevice = pairing && tally?.state.devices.find((d) => d.status === "ACTIVE" && !pairing.knownDeviceIds.includes(d.id));
  const synced = Boolean(newDevice && tally?.state.lastSyncAt && new Date(tally.state.lastSyncAt).getTime() >= new Date(newDevice.pairedAt).getTime());

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const refresh = useCallback(async () => {
    try {
      const res = await api.connectors.list();
      setTally(res.connectors.find((c) => c.id === "tally") || null);
    } catch { /* transient; next poll retries */ }
  }, []);

  useEffect(() => { refresh(); return stopPolling; }, [refresh]);
  useEffect(() => {
    if (!pairing) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pairing]);
  useEffect(() => {
    if (synced) { stopPolling(); if (tally) onConnected?.(tally); }
    else if (expired && !newDevice) stopPolling();
  }, [synced, expired, newDevice, tally, onConnected]);

  async function download() {
    setDownloading(true); setError(null);
    try { setDownloaded(await api.connectors.downloadBridge("tally")); }
    catch { setError(`The bridge didn't download. ${OFFLINE}`); }
    finally { setDownloading(false); }
  }

  async function getCode() {
    setPairingBusy(true); setError(null); setCopied(false);
    try {
      const before = await api.connectors.list();
      const knownDeviceIds = (before.connectors.find((c) => c.id === "tally")?.state.devices || []).map((d) => d.id);
      const res = await api.connectors.pairing("tally");
      setPairing({ ...res.pairing, knownDeviceIds });
      setNow(Date.now());
      stopPolling();
      pollRef.current = setInterval(refresh, POLL_MS);
    } catch {
      setError(`No pairing code was created. ${OFFLINE}`);
    } finally { setPairingBusy(false); }
  }

  async function copy() {
    if (!pairing) return;
    try { await navigator.clipboard.writeText(pairing.command); setCopied(true); } catch { setCopied(false); }
  }

  const secondsLeft = pairing ? Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - now) / 1000)) : 0;

  const P = { fontSize: 13, color: "var(--ink-2)", margin: 0, lineHeight: 1.6 } as const;

  return (
    <div>
      {error && (
        <div role="alert" className="flex items-center justify-between flex-wrap" style={{ gap: 10, fontSize: 13, color: "var(--critical)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 12px", marginBottom: 18 }}>
          {error}
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Step n={1} title="Download the Starlane Tally bridge" done={!!downloaded} active={!downloaded}>
          <p style={{ ...P, marginBottom: 12 }}>
            Save it on the computer that runs TallyPrime. It needs Node.js 18 or newer, and Tally&apos;s XML server switched on (F1, Settings, Connectivity, port 9000).
          </p>
          <button type="button" onClick={download} disabled={downloading} className={`ui-btn ${downloaded ? "ui-btn-secondary" : "ui-btn-primary"}`} aria-busy={downloading || undefined}>
            {downloading ? "Downloading…" : downloaded ? "Download again" : "Download tally-sync.mjs"}
          </button>
          {downloaded?.sha256 && (
            <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "10px 0 0", wordBreak: "break-all" }}>
              SHA-256 <span className="num" style={{ color: "var(--ink-2)", fontSize: 11.5 }}>{downloaded.sha256}</span>
            </p>
          )}
        </Step>

        <Step n={2} title="Pair it with a one-time code" done={!!newDevice} active={!!downloaded && !newDevice}>
          {!pairing || expired ? (
            <>
              {expired && !newDevice && <p style={{ ...P, color: "var(--warning)", marginBottom: 10 }}>That code expired before a computer used it. Get a new one.</p>}
              <button type="button" onClick={getCode} disabled={pairingBusy} className={`ui-btn ${downloaded ? "ui-btn-primary" : "ui-btn-secondary"}`} aria-busy={pairingBusy || undefined}>
                {pairingBusy ? "Creating…" : pairing ? "Get a new code" : "Get pairing code"}
              </button>
            </>
          ) : (
            <>
              <p style={{ ...P, marginBottom: 8 }}>In the folder where you saved the bridge, run:</p>
              <div className="flex" style={{ gap: 8, alignItems: "stretch" }}>
                <code style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 12px", overflowX: "auto", whiteSpace: "nowrap", color: "var(--ink)" }}>{pairing.command}</code>
                <button type="button" onClick={copy} className="ui-btn ui-btn-secondary" style={{ height: "auto" }} aria-label={copied ? "Copied" : "Copy command"}>
                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "8px 0 0", lineHeight: 1.55 }} aria-live="polite">
                The code works once and expires in <span className="num" style={{ color: "var(--ink-2)" }}>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</span>. The bridge gets its own credential; your password never leaves Starlane.
              </p>
            </>
          )}
          {newDevice && <p style={{ ...P, color: "var(--positive)" }}>Paired with {newDevice.name}</p>}
        </Step>

        <Step n={3} title="First sync" done={synced} active={!!newDevice && !synced} last>
          {!newDevice && <p style={P}>Starts by itself right after pairing.</p>}
          {newDevice && !synced && (
            <p style={P} aria-live="polite">
              Waiting for the bridge to send its first vouchers. If nothing arrives in a minute, check the bridge window for an error; usually Tally&apos;s XML server is off.
            </p>
          )}
          {synced && tally?.state.lastSyncAt && (
            <p style={P}>
              <span style={{ color: "var(--positive)" }}>Received at {formatClock(tally.state.lastSyncAt)}.</span> Keep <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)" }}>node tally-sync.mjs --watch</code> running to sync every 30 minutes.
            </p>
          )}
        </Step>
      </ol>
    </div>
  );
}

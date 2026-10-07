"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Connector } from "@/lib/api";

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

const ink = "var(--ink)", soft = "var(--ink-2)", faint = "var(--ink-3)", line = "var(--line)", ok = "var(--positive)", bad = "var(--critical)";

function Step({ n, title, done, active, children }: { n: number; title: string; done: boolean; active: boolean; children?: React.ReactNode }) {
  return (
    <li style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 14, padding: "18px 0", borderTop: `1px solid ${line}`, opacity: active || done ? 1 : 0.5 }}>
      <span aria-hidden style={{ width: 24, height: 24, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
        background: done ? ok : active ? ink : "var(--surface-2)", color: done ? "var(--bg)" : active ? "var(--on-inverse)" : soft }}>{done ? "✓" : n}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: ink }}>{title}<span className="sr-only">{done ? " — done" : active ? " — current step" : ""}</span></p>
        {children && <div style={{ marginTop: 8 }}>{children}</div>}
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
    catch (e) { setError(e instanceof Error ? e.message : "Download failed"); }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a pairing code");
    } finally { setPairingBusy(false); }
  }

  async function copy() {
    if (!pairing) return;
    try { await navigator.clipboard.writeText(pairing.command); setCopied(true); } catch { setCopied(false); }
  }

  const secondsLeft = pairing ? Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - now) / 1000)) : 0;

  return (
    <div>
      {error && <p role="alert" style={{ fontSize: 13, color: bad, background: "#FBEFEF", border: "1px solid #F0D5D5", borderRadius: 8, padding: 12, marginBottom: 12 }}>{error}</p>}
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Step n={1} title="Download the Starlane Tally bridge" done={!!downloaded} active={!downloaded}>
          <p style={{ fontSize: 13, color: soft, margin: "0 0 10px", lineHeight: 1.55 }}>
            Save it on the computer that runs TallyPrime. It needs Node.js 18 or newer, and Tally&apos;s XML server enabled (F1 › Settings › Connectivity, port 9000).
          </p>
          <button type="button" onClick={download} disabled={downloading} className="btn-primary" style={{ background: ink, color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}>
            {downloading ? "Downloading…" : downloaded ? "Download again" : "Download tally-sync.mjs"}
          </button>
          {downloaded?.sha256 && <p style={{ fontSize: 11, color: faint, marginTop: 8, wordBreak: "break-all" }}>SHA-256 {downloaded.sha256}</p>}
        </Step>

        <Step n={2} title="Pair it with a one-time code" done={!!newDevice} active={!!downloaded && !newDevice}>
          {!pairing || expired ? (
            <>
              {expired && !newDevice && <p style={{ fontSize: 13, color: bad, margin: "0 0 10px" }}>That code expired before a device used it. Get a new one.</p>}
              <button type="button" onClick={getCode} disabled={pairingBusy} style={{ background: "none", border: `1px solid ${ink}`, color: ink, borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {pairingBusy ? "Creating…" : pairing ? "Get a new code" : "Get pairing code"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: soft, margin: "0 0 8px" }}>In the folder where you saved the bridge, run:</p>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <code style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-sans)", fontSize: 12.5, background: "#F6F5F2", border: `1px solid ${line}`, borderRadius: 8, padding: "10px 12px", overflowX: "auto", whiteSpace: "nowrap", color: ink }}>{pairing.command}</code>
                <button type="button" onClick={copy} style={{ background: "none", border: `1px solid ${line}`, borderRadius: 8, padding: "0 12px", fontSize: 12.5, cursor: "pointer", color: ink }}>{copied ? "Copied" : "Copy"}</button>
              </div>
              <p style={{ fontSize: 12, color: faint, marginTop: 8 }} aria-live="polite">
                Code works once and expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}. The bridge gets its own credential; your password never leaves Starlane.
              </p>
            </>
          )}
          {newDevice && <p style={{ fontSize: 13, color: ok, margin: 0 }}>Paired: {newDevice.name}</p>}
        </Step>

        <Step n={3} title="First sync" done={synced} active={!!newDevice && !synced}>
          {newDevice && !synced && (
            <p style={{ fontSize: 13, color: soft, margin: 0 }} aria-live="polite">
              Waiting for the bridge to send its first vouchers… This happens right after pairing; if nothing arrives, check the bridge window for an error (usually Tally&apos;s XML server being off).
            </p>
          )}
          {synced && tally?.state.lastSyncAt && (
            <p style={{ fontSize: 13, color: ok, margin: 0 }}>Received at {new Date(tally.state.lastSyncAt).toLocaleTimeString()}. Keep <code>node tally-sync.mjs --watch</code> running to sync every 30 minutes.</p>
          )}
        </Step>
      </ol>
    </div>
  );
}

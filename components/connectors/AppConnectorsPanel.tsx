"use client";

// Live app connectors: Zoho Books, QuickBooks Online, Razorpay and WhatsApp
// Business (backend lib/connectors/apps).
//
// Only connectors the backend reports as available appear here; until an
// app's feature flag is on and its developer credentials are set it stays
// under "Coming soon" with no connect action. Every connector is read-only
// (WhatsApp Business only receives messages). Keys are typed once and never
// shown again. All state shown comes from GET /api/connectors.

import { useState } from "react";
import { api, type Connector } from "@/lib/api";
import { Button, Card, StatusDot, V, ago } from "@/components/v32/ui";

const field: React.CSSProperties = { padding: "8px 10px", border: `1px solid ${V.input}`, borderRadius: 6, font: "inherit", fontSize: 13.5, background: "#fff", color: V.ink, minWidth: 0, width: "100%" };
const small: React.CSSProperties = { fontSize: 12, color: V.tertiary };
const heading: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: V.ink, margin: 0 };

const HEALTH: Record<string, { label: string; color: string }> = {
  healthy: { label: "Connected", color: V.positive },
  connected: { label: "Connected, first sync pending", color: V.warning },
  syncing: { label: "Syncing", color: V.warning },
  delayed: { label: "Sync delayed", color: V.warning },
  error: { label: "Needs attention", color: V.critical },
  not_connected: { label: "Not connected", color: V.neutralDot },
};

function errText(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function KeyForm({ c, onSaved }: { c: Connector; onSaved: (note: string) => void }) {
  const fields = c.connect?.fields || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api.connectors.appSaveKey(c.id, values);
      setValues({});
      const s = r.sync;
      onSaved(!s ? `${c.name} is connected.`
        : "error" in s ? `${c.name} is connected, but the first sync failed: ${s.error}`
          : `${c.name} is connected. ${s.counts.inserted} new, ${s.counts.updated} updated${s.counts.skippedOtherSource ? `, ${s.counts.skippedOtherSource} already in Starlane from another source` : ""}${s.counts.rejected ? `, ${s.counts.rejected} could not be read` : ""}.`);
    } catch (err) { setError(errText(err, "Could not connect.")); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
      {fields.map((f) => (
        <label key={f.name} style={{ display: "grid", gap: 4, fontSize: 12.5, color: V.secondary }}>
          {f.label}
          <input style={field} type={f.secret ? "password" : "text"} autoComplete="off" spellCheck={false} placeholder={f.placeholder || ""}
            value={values[f.name] || ""} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} required />
          {f.help && <span style={small}>{f.help}</span>}
        </label>
      ))}
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <Button small primary type="submit" disabled={busy || fields.some((f) => !values[f.name])}>{busy ? "Checking…" : "Check and connect"}</Button>
        <span style={small}>Starlane checks the key with one read before saving it.</span>
      </div>
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: 0 }}>{error}</p>}
    </form>
  );
}

function AppCard({ c, onChanged }: { c: Connector; onChanged: () => void }) {
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const account = c.state.account || null;
  const h = HEALTH[c.state.health] || { label: c.state.health.replace(/_/g, " "), color: V.neutralDot };
  const needsReconnect = account?.status === "AUTH_REQUIRED";
  const receiveOnly = c.id === "whatsapp_business";

  const connect = async () => {
    if (c.connect?.kind === "api_key") { setShowForm(!showForm); return; }
    setBusy("connect"); setError(null);
    try { window.location.href = (await api.connectors.appConnectUrl(c.id, "sources")).url; }
    catch (e) { setError(errText(e, `Could not start the ${c.provider || c.name} sign-in.`)); setBusy(null); }
  };
  const sync = async () => {
    setBusy("sync"); setError(null); setNote(null);
    try {
      const r = await api.connectors.appSync(c.id);
      setNote(`Synced: ${r.counts.inserted} new, ${r.counts.updated} updated, ${r.counts.unchanged} unchanged${r.counts.skippedOtherSource ? `, ${r.counts.skippedOtherSource} already in Starlane from another source` : ""}${r.counts.rejected ? `, ${r.counts.rejected} could not be read` : ""}.`);
      onChanged();
    } catch (e) { setError(errText(e, "The sync failed.")); onChanged(); }
    finally { setBusy(null); }
  };
  const disconnect = async () => {
    if (!window.confirm(`Disconnect ${c.name}? Starlane forgets its access. Invoices already synced stay.`)) return;
    setBusy("disconnect"); setError(null);
    try { await api.connectors.appDisconnect(c.id); setNote(null); onChanged(); }
    catch (e) { setError(errText(e, "Could not disconnect.")); }
    finally { setBusy(null); }
  };

  return (
    <Card style={{ padding: 16 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <p style={heading}>{c.name}</p>
            <StatusDot label={h.label} color={h.color} />
          </div>
          <p style={{ ...small, margin: "4px 0 0", lineHeight: 1.5 }}>{c.summary}</p>
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          {account && !needsReconnect && !receiveOnly && <Button small onClick={sync} disabled={!!busy}>{busy === "sync" ? "Syncing…" : "Sync now"}</Button>}
          {(!account || needsReconnect) && (
            <Button small primary onClick={connect} disabled={!!busy}>
              {busy === "connect" ? `Opening ${c.provider || c.name}…` : needsReconnect ? "Connect again" : "Connect"}
            </Button>
          )}
          {account && <Button small onClick={disconnect} disabled={!!busy}>{busy === "disconnect" ? "Disconnecting…" : "Disconnect"}</Button>}
        </div>
      </div>
      {account && (
        <p style={{ fontSize: 12.5, color: V.body, margin: "10px 0 0" }}>
          {account.label || c.name}
          {receiveOnly
            ? ` · ${c.state.messagesReceived || 0} message${c.state.messagesReceived === 1 ? "" : "s"} received${c.state.lastSyncAt ? `, last ${ago(c.state.lastSyncAt)}` : ""}`
            : c.state.lastSyncAt ? ` · last synced ${ago(c.state.lastSyncAt)}` : " · not synced yet"}
        </p>
      )}
      {c.state.lastError && <p style={{ fontSize: 12.5, color: V.critical, margin: "8px 0 0" }}>{c.state.lastError}</p>}
      {showForm && (!account || needsReconnect) && c.connect?.kind === "api_key" && <KeyForm c={c} onSaved={(n) => { setShowForm(false); setNote(n); onChanged(); }} />}
      <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 3 }}>
        {c.access.map((a) => <li key={a} style={small}>· {a}</li>)}
      </ul>
      {note && <p style={{ fontSize: 12.5, color: V.body, margin: "10px 0 0" }}>{note}</p>}
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: "10px 0 0" }}>{error}</p>}
    </Card>
  );
}

export default function AppConnectorsPanel({ connectors, onChanged }: { connectors: Connector[]; onChanged: () => void }) {
  const apps = connectors.filter((c) => c.app && c.availability === "available");
  if (!apps.length) return null;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {apps.map((c) => <AppCard key={c.id} c={c} onChanged={onChanged} />)}
    </div>
  );
}

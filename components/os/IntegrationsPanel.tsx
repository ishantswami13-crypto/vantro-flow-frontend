"use client";

// Connect any software: Gmail, incoming webhooks, HTTP APIs and Slack.
//
// Backed by /api/integrations (backend lib/routes/connections.js). Every
// state shown comes from the server. Secrets are typed once and never shown
// again; an incoming webhook's URL and signing secret are shown once, at
// creation (the server keeps only a hash of the URL token).

import { useCallback, useEffect, useState } from "react";
import { api, type Integration, type IntegrationAuth, type IntegrationEvent, type IntegrationsResponse } from "@/lib/api";
import { Button, Card, ErrorBanner, SkeletonRows, StatusDot, V, ago } from "@/components/v32/ui";

const field: React.CSSProperties = { padding: "8px 10px", border: `1px solid ${V.input}`, borderRadius: 6, font: "inherit", fontSize: 13.5, background: "#fff", color: V.ink, minWidth: 0, width: "100%" };
const small: React.CSSProperties = { fontSize: 12, color: V.tertiary };
const label: React.CSSProperties = { display: "grid", gap: 4, fontSize: 12.5, color: V.secondary };
const heading: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: V.ink, margin: 0 };

const AUTH_LABEL: Record<IntegrationAuth, string> = {
  none: "No authentication",
  bearer: "Bearer token",
  header: "API key in a header",
  basic: "Username and password (basic)",
  oauth2_client_credentials: "OAuth2 client credentials",
};

function errText(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function Secret({ label: l, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: V.secondary }}>{l}</span>
      <div className="flex items-center" style={{ gap: 8 }}>
        <code style={{ ...field, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, wordBreak: "break-all", whiteSpace: "normal" }}>{value}</code>
        <Button small onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => undefined); }}>{copied ? "Copied" : "Copy"}</Button>
      </div>
    </div>
  );
}

function GmailCard({ data, onChanged }: { data: IntegrationsResponse; onChanged: () => void }) {
  const [busy, setBusy] = useState<"connect" | "check" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const g = data.gmail;
  const ready = g.oauthConfigured && g.credentialsKeyConfigured;

  const connect = async () => {
    setBusy("connect"); setError(null);
    try { window.location.href = (await api.integrations.gmailConnectUrl("sources")).url; }
    catch (e) { setError(errText(e, "Could not start the Google sign-in.")); setBusy(null); }
  };
  const check = async () => {
    setBusy("check"); setError(null); setNote(null);
    try {
      const r = await api.integrations.gmailCheck();
      setNote(r.status === "OK"
        ? `${r.newMessages ? `${r.newMessages} new message${r.newMessages === 1 ? "" : "s"}` : "No new messages"}${r.workflowsRun ? `, ${r.workflowsRun} workflow run${r.workflowsRun === 1 ? "" : "s"} started` : ""}.`
        : r.status === "AUTH_REQUIRED" ? "Google asked for the account to be connected again." : "No Gmail account is connected.");
      onChanged();
    } catch (e) { setError(errText(e, "Could not read the inbox.")); }
    finally { setBusy(null); }
  };

  return (
    <Card style={{ padding: 16 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <p style={heading}>Gmail</p>
          <p style={{ ...small, margin: "4px 0 0", lineHeight: 1.5 }}>
            Starlane reads new messages so workflows can start from them (invoices, payment promises, disputes), and sends a reply from your address only after you approve each one.
          </p>
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          {g.accounts.length > 0 && <Button small onClick={check} disabled={!!busy}>{busy === "check" ? "Checking…" : "Check inbox now"}</Button>}
          <Button small primary onClick={connect} disabled={!ready || !!busy}>{busy === "connect" ? "Opening Google…" : g.accounts.length ? "Connect another" : "Connect Gmail"}</Button>
        </div>
      </div>
      {!ready && (
        <p style={{ fontSize: 12.5, color: V.warning, margin: "10px 0 0", lineHeight: 1.5 }}>
          Gmail is not set up on this server yet. An administrator sets {!g.oauthConfigured && "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URI"}{!g.oauthConfigured && !g.credentialsKeyConfigured && ", and "}{!g.credentialsKeyConfigured && "OUTBOUND_CREDENTIALS_KEY"} on the backend.
        </p>
      )}
      {g.accounts.length > 0 && (
        <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "grid", gap: 6 }}>
          {g.accounts.map((a) => (
            <li key={a.id} className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 13 }}>
              <span style={{ color: V.ink, fontWeight: 500 }}>{a.address}</span>
              <StatusDot label={a.status === "HEALTHY" ? "Connected" : a.status === "AUTH_REQUIRED" ? "Connect again" : a.status.toLowerCase().replace(/_/g, " ")} color={a.status === "HEALTHY" ? V.positive : V.critical} />
              {a.lastSuccessAt && <span style={small}>last read {ago(a.lastSuccessAt)}</span>}
              {a.statusReason && a.status !== "HEALTHY" && <span style={{ ...small, color: V.critical }}>{a.statusReason}</span>}
            </li>
          ))}
        </ul>
      )}
      {note && <p style={{ fontSize: 12.5, color: V.body, margin: "10px 0 0" }}>{note}</p>}
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: "10px 0 0" }}>{error}</p>}
    </Card>
  );
}

function NewWebhook({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ url: string; secret?: string } | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.integrations.create({ kind: "webhook_in", name: name.trim(), signed });
      setMade({ url: r.webhookUrl || "", secret: r.signingSecret });
      setName(""); setSigned(false);
      onCreated();
    } catch (e) { setError(errText(e, "Could not create the webhook.")); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {made ? (
        <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 8, background: V.surface2 }}>
          <p style={{ fontSize: 12.5, color: V.ink, margin: 0, fontWeight: 600 }}>Copy these now. They are not shown again.</p>
          <Secret label="Webhook URL: have your tool POST JSON here" value={made.url} />
          {made.secret && <Secret label="Signing secret: send X-Starlane-Signature: sha256=HMAC-SHA256(secret, raw body)" value={made.secret} />}
          <div><Button small onClick={() => setMade(null)}>Done</Button></div>
        </div>
      ) : (
        <>
          <label style={label}>Name
            <input style={field} maxLength={80} placeholder="e.g. Stripe payments, Shopify orders, Zapier" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: V.secondary }}>
            <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
            Require a signature on every request (recommended when your tool supports HMAC signing)
          </label>
          <div className="flex items-center" style={{ gap: 10 }}>
            <Button small primary onClick={create} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create webhook"}</Button>
            <span style={small}>Each request it receives can start a workflow. Repeats with the same event id are ignored.</span>
          </div>
        </>
      )}
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: 0 }}>{error}</p>}
    </div>
  );
}

function NewApi({ onCreated }: { onCreated: () => void }) {
  const [preset, setPreset] = useState<"custom" | "slack">("custom");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState<IntegrationAuth>("bearer");
  const [headerName, setHeaderName] = useState("X-API-Key");
  const [secret, setSecret] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true); setError(null);
    try {
      if (preset === "slack") await api.integrations.create({ kind: "http_api", preset: "slack", name: name.trim(), webhookUrl: baseUrl.trim() });
      else await api.integrations.create({
        kind: "http_api", preset: "custom", name: name.trim(), baseUrl: baseUrl.trim(), authType,
        ...(authType === "header" ? { headerName: headerName.trim() } : {}),
        ...(authType !== "none" ? { secret } : {}),
        ...(authType === "oauth2_client_credentials" ? { tokenUrl: tokenUrl.trim(), clientId: clientId.trim(), scope: scope.trim() || undefined } : {}),
      });
      setName(""); setBaseUrl(""); setSecret(""); setTokenUrl(""); setClientId(""); setScope("");
      onCreated();
    } catch (e) { setError(errText(e, "Could not save the connection.")); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        {(["custom", "slack"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPreset(p)} className="hover-dim"
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${V.divider}`, background: preset === p ? V.ink : "transparent", color: preset === p ? "#fff" : V.secondary, cursor: "pointer" }}>
            {p === "custom" ? "Any REST API" : "Slack"}
          </button>
        ))}
      </div>
      <label style={label}>Name
        <input style={field} maxLength={80} placeholder={preset === "slack" ? "e.g. #finance channel" : "e.g. HubSpot, our ERP, Airtable"} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={label}>{preset === "slack" ? "Slack incoming webhook URL" : "Base URL"}
        <input style={field} inputMode="url" placeholder={preset === "slack" ? "https://hooks.slack.com/services/…" : "https://api.example.com/v1"} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      </label>
      {preset === "custom" && (
        <>
          <label style={label}>Authentication
            <select style={field} value={authType} onChange={(e) => setAuthType(e.target.value as IntegrationAuth)}>
              {(Object.keys(AUTH_LABEL) as IntegrationAuth[]).map((k) => <option key={k} value={k}>{AUTH_LABEL[k]}</option>)}
            </select>
          </label>
          {authType === "header" && (
            <label style={label}>Header name
              <input style={field} maxLength={64} value={headerName} onChange={(e) => setHeaderName(e.target.value)} />
            </label>
          )}
          {authType === "oauth2_client_credentials" && (
            <>
              <label style={label}>Token URL<input style={field} inputMode="url" placeholder="https://auth.example.com/oauth/token" value={tokenUrl} onChange={(e) => setTokenUrl(e.target.value)} /></label>
              <label style={label}>Client ID<input style={field} value={clientId} onChange={(e) => setClientId(e.target.value)} /></label>
              <label style={label}>Scope (optional)<input style={field} value={scope} onChange={(e) => setScope(e.target.value)} /></label>
            </>
          )}
          {authType !== "none" && (
            <label style={label}>{authType === "basic" ? "username:password" : authType === "oauth2_client_credentials" ? "Client secret" : "API key or token"}
              <input style={field} type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </label>
          )}
        </>
      )}
      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <Button small primary onClick={create} disabled={busy || !name.trim() || !baseUrl.trim()}>{busy ? "Saving…" : "Save connection"}</Button>
        <span style={small}>Stored encrypted and never shown again. Only https addresses on the public internet are allowed.</span>
      </div>
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: 0 }}>{error}</p>}
    </div>
  );
}

function ConnectionRow({ c, onChanged }: { c: Integration; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); onChanged(); } catch (e) { setError(errText(e, "That did not work. Nothing was changed.")); } finally { setBusy(false); }
  };
  const kindText = c.kind === "webhook_in" ? `Incoming webhook${c.signed ? " · signed" : ""}` : c.preset === "slack" ? "Slack" : `API · ${c.baseUrl || ""} · ${AUTH_LABEL[c.authType || "none"]}`;
  return (
    <li style={{ padding: "12px 0", borderBottom: `1px solid ${V.divider}` }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 10 }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>{c.name}</span>
            <StatusDot label={c.status === "ACTIVE" ? (c.lastError ? "Needs attention" : "On") : "Off"} color={c.status !== "ACTIVE" ? V.neutralDot : c.lastError ? V.critical : V.positive} />
          </div>
          <p style={{ ...small, margin: "3px 0 0", wordBreak: "break-all" }}>{kindText}{c.lastUsedAt ? ` · last used ${ago(c.lastUsedAt)}` : " · not used yet"}</p>
          {c.lastError && <p style={{ ...small, color: V.critical, margin: "3px 0 0" }}>{c.lastError}</p>}
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
          {c.kind === "webhook_in" && <Button small disabled={busy} onClick={() => { if (window.confirm("Make a new URL? The old one stops working at once.")) run(async () => setNewUrl((await api.integrations.rotate(c.id)).webhookUrl)); }}>New URL</Button>}
          <Button small disabled={busy} onClick={() => run(() => (c.status === "ACTIVE" ? api.integrations.disable(c.id) : api.integrations.enable(c.id)))}>{c.status === "ACTIVE" ? "Turn off" : "Turn on"}</Button>
          <Button small disabled={busy} onClick={() => { if (window.confirm(`Delete "${c.name}"? Workflows that use it will stop at that step.`)) run(() => api.integrations.remove(c.id)); }}>Delete</Button>
        </div>
      </div>
      {newUrl && <div style={{ marginTop: 10 }}><Secret label="New webhook URL (shown once)" value={newUrl} /></div>}
      {error && <p style={{ ...small, color: V.critical, margin: "6px 0 0" }}>{error}</p>}
    </li>
  );
}

function EventsList({ events }: { events: IntegrationEvent[] }) {
  if (!events.length) return <p style={{ ...small, margin: 0 }}>Nothing has arrived yet. New Gmail messages and webhook requests appear here.</p>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
      {events.slice(0, 15).map((e) => (
        <li key={e.id} className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 12.5, color: V.body }}>
          <span style={{ ...small, width: 64 }}>{e.source === "gmail" ? "Gmail" : "Webhook"}</span>
          <span style={{ minWidth: 0, flex: "1 1 200px" }} className="truncate">
            {e.source === "gmail" ? `${e.preview.from || ""}: ${e.preview.subject || "(no subject)"}` : `${e.preview.eventType || "data"}${e.preview.keys?.length ? ` · ${e.preview.keys.join(", ")}` : ""}`}
          </span>
          <span style={small}>{ago(e.receivedAt)}{e.dispatchedAt ? "" : " · waiting"}</span>
        </li>
      ))}
    </ul>
  );
}

export default function IntegrationsPanel() {
  const [data, setData] = useState<IntegrationsResponse | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<"webhook" | "api" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, ev] = await Promise.all([api.integrations.list(), api.integrations.events().catch(() => ({ events: [] as IntegrationEvent[] }))]);
      setData(d); setEvents(ev.events);
    } catch (e) { setError(errText(e, "Could not load your connections.")); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return error ? <ErrorBanner>{error}</ErrorBanner> : <SkeletonRows rows={3} height={70} />;
  const hooks = data.connections.filter((c) => c.kind === "webhook_in");
  const apis = data.connections.filter((c) => c.kind === "http_api");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && <ErrorBanner>{error}</ErrorBanner>}
      <GmailCard data={data} onChanged={load} />

      <Card style={{ padding: 16 }}>
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <p style={heading}>Connect any other software</p>
            <p style={{ ...small, margin: "4px 0 0", lineHeight: 1.5 }}>
              Anything that can send a webhook (Stripe, Shopify, your CRM, Zapier, Make, a script) can start a workflow. Anything with a REST API, or a Slack channel, can be acted on from a workflow.
            </p>
          </div>
          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <Button small primary={adding === "webhook"} onClick={() => setAdding(adding === "webhook" ? null : "webhook")}>Incoming webhook</Button>
            <Button small primary={adding === "api"} onClick={() => setAdding(adding === "api" ? null : "api")}>API or Slack</Button>
          </div>
        </div>
        {adding && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${V.divider}` }}>
            {adding === "webhook" ? <NewWebhook onCreated={load} /> : <NewApi onCreated={() => { setAdding(null); load(); }} />}
          </div>
        )}
        {(hooks.length > 0 || apis.length > 0) && (
          <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}>
            {[...hooks, ...apis].map((c) => <ConnectionRow key={c.id} c={c} onChanged={load} />)}
          </ul>
        )}
        {!hooks.length && !apis.length && !adding && <p style={{ ...small, margin: "12px 0 0" }}>No connections yet.</p>}
      </Card>

      <Card style={{ padding: 16 }}>
        <p style={{ ...heading, marginBottom: 10 }}>What arrived</p>
        <EventsList events={events} />
      </Card>
    </div>
  );
}

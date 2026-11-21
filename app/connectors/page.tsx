"use client";

// Connected apps: any software with an HTTP API. Three ways in:
//   * the catalog (common apps, written from each vendor's public API docs,
//     marked "not yet verified" until a call succeeds for you);
//   * an OpenAPI or Swagger document (paste it or give its URL);
//   * an MCP server (its tools are listed live).
// Reads can be tried by any member. An operation that changes something in
// the other app needs an admin and an explicit confirmation here, and when an
// agent asks for one it always waits in Approvals. The server enforces all of
// this; the page only shows what it is told.

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Subnav } from "@/components/v32/ui";
import { platformApi, type AppConnection, type AppOperation, type AuthInput, type CatalogEntry, type SpecPreview, type CallResult } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, Loading, Chip, when, Section, Field, EmptyState, useAction, InlineError } from "@/components/platform/ui";
import { AuthFields, AUTH_LABEL, cleanAuth } from "@/components/platform/AuthFields";

type Tab = "apps" | "add" | "calls";
const STATUS: Record<AppConnection["status"], { label: string; tone?: "good" | "warn" | "bad" }> = {
  active: { label: "Active", tone: "good" },
  authorization_required: { label: "Needs authorization", tone: "warn" },
  disabled: { label: "Turned off" },
};
const SOURCE: Record<AppConnection["source"], string> = { catalog: "Catalog", openapi: "OpenAPI import", mcp: "MCP server" };
const host = (u: string) => { try { return new URL(u).host; } catch { return u; } };

export default function ConnectorsPage() {
  return <Suspense fallback={null}><Connectors /></Suspense>;
}

function Connectors() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const manage = can(ws.data, "connectors.manage");
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("apps");
  const [open, setOpen] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["platform", "app-connections", org], queryFn: () => platformApi.appConnections(), retry: false });
  const flash = params.get("connector");
  const apps = list.data?.connections || [];

  return (
    <DashboardLayout pageTitle="Connected apps">
      <PageHeader eyebrow="Organization" divider title="Connected apps" subtitle="Connect any software with an API, so agents can read from it and propose changes for approval"
        right={manage && tab !== "add" ? <Button primary onClick={() => setTab("add")}>Connect an app</Button> : null}>
        <Subnav label="Connected apps" active={tab} onChange={(k) => setTab(k as Tab)} items={[
          { key: "apps", label: "Apps", count: list.data ? apps.length : null },
          ...(manage ? [{ key: "add", label: "Connect an app" }] : []),
          { key: "calls", label: "Call log" },
        ]} />
      </PageHeader>
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        {flash && <div className={`pf-note ${flash === "error" ? "is-warn" : ""}`} role="status">{params.get("message") || (flash === "connected" ? "The app is connected." : "The app could not be connected.")}</div>}
        <PlatformErrorBanner error={list.error} what="Connected apps" />
        {tab === "apps" && (
          <>
            {list.isLoading && <Loading rows={4} />}
            {list.data && apps.length === 0 && (
              <EmptyState title="No apps connected yet" body="Connect a CRM, help desk, tracker or any API. Agents can then read live data from it, and anything that would change it waits for a person to approve."
                action={manage ? <Button primary onClick={() => setTab("add")}>Connect an app</Button> : <span style={{ fontSize: 13, color: "#6E6A63" }}>Ask an admin to connect one.</span>} />
            )}
            {apps.length > 0 && (
              <div className="pf-list">
                {apps.map((c) => (
                  <div key={c.id}>
                    <button type="button" className="pf-row" style={{ width: "100%", textAlign: "left", cursor: "pointer", background: "transparent", border: 0 }} onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                      <div className="pf-row-main">
                        <div className="pf-row-title">{c.name}</div>
                        <div className="pf-row-sub">{SOURCE[c.source]} · {host(c.baseUrl)} · {c.operationCounts.read} read, {c.operationCounts.external} that change data{c.lastUsedAt ? ` · Last used ${when(c.lastUsedAt)}` : ""}</div>
                        {c.lastError && <div style={{ fontSize: 12, color: "#A64F4B", marginTop: 3 }}>Last error: {c.lastError}</div>}
                      </div>
                      <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
                    </button>
                    {open === c.id && <ConnectionDetail id={c.id} manage={manage} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {tab === "add" && manage && <AddApp onDone={(id) => { setTab("apps"); setOpen(id); }} />}
        {tab === "calls" && <CallLog />}
      </div>
    </DashboardLayout>
  );
}

// ── One connection ──────────────────────────────────────────────────────

function ConnectionDetail({ id, manage }: { id: string; manage: boolean }) {
  const qc = useQueryClient();
  const org = useActiveOrg();
  const q = useQuery({ queryKey: ["platform", "app-connection", org, id], queryFn: () => platformApi.appConnection(id), retry: false });
  const act = useAction();
  const [creds, setCreds] = useState<AuthInput | null>(null);
  const [tryOp, setTryOp] = useState<AppOperation | null>(null);
  const c = q.data?.connection;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["platform", "app-connections"] }); qc.invalidateQueries({ queryKey: ["platform", "app-connection", org, id] }); };
  if (q.isLoading) return <div style={{ padding: "8px 0 16px" }}><Loading rows={2} /></div>;
  if (!c) return <div style={{ padding: "8px 0 16px" }}><PlatformErrorBanner error={q.error} what="This connection" /></div>;
  const ops = c.operations || [];
  const authorize = () => act.run(async () => { const r = await platformApi.authorizeApp(c.id, "/connectors"); window.location.href = r.authorizeUrl; });

  return (
    <div style={{ padding: "4px 0 20px" }}>
      <Section title="Connection" aside={<span style={{ fontSize: 12, color: "#8F8A81" }}>{AUTH_LABEL[c.auth.type]}{c.hasCredentials ? " · credential stored" : ""}</span>}>
        <div className="pf-stack" style={{ gap: 10 }}>
          <div style={{ fontSize: 13, color: "#3F3D39" }}>Base URL <code>{c.baseUrl}</code>{c.spec.title ? ` · ${c.spec.title}${c.spec.version ? ` ${c.spec.version}` : ""}` : ""}{c.spec.readOnly ? " · imported read only" : ""}</div>
          {c.source === "catalog" && <div className="pf-note is-warn">Catalog entries are written from the vendor&apos;s public API reference and have not been verified against a live account from Starlane. Try a read operation below to confirm it works for you.</div>}
          {c.source === "mcp" && <div className="pf-note">Every MCP tool is treated as able to change data, whatever the server says about it, so an agent&apos;s call always waits for approval.</div>}
          {c.status === "authorization_required" && c.auth.type === "oauth2_authorization_code" && manage && c.hasCredentials && (
            <div className="pf-note is-warn">Sign in to {c.name} to finish connecting. <Button small primary onClick={authorize} disabled={act.busy}>Authorize</Button></div>
          )}
          {manage && (
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {c.auth.type !== "none" && <Button small onClick={() => setCreds(creds ? null : { type: c.auth.type, in: c.auth.in || undefined, name: c.auth.name || undefined, clientId: c.auth.clientId || undefined, scopes: c.auth.scopes.join(" ") })}>{c.hasCredentials ? "Replace credential" : "Add credential"}</Button>}
              {c.auth.type === "oauth2_authorization_code" && c.hasCredentials && c.status !== "authorization_required" && <Button small onClick={authorize} disabled={act.busy}>Authorize again</Button>}
              {c.source === "mcp" && <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.refreshMcpTools(c.id); refresh(); })}>List tools again</Button>}
              {c.status !== "authorization_required" && <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.setAppEnabled(c.id, c.status === "disabled"); refresh(); })}>{c.status === "disabled" ? "Turn on" : "Turn off"}</Button>}
              <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Remove ${c.name}? Agents that use it will stop being able to.`)) act.run(async () => { await platformApi.removeApp(c.id); refresh(); }); }}>Remove</Button>
            </div>
          )}
          {creds && (
            <div className="pf-stack" style={{ gap: 10, paddingTop: 6 }}>
              <AuthFields value={creds} onChange={setCreds} lockType hideUrls existing />
              <div><Button small primary disabled={act.busy} onClick={() => act.run(async () => { await platformApi.setAppCredentials(c.id, cleanAuth(creds)); setCreds(null); refresh(); })}>Save credential</Button></div>
            </div>
          )}
          <InlineError error={act.error} />
        </div>
      </Section>
      <Section title={c.source === "mcp" ? `Tools (${ops.length})` : `Operations (${ops.length})`} description="Reads go straight through. Anything that changes data in the other app needs an admin here, and an approval when an agent asks for it.">
        <div className="pf-list">
          {ops.map((o) => (
            <div key={o.id} className="pf-row">
              <div className="pf-row-main">
                <div className="pf-row-title"><code style={{ fontSize: 12 }}>{o.method}</code> {o.summary || o.id}</div>
                <div className="pf-row-sub">{o.id}{o.path ? ` · ${o.path}` : ""}{o.readOnlyHint ? " · server says read only (not trusted)" : ""}</div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <Chip tone={o.risk === "read" ? undefined : "warn"}>{o.risk === "read" ? "Reads" : "Changes data"}</Chip>
                {c.status === "active" && (o.risk === "read" || manage) && <Button small onClick={() => setTryOp(tryOp?.id === o.id ? null : o)}>Try</Button>}
              </div>
            </div>
          ))}
        </div>
        {tryOp && <TryOperation connection={c} op={tryOp} key={tryOp.id} />}
      </Section>
    </div>
  );
}

function TryOperation({ connection, op }: { connection: AppConnection; op: AppOperation }) {
  const qc = useQueryClient();
  const act = useAction();
  const mcp = connection.source === "mcp";
  const [values, setValues] = useState<Record<string, string>>({});
  const [args, setArgs] = useState("{}");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<CallResult | null>(null);
  const external = op.risk !== "read";
  const run = () => act.run(async () => {
    let params: Record<string, unknown> = {};
    if (mcp) {
      try { params = JSON.parse(args || "{}"); } catch { throw new Error("The arguments must be JSON."); }
    } else {
      for (const [k, v] of Object.entries(values)) if (v !== "") params[k] = v;
    }
    let parsedBody: unknown = undefined;
    if (!mcp && body.trim()) { try { parsedBody = JSON.parse(body); } catch { throw new Error("The body must be JSON."); } }
    const r = await platformApi.callApp(connection.id, { operationId: op.id, params, body: parsedBody, confirm: external ? confirm : undefined });
    setResult(r.result);
    qc.invalidateQueries({ queryKey: ["platform", "connector-calls"] });
  });
  return (
    <div className="pf-stack" style={{ gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid #EBEAE6" }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>Try {op.id}</div>
      {mcp ? (
        <Field label="Arguments (JSON)" htmlFor="try-args"><textarea id="try-args" className="pf-textarea" rows={4} value={args} onChange={(e) => setArgs(e.target.value)} /></Field>
      ) : (
        (op.parameters || []).length > 0 && (
          <div className="pf-grid2">
            {(op.parameters || []).map((p) => (
              <Field key={`${p.in}.${p.name}`} label={`${p.name}${p.required ? " *" : ""}`} hint={`${p.in}${p.description ? ` · ${p.description.slice(0, 80)}` : ""}`} htmlFor={`try-${p.name}`}>
                <input id={`try-${p.name}`} className="pf-input" value={values[p.name] || ""} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} />
              </Field>
            ))}
          </div>
        )
      )}
      {!mcp && op.body && <Field label={`Body (JSON)${op.body.required ? " *" : ""}`} htmlFor="try-body"><textarea id="try-body" className="pf-textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>}
      {external && <label className="pf-toggle"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I understand this changes data in {connection.name}</label>}
      <div><Button small primary disabled={act.busy || (external && !confirm)} onClick={run}>{act.busy ? "Calling…" : "Call"}</Button></div>
      <InlineError error={act.error} />
      {result && (
        <div className="pf-stack" style={{ gap: 6 }}>
          <div style={{ fontSize: 12.5, color: result.ok ? "#477054" : "#A64F4B" }}>HTTP {result.status} · {result.ok ? "succeeded" : "failed"}</div>
          <pre className="pf-pre" style={{ maxHeight: 320, overflow: "auto" }}>{result.json != null ? JSON.stringify(result.json, null, 2) : (result.text || result.bodyPreview || "(empty)")}</pre>
        </div>
      )}
    </div>
  );
}

// ── Adding an app ───────────────────────────────────────────────────────

function AddApp({ onDone }: { onDone: (id: string) => void }) {
  const [mode, setMode] = useState<"catalog" | "openapi" | "mcp">("catalog");
  return (
    <div className="pf-stack" style={{ gap: 14 }}>
      <Subnav label="How to connect" active={mode} onChange={(k) => setMode(k as typeof mode)} items={[
        { key: "catalog", label: "Common apps" },
        { key: "openapi", label: "Any API (OpenAPI)" },
        { key: "mcp", label: "MCP server" },
      ]} />
      {mode === "catalog" && <FromCatalog onDone={onDone} />}
      {mode === "openapi" && <FromOpenApi onDone={onDone} />}
      {mode === "mcp" && <FromMcp onDone={onDone} />}
    </div>
  );
}

function useCreated(onDone: (id: string) => void) {
  const qc = useQueryClient();
  return (c: AppConnection) => { qc.invalidateQueries({ queryKey: ["platform", "app-connections"] }); onDone(c.id); };
}

function FromCatalog({ onDone }: { onDone: (id: string) => void }) {
  const org = useActiveOrg();
  const q = useQuery({ queryKey: ["platform", "connector-catalog", org], queryFn: () => platformApi.connectorCatalog(), retry: false, staleTime: 300_000 });
  const [pick, setPick] = useState<CatalogEntry | null>(null);
  const [search, setSearch] = useState("");
  const created = useCreated(onDone);
  const act = useAction();
  const [auth, setAuth] = useState<AuthInput>({});
  const [fields, setFields] = useState<Record<string, string>>({});
  const [readOnly, setReadOnly] = useState(true);
  const items = useMemo(() => (q.data?.catalog || []).filter((c) => !search || `${c.name} ${c.category}`.toLowerCase().includes(search.toLowerCase())), [q.data, search]);
  const choose = (c: CatalogEntry) => { setPick(c); setAuth({ type: c.auth.type, in: c.auth.in, name: c.auth.name, scopes: (c.auth.scopes || []).join(" ") }); setFields({}); setReadOnly(true); };

  if (q.isLoading) return <Loading rows={4} />;
  if (!q.data) return <PlatformErrorBanner error={q.error} what="The catalog" />;
  if (pick) {
    return (
      <Section title={`Connect ${pick.name}`} aside={<Button small onClick={() => setPick(null)}>Back</Button>}>
        <div className="pf-stack" style={{ gap: 12 }}>
          <div className="pf-note is-warn">Written from <a className="underline" href={pick.docs} target="_blank" rel="noreferrer">{pick.name}&apos;s API reference</a>; not yet verified against a live account. {pick.auth.hint}</div>
          {pick.baseUrlFields.map((f) => (
            <Field key={f.name} label={f.label} htmlFor={`bf-${f.name}`}>
              <input id={`bf-${f.name}`} className="pf-input" value={fields[f.name] || ""} onChange={(e) => setFields({ ...fields, [f.name]: e.target.value })} />
            </Field>
          ))}
          <AuthFields value={auth} onChange={setAuth} lockType hideUrls redirectUri={q.data.oauthRedirectUri} />
          <label className="pf-toggle"><input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />Read only: leave out the {pick.operations.filter((o) => o.risk !== "read").length} operations that change data</label>
          <div><Button primary disabled={act.busy} onClick={() => act.run(async () => { const r = await platformApi.addCatalogApp({ catalogKey: pick.key, readOnly, baseUrlFields: fields, auth: cleanAuth(auth) }); created(r.connection); })}>Connect</Button></div>
          <InlineError error={act.error} />
        </div>
      </Section>
    );
  }
  return (
    <div className="pf-stack" style={{ gap: 12 }}>
      <input className="pf-input" placeholder="Search apps" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search apps" style={{ maxWidth: 320 }} />
      <div className="pf-list">
        {items.map((c) => (
          <div key={c.key} className="pf-row">
            <div className="pf-row-main">
              <div className="pf-row-title">{c.name}</div>
              <div className="pf-row-sub">{c.category} · {AUTH_LABEL[c.auth.type]} · {c.operations.length} operations · not yet verified</div>
            </div>
            <Button small onClick={() => choose(c)}>Connect</Button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "#6E6A63" }}>Not listed? Import its OpenAPI document or add its MCP server: anything with a documented HTTP API can be connected.</p>
    </div>
  );
}

function FromOpenApi({ onDone }: { onDone: (id: string) => void }) {
  const created = useCreated(onDone);
  const act = useAction();
  const [specUrl, setSpecUrl] = useState("");
  const [spec, setSpec] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [preview, setPreview] = useState<SpecPreview | null>(null);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [auth, setAuth] = useState<AuthInput>({ type: "none" });
  const source = spec.trim() ? { spec } : { specUrl: specUrl.trim() };
  const doPreview = () => act.run(async () => {
    const r = await platformApi.previewOpenApi({ ...source, readOnly });
    setPreview(r.preview); setName(r.preview.title); setBaseUrl(r.preview.baseUrl || "");
    const a = (r.preview.auth || { type: "none" }) as AuthInput & { scopes?: string | string[] };
    setAuth({ ...a, scopes: Array.isArray(a.scopes) ? a.scopes.join(" ") : a.scopes });
  });
  return (
    <Section title="Import an OpenAPI or Swagger document" description="OpenAPI 3 or Swagger 2, JSON or YAML. GET operations become reads; everything else is treated as changing data, whatever the document says.">
      <div className="pf-stack" style={{ gap: 12 }}>
        <Field label="Document URL" htmlFor="spec-url"><input id="spec-url" className="pf-input" value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} placeholder="https://api.example.com/openapi.json" /></Field>
        <Field label="Or paste the document" htmlFor="spec-text"><textarea id="spec-text" className="pf-textarea" rows={6} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="openapi: 3.0.0 …" /></Field>
        <label className="pf-toggle"><input type="checkbox" checked={readOnly} onChange={(e) => { setReadOnly(e.target.checked); setPreview(null); }} />Read only: import GET operations only</label>
        <div><Button disabled={act.busy || (!spec.trim() && !specUrl.trim())} onClick={doPreview}>{act.busy && !preview ? "Reading…" : "Preview"}</Button></div>
        {preview && (
          <>
            <div className="pf-note">{preview.title}{preview.version ? ` ${preview.version}` : ""} · {preview.format} · {preview.operations.filter((o) => o.risk === "read").length} read and {preview.operations.filter((o) => o.risk !== "read").length} data-changing operations{preview.totalOperations > preview.operations.length ? ` (of ${preview.totalOperations} in the document)` : ""}</div>
            <div className="pf-list" style={{ maxHeight: 260, overflow: "auto" }}>
              {preview.operations.map((o) => (
                <div key={o.id} className="pf-row"><div className="pf-row-main"><div className="pf-row-title"><code style={{ fontSize: 12 }}>{o.method}</code> {o.path}</div><div className="pf-row-sub">{o.summary || o.id}</div></div><Chip tone={o.risk === "read" ? undefined : "warn"}>{o.risk === "read" ? "Reads" : "Changes data"}</Chip></div>
              ))}
            </div>
            <div className="pf-grid2">
              <Field label="Name" htmlFor="oa-name"><input id="oa-name" className="pf-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="API base URL" htmlFor="oa-base" hint="https only. Calls can never leave this URL."><input id="oa-base" className="pf-input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></Field>
            </div>
            <AuthFields value={auth} onChange={setAuth} />
            <div><Button primary disabled={act.busy} onClick={() => act.run(async () => { const r = await platformApi.importOpenApi({ ...source, readOnly, name, baseUrl, auth: cleanAuth(auth) }); created(r.connection); })}>Import and connect</Button></div>
          </>
        )}
        <InlineError error={act.error} />
      </div>
    </Section>
  );
}

function FromMcp({ onDone }: { onDone: (id: string) => void }) {
  const created = useCreated(onDone);
  const act = useAction();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [auth, setAuth] = useState<AuthInput>({ type: "none" });
  return (
    <Section title="Add an MCP server" description="A remote Model Context Protocol server over Streamable HTTP. Starlane lists its tools now; each tool call by an agent waits for approval.">
      <div className="pf-stack" style={{ gap: 12 }}>
        <div className="pf-grid2">
          <Field label="Server URL" htmlFor="mcp-url"><input id="mcp-url" className="pf-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" /></Field>
          <Field label="Name (optional)" htmlFor="mcp-name"><input id="mcp-name" className="pf-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        </div>
        <AuthFields value={auth} onChange={setAuth} types={["none", "bearer", "api_key"]} />
        <div><Button primary disabled={act.busy || !url.trim()} onClick={() => act.run(async () => { const r = await platformApi.addMcpServer({ url: url.trim(), name: name.trim() || undefined, auth: cleanAuth(auth.type === "api_key" ? { ...auth, in: "header" } : auth) }); created(r.connection); })}>{act.busy ? "Listing tools…" : "Add server"}</Button></div>
        <InlineError error={act.error} />
      </div>
    </Section>
  );
}

// ── Call log ────────────────────────────────────────────────────────────

function CallLog() {
  const org = useActiveOrg();
  const q = useQuery({ queryKey: ["platform", "connector-calls", org], queryFn: () => platformApi.connectorCalls(), retry: false });
  if (q.isLoading) return <Loading rows={4} />;
  if (!q.data) return <PlatformErrorBanner error={q.error} what="The call log" />;
  if (!q.data.calls.length) return <EmptyState title="No calls yet" body="Every call to a connected app, by a person or an agent, is listed here: who, which operation, the status and how long it took. Request and response bodies are not stored." />;
  return (
    <div className="pf-list">
      {q.data.calls.map((c) => (
        <div key={c.id} className="pf-row">
          <div className="pf-row-main">
            <div className="pf-row-title">{c.connection_name || "Removed connection"} · <code style={{ fontSize: 12 }}>{c.method}</code> {c.operation_id}</div>
            <div className="pf-row-sub">
              {c.actor_kind === "agent" ? "Agent" : c.actor_email || "Someone"} · {when(c.created_at)}{c.duration_ms != null ? ` · ${c.duration_ms} ms` : ""}{c.error ? ` · ${c.error}` : ""}
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            {c.risk !== "read" && <Chip tone="warn">Changed data</Chip>}
            <Chip tone={c.ok ? "good" : "bad"}>{c.status_code ? `HTTP ${c.status_code}` : c.ok ? "OK" : "Failed"}</Chip>
          </div>
        </div>
      ))}
    </div>
  );
}

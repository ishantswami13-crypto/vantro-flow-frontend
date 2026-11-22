"use client";

// Sign-in security on the Security and privacy page:
//   TwoStepSignIn   your own authenticator app and recovery codes
//   Passkeys        passkeys on your phone, laptop or security key
//   SignedInDevices where you are signed in, ending one or all sessions
//   MfaRule         who in the organization must use a second factor (admins)
//   SessionLength   how long a sign-in lasts in the workspace (admins)
//   SingleSignOn    the organization's SAML or OpenID Connect provider, its
//                   verified email domains, a test sign-in, and enforcement
// The server decides everything; secrets typed here are sent once and never
// shown again.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, saveAuth, clearAuth, type AccountSession } from "@/lib/api";
import { platformApi, type MfaRequiredFor, type SsoSettings } from "@/lib/platform";
import { Button } from "@/components/v32/ui";
import { useActiveOrg, PlatformErrorBanner, Loading, Chip, when, Section, Field, useAction, InlineError } from "@/components/platform/ui";

function CodeInput({ value, onChange, id, label = "Code from your authenticator app" }: { value: string; onChange: (v: string) => void; id: string; label?: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <input id={id} className="pf-input" inputMode="numeric" autoComplete="one-time-code" maxLength={14} placeholder="123 456" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 200 }} />
    </Field>
  );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
  const text = codes.join("\n");
  return (
    <div className="pf-note is-warn" role="status">
      <div style={{ fontWeight: 500, marginBottom: 6 }}>Save these recovery codes now. Each works once if you lose your phone. They will not be shown again.</div>
      <pre className="pf-pre" style={{ columns: 2, margin: "6px 0" }}>{text}</pre>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <Button small onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); }}>Copy</Button>
        <Button small onClick={() => {
          const url = URL.createObjectURL(new Blob([`Starlane recovery codes\n\n${text}\n`], { type: "text/plain" }));
          const a = document.createElement("a"); a.href = url; a.download = "starlane-recovery-codes.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}>Download</Button>
      </div>
    </div>
  );
}

export function TwoStepSignIn() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["auth", "mfa"], queryFn: () => api.auth.mfaStatus(), retry: false });
  const act = useAction();
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<"none" | "disable" | "regen">("none");
  useEffect(() => {
    if (!setup) { setQr(null); return; }
    import("qrcode").then((m) => m.toDataURL(setup.otpauthUri, { margin: 1, width: 180 })).then(setQr).catch(() => setQr(null));
  }, [setup]);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["auth", "mfa"] }); qc.invalidateQueries({ queryKey: ["auth", "account-sessions"] }); qc.invalidateQueries({ queryKey: ["platform", "workspace"] }); };
  const s = q.data;

  return (
    <Section title="Two-step sign-in" description="After your password (or Google, Apple or phone), Starlane asks for a 6-digit code from an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password."
      aside={s ? <Chip tone={s.enabled ? "good" : undefined}>{s.enabled ? "On" : "Off"}</Chip> : null}>
      {q.isLoading && <Loading rows={2} />}
      {q.error && <InlineError error={q.error instanceof Error ? q.error.message : "Could not load."} />}
      {s && (
        <div className="pf-stack" style={{ gap: 12 }}>
          {codes && <RecoveryCodes codes={codes} />}
          {!s.enabled && !setup && (
            <>
              {!s.canEnable && <div className="pf-note is-warn">This server has no encryption key for sign-in secrets yet (OUTBOUND_CREDENTIALS_KEY), so two-step sign-in cannot be turned on.</div>}
              <div><Button primary disabled={!s.canEnable || act.busy} onClick={() => act.run(async () => { setSetup(await api.auth.mfaSetup()); setCode(""); })}>Set up two-step sign-in</Button></div>
            </>
          )}
          {!s.enabled && setup && (
            <>
              <div className="flex flex-wrap" style={{ gap: 18, alignItems: "flex-start" }}>
                {qr ? <img src={qr} alt="QR code to add Starlane to your authenticator app" width={180} height={180} style={{ borderRadius: 8, border: "1px solid #E4E1DA" }} /> : <div style={{ width: 180, height: 180 }} />}
                <div className="pf-stack" style={{ gap: 8, maxWidth: 420 }}>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>1. Scan the code with your authenticator app. On a phone, <a className="underline" href={setup.otpauthUri}>open it in the app</a>.</div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>Or type this key: <code style={{ wordBreak: "break-all" }}>{setup.secret.match(/.{1,4}/g)?.join(" ")}</code></div>
                  <div style={{ fontSize: 13, lineHeight: 1.55 }}>2. Enter the 6-digit code the app shows.</div>
                  <CodeInput id="mfa-confirm" value={code} onChange={setCode} label="Code" />
                  <div className="flex" style={{ gap: 8 }}>
                    <Button primary disabled={act.busy || code.replace(/\s/g, "").length !== 6} onClick={() => act.run(async () => {
                      const r = await api.auth.mfaConfirm(code.replace(/\s/g, ""));
                      // This browser proved the factor: keep the session that says so.
                      await saveAuth(r.token, r.user, true, r.csrf_token);
                      setCodes(r.recoveryCodes); setSetup(null); setCode(""); refresh();
                    })}>Turn on</Button>
                    <Button onClick={() => { setSetup(null); setCode(""); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            </>
          )}
          {s.enabled && (
            <>
              <div style={{ fontSize: 13, color: "#3F3D39" }}>On since {when(s.enabledAt)} · {s.recoveryCodesLeft} recovery code{s.recoveryCodesLeft === 1 ? "" : "s"} left{s.sessionVerified ? "" : " · this browser signed in before it was on; sign out and back in to use it here"}</div>
              {mode === "none" && (
                <div className="flex flex-wrap" style={{ gap: 8 }}>
                  <Button small onClick={() => { setMode("regen"); setCode(""); }}>New recovery codes</Button>
                  <Button small onClick={() => { setMode("disable"); setCode(""); }}>Turn off</Button>
                </div>
              )}
              {mode !== "none" && (
                <div className="pf-stack" style={{ gap: 8 }}>
                  <CodeInput id="mfa-manage" value={code} onChange={setCode} label="Code from your app, or a recovery code" />
                  <div className="flex" style={{ gap: 8 }}>
                    <Button small primary disabled={act.busy || code.trim().length < 6} onClick={() => act.run(async () => {
                      if (mode === "disable") await api.auth.mfaDisable(code.trim());
                      else setCodes((await api.auth.mfaRecoveryCodes(code.trim())).recoveryCodes);
                      setMode("none"); setCode(""); refresh();
                    })}>{mode === "disable" ? "Turn off two-step sign-in" : "Replace recovery codes"}</Button>
                    <Button small onClick={() => setMode("none")}>Cancel</Button>
                  </div>
                </div>
              )}
            </>
          )}
          <InlineError error={act.error} />
        </div>
      )}
    </Section>
  );
}

const RULES: { value: MfaRequiredFor; label: string }[] = [
  { value: "none", label: "Not required" },
  { value: "admins", label: "Required for owners and admins" },
  { value: "everyone", label: "Required for everyone" },
];

export function MfaRule({ manage }: { manage: boolean }) {
  const org = useActiveOrg();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "mfa-policy", org], queryFn: () => platformApi.mfaPolicy(), retry: false });
  const act = useAction();
  return (
    <Section title="Organization rule" description="Members it covers can only use the workspace from a sign-in that passed a second factor, or this organization's single sign-on. To avoid locking yourself out, turn it on for your own account first.">
      {q.isLoading ? <Loading rows={1} /> : q.data ? (
        <div className="pf-stack" style={{ gap: 10 }}>
          <select className="pf-select" style={{ maxWidth: 360 }} disabled={!manage || act.busy} value={q.data.requiredFor} aria-label="Who must use two-step sign-in"
            onChange={(e) => act.run(async () => { await platformApi.setMfaPolicy(e.target.value as MfaRequiredFor); qc.invalidateQueries({ queryKey: ["platform", "mfa-policy"] }); qc.invalidateQueries({ queryKey: ["platform", "workspace"] }); })}>
            {RULES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <InlineError error={act.error} />
        </div>
      ) : <PlatformErrorBanner error={q.error} what="The sign-in rule" />}
    </Section>
  );
}

export function SingleSignOn({ flash }: { flash: { tested: boolean; error: string | null } }) {
  const org = useActiveOrg();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "sso", org], queryFn: () => platformApi.sso(), retry: false });
  const act = useAction();
  const [form, setForm] = useState({ issuer: "", clientId: "", clientSecret: "", jitRole: "member" });
  const [protocol, setProtocol] = useState<"oidc" | "saml">("saml");
  const [saml, setSaml] = useState({ how: "metadata" as "metadata" | "manual", metadataXml: "", entityId: "", ssoUrl: "", certificate: "", emailAttribute: "" });
  const [domain, setDomain] = useState("");
  const d = q.data;
  useEffect(() => {
    const k = d?.connection;
    if (!k) return;
    setProtocol(k.protocol);
    setForm((f) => ({ ...f, issuer: k.protocol === "oidc" ? k.issuer : "", clientId: k.clientId ?? "", jitRole: k.jitRole }));
    if (k.protocol === "saml") setSaml((x) => ({ ...x, entityId: k.issuer, ssoUrl: k.saml?.ssoUrl || "", emailAttribute: k.saml?.emailAttribute || "" }));
  }, [d?.connection]);
  const set = (v: SsoSettings) => qc.setQueryData(["platform", "sso", org], v);
  const c = d?.connection;
  const verified = (d?.domains || []).some((x) => x.verified);

  if (q.isLoading) return <Loading rows={4} />;
  if (!d) return <PlatformErrorBanner error={q.error} what="Single sign-on" />;
  return (
    <>
      {flash.tested && <div className="pf-note" role="status">The test sign-in worked. Single sign-on is active for verified domains.</div>}
      {flash.error && <div className="pf-note is-warn" role="status">The test sign-in failed: {flash.error}</div>}
      <Section title="Identity provider" aside={c ? <Chip tone={c.status === "active" ? "good" : "warn"}>{c.protocol === "saml" ? "SAML · " : "OIDC · "}{c.status === "active" ? (c.enforce ? "Active, required" : "Active") : "Draft: test it"}</Chip> : null}
        description="Works with Okta, Microsoft Entra ID, Google Workspace, OneLogin, JumpCloud, Ping, ADFS, Auth0, Keycloak and any other SAML 2.0 or OpenID Connect provider. Automatic user provisioning (SCIM) is not available yet.">
        <div className="pf-stack" style={{ gap: 12 }}>
          <div className="pf-seg" role="radiogroup" aria-label="Protocol" style={{ display: "flex", gap: 8 }}>
            {(["saml", "oidc"] as const).map((p) => (
              <label key={p} className="pf-toggle"><input type="radio" name="sso-protocol" checked={protocol === p} onChange={() => setProtocol(p)} />{p === "saml" ? "SAML 2.0" : "OpenID Connect"}</label>
            ))}
          </div>
          {protocol === "oidc" ? (
            <>
              <div className="pf-note">In your provider, create a web application with this redirect URL: <code style={{ wordBreak: "break-all" }}>{d.redirectUri}</code></div>
              <div className="pf-grid2">
                <Field label="Issuer URL" htmlFor="sso-issuer" hint="For example https://yourcompany.okta.com"><input id="sso-issuer" className="pf-input" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></Field>
                <Field label="Client ID" htmlFor="sso-client"><input id="sso-client" className="pf-input" autoComplete="off" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
                <Field label="Client secret" htmlFor="sso-secret" hint={c?.hasClientSecret ? "Stored encrypted. Enter a new one only to replace it." : "Stored encrypted and never shown again."}><input id="sso-secret" className="pf-input" type="password" autoComplete="off" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></Field>
                <RoleField value={form.jitRole} onChange={(v) => setForm({ ...form, jitRole: v })} />
              </div>
            </>
          ) : (
            <>
              {d.serviceProvider && (
                <div className="pf-note">
                  <div style={{ marginBottom: 4 }}>In your provider, create a SAML application with these values, or give it the metadata URL:</div>
                  <div>Entity ID (audience): <code style={{ wordBreak: "break-all" }}>{d.serviceProvider.entityId}</code></div>
                  <div>ACS (reply) URL: <code style={{ wordBreak: "break-all" }}>{d.serviceProvider.acsUrl}</code></div>
                  <div>Metadata: <a className="underline" href={d.serviceProvider.metadataUrl} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>{d.serviceProvider.metadataUrl}</a></div>
                  <div style={{ marginTop: 4 }}>Name ID: email address. Assertions must be signed (SHA-256).</div>
                </div>
              )}
              {c?.protocol === "saml" && c.saml && (
                <div className="pf-list">
                  {c.saml.certificates.map((x, i) => (
                    <div key={x.sha256 || i} className="pf-row">
                      <div className="pf-row-main">
                        <div className="pf-row-title">Signing certificate {c.saml!.certificates.length > 1 ? i + 1 : ""}</div>
                        <div className="pf-row-sub">{x.subject}{x.validTo ? ` · valid until ${new Date(x.validTo).toLocaleDateString()}` : ""}</div>
                      </div>
                      <Chip tone={x.expired ? "warn" : "good"}>{x.expired ? "Expired" : "Valid"}</Chip>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex" style={{ gap: 12 }}>
                <label className="pf-toggle"><input type="radio" name="saml-how" checked={saml.how === "metadata"} onChange={() => setSaml({ ...saml, how: "metadata" })} />Paste the provider&apos;s metadata XML</label>
                <label className="pf-toggle"><input type="radio" name="saml-how" checked={saml.how === "manual"} onChange={() => setSaml({ ...saml, how: "manual" })} />Enter the values</label>
              </div>
              {saml.how === "metadata" ? (
                <Field label="Identity provider metadata XML" htmlFor="saml-meta" hint="Download it from your provider's SAML application page.">
                  <textarea id="saml-meta" className="pf-input" rows={6} spellCheck={false} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} value={saml.metadataXml} onChange={(e) => setSaml({ ...saml, metadataXml: e.target.value })} />
                </Field>
              ) : (
                <div className="pf-grid2">
                  <Field label="Provider entity ID (issuer)" htmlFor="saml-entity"><input id="saml-entity" className="pf-input" value={saml.entityId} onChange={(e) => setSaml({ ...saml, entityId: e.target.value })} /></Field>
                  <Field label="Sign-in URL (SSO URL)" htmlFor="saml-url"><input id="saml-url" className="pf-input" value={saml.ssoUrl} onChange={(e) => setSaml({ ...saml, ssoUrl: e.target.value })} /></Field>
                  <Field label="Signing certificate (PEM)" htmlFor="saml-cert" hint={c?.protocol === "saml" ? "Paste it again to save changes." : undefined}>
                    <textarea id="saml-cert" className="pf-input" rows={4} spellCheck={false} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder="-----BEGIN CERTIFICATE-----" value={saml.certificate} onChange={(e) => setSaml({ ...saml, certificate: e.target.value })} />
                  </Field>
                </div>
              )}
              <div className="pf-grid2">
                <Field label="Email attribute (optional)" htmlFor="saml-email" hint="Only if the Name ID is not the email address."><input id="saml-email" className="pf-input" autoComplete="off" value={saml.emailAttribute} onChange={(e) => setSaml({ ...saml, emailAttribute: e.target.value })} /></Field>
                <RoleField value={form.jitRole} onChange={(v) => setForm({ ...form, jitRole: v })} />
              </div>
            </>
          )}
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Button primary disabled={act.busy || (protocol === "oidc" ? !form.issuer || !form.clientId : saml.how === "metadata" ? !saml.metadataXml.trim() : !saml.entityId || !saml.ssoUrl || !saml.certificate)} onClick={() => act.run(async () => {
              if (protocol === "oidc") {
                set(await platformApi.saveSso({ protocol: "oidc", issuer: form.issuer.trim(), clientId: form.clientId.trim(), clientSecret: form.clientSecret || undefined, jitRole: form.jitRole }));
                setForm((f) => ({ ...f, clientSecret: "" }));
              } else {
                const common = { protocol: "saml" as const, emailAttribute: saml.emailAttribute.trim() || undefined, jitRole: form.jitRole };
                set(await platformApi.saveSso(saml.how === "metadata" ? { ...common, metadataXml: saml.metadataXml } : { ...common, entityId: saml.entityId.trim(), ssoUrl: saml.ssoUrl.trim(), certificate: saml.certificate }));
                setSaml((x) => ({ ...x, metadataXml: "", certificate: "" }));
              }
            })}>Save</Button>
            {c && <Button disabled={act.busy || !verified} title={verified ? undefined : "Verify a domain first"} onClick={() => act.run(async () => { window.location.href = (await platformApi.testSso()).authorizeUrl; })}>Run a test sign-in</Button>}
            {c && <Button disabled={act.busy} onClick={() => { if (window.confirm("Remove single sign-on? People will sign in with their other methods.")) act.run(async () => { await platformApi.removeSso(); qc.invalidateQueries({ queryKey: ["platform", "sso"] }); }); }}>Remove</Button>}
          </div>
          {c && protocol !== c.protocol && <p style={{ fontSize: 12.5, color: "#6E6A63", margin: 0 }}>Saving replaces the current {c.protocol === "saml" ? "SAML" : "OpenID Connect"} connection, which then needs a new test sign-in.</p>}
        </div>
      </Section>
      <Section title="Email domains" description="Single sign-on applies to emails on domains you prove you control, with a DNS TXT record. Public mail services like gmail.com cannot be claimed.">
        <div className="pf-stack" style={{ gap: 10 }}>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <input className="pf-input" style={{ maxWidth: 260 }} placeholder="yourcompany.com" aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <Button disabled={act.busy || !domain.trim()} onClick={() => act.run(async () => { set(await platformApi.addSsoDomain(domain.trim())); setDomain(""); })}>Add domain</Button>
          </div>
          <div className="pf-list">
            {d.domains.map((x) => (
              <div key={x.domain} className="pf-row" style={{ alignItems: "flex-start" }}>
                <div className="pf-row-main">
                  <div className="pf-row-title">{x.domain}</div>
                  {!x.verified && <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>Add a TXT record named <code>{x.dnsRecord.name}</code> with the value <code style={{ wordBreak: "break-all" }}>{x.dnsRecord.value}</code>, then verify.</div>}
                  {x.verified && <div className="pf-row-sub">Verified {when(x.verifiedAt)}</div>}
                </div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <Chip tone={x.verified ? "good" : "warn"}>{x.verified ? "Verified" : "Not verified"}</Chip>
                  {!x.verified && <Button small disabled={act.busy} onClick={() => act.run(async () => set(await platformApi.verifySsoDomain(x.domain)))}>Verify</Button>}
                  <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.removeSsoDomain(x.domain); qc.invalidateQueries({ queryKey: ["platform", "sso"] }); })}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
      {c && (
        <Section title="Require single sign-on" description="People with an email on a verified domain must then sign in through your provider: passwords, Google, Apple and phone codes stop working for them. The organization's owner keeps their other methods in case the provider fails.">
          <label className="pf-toggle"><input type="checkbox" disabled={act.busy || c.status !== "active" || !verified} checked={c.enforce} onChange={(e) => act.run(async () => set(await platformApi.enforceSso(e.target.checked)))} />Require single sign-on for verified domains</label>
          {(c.status !== "active" || !verified) && <p style={{ fontSize: 12.5, color: "#6E6A63", margin: "6px 0 0" }}>Available after a domain is verified and a test sign-in passes.</p>}
        </Section>
      )}
      <InlineError error={act.error} />
    </>
  );
}

function RoleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Role for people who join through SSO" htmlFor="sso-role">
      <select id="sso-role" className="pf-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="viewer">Viewer</option><option value="member">Member</option><option value="admin">Admin</option>
      </select>
    </Field>
  );
}

const isCancel = (e: unknown) => e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError");

export function Passkeys() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["auth", "passkeys"], queryFn: () => api.auth.passkeys(), retry: false });
  const act = useAction();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [supported, setSupported] = useState(true);
  useEffect(() => { setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential); }, []);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["auth", "passkeys"] }); qc.invalidateQueries({ queryKey: ["auth", "mfa"] }); qc.invalidateQueries({ queryKey: ["auth", "account-sessions"] }); qc.invalidateQueries({ queryKey: ["platform", "workspace"] }); };
  const list = q.data?.passkeys || [];

  const add = () => act.run(async () => {
    const { startRegistration } = await import("@simplewebauthn/browser");
    const { options } = await api.auth.passkeyRegisterOptions();
    let response;
    try { response = await startRegistration({ optionsJSON: options }); } catch (e) { if (isCancel(e)) return; throw e; }
    const r = await api.auth.passkeyRegister(response, name.trim());
    // The passkey just proved a second factor: keep the session that says so.
    await saveAuth(r.token, r.user, true, r.csrf_token ?? undefined);
    setName(""); refresh();
  });

  return (
    <Section title="Passkeys" description="Sign in with your fingerprint, face or device PIN instead of a password. A passkey stays on your phone, laptop or security key and cannot be phished, because it only works on the real Starlane site. It also counts as a second factor."
      aside={q.data ? <Chip tone={list.length ? "good" : undefined}>{list.length ? `${list.length} added` : "None"}</Chip> : null}>
      {q.isLoading && <Loading rows={2} />}
      {q.error && <InlineError error={q.error instanceof Error ? q.error.message : "Could not load."} />}
      {q.data && !q.data.available && <div className="pf-note is-warn">Passkeys are not available on this server yet.</div>}
      {q.data?.available && (
        <div className="pf-stack" style={{ gap: 12 }}>
          {list.length > 0 && (
            <div className="pf-list">
              {list.map((p) => (
                <div key={p.id} className="pf-row">
                  <div className="pf-row-main">
                    {editing?.id === p.id ? (
                      <input className="pf-input" style={{ maxWidth: 260 }} aria-label="Passkey name" value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    ) : <div className="pf-row-title">{p.name}</div>}
                    <div className="pf-row-sub">{p.syncs ? "Synced across your devices" : "On one device"} · added {when(p.createdAt)}{p.lastUsedAt ? ` · last used ${when(p.lastUsedAt)}` : " · not used yet"}</div>
                  </div>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    {editing?.id === p.id ? (
                      <>
                        <Button small primary disabled={act.busy || !editing.name.trim()} onClick={() => act.run(async () => { await api.auth.renamePasskey(p.id, editing.name.trim()); setEditing(null); refresh(); })}>Save</Button>
                        <Button small onClick={() => setEditing(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button small disabled={act.busy} onClick={() => setEditing({ id: p.id, name: p.name })}>Rename</Button>
                        <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Remove "${p.name}"? Remove it from the device too, in its passkey settings.`)) act.run(async () => { await api.auth.removePasskey(p.id); refresh(); }); }}>Remove</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!supported ? <div className="pf-note">This browser cannot create passkeys.</div> : (
            <div className="flex flex-wrap items-end" style={{ gap: 8 }}>
              <Field label="Name (optional)" htmlFor="pk-name"><input id="pk-name" className="pf-input" style={{ maxWidth: 240 }} placeholder="For example: work laptop" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Button primary disabled={act.busy} onClick={add}>Add a passkey</Button>
            </div>
          )}
          <InlineError error={act.error} />
        </div>
      )}
    </Section>
  );
}

const METHOD: Record<string, string> = { password: "password", passkey: "passkey", sso: "single sign-on", google: "Google", apple: "Apple", phone: "phone code", otp: "email code", app_handoff: "the Starlane app" };

export function SignedInDevices() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["auth", "account-sessions"], queryFn: () => api.auth.accountSessions(), retry: false });
  const act = useAction();
  const [done, setDone] = useState<string | null>(null);
  const list = q.data?.sessions || [];
  const end = (s: AccountSession) => act.run(async () => {
    const r = await api.auth.endSession(s.id);
    if (r.endedCurrent) { clearAuth(); window.location.href = "/login"; return; }
    qc.invalidateQueries({ queryKey: ["auth", "account-sessions"] });
  });
  return (
    <Section title="Where you're signed in" description="Every browser and Starlane app signed in to your account. If you see one you don't recognise, end it and change your password. Only the first part of a network address is kept.">
      {q.isLoading && <Loading rows={3} />}
      {q.error && <InlineError error={q.error instanceof Error ? q.error.message : "Could not load."} />}
      {q.data && (
        <div className="pf-stack" style={{ gap: 12 }}>
          {done && <div className="pf-note" role="status">{done}</div>}
          <div className="pf-list">
            {list.map((s) => (
              <div key={s.id} className="pf-row">
                <div className="pf-row-main">
                  <div className="pf-row-title">{s.device}{s.current ? " · this browser" : ""}</div>
                  <div className="pf-row-sub">Signed in with {METHOD[s.signedInWith] || s.signedInWith}{s.twoStep ? " and a second factor" : ""} · {when(s.createdAt)} · last active {when(s.lastSeenAt)}{s.network ? ` · network ${s.network}` : ""}</div>
                </div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  {s.kind === "app" && <Chip>App</Chip>}
                  <Button small disabled={act.busy} onClick={() => { if (!s.current || window.confirm("End this browser's session? You will be signed out here.")) end(s); }}>{s.current ? "Sign out" : "End"}</Button>
                </div>
              </div>
            ))}
            {!list.length && <div className="pf-row"><div className="pf-row-sub">No sessions listed.</div></div>}
          </div>
          <div>
            <Button disabled={act.busy} onClick={() => { if (window.confirm("Sign out of every browser and app? This browser stays signed in with a fresh session.")) act.run(async () => {
              const r = await api.auth.signOutEverywhere();
              await saveAuth(r.token, r.user, true, r.csrf_token ?? undefined);
              setDone("Every other session was ended."); qc.invalidateQueries({ queryKey: ["auth", "account-sessions"] });
            }); }}>Sign out everywhere else</Button>
          </div>
          <InlineError error={act.error} />
        </div>
      )}
    </Section>
  );
}

const LENGTHS: { value: number | null; label: string }[] = [
  { value: null, label: "No limit (30 days)" }, { value: 8, label: "8 hours (a working day)" }, { value: 12, label: "12 hours" },
  { value: 24, label: "1 day" }, { value: 72, label: "3 days" }, { value: 168, label: "7 days" }, { value: 336, label: "14 days" },
];

export function SessionLength({ manage }: { manage: boolean }) {
  const org = useActiveOrg();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "session-policy", org], queryFn: () => platformApi.sessionPolicy(), retry: false });
  const act = useAction();
  const cur = q.data?.maxHours ?? null;
  const opts = LENGTHS.some((l) => l.value === cur) ? LENGTHS : [...LENGTHS, { value: cur, label: `${cur} hours` }];
  return (
    <Section title="Session length" description="How long a sign-in can use this workspace before people must sign in again. It applies to every member, on every device.">
      {q.isLoading ? <Loading rows={1} /> : q.data ? (
        <div className="pf-stack" style={{ gap: 10 }}>
          <select className="pf-select" style={{ maxWidth: 360 }} disabled={!manage || act.busy} value={cur === null ? "" : String(cur)} aria-label="Session length"
            onChange={(e) => act.run(async () => { await platformApi.setSessionPolicy(e.target.value === "" ? null : Number(e.target.value)); qc.invalidateQueries({ queryKey: ["platform", "session-policy"] }); qc.invalidateQueries({ queryKey: ["platform", "workspace"] }); })}>
            {opts.map((l) => <option key={String(l.value)} value={l.value === null ? "" : String(l.value)}>{l.label}</option>)}
          </select>
          <InlineError error={act.error} />
        </div>
      ) : <PlatformErrorBanner error={q.error} what="Session length" />}
    </Section>
  );
}

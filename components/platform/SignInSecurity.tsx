"use client";

// Sign-in security on the Security and privacy page:
//   TwoStepSignIn   your own authenticator app and recovery codes
//   MfaRule         who in the organization must use a second factor (admins)
//   SingleSignOn    the organization's OpenID Connect provider, its verified
//                   email domains, a test sign-in, and enforcement (admins)
// The server decides everything; secrets typed here are sent once and never
// shown again.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, saveAuth } from "@/lib/api";
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
  const refresh = () => { qc.invalidateQueries({ queryKey: ["auth", "mfa"] }); qc.invalidateQueries({ queryKey: ["platform", "workspace"] }); };
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
  const [domain, setDomain] = useState("");
  const d = q.data;
  useEffect(() => {
    if (d?.connection) setForm((f) => ({ ...f, issuer: d.connection!.issuer, clientId: d.connection!.clientId, jitRole: d.connection!.jitRole }));
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
      <Section title="Identity provider (OpenID Connect)" aside={c ? <Chip tone={c.status === "active" ? "good" : "warn"}>{c.status === "active" ? (c.enforce ? "Active, required" : "Active") : "Draft: test it"}</Chip> : null}
        description="Works with Okta, Microsoft Entra ID, Google Workspace, Auth0, OneLogin, JumpCloud, Keycloak and any other OpenID Connect provider. SAML and SCIM provisioning are not available yet.">
        <div className="pf-stack" style={{ gap: 12 }}>
          <div className="pf-note">In your provider, create a web application with this redirect URL: <code style={{ wordBreak: "break-all" }}>{d.redirectUri}</code></div>
          <div className="pf-grid2">
            <Field label="Issuer URL" htmlFor="sso-issuer" hint="For example https://yourcompany.okta.com"><input id="sso-issuer" className="pf-input" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></Field>
            <Field label="Client ID" htmlFor="sso-client"><input id="sso-client" className="pf-input" autoComplete="off" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></Field>
            <Field label="Client secret" htmlFor="sso-secret" hint={c?.hasClientSecret ? "Stored encrypted. Enter a new one only to replace it." : "Stored encrypted and never shown again."}><input id="sso-secret" className="pf-input" type="password" autoComplete="off" value={form.clientSecret} onChange={(e) => setForm({ ...form, clientSecret: e.target.value })} /></Field>
            <Field label="Role for people who join through SSO" htmlFor="sso-role">
              <select id="sso-role" className="pf-select" value={form.jitRole} onChange={(e) => setForm({ ...form, jitRole: e.target.value })}>
                <option value="viewer">Viewer</option><option value="member">Member</option><option value="admin">Admin</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Button primary disabled={act.busy || !form.issuer || !form.clientId} onClick={() => act.run(async () => { set(await platformApi.saveSso({ issuer: form.issuer.trim(), clientId: form.clientId.trim(), clientSecret: form.clientSecret || undefined, jitRole: form.jitRole })); setForm((f) => ({ ...f, clientSecret: "" })); })}>Save</Button>
            {c && <Button disabled={act.busy || !verified} title={verified ? undefined : "Verify a domain first"} onClick={() => act.run(async () => { window.location.href = (await platformApi.testSso()).authorizeUrl; })}>Run a test sign-in</Button>}
            {c && <Button disabled={act.busy} onClick={() => { if (window.confirm("Remove single sign-on? People will sign in with their other methods.")) act.run(async () => { await platformApi.removeSso(); qc.invalidateQueries({ queryKey: ["platform", "sso"] }); }); }}>Remove</Button>}
          </div>
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

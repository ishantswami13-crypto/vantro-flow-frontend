"use client";

// How a connected app signs requests. Secrets typed here go to the server
// once, are encrypted there (AES-256-GCM) and are never sent back: an
// existing connection only says whether it has a credential.

import type { AuthInput, AuthType } from "@/lib/platform";
import { Field } from "@/components/platform/ui";

export const AUTH_LABEL: Record<AuthType, string> = {
  none: "No authentication",
  api_key: "API key",
  bearer: "Bearer token",
  basic: "Username and password (basic)",
  oauth2_client_credentials: "OAuth 2.0 (client credentials)",
  oauth2_authorization_code: "OAuth 2.0 (sign in with the app)",
};

export function AuthFields({ value, onChange, types, lockType, redirectUri, existing, hideUrls }: {
  value: AuthInput;
  onChange: (v: AuthInput) => void;
  /** The auth types to offer. Leave out for all of them. */
  types?: AuthType[];
  /** The type is fixed (a catalog entry or an existing connection). */
  lockType?: boolean;
  redirectUri?: string | null;
  /** Editing an existing connection: blank secret fields keep nothing, so say so. */
  existing?: boolean;
  /** The OAuth URLs are already known (catalog entry or saved connection). */
  hideUrls?: boolean;
}) {
  const type = (value.type || "none") as AuthType;
  const set = (patch: Partial<AuthInput>) => onChange({ ...value, ...patch });
  const offered = types || (Object.keys(AUTH_LABEL) as AuthType[]);
  const oauth = type === "oauth2_client_credentials" || type === "oauth2_authorization_code";
  return (
    <div className="pf-stack" style={{ gap: 12 }}>
      <Field label="Authentication" htmlFor="auth-type">
        <select id="auth-type" className="pf-select" value={type} disabled={lockType} onChange={(e) => onChange({ type: e.target.value as AuthType })}>
          {offered.map((t) => <option key={t} value={t}>{AUTH_LABEL[t]}</option>)}
        </select>
      </Field>
      {type === "api_key" && (
        <div className="pf-grid2">
          <Field label="Sent in" htmlFor="auth-in">
            <select id="auth-in" className="pf-select" value={value.in || "header"} disabled={lockType && !!value.in} onChange={(e) => set({ in: e.target.value })}>
              <option value="header">A header</option>
              <option value="query">A query parameter</option>
            </select>
          </Field>
          <Field label="Header or parameter name" htmlFor="auth-name">
            <input id="auth-name" className="pf-input" value={value.name || ""} disabled={lockType && !!value.name} onChange={(e) => set({ name: e.target.value })} placeholder="X-API-Key" />
          </Field>
        </div>
      )}
      {(type === "api_key" || type === "bearer" || type === "basic") && (
        <Field label={type === "basic" ? "username:password" : type === "bearer" ? "Token" : "API key"} htmlFor="auth-secret" hint={existing ? "Enter a new value to replace the stored one." : "Encrypted on the server and never shown again."}>
          <input id="auth-secret" className="pf-input" type="password" autoComplete="off" value={value.secret || ""} onChange={(e) => set({ secret: e.target.value })} />
        </Field>
      )}
      {oauth && (
        <>
          {type === "oauth2_authorization_code" && !hideUrls && (
            <Field label="Authorization URL" htmlFor="auth-authorize">
              <input id="auth-authorize" className="pf-input" value={value.authorizeUrl || ""} onChange={(e) => set({ authorizeUrl: e.target.value })} placeholder="https://…/oauth/authorize" />
            </Field>
          )}
          {!hideUrls && (
            <Field label="Token URL" htmlFor="auth-token">
              <input id="auth-token" className="pf-input" value={value.tokenUrl || ""} onChange={(e) => set({ tokenUrl: e.target.value })} placeholder="https://…/oauth/token" />
            </Field>
          )}
          <div className="pf-grid2">
            <Field label="Client ID" htmlFor="auth-client">
              <input id="auth-client" className="pf-input" autoComplete="off" value={value.clientId || ""} onChange={(e) => set({ clientId: e.target.value })} />
            </Field>
            <Field label="Client secret" htmlFor="auth-client-secret" hint="Encrypted on the server and never shown again.">
              <input id="auth-client-secret" className="pf-input" type="password" autoComplete="off" value={value.clientSecret || ""} onChange={(e) => set({ clientSecret: e.target.value })} />
            </Field>
          </div>
          <Field label="Scopes" htmlFor="auth-scopes" hint="Separated by spaces or commas. Ask for the fewest the agents need.">
            <input id="auth-scopes" className="pf-input" value={value.scopes || ""} onChange={(e) => set({ scopes: e.target.value })} />
          </Field>
          {type === "oauth2_authorization_code" && redirectUri && (
            <div className="pf-note">Register this redirect URL in the app&apos;s developer settings: <code style={{ wordBreak: "break-all" }}>{redirectUri}</code></div>
          )}
        </>
      )}
    </div>
  );
}

/** Only the fields that apply to the chosen type, so nothing stray is sent. */
export function cleanAuth(a: AuthInput): AuthInput {
  const type = a.type || "none";
  const out: AuthInput = { type };
  if (type === "api_key") Object.assign(out, { in: a.in || "header", name: a.name, secret: a.secret || undefined });
  if (type === "bearer" || type === "basic") out.secret = a.secret || undefined;
  if (type === "oauth2_client_credentials" || type === "oauth2_authorization_code") {
    Object.assign(out, { tokenUrl: a.tokenUrl, clientId: a.clientId, clientSecret: a.clientSecret || undefined, scopes: a.scopes || undefined });
    if (type === "oauth2_authorization_code") out.authorizeUrl = a.authorizeUrl;
  }
  return out;
}

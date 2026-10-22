// Public access-flow client (no account yet, so none of api.ts's session
// handling or auto-logout applies). Tokens are read from the URL fragment —
// browsers never send the fragment to any server — and sent to the API in the
// X-Access-Token header, never a query string.
import { API_BASE } from "./api";

export type Tier = "ready" | "review" | "unsupported" | "waitlist";
export interface Eligibility { tier: Tier; label: string; reasons: string[]; rules_version: string }

export interface CatalogConnector {
  id: string; name: string; provider: string | null; category: string;
  authType: "local_bridge" | "file_import" | "oauth" | "api_key" | "public_feed";
  availability: "available" | "not_available"; summary: string; unavailableReason: string | null;
  objects: string[]; access: string[];
}

export interface ApplicationInput {
  name: string; email: string; company: string; website: string; role: string;
  companySize: string; industry: string; country: string;
  systems: string[]; otherSystems: string; willConnectSystems: boolean | null;
  problem: string; desiredOutcome: string; notes: string; companyFax: string;
}

export interface SubmitResult {
  success: boolean; received?: boolean; duplicate?: boolean; status?: string;
  eligibility?: Eligibility; statusToken?: string; downloadToken?: string | null; emailed?: boolean;
  error?: string; fields?: Record<string, string>;
}

export interface ApplicationStatus {
  company: string; email: string;
  status: "submitted" | "reviewing" | "approved" | "waitlisted" | "rejected" | "expired";
  eligibility: Eligibility; reviewNote: string | null; submittedAt: string; updatedAt: string; downloadReady: boolean;
}

export interface Artifact {
  id: string; name: string; os: string; kind: "bridge" | "desktop" | "mobile"; available: boolean;
  filename?: string; bytes?: number; sha256?: string; requirements?: string; note: string | null;
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}, timeoutMs = 20000): Promise<{ status: number; body: T }> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (rest.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("X-Access-Token", token);
  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers, signal: AbortSignal.timeout(timeoutMs) });
  const body = (await res.json().catch(() => ({ success: false, error: `Unexpected response (${res.status})` }))) as T;
  return { status: res.status, body };
}

export const accessApi = {
  catalog: () => call<{ success: boolean; connectors: CatalogConnector[] }>("/api/connectors/catalog"),
  submit: (input: ApplicationInput) =>
    call<SubmitResult>("/api/access/applications", { method: "POST", body: JSON.stringify(input) }),
  status: (token: string) =>
    call<{ success: boolean; application?: ApplicationStatus; error?: string }>("/api/access/status", { token }),
  downloads: (token: string) =>
    call<{ success: boolean; company?: string; name?: string; expiresAt?: string; artifacts?: Artifact[]; error?: string }>("/api/access/download", { token }),
  async download(token: string, artifact: string): Promise<{ ok: true; blob?: Blob; filename?: string; url?: string } | { ok: false; error: string }> {
    const res = await fetch(`${API_BASE}/api/access/download/${encodeURIComponent(artifact)}`, {
      method: "POST", headers: { "X-Access-Token": token }, signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      return { ok: false, error: (b as { error?: string }).error || `Download failed (${res.status})` };
    }
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      const b = (await res.json()) as { url?: string };
      return { ok: true, url: b.url };
    }
    const cd = res.headers.get("content-disposition") || "";
    const filename = /filename="([^"]+)"/.exec(cd)?.[1] || artifact;
    return { ok: true, blob: await res.blob(), filename };
  },
};

/** Read `token` from the URL fragment (#token=...). */
export function tokenFromHash(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";
}

export const TIER_TONE: Record<Tier, "ok" | "warn" | "bad" | ""> = { ready: "ok", review: "warn", unsupported: "bad", waitlist: "" };

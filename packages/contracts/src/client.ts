// Platform-neutral Starlane API client used by the desktop and mobile apps.
//
// The platform supplies:
//   - fetch       (desktop: Tauri's native HTTP client; mobile: React Native fetch)
//   - tokens      secure storage (desktop: OS credential store via Rust;
//                 mobile: Keychain / Android Keystore via expo-secure-store)
// It never touches localStorage.
//
// Errors are typed so the UI can be honest about what happened:
//   OfflineError   the request never reached Starlane (show last-known data + "offline")
//   SessionEnded   refresh failed / session revoked (go to sign-in)
//   ApiError       Starlane answered with an error (show its message)

import type {
  ActionDetail, ActionSummary, AskReply, Bootstrap, ClientKind, Connector, DecisionResult, DeviceClaim, DeviceToken,
  LoginResponse, Now, Opportunity, Session, StarlaneNotification, TelemetryEvent, Watch,
} from './types';
import type {
  BridgeView, CustomerScan, InvoiceScan, MemoryRecord, Mission, MissionDraft, MissionInput, PreparedHorizon, ScanSearch,
  SimulateInput, Simulation, WatchDetail, WatchList, WatchState,
} from './features';

export interface TokenStore {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

export interface ClientInfo { client: ClientKind; platform: string; appVersion: string; deviceName?: string }

export class OfflineError extends Error { constructor(msg = 'Starlane could not be reached') { super(msg); this.name = 'OfflineError'; } }
export class SessionEnded extends Error { constructor(msg = 'Your session has ended. Sign in again.') { super(msg); this.name = 'SessionEnded'; } }
export class ApiError extends Error {
  status: number; code?: string; body: unknown;
  constructor(status: number, message: string, code?: string, body?: unknown) { super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.body = body; }
}

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string>; headers: { get(name: string): string | null };
}>;

export interface StarlaneClientOptions {
  baseUrl: string;
  fetch: FetchLike;
  tokens: TokenStore;
  info: ClientInfo;
  timeoutMs?: number;
  onSessionEnded?: () => void;
}

export function createStarlaneClient(opts: StarlaneClientOptions) {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const timeoutMs = opts.timeoutMs ?? 20000;
  // Called unbound: a browser's fetch throws "Illegal invocation" when called as a method of another object.
  const doFetch = opts.fetch;
  let session: Session | null = null;
  let loaded = false;
  let refreshing: Promise<Session> | null = null;

  async function current(): Promise<Session | null> {
    if (!loaded) { session = await opts.tokens.load(); loaded = true; }
    return session;
  }

  async function raw(path: string, init: { method?: string; body?: unknown; auth?: string | null; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers || {}) };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init.auth) headers.Authorization = init.auth;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      return await doFetch(`${base}${path}`, {
        method: init.method || 'GET', headers, body: init.body !== undefined ? JSON.stringify(init.body) : undefined, signal: ctrl?.signal,
      });
    } catch {
      throw new OfflineError();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function parse<T>(res: Awaited<ReturnType<FetchLike>>): Promise<T> {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new ApiError(res.status, String(body.error || `Request failed (${res.status})`), body.code as string | undefined, body);
    return body as T;
  }

  async function endSession() {
    session = null; loaded = true;
    await opts.tokens.clear().catch(() => {});
    opts.onSessionEnded?.();
  }

  async function refresh(): Promise<Session> {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const s = await current();
      if (!s) throw new SessionEnded();
      const res = await raw('/api/auth/native/refresh', { method: 'POST', body: { refreshToken: s.refreshToken, appVersion: opts.info.appVersion } });
      if (res.status === 401) { await endSession(); throw new SessionEnded(); }
      const next = await parse<Session>(res);
      session = next;
      await opts.tokens.save(next);
      return next;
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }

  async function authed<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    let s = await current();
    if (!s) throw new SessionEnded();
    // Refresh proactively when the access token is about to expire.
    if (Date.parse(s.accessExpiresAt) - Date.now() < 30000) s = await refresh();
    let res = await raw(path, { ...init, auth: `Bearer ${s.accessToken}` });
    if (res.status === 401) {
      s = await refresh();
      res = await raw(path, { ...init, auth: `Bearer ${s.accessToken}` });
      if (res.status === 401) { await endSession(); throw new SessionEnded(); }
    }
    return parse<T>(res);
  }

  const userId = async () => {
    const s = await current();
    if (!s) throw new SessionEnded();
    try { return JSON.parse(atobSafe(s.accessToken.split('.')[1])).userId as string; } catch { throw new SessionEnded(); }
  };

  return {
    info: opts.info,
    baseUrl: base,
    async isSignedIn() { return !!(await current()); },

    async login(email: string, password: string): Promise<LoginResponse> {
      const res = await raw('/api/auth/native/login', {
        method: 'POST',
        body: { email, password, client: opts.info.client, platform: opts.info.platform, deviceName: opts.info.deviceName, appVersion: opts.info.appVersion },
      });
      const out = await parse<LoginResponse & { success: boolean }>(res);
      const { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, sessionId } = out;
      session = { accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, sessionId };
      loaded = true;
      await opts.tokens.save(session);
      return out;
    },
    async logout() {
      try { await authed('/api/auth/native/logout', { method: 'POST', body: {} }); } catch { /* sign out locally regardless */ }
      await endSession();
    },

    bootstrap: () => authed<Bootstrap & { success: boolean }>('/api/client/bootstrap'),
    now: (since?: string | null) => authed<Now & { success: boolean }>(`/api/client/now${since ? `?since=${encodeURIComponent(since)}` : ''}`),
    actions: (status: string = 'pending') => authed<{ actions: ActionSummary[] }>(`/api/client/actions?status=${encodeURIComponent(status)}`).then((r) => r.actions),
    action: (id: string) => authed<{ action: ActionDetail }>(`/api/client/actions/${encodeURIComponent(id)}`).then((r) => r.action),
    decide: (id: string, decision: 'approve' | 'reject', confirmHighRisk = false) =>
      authed<DecisionResult & { success: boolean }>(`/api/client/actions/${encodeURIComponent(id)}/decision`, { method: 'POST', body: { decision, confirmHighRisk, via: opts.info.client } }),

    inbox: () => authed<{ unread: number; notifications: StarlaneNotification[] }>('/api/client/inbox'),
    markRead: (id: string) => authed(`/api/client/inbox/${encodeURIComponent(id)}/read`, { method: 'POST', body: {} }),
    markAllRead: () => authed('/api/client/inbox/read-all', { method: 'POST', body: {} }),
    registerPush: (token: string, platform: string, deviceName?: string) =>
      authed<{ id: string }>('/api/client/push-devices', { method: 'POST', body: { token, platform, deviceName } }),

    sessions: () => authed<{ sessions: Array<{ id: string; client: string; platform: string | null; device_name: string | null; app_version: string | null; last_used_at: string; current: boolean }> }>('/api/auth/sessions').then((r) => r.sessions),
    revokeSession: (id: string) => authed(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    connectors: () => authed<{ connectors: Connector[] }>('/api/connectors').then((r) => r.connectors),
    pairing: (connectorId: string) =>
      authed<{ pairing: { connectorId: string; code: string; expiresAt: string; command: string } }>(`/api/connectors/${encodeURIComponent(connectorId)}/pairing`, { method: 'POST', body: {} }).then((r) => r.pairing),
    revokeDevice: (deviceId: string) => authed(`/api/connectors/tally/devices/${encodeURIComponent(deviceId)}/revoke`, { method: 'POST', body: {} }),

    watches: () => authed<{ watches: Watch[] }>('/api/watches').then((r) => r.watches),
    signals: () => authed<{ signals: Array<Record<string, unknown>> }>('/api/intelligence/signals').then((r) => r.signals || []),
    opportunities: async () => authed<{ opportunities: Opportunity[] }>(`/api/intelligence/opportunities/${await userId()}`).then((r) => r.opportunities || []),
    simulationInvoices: async () => authed<{ invoices: Array<Record<string, unknown>> }>(`/api/intelligence/scenarios/${await userId()}/invoices`),
    simulate: async (body: { targetInvoiceId: string; daysEarlier?: number; remainsUnpaid?: boolean }) =>
      authed<Record<string, unknown>>(`/api/intelligence/scenarios/${await userId()}`, { method: 'POST', body }),
    ask: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, businessName?: string | null) =>
      authed<AskReply>('/api/ai-chat', { method: 'POST', body: { messages, business_name: businessName || '' } }),

    // ── The seven features ────────────────────────────────────────────────
    bridge: () => authed<BridgeView & { success: boolean }>('/api/client/bridge'),
    scanSearch: (q: string) => authed<ScanSearch>(`/api/client/scan/search?q=${encodeURIComponent(q)}`),
    scanCustomer: (key: string) => authed<{ scan: CustomerScan }>(`/api/client/scan/customer/${encodeURIComponent(key)}`).then((r) => r.scan),
    scanInvoice: (id: string) => authed<{ scan: InvoiceScan }>(`/api/client/scan/invoice/${encodeURIComponent(id)}`).then((r) => r.scan),
    watchEvents: (state: 'active' | 'open' | 'acknowledged' | 'closed' = 'active', refresh = false) =>
      authed<WatchList>(`/api/client/watch?state=${state}${refresh ? '&refresh=1' : ''}`),
    watchEvent: (id: string) => authed<WatchDetail>(`/api/client/watch/${encodeURIComponent(id)}`),
    setWatchState: (id: string, state: Exclude<WatchState, 'resolved'>) =>
      authed<{ event: WatchDetail['event'] }>(`/api/client/watch/${encodeURIComponent(id)}/state`, { method: 'POST', body: { state } }).then((r) => r.event),
    missions: () => authed<{ missions: Mission[] }>('/api/client/missions').then((r) => r.missions),
    mission: (id: string) => authed<{ mission: Mission }>(`/api/client/missions/${encodeURIComponent(id)}`).then((r) => r.mission),
    previewMission: (input: MissionInput) => authed<{ errors: string[]; draft: MissionDraft; simulation: Simulation | null }>('/api/client/missions/preview', { method: 'POST', body: input }),
    createMission: (input: MissionInput) => authed<{ mission: Mission; excluded: MissionDraft['excluded'] }>('/api/client/missions', { method: 'POST', body: { type: 'collections', ...input } }),
    missionAction: (id: string, verb: 'activate' | 'pause' | 'cancel') =>
      authed<{ mission: Mission; proposed: { created: number; adopted: number; blocked: number } | null }>(`/api/client/missions/${encodeURIComponent(id)}/${verb}`, { method: 'POST', body: {} }),
    simulateCash: (input: SimulateInput) => authed<{ scope: string; invoiceCount: number; simulation: Simulation | null; emptyReason: string | null }>('/api/client/simulate', { method: 'POST', body: input }),
    memory: (removed = false) => authed<{ records: MemoryRecord[] }>(`/api/client/memory${removed ? '?status=removed' : ''}`).then((r) => r.records),
    remember: (statement: string, subject?: string) => authed<{ record: MemoryRecord }>('/api/client/memory', { method: 'POST', body: { statement, subject } }).then((r) => r.record),
    memoryDecide: (id: string, verb: 'confirm' | 'correct' | 'remove', statement?: string) =>
      authed<{ record: MemoryRecord }>(`/api/client/memory/${encodeURIComponent(id)}/${verb}`, { method: 'POST', body: statement ? { statement } : {} }).then((r) => r.record),
    prepared: () => authed<{ generatedAt: string; horizons: PreparedHorizon[] }>('/api/client/prepared'),

    telemetry: async (events: TelemetryEvent[]) => {
      const s = await current();
      const res = await raw('/api/client/telemetry', { method: 'POST', body: { events }, auth: s ? `Bearer ${s.accessToken}` : null });
      return res.ok;
    },

    // ── Local connector device (desktop connector host) ───────────────────
    device: {
      claim: (code: string, deviceName: string) =>
        raw('/api/connectors/tally/claim', { method: 'POST', body: { enrollmentCode: code, deviceName, clientVersion: opts.info.appVersion, platform: opts.info.platform } }).then((r) => parse<DeviceClaim>(r)),
      token: (deviceId: string, deviceSecret: string) =>
        raw('/api/connectors/device/token', { method: 'POST', auth: `VantroDevice ${deviceId}.${deviceSecret}`, body: { clientVersion: opts.info.appVersion, platform: opts.info.platform } }).then((r) => parse<DeviceToken>(r)),
      startRun: (deviceToken: string) =>
        raw('/api/connectors/device/sync-runs', { method: 'POST', auth: `StarlaneDevice ${deviceToken}`, body: { clientVersion: opts.info.appVersion } })
          .then((r) => parse<{ syncRun: { id: string } }>(r)).then((r) => r.syncRun.id),
      failRun: (deviceToken: string, runId: string, error: string) =>
        raw(`/api/connectors/device/sync-runs/${encodeURIComponent(runId)}`, { method: 'PATCH', auth: `StarlaneDevice ${deviceToken}`, body: { status: 'failed', error } }).then((r) => parse(r)),
      importTally: (deviceToken: string, runId: string, vouchers: unknown[]) =>
        raw('/api/import/tally', { method: 'POST', auth: `StarlaneDevice ${deviceToken}`, headers: { 'X-Sync-Run-Id': runId }, body: { vouchers } })
          .then((r) => parse<{ imported: Record<string, number>; rejected: unknown[]; message: string; syncRunId: string }>(r)),
      disconnect: (deviceToken: string) =>
        raw('/api/connectors/device/disconnect', { method: 'POST', auth: `StarlaneDevice ${deviceToken}`, body: {} }).then((r) => parse(r)),
    },
  };
}

export type StarlaneClient = ReturnType<typeof createStarlaneClient>;

function atobSafe(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  if (typeof atob === 'function') return atob(b64);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).Buffer.from(b64, 'base64').toString('utf8');
}

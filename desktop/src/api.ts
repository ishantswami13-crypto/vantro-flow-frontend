// The one Starlane API client for the desktop app, plus the small set of
// non-secret preferences (kept in the OS store alongside the session so the
// app has exactly one place it persists anything).
import { createStarlaneClient, type StarlaneClient, type TelemetryEvent } from '@starlane/contracts';
import { appInfo, platformFetch, platformName, secrets, sessionStore, type AppInfo } from './platform';

export const PRODUCTION_API = 'https://vantro-flow-backend-production.up.railway.app';
const BUILD_API = (import.meta.env.VITE_STARLANE_API_URL as string | undefined) || PRODUCTION_API;

export interface Prefs {
  apiBase?: string;
  channel: 'stable' | 'beta';
  notifications: boolean;
  tally: { port: number; company: string | null; intervalMin: number };
  onboarded?: boolean;
}
const DEFAULT_PREFS: Prefs = { channel: 'stable', notifications: true, tally: { port: 9000, company: null, intervalMin: 15 } };

/** Only Starlane-operated hosts and a local development server are accepted. */
export function allowedApiBase(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && (/\.up\.railway\.app$/.test(u.hostname) || /(^|\.)starlane\.app$/.test(u.hostname))) return true;
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === '8787';
  } catch { return false; }
}

let prefs: Prefs = DEFAULT_PREFS;
export async function loadPrefs(): Promise<Prefs> {
  const p = await secrets.getJSON<Partial<Prefs>>('prefs');
  prefs = { ...DEFAULT_PREFS, ...(p || {}), tally: { ...DEFAULT_PREFS.tally, ...(p?.tally || {}) } };
  if (prefs.apiBase && !allowedApiBase(prefs.apiBase)) prefs.apiBase = undefined;
  return prefs;
}
export const getPrefs = () => prefs;
export async function savePrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch, tally: { ...prefs.tally, ...(patch.tally || {}) } };
  await secrets.set('prefs', JSON.stringify(prefs));
  return prefs;
}

let client: StarlaneClient | null = null;
let info: AppInfo | null = null;
const sessionListeners = new Set<() => void>();
export const onSessionEnded = (cb: () => void) => { sessionListeners.add(cb); return () => { sessionListeners.delete(cb); }; };

export async function initClient(): Promise<StarlaneClient> {
  info = await appInfo();
  await loadPrefs();
  client = createStarlaneClient({
    baseUrl: prefs.apiBase || BUILD_API,
    fetch: platformFetch as never,
    tokens: sessionStore,
    info: { client: 'desktop', platform: platformName(info.os), appVersion: info.version, deviceName: info.device_name },
    onSessionEnded: () => sessionListeners.forEach((cb) => cb()),
  });
  return client;
}
export function api(): StarlaneClient {
  if (!client) throw new Error('Starlane client not initialised');
  return client;
}
export const app = () => info!;

// Telemetry: batched, allowlisted names and props only (see contracts
// TelemetryEvent). Failures are dropped — telemetry must never break the app.
const queue: TelemetryEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
export function track(name: TelemetryEvent['name'], props: TelemetryEvent['props'] = {}) {
  if (!info) return;
  queue.push({ name, props: { client: 'desktop', platform: platformName(info.os), app_version: info.version, ...props } });
  if (!timer) timer = setTimeout(flush, 4000);
}
async function flush() {
  timer = null;
  const batch = queue.splice(0, 20);
  if (batch.length && client) await client.telemetry(batch).catch(() => false);
  if (queue.length) timer = setTimeout(flush, 4000);
}

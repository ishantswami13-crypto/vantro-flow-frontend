// Platform layer: everything that differs between the real desktop app and a
// plain browser preview of the web view (used for development and screenshots).
//
// In the desktop app:
//   - HTTP goes through Tauri's native client (plugin-http), scoped by
//     src-tauri/capabilities/default.json to Starlane's API and local Tally.
//   - Secrets go to the OS credential store through the Rust `secret_*`
//     commands (Windows Credential Manager / macOS Keychain).
// In a browser preview there is no secure store, so secrets live in memory
// only and are gone on reload. Nothing is ever written to localStorage.
import type { Session, TokenStore } from '@starlane/contracts';

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

type SecretKey = 'session' | 'device:tally' | 'prefs';
const memory = new Map<SecretKey, string>();

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const core = await import('@tauri-apps/api/core');
  return core.invoke<T>(cmd, args);
}

export const secrets = {
  async get(key: SecretKey): Promise<string | null> {
    if (!isDesktop) return memory.get(key) ?? null;
    return invoke<string | null>('secret_get', { key });
  },
  async set(key: SecretKey, value: string): Promise<void> {
    if (!isDesktop) { memory.set(key, value); return; }
    await invoke('secret_set', { key, value });
  },
  async delete(key: SecretKey): Promise<void> {
    if (!isDesktop) { memory.delete(key); return; }
    await invoke('secret_delete', { key });
  },
  async getJSON<T>(key: SecretKey): Promise<T | null> {
    const raw = await this.get(key).catch(() => null);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
};

export const sessionStore: TokenStore = {
  load: () => secrets.getJSON<Session>('session'),
  save: (s) => secrets.set('session', JSON.stringify(s)),
  clear: () => secrets.delete('session'),
};

// Native fetch in the app (no browser CORS, scoped by capability); window.fetch in preview.
export async function platformFetch(input: string, init?: RequestInit) {
  if (!isDesktop) return window.fetch(input, init);
  const http = await import('@tauri-apps/plugin-http');
  return http.fetch(input, init);
}

export interface AppInfo { version: string; os: string; arch: string; device_name: string; updater_configured: boolean }
export async function appInfo(): Promise<AppInfo> {
  if (!isDesktop) return { version: '0.1.4', os: 'browser-preview', arch: '', device_name: 'Browser preview', updater_configured: false };
  return invoke<AppInfo>('app_info');
}

export function platformName(os: string) {
  return os === 'windows' ? 'windows' : os === 'macos' ? 'macos' : os === 'linux' ? 'linux' : 'web';
}

// ── Native events from the shell (tray, deep links, window hidden) ─────────
export async function onShellEvent(name: 'starlane://route' | 'starlane://sync-now' | 'starlane://hidden', cb: (payload: unknown) => void) {
  if (!isDesktop) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen(name, (e) => cb(e.payload));
}

// ── Notifications ─────────────────────────────────────────────────────────
export async function notifyNative(title: string, body?: string | null) {
  if (!isDesktop) return false;
  const n = await import('@tauri-apps/plugin-notification');
  let granted = await n.isPermissionGranted();
  if (!granted) granted = (await n.requestPermission()) === 'granted';
  if (!granted) return false;
  n.sendNotification({ title, body: body || undefined });
  return true;
}

// ── Start at login ────────────────────────────────────────────────────────
export const autostart = {
  async enabled() {
    if (!isDesktop) return false;
    return (await import('@tauri-apps/plugin-autostart')).isEnabled();
  },
  async set(on: boolean) {
    if (!isDesktop) return;
    const a = await import('@tauri-apps/plugin-autostart');
    if (on) await a.enable(); else await a.disable();
  },
};

// ── Updates (signature-verified by the Rust updater) ──────────────────────
export interface UpdateInfo { available: boolean; version: string | null; notes: string | null; configured: boolean }
export const updates = {
  check: (channel: 'stable' | 'beta') =>
    isDesktop ? invoke<UpdateInfo>('check_update', { channel }) : Promise.resolve<UpdateInfo>({ available: false, version: null, notes: null, configured: false }),
  async install(channel: 'stable' | 'beta') {
    const v = await invoke<string>('install_update', { channel });
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
    return v;
  },
};

// ── The live Starlane app (desktop only) ──────────────────────────────────
// Opens the website in the app's own "web" window, signed in with a 60-second
// single-use code from the API; the shell builds the URL, so this window can
// never be pointed anywhere else.
export async function openWebWindow(id: string, code: string, next?: string) {
  if (!isDesktop) return false;
  await invoke('open_web', { id, code, next: next ?? null });
  return true;
}

export async function openExternal(url: string) {
  if (!isDesktop) { window.open(url, '_blank', 'noopener'); return; }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}

// ── Support log (desktop only) ────────────────────────────────────────────
// Goes to the rotating file the shell writes (Settings › Diagnostics › Open
// logs). Callers pass event names, codes and messages only: never tokens,
// passwords, pairing codes or business records.
export function logLine(level: 'info' | 'warn' | 'error', message: string) {
  if (!isDesktop) return;
  void import('@tauri-apps/plugin-log').then((l) => (level === 'error' ? l.error : level === 'warn' ? l.warn : l.info)(message.slice(0, 500))).catch(() => {});
}

export async function openLogs() {
  if (!isDesktop) return;
  await invoke('open_logs');
}

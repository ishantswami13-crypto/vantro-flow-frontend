// Keeps the desktop shell current without anyone opening Settings.
//   - At start-up: a quick check (never blocks more than a few seconds, and
//     never when offline); a newer signed build is installed straight away,
//     before any window has work in it.
//   - Every 6 hours while running: if a newer build exists it is installed
//     the next time Starlane's windows are closed to the tray, so nobody is
//     interrupted mid-task; a notification says so.
// Every build is signature-checked by the shell against the key baked into
// it. Builds without an updater key simply report "not configured".
import { getPrefs, track } from '../api';
import { logLine, notifyNative, onShellEvent, updates } from '../platform';

const STARTUP_TIMEOUT_MS = 6000;
const PERIOD_MS = 6 * 60 * 60 * 1000;

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** True when an update is being installed (the app restarts itself). */
export async function updateAtStartup(): Promise<boolean> {
  const channel = getPrefs().channel;
  try {
    const u = await withTimeout(updates.check(channel), STARTUP_TIMEOUT_MS);
    if (!u.configured || !u.available) return false;
    track('client.update_available', { channel, reason: 'startup' });
    logLine('info', `installing update ${u.version} at start-up`);
    await updates.install(channel);
    track('client.update_installed', { channel });
    return true;
  } catch (e) {
    logLine('warn', `start-up update check skipped: ${(e as Error).message}`);
    return false;
  }
}

let pending: string | null = null;
let installing = false;

async function installPending() {
  if (!pending || installing) return;
  installing = true;
  const channel = getPrefs().channel;
  try {
    await updates.install(channel);
    track('client.update_installed', { channel });
  } catch (e) {
    installing = false;
    track('client.update_failed', { channel, error_code: (e as Error).name });
    logLine('error', `update failed: ${(e as Error).message}`);
  }
}

export function startBackgroundUpdates(): () => void {
  const check = async () => {
    if (pending) return;
    const channel = getPrefs().channel;
    try {
      const u = await updates.check(channel);
      if (!u.configured || !u.available) return;
      pending = u.version;
      track('client.update_available', { channel, reason: 'background' });
      await notifyNative('Starlane update ready', `Version ${u.version} installs the next time you close Starlane.`);
    } catch { /* offline: try again next time */ }
  };
  const timer = setInterval(() => void check(), PERIOD_MS);
  const first = setTimeout(() => void check(), 60_000);
  const off = onShellEvent('starlane://hidden', () => { void installPending(); });
  return () => { clearInterval(timer); clearTimeout(first); void off.then((f) => f()); };
}

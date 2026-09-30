// Formatting that must read the same on every client.

/** ₹1,28,500.50 — Indian grouping; paise only when present. */
export function inr(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const opts: Intl.NumberFormatOptions = Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `₹${n.toLocaleString('en-IN', opts)}`;
}

/** ₹1.3L / ₹45K for glanceable places (mobile Today); exact figures elsewhere. */
export function inrShort(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return inr(n);
}

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  if (ms < 45_000) return 'just now';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** "as of 14:05" — shown whenever data may be old (offline, cached). */
export function asOf(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `as of ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${Date.now() - d.getTime() > 86_400_000 ? `, ${d.toLocaleDateString()}` : ''}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const HEALTH_LABEL: Record<string, string> = {
  not_connected: 'Not connected', pairing: 'Pairing', connected: 'Connected — waiting for first sync', syncing: 'Syncing',
  healthy: 'Healthy', delayed: 'Delayed', error: 'Error', revoked: 'Revoked', stale: 'Delayed',
  disconnected: 'Disconnected', unavailable: 'Not available yet',
};
export const healthLabel = (h: string) => HEALTH_LABEL[h] || h;

/** Numbers in words for the Now sentence: "Two decisions need you." */
export function countWord(n: number): string {
  return ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][n] ?? String(n);
}

/**
 * The one sentence at the top of Now/Today, from real data only.
 * Returns plain text; clients choose how to set it.
 */
export function nowSentence(input: { needsYou: number; changed: number; connectorHealth?: string | null; lastSyncAt?: string | null }): string {
  const parts: string[] = [];
  if (input.needsYou > 0) parts.push(`${countWord(input.needsYou)} ${input.needsYou === 1 ? 'decision needs' : 'decisions need'} you.`);
  else parts.push('Nothing needs your decision right now.');
  if (input.changed > 0) parts.push(`${countWord(input.changed)} ${input.changed === 1 ? 'thing has' : 'things have'} changed.`);
  if (input.connectorHealth === 'healthy' && input.lastSyncAt) parts.push(`Tally synced ${ago(input.lastSyncAt)}.`);
  else if (input.connectorHealth === 'delayed' || input.connectorHealth === 'error') parts.push('Tally is not syncing.');
  return parts.join(' ');
}

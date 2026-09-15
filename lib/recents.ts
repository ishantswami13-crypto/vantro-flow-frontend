// Real working-memory of what the user actually visited — not a fabricated
// "recent activity" feed. Every entry here corresponds to a real page the
// user opened, recorded client-side (this product has no server-side
// activity log yet), keyed by the same pathname+pageTitle every screen
// already passes into DashboardLayout.
const KEY = "vantro_recents";
const MAX = 6;

export interface RecentEntry {
  href: string;
  label: string;
  at: string; // ISO timestamp
}

// Recents is meant to be working memory for actual investigations, not a
// browser-history dump of every page visited. The only real "work object"
// this product has today is an individual intelligence signal
// (/intelligence/<id>) — the signal list page itself, and every other
// route (settings, billing, legacy utility pages) is navigation, not work,
// and must never be recorded. When a real Investigation/Workspace object
// model exists this can widen; until then, narrow is more honest than
// complete.
const RECORDABLE = /^\/intelligence\/[^/]+$/;

export function recordRecent(href: string, label?: string) {
  if (typeof window === "undefined" || !label) return;
  if (!RECORDABLE.test(href)) return;
  try {
    const existing: RecentEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const withoutThis = existing.filter(e => e.href !== href);
    const next = [{ href, label, at: new Date().toISOString() }, ...withoutThis].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* localStorage unavailable — recents just won't populate */ }
}

export function getRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored: RecentEntry[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Defensive re-filter: entries recorded before this curation rule
    // existed (e.g. CA Partner Portal, Payment Plans from earlier testing)
    // may still be sitting in a real user's localStorage — never display
    // those even if they were already written.
    return stored.filter(e => RECORDABLE.test(e.href));
  } catch { return []; }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

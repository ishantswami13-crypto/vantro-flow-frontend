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

export function recordRecent(href: string, label?: string) {
  if (typeof window === "undefined" || !label) return;
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
    return JSON.parse(localStorage.getItem(KEY) || "[]");
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

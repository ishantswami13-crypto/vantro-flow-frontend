// The owner's daily loop on the home page: what changed since they last
// looked, and a short, finite list for today that they can finish. Both live
// in this browser only (per-viewer conveniences, like the identity colour) —
// the numbers themselves always come from the backend; this file only
// remembers the last numbers the owner saw so it can say what moved.

export interface PulseSnapshot {
  at: string;            // ISO time the owner last saw these numbers
  outstanding: number;   // total receivable
  paid: number;          // total collected to date
  pending: number;       // pending invoice count
  overdue30: number;     // ₹ overdue past 30 days
}

export interface PulseChange {
  key: string;
  text: string;
  tone: "good" | "bad" | "neutral";
}

const SNAP_PREFIX = "starlane_pulse_";
const DONE_PREFIX = "starlane_today_done_";
// A visit shorter than this after the previous one is the same sitting, so
// the "since you were last here" baseline is kept rather than overwritten.
const SAME_VISIT_MS = 30 * 60 * 1000;

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* per-viewer nicety only */ }
}

export function fmtLakh(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(abs >= 1000000 ? 1 : 2).replace(/\.?0+$/, "")}L`;
  if (abs >= 1000) return `₹${Math.round(abs / 1000)}K`;
  return `₹${Math.round(abs).toLocaleString("en-IN")}`;
}

// Returns the snapshot to compare against (the previous visit), and records
// the current numbers as the new baseline unless this is the same sitting.
export function readAndRecordPulse(userId: string, current: Omit<PulseSnapshot, "at">): PulseSnapshot | null {
  const key = SNAP_PREFIX + userId;
  let prev: (PulseSnapshot & { baseline?: PulseSnapshot }) | null = null;
  try { prev = JSON.parse(safeGet(key) || "null"); } catch { prev = null; }
  const now = new Date();

  if (prev && now.getTime() - new Date(prev.at).getTime() < SAME_VISIT_MS) {
    // Same sitting: keep comparing against the visit before this one.
    safeSet(key, JSON.stringify({ ...current, at: now.toISOString(), baseline: prev.baseline ?? null }));
    return prev.baseline ?? null;
  }
  const baseline = prev ? { at: prev.at, outstanding: prev.outstanding, paid: prev.paid, pending: prev.pending, overdue30: prev.overdue30 } : null;
  safeSet(key, JSON.stringify({ ...current, at: now.toISOString(), baseline }));
  return baseline;
}

export function describeChanges(prev: PulseSnapshot, cur: Omit<PulseSnapshot, "at">): PulseChange[] {
  const out: PulseChange[] = [];
  const collected = cur.paid - prev.paid;
  if (collected > 0) out.push({ key: "paid", text: `${fmtLakh(collected)} collected`, tone: "good" });

  const newInvoices = cur.pending - prev.pending;
  if (newInvoices > 0) out.push({ key: "pending", text: `${newInvoices} new unpaid invoice${newInvoices === 1 ? "" : "s"}`, tone: "neutral" });
  if (newInvoices < 0) out.push({ key: "pending", text: `${-newInvoices} invoice${newInvoices === -1 ? "" : "s"} closed`, tone: "good" });

  const overdueDelta = cur.overdue30 - prev.overdue30;
  if (overdueDelta > 0) out.push({ key: "overdue", text: `${fmtLakh(overdueDelta)} more slipped past 30 days`, tone: "bad" });
  if (overdueDelta < 0) out.push({ key: "overdue", text: `${fmtLakh(-overdueDelta)} less overdue past 30 days`, tone: "good" });
  return out;
}

export function sinceLabel(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(then.toDateString()).getTime()) / 86400000);
  const time = then.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days <= 0) return `earlier today at ${time}`;
  if (days === 1) return "yesterday";
  if (days < 7) return then.toLocaleDateString("en-IN", { weekday: "long" });
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Today's list: which items the owner has ticked off today ─────────────
function todayKey(userId: string) {
  return DONE_PREFIX + userId + "_" + new Date().toLocaleDateString("en-CA");
}

export function readDoneToday(userId: string): string[] {
  try {
    const v = JSON.parse(safeGet(todayKey(userId)) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

export function writeDoneToday(userId: string, ids: string[]) {
  safeSet(todayKey(userId), JSON.stringify(ids));
}

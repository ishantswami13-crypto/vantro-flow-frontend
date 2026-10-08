// The one place the web app formats money and time. Amounts use Indian
// grouping (₹1,28,500) and the shared contracts helpers, so the web, the
// desktop app and mobile all read a figure the same way.

import { inr, inrShort } from "../packages/contracts/src/format";

export { inr, inrShort };

/** ₹1,28,500 with no paise, for tables and cards. Unknown stays "—", never ₹0. */
export function inrWhole(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function toDate(v: string | number | Date | null | undefined): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "7 Oct 2026", or "7 Oct" within the current year. */
export function formatDate(v: string | number | Date | null | undefined, opts: { year?: "auto" | "always" } = {}): string {
  const d = toDate(v);
  if (!d) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
    ...(opts.year === "always" || !sameYear ? { year: "numeric" } : {}),
  });
}

/** "7 Oct, 4:05 pm". */
export function formatDateTime(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

/** "just now", "5m ago", "3h ago", "yesterday", "4d ago", then the date. */
export function formatRelative(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  const ms = Date.now() - d.getTime();
  if (ms < 0) return formatDate(d);
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

/** Today's time ("4:05 pm"), otherwise the short date. */
export function formatClock(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  return formatDate(d);
}

/** "12 days overdue" / "due in 3 days" / "due today" from a due date. */
export function formatDue(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  const day = 86_400_000;
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(new Date())) / day);
  if (diff === 0) return "due today";
  if (diff < 0) return `${-diff} day${diff === -1 ? "" : "s"} overdue`;
  return `due in ${diff} day${diff === 1 ? "" : "s"}`;
}

/** 1,234 with Indian grouping. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN");
}

/** Time of day only ("4:21 pm"), for rows already grouped by date. */
export function formatTime(v: string | number | Date | null | undefined): string {
  const d = toDate(v);
  if (!d) return "";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

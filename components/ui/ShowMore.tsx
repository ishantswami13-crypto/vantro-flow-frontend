"use client";
import { formatNumber } from "@/lib/locale";

/** The "show more" row under a list rendered with useIncrementalList. */
export function ShowMore({ shown, total, remaining, onClick, step = 100 }: { shown: number; total: number; remaining: number; onClick: () => void; step?: number }) {
  if (remaining <= 0) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted">
      <span>Showing {formatNumber(shown)} of {formatNumber(total)}</span>
      <button type="button" onClick={onClick} className="font-semibold underline underline-offset-2">
        Show {formatNumber(Math.min(step, remaining))} more
      </button>
    </div>
  );
}

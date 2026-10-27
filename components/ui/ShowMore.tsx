"use client";

/** The "show more" row under a list rendered with useIncrementalList. */
export function ShowMore({ shown, total, remaining, onClick, step = 100 }: { shown: number; total: number; remaining: number; onClick: () => void; step?: number }) {
  if (remaining <= 0) return null;
  return (
    <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted">
      <span>Showing {shown.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}</span>
      <button type="button" onClick={onClick} className="font-semibold underline underline-offset-2">
        Show {Math.min(step, remaining).toLocaleString("en-IN")} more
      </button>
    </div>
  );
}

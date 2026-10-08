import s from "./more.module.css";

// Route-level loading shape for the More pages: title, figure row and a
// table, so the page doesn't jump when the real content arrives.
export function PageSkeleton({ figures = 4, rows = 6 }: { figures?: number; rows?: number }) {
  return (
    <div className={s.skelPage} role="status" aria-busy="true" aria-label="Loading">
      <div>
        <div className="skeleton" style={{ height: 26, width: 180, marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 12, width: 320, maxWidth: "80%" }} />
      </div>
      {figures > 0 && (
        <div className="flex flex-wrap" style={{ gap: 40 }}>
          {Array.from({ length: figures }).map((_, i) => (
            <div key={i}>
              <div className="skeleton" style={{ height: 26, width: 120, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 10, width: 80 }} />
            </div>
          ))}
        </div>
      )}
      <div className={s.panel} style={{ padding: "6px 20px" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between" style={{ height: 52, gap: 16, borderBottom: i === rows - 1 ? "none" : "1px solid var(--line-row)" }}>
            <div className="skeleton" style={{ height: 11, width: 200 - (i % 3) * 30 }} />
            <div className="skeleton" style={{ height: 11, width: 84 }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}

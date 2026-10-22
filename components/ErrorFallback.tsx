import { IconAlert } from "@/components/v32/icons";

export function ErrorFallback({ errorId, retryAction }: { errorId?: string | null, retryAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" style={{ gap: 12 }}>
      <span aria-hidden="true" className="inline-flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, color: "var(--critical)", background: "rgb(var(--tk-critical) / 0.10)" }}>
        <IconAlert size={19} />
      </span>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>This page hit a problem</h2>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", maxWidth: 380, lineHeight: 1.55 }}>
        It has been logged. Try again, or go back to the Bridge.
      </p>
      {errorId && <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>Reference <span className="select-all">{errorId}</span></p>}
      <div className="flex gap-2" style={{ marginTop: 8 }}>
        <button onClick={retryAction} className="ui-btn ui-btn-primary">Try again</button>
        <a href="/bridge" className="ui-btn ui-btn-secondary">Back to the Bridge</a>
      </div>
    </div>
  );
}

export function ErrorIdBadge({ id }: { id: string }) {
  if (!id) return null;
  return <span className="chip chip-critical">{id}</span>;
}

export function OfflineBanner() {
  return (
    <div role="status" className="fixed bottom-0 left-0 right-0 px-4 py-2.5 text-center text-sm z-50"
      style={{ background: "var(--elevated)", borderTop: "1px solid var(--line)", color: "var(--warning)" }}>
      You are offline. Starlane will catch up when your connection is back.
    </div>
  );
}

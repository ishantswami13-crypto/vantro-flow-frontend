export function ErrorFallback({ errorId, retryAction }: { errorId: string, retryAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center"
      style={{ background: "#080808" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(245,66,77,0.1)", border: "1px solid rgba(245,66,77,0.2)" }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#F5424D">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "#F2F2F2" }}>Something went wrong</h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: "#888888" }}>
        We've logged this issue. Please try again or return to the dashboard.
      </p>

      <div className="rounded-lg px-4 py-2 mb-6 font-mono text-sm flex items-center gap-2"
        style={{ background: "#161616", border: "1px solid #222222", color: "#888888" }}>
        <span>Error ID:</span>
        <span className="font-bold select-all" style={{ color: "#F2F2F2" }}>{errorId}</span>
      </div>

      <div className="flex gap-3">
        <button onClick={retryAction}
          className="px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "#4F6EF7", color: "#ffffff" }}>
          Try Again
        </button>
        <a href="/dashboard"
          className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "#161616", border: "1px solid #222222", color: "#888888" }}>
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

export function ErrorIdBadge({ id }: { id: string }) {
  if (!id) return null;
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono"
      style={{ background: "rgba(245,66,77,0.1)", color: "#F5424D", border: "1px solid rgba(245,66,77,0.2)" }}>
      {id}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 py-3 text-center text-sm font-medium z-50"
      style={{ background: "#F5A524", color: "#080808" }}>
      You are currently offline. Check your internet connection.
    </div>
  );
}

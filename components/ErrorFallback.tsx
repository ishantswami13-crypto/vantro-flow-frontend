export function ErrorFallback({ errorId, retryAction }: { errorId: string, retryAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        We've logged this issue and our engineering team will look into it. 
      </p>
      
      <div className="bg-gray-100 rounded-md px-4 py-2 mb-6 font-mono text-sm text-gray-600 flex items-center gap-2">
        <span>Error ID:</span>
        <span className="font-bold text-gray-900 select-all">{errorId}</span>
      </div>

      <div className="flex gap-4">
        <button onClick={retryAction} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
          Try Again
        </button>
        <a href="/dashboard" className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

export function ErrorIdBadge({ id }: { id: string }) {
  if (!id) return null;
  return (
    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 font-mono">
      {id}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-3 text-center text-sm font-medium z-50">
      You are currently offline. Check your internet connection.
    </div>
  );
}

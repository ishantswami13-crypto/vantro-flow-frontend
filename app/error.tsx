'use client';

import { useEffect } from 'react';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function Error({
  error,
  reset,
}: {
  error: Error & { requestId?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Starlane Error]', error);
  }, [error]);

  const errorId = error.requestId || 'UNKNOWN';

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-secondary)" }}>
      <ErrorFallback errorId={errorId} retryAction={reset} />
    </div>
  );
}

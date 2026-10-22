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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <ErrorFallback errorId={error.requestId} retryAction={reset} />
    </div>
  );
}

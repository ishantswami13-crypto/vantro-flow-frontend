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
    console.error('[Vantro Error]', error);
  }, [error]);

  const errorId = error.requestId || 'UNKNOWN';

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorFallback errorId={errorId} retryAction={reset} />
    </div>
  );
}

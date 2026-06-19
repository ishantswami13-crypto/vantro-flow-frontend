'use client';

import { useEffect } from 'react';

import { ErrorFallback } from '@/components/ErrorFallback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { requestId?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Starlane Global Error]', error);
  }, [error]);

  const errorId = error.requestId || 'UNKNOWN';

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '2rem', maxWidth: '600px', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>A critical error occurred</h1>
            <p style={{ marginBottom: '2rem' }}>We've been notified. Please try reloading the page.</p>
            <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', marginBottom: '2rem' }}>
              Error ID: {errorId}
            </div>
            <button
              onClick={reset}
              style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

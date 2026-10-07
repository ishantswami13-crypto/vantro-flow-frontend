'use client';

import { useEffect } from 'react';

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
        <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>A critical error occurred</h1>
            <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>We've been notified. Please try reloading the page.</p>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
              Error ID: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{errorId}</span>
            </div>
            <button
              onClick={reset}
              style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-inverse)', color: 'white', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

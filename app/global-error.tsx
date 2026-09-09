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
    console.error('[Starlane Error]', error);
  }, [error]);

  const errorId = error.requestId || 'UNKNOWN';

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '2rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#F2F2F2' }}>A critical error occurred</h1>
            <p style={{ marginBottom: '2rem', color: '#888888' }}>We've been notified. Please try reloading the page.</p>
            <div style={{ background: '#161616', border: '1px solid #222222', padding: '1rem', borderRadius: '0.5rem', fontFamily: 'monospace', marginBottom: '2rem', color: '#888888' }}>
              Error ID: <span style={{ color: '#F2F2F2', fontWeight: 'bold' }}>{errorId}</span>
            </div>
            <button
              onClick={reset}
              style={{ padding: '0.75rem 1.5rem', background: '#4F6EF7', color: 'white', borderRadius: '0.75rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Reload application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

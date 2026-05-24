'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Vantro Global Error]', error);
  }, [error]);

  return (
    <html lang="hi">
      <body>
        <div
          style={{
            minHeight: '100vh',
            background: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              fontSize: 28,
            }}
          >
            🚨
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
            App mein kuch problem hai
          </h1>
          <p style={{ color: '#6b7280', marginBottom: 24, maxWidth: 320 }}>
            Please page refresh karein. Problem persist kare toh support se contact karein.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Refresh karein
          </button>
        </div>
      </body>
    </html>
  );
}

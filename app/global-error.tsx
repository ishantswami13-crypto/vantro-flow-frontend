'use client';

import { useEffect } from 'react';

// Replaces the root layout when it fails, so no stylesheet is guaranteed:
// the dark-theme token values are written out here on purpose.
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

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0D0D0C', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 8px', color: '#EDECE8' }}>Starlane couldn&apos;t load</h1>
            <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.55, color: '#9E9D97' }}>Something failed while starting the app. Reloading usually fixes it.</p>
            {error.requestId && (
              <p style={{ margin: '0 0 24px', fontSize: 12.5, color: '#7C7B75' }}>Reference {error.requestId}</p>
            )}
            <button
              onClick={reset}
              style={{ height: 36, padding: '0 16px', background: '#EDECE8', color: '#0D0D0C', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

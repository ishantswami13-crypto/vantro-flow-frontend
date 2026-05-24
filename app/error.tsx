'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Vantro Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Kuch galat ho gaya</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        Ek error aa gayi. Hamari team ko pata chal gaya hai.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Dobara try karein
      </button>
    </div>
  );
}

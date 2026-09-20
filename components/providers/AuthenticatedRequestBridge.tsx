"use client";

import { useEffect } from "react";

const API_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app"
).origin;

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )vantro_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function unsafe(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

/**
 * Migration boundary for legacy screens that directly call fetch(). It only
 * touches requests sent to the configured API origin; third-party requests
 * retain their original browser behavior.
 */
export default function AuthenticatedRequestBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    const bridgedFetch: typeof window.fetch = (input, init = {}) => {
      const url = input instanceof Request ? input.url : String(input);
      let origin: string;
      try {
        origin = new URL(url, window.location.origin).origin;
      } catch {
        return nativeFetch(input, init);
      }
      if (origin !== API_ORIGIN) return nativeFetch(input, init);

      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      const method = init.method || (input instanceof Request ? input.method : "GET");
      const csrf = csrfToken();
      if (unsafe(method) && csrf && !headers.has("Authorization") && !headers.has("X-CSRF-Token")) {
        headers.set("X-CSRF-Token", csrf);
      }

      return nativeFetch(input, { ...init, headers, credentials: init.credentials || "include" });
    };

    window.fetch = bridgedFetch;
    return () => {
      if (window.fetch === bridgedFetch) window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("vantro_cookie_consent");
      if (!consent) {
        // Show after 1.5 s — let the page settle first
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable (SSR / private mode) — do nothing
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem("vantro_cookie_consent", "accepted"); } catch {}
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem("vantro_cookie_consent", "declined"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 right-4 left-4 sm:left-auto w-auto sm:w-[380px] z-[300] cookie-slide-up"
    >
      <div
        className="flex flex-col gap-3 px-4 py-3.5 rounded-xl"
        style={{
          background: "var(--elevated)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Text */}
        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
          We use cookies to improve your experience and analyse usage.{" "}
          <Link
            href="/privacy"
            className="underline"
            style={{ color: "var(--ink)" }}
          >
            Privacy policy
          </Link>
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={decline}
            className="ui-btn ui-btn-ghost ui-btn-sm"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="ui-btn ui-btn-primary ui-btn-sm"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

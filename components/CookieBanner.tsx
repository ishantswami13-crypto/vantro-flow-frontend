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
          background: "#FFFFFF",
          border: "1px solid #E5E5E1",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* Text */}
        <p className="text-xs leading-relaxed" style={{ color: "#686868" }}>
          We use cookies to improve your experience and analyse usage.{" "}
          <Link
            href="/privacy"
            className="underline transition-colors hover:text-gray-900"
            style={{ color: "#171717" }}
          >
            Privacy policy
          </Link>
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50"
            style={{ color: "#686868" }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ background: "#171717", color: "#ffffff" }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[520px] z-[300] cookie-slide-up"
    >
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 rounded-2xl"
        style={{
          background: "rgba(14,14,16,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
            We use cookies to improve your experience and analyse usage.{" "}
            <Link
              href="/privacy"
              className="underline transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              Privacy policy
            </Link>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors hover:opacity-70"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#ffffff", color: "#000000" }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

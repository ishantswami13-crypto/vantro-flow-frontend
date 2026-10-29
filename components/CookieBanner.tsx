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

  // Colours come from --ck-* variables so a page can restyle the notice to its
  // own surface (the public site sets a dark variant in start.css).
  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="cookie-consent fixed bottom-4 right-4 left-4 sm:left-auto w-auto sm:w-[380px] z-[300] cookie-slide-up"
    >
      <div className="cookie-card flex flex-col gap-3 px-4 py-3.5 rounded-xl">
        <p className="text-xs leading-relaxed">
          We use cookies to improve your experience and analyse usage.{" "}
          <Link href="/privacy" className="underline">Privacy policy</Link>
        </p>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={decline} className="cookie-quiet px-3 py-1.5 rounded-lg text-xs font-medium">Decline</button>
          <button type="button" onClick={accept} className="cookie-solid px-3.5 py-1.5 rounded-lg text-xs font-semibold">Accept all</button>
        </div>
      </div>
    </div>
  );
}

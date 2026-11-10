"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The cookie notice belongs to the public website only. Inside the signed-in
// app (and on sign-in pages) it never shows. This is an allowlist, so any new
// app page stays clean by default.
const MARKETING_PREFIXES = [
  "/platform", "/integrations", "/security", "/pricing", "/company",
  "/solutions", "/pilots", "/access", "/product", "/resources",
  "/legal", "/privacy", "/terms",
];

export function isMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function CookieBanner() {
  const pathname = usePathname();
  const onMarketing = isMarketingPath(pathname);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!onMarketing) {
      setVisible(false);
      return;
    }
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
  }, [onMarketing]);

  const accept = () => {
    try { localStorage.setItem("vantro_cookie_consent", "accepted"); } catch {}
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem("vantro_cookie_consent", "declined"); } catch {}
    setVisible(false);
  };

  if (!visible || !onMarketing) return null;

  // A centred card that rises in over the page. Colours come from --ck-*
  // variables so a page can restyle the notice to its own surface.
  return (
    <div role="region" aria-label="Cookie consent" className="cookie-consent cookie-rise">
      <div className="cookie-card">
        <p className="cookie-title">We use cookies</p>
        <p className="cookie-text">
          By choosing &ldquo;Accept all&rdquo;, you agree to cookies that help us understand how the site is used. Starlane works the same if you reject them.
        </p>
        <div className="cookie-actions">
          <button type="button" onClick={accept} className="cookie-btn">Accept all</button>
          <button type="button" onClick={decline} className="cookie-btn">Reject all</button>
          <Link href="/privacy" className="cookie-btn">Privacy policy</Link>
        </div>
      </div>
    </div>
  );
}

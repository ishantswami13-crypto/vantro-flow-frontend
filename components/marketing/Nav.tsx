"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function useNavScroll(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fn = () => el.classList.toggle("on", window.scrollY > 8);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [ref]);
}

// Section 01 — navigation. Wordmark left, a handful of anchors, one CTA.
export function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useNavScroll(navRef);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); navRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    if (menuOpen) document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav aria-label="Main navigation" className="sl-nav" ref={navRef}>
        <Link href="/" aria-label="Starlane home" className="sl-wordmark">Starlane</Link>
        <div className="sl-navlinks">
          <a href="#product" className="hidden md:inline">Product</a>
          <a href="#story" className="hidden md:inline">Intelligence</a>
          <a href="#capabilities" className="hidden md:inline">Capabilities</a>
          <Link href="/login" className="hidden md:inline">Sign in</Link>
          <Link href="/signup" className="sl-btn sl-btn-solid">Request access</Link>
          <button
            type="button"
            className="sl-nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="sl-mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{menuOpen ? "×" : "≡"}</span>
          </button>
        </div>
      </nav>
      <div id="sl-mobile-menu" className={`sl-mobile-menu${menuOpen ? " open" : ""}`}>
        <a href="#product" onClick={close}>Product</a>
        <a href="#story" onClick={close}>Intelligence</a>
        <a href="#capabilities" onClick={close}>Capabilities</a>
        <Link href="/login" onClick={close}>Sign in</Link>
      </div>
    </>
  );
}

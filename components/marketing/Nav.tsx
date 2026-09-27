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
          <Link href="/product" className="hidden md:inline">Product</Link>
          <Link href="/product/briefing" className="hidden md:inline">Briefing</Link>
          <Link href="/product/agents" className="hidden md:inline">Agents</Link>
          <Link href="/product/apps" className="hidden md:inline">Apps</Link>
          <Link href="/product/control" className="hidden md:inline">Trust</Link>
          <Link href="/login" className="hidden md:inline">Sign in</Link>
          <Link href="/access" className="sl-btn sl-btn-solid">Get Starlane</Link>
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
        <Link href="/product" onClick={close}>Product guide</Link>
        <Link href="/product/briefing" onClick={close}>Owner briefing</Link>
        <Link href="/product/agents" onClick={close}>Agents</Link>
        <Link href="/product/apps" onClick={close}>Desktop &amp; mobile</Link>
        <Link href="/product/control" onClick={close}>Trust</Link>
        <Link href="/login" onClick={close}>Sign in</Link>
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import StarlaneMark from "@/components/brand/StarlaneMark";
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

// Public navigation. Wordmark left, four destinations centred, sign in and one
// call to action right. Transparent at the top of the page; a quiet surface and
// hairline once the page scrolls. tone="dark" for pages that open on a dark hero.
const LINKS: Array<[string, string]> = [
  ["/product", "Product"],
  ["/integrations", "Integrations"],
  ["/#how", "How it works"],
  ["/security", "Trust"],
];

export function Nav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();
  const cur = (href: string) => (path === href ? "page" : undefined);
  useNavScroll(navRef);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); navRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); } };
    if (menuOpen) document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav aria-label="Main navigation" className={`sl-nav${tone === "dark" ? " sl-nav-dark" : ""}`} ref={navRef}>
        <Link href="/" aria-label="Starlane home" className="sl-wordmark" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><StarlaneMark size={24} />Starlane</Link>
        <div className="sl-navlinks">
          <div className="sl-navmid">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} aria-current={cur(href)} className="hidden md:inline">{label}</Link>
            ))}
          </div>
          <Link href="/login" className="hidden md:inline">Sign in</Link>
          <Link href="/access" className="sl-btn sl-btn-solid">Request a pilot</Link>
          <button
            type="button"
            className="sl-nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="sl-mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden className={`sl-burger${menuOpen ? " x" : ""}`}><i /><i /></span>
          </button>
        </div>
      </nav>
      <div id="sl-mobile-menu" className={`sl-mobile-menu${menuOpen ? " open" : ""}${tone === "dark" ? " sl-nav-dark" : ""}`}>
        {LINKS.map(([href, label]) => <Link key={href} href={href} onClick={close}>{label}</Link>)}
        <Link href="/login" onClick={close}>Sign in</Link>
      </div>
    </>
  );
}

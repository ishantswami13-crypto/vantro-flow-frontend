"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import StarlaneWordmark from "@/components/brand/StarlaneWordmark";
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

// Public navigation. Wordmark left, five destinations centred, sign in and one
// call to action right. Transparent at the top of the page; a quiet surface and
// hairline once the page scrolls.
const LINKS: Array<[string, string]> = [
  ["/platform", "Product"],
  ["/integrations", "Integrations"],
  ["/security", "Security"],
  ["/pricing", "Pricing"],
  ["/company", "Company"],
];

export function Nav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const navRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const path = usePathname();
  const cur = (href: string) => (path === href || path?.startsWith(href + "/") ? "page" : undefined);
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
        <Link href="/" aria-label="Starlane home" className="sl-wordmark sl-wordmark-lockup"><StarlaneWordmark height={19} title={null} /></Link>
        <div className="sl-navlinks">
          <div className="sl-navmid">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} aria-current={cur(href)} className="hidden lg:inline">{label}</Link>
            ))}
          </div>
          <Link href="/login" className="hidden lg:inline">Sign in</Link>
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
      <nav id="sl-mobile-menu" aria-label="Menu" className={`sl-mobile-menu${menuOpen ? " open" : ""}${tone === "dark" ? " sl-menu-dark" : ""}`}>
        {LINKS.map(([href, label]) => <Link key={href} href={href} aria-current={cur(href)} onClick={close}>{label}</Link>)}
        <Link href="/login" onClick={close}>Sign in</Link>
      </nav>
    </>
  );
}

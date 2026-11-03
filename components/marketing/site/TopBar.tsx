"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import StarlaneWordmark from "@/components/brand/StarlaneWordmark";
import { MENUS, PLAIN, LOGIN, BANNER, type Menu } from "./topbar-data";

// The public top bar: an announcement banner, then a sticky header with the
// wordmark, six destinations, sign in and one call to action. Four
// destinations open a full-width mega menu (columns of links and a featured
// card). The header reads the colour of the section under it and turns light
// or dark to match, so it never sits as a slab of the wrong colour.

type Theme = "light" | "dark";

// React 18 has no boolean `inert`; an empty string sets the attribute.
const inert = (on: boolean) => (on ? ({ inert: "" } as Record<string, string>) : {});

function Chevron() {
  return (
    <svg className="tb-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Relative luminance of the first opaque background at or above an element.
function backgroundIsDark(start: Element | null): boolean | null {
  let el: Element | null = start;
  while (el && el !== document.documentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
      if (parseFloat(a) > 0.5) {
        const lum = 0.2126 * +r + 0.7152 * +g + 0.0722 * +b;
        return lum < 110;
      }
    }
    el = el.parentElement;
  }
  return null;
}

function useSectionTheme(headerRef: React.RefObject<HTMLElement | null>, fallback: Theme) {
  const [theme, setTheme] = useState<Theme>(fallback);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const h = headerRef.current;
      if (!h) return;
      const y = h.getBoundingClientRect().bottom + 2;
      const x = Math.round(window.innerWidth * 0.5);
      const below = document.elementsFromPoint(x, y).find((el) => !h.contains(el) && !el.closest(".tb-mobile") && getComputedStyle(el).position !== "fixed");
      const dark = backgroundIsDark(below ?? null);
      if (dark !== null) setTheme(dark ? "dark" : "light");
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const t = window.setTimeout(read, 400);
    return () => { window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); cancelAnimationFrame(raf); clearTimeout(t); };
  }, [headerRef]);
  return theme;
}

function Featured({ menu, onNavigate }: { menu: Menu; onNavigate: () => void }) {
  const f = menu.featured;
  return (
    <Link href={f.href} className="tb-feat" onClick={onNavigate}>
      <div className="tb-feat-card" aria-hidden>
        <ul className="tb-pairs">
          {f.pairs.map(([a, b], i) => (
            <li key={a + b} style={{ "--i": i } as React.CSSProperties}>
              <span>{a}</span><i /><span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="tb-feat-h">{f.title}</p>
      <p className="tb-feat-p">{f.blurb}</p>
    </Link>
  );
}

export function TopBar({ tone = "light" }: { tone?: Theme }) {
  const headerRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const path = usePathname() ?? "/";
  const theme = useSectionTheme(headerRef, tone);
  const [open, setOpen] = useState<string | null>(null);
  const [login, setLogin] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileSec, setMobileSec] = useState<string | null>(null);
  const [banner, setBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const closeT = useRef<number | undefined>(undefined);
  const openT = useRef<number | undefined>(undefined);

  useEffect(() => {
    try { if (sessionStorage.getItem("sl-banner") === BANNER.id) setBanner(false); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const closeAll = useCallback(() => { setOpen(null); setLogin(false); setMobile(false); }, []);
  useEffect(() => { closeAll(); }, [path, closeAll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) wrapRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${open}"]`)?.focus();
      closeAll();
    };
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) { setOpen(null); setLogin(false); } };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, closeAll]);

  const mobileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const top = headerRef.current?.getBoundingClientRect().bottom;
    if (mobile && top !== undefined) mobileRef.current?.style.setProperty("--tb-m-top", `${Math.max(0, top)}px`);
    document.documentElement.classList.toggle("tb-lock", mobile);
    return () => document.documentElement.classList.remove("tb-lock");
  }, [mobile]);

  // Hover intent: open after a beat, close after leaving the header and panel.
  const hoverOpen = (id: string) => {
    if (!window.matchMedia("(hover: hover) and (min-width: 1025px)").matches) return;
    clearTimeout(closeT.current); clearTimeout(openT.current);
    openT.current = window.setTimeout(() => { setOpen(id); setLogin(false); }, open ? 0 : 90);
  };
  const hoverLeave = () => {
    clearTimeout(openT.current);
    closeT.current = window.setTimeout(() => setOpen(null), 180);
  };
  const hoverStay = () => clearTimeout(closeT.current);

  const isCurrent = (hrefs: string[]) => hrefs.some((h) => { const p = h.split("#")[0]; return p !== "/" && (path === p || path.startsWith(p + "/")); });
  const dismissBanner = () => { setBanner(false); try { sessionStorage.setItem("sl-banner", BANNER.id); } catch { /* storage blocked */ } };
  const active = MENUS.find((m) => m.id === open) ?? null;

  return (
    <div ref={wrapRef} className={`tb tb-${theme}${open ? " tb-has-open" : ""}`}>
      {banner && (
        <div className="tb-banner" role="region" aria-label="Announcement">
          <p><span>{BANNER.text}</span> <Link href={BANNER.href}>{BANNER.cta}</Link></p>
          <button type="button" className="tb-banner-x" aria-label="Dismiss announcement" onClick={dismissBanner}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="m2 2 10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
      <header ref={headerRef} className={`tb-head${scrolled ? " is-scrolled" : ""}`} onMouseLeave={hoverLeave} onMouseEnter={hoverStay}>
        <nav className="tb-bar" aria-label="Main navigation">
          <Link href="/" aria-label="Starlane home" className="tb-mark"><StarlaneWordmark height={26} title={null} /></Link>
          <ul className="tb-items">
            {[...MENUS.slice(0, 2), PLAIN[0], PLAIN[1], ...MENUS.slice(2)].map((item) => {
              if ("href" in item) {
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="tb-item" aria-current={isCurrent([item.href]) ? "page" : undefined} onMouseEnter={() => { clearTimeout(openT.current); if (open) setOpen(null); }}>
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const m = item as Menu;
              const on = open === m.id;
              const cur = isCurrent(m.cols.flatMap((c) => c.links.map((l) => l.href)));
              return (
                <li key={m.id}>
                  <button
                    type="button" data-menu={m.id}
                    className={`tb-item${on ? " is-open" : ""}${cur ? " is-current" : ""}`}
                    aria-expanded={on} aria-controls="tb-mega"
                    onClick={() => { setOpen(on ? null : m.id); setLogin(false); }}
                    onMouseEnter={() => hoverOpen(m.id)}
                  >
                    {m.label}<Chevron />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="tb-act">
            <div className={`tb-login${login ? " is-open" : ""}`}>
              <button type="button" className="tb-btn tb-btn-line" aria-expanded={login} aria-haspopup="true" onClick={() => { setLogin((v) => !v); setOpen(null); }}>
                Login<Chevron />
              </button>
              <ul className="tb-login-menu">
                {LOGIN.map(([href, label, sub]) => (
                  <li key={href}><Link href={href} onClick={closeAll}><span>{label}</span><small>{sub}</small></Link></li>
                ))}
              </ul>
            </div>
            <Link href="/access" className="tb-btn tb-btn-solid">Request a Demo</Link>
            <button type="button" className="tb-burger" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} aria-controls="tb-mobile" onClick={() => setMobile((v) => !v)}>
              <span className={mobile ? "x" : ""}><i /><i /></span>
            </button>
          </div>
        </nav>

        <div id="tb-mega" className={`tb-mega${active ? " is-open" : ""}`} onMouseEnter={hoverStay} aria-hidden={!active}>
          <div className="tb-mega-clip">
            {MENUS.map((m) => (
              <div key={m.id} className={`tb-panel${open === m.id ? " is-on" : ""}`} {...inert(open !== m.id)}>
                <div className="tb-cols" style={{ "--n": m.cols.length } as React.CSSProperties}>
                  {m.cols.map((c, ci) => (
                    <div key={c.h} className="tb-col" style={{ "--c": ci } as React.CSSProperties}>
                      <p className="tb-col-h">{c.h}</p>
                      <ul>
                        {c.links.map((l) => <li key={l.href + l.label}><Link href={l.href} onClick={closeAll}>{l.label}</Link></li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="tb-side"><Featured menu={m} onNavigate={closeAll} /></div>
              </div>
            ))}
          </div>
        </div>
      </header>
      <div className={`tb-scrim${active ? " is-on" : ""}`} aria-hidden onClick={() => setOpen(null)} />

      <div id="tb-mobile" ref={mobileRef} className={`tb-mobile${mobile ? " is-open" : ""}`} {...inert(!mobile)}>
        <ul>
          {MENUS.slice(0, 2).map((m) => <MobileSec key={m.id} m={m} open={mobileSec === m.id} toggle={() => setMobileSec(mobileSec === m.id ? null : m.id)} onNavigate={closeAll} />)}
          {PLAIN.map((p) => <li key={p.href}><Link className="tb-m-row" href={p.href} onClick={closeAll}>{p.label}</Link></li>)}
          {MENUS.slice(2).map((m) => <MobileSec key={m.id} m={m} open={mobileSec === m.id} toggle={() => setMobileSec(mobileSec === m.id ? null : m.id)} onNavigate={closeAll} />)}
        </ul>
        <div className="tb-m-act">
          <Link href="/login" className="tb-btn tb-btn-line" onClick={closeAll}>Login</Link>
          <Link href="/access" className="tb-btn tb-btn-solid" onClick={closeAll}>Request a Demo</Link>
        </div>
      </div>
    </div>
  );
}

function MobileSec({ m, open, toggle, onNavigate }: { m: Menu; open: boolean; toggle: () => void; onNavigate: () => void }) {
  return (
    <li className={`tb-m-sec${open ? " is-open" : ""}`}>
      <button type="button" className="tb-m-row" aria-expanded={open} onClick={toggle}>{m.label}<Chevron /></button>
      <div className="tb-m-body"><div>
        {m.cols.map((c) => (
          <div key={c.h} className="tb-m-col">
            <p>{c.h}</p>
            {c.links.map((l) => <Link key={l.href + l.label} href={l.href} onClick={onNavigate}>{l.label}</Link>)}
          </div>
        ))}
      </div></div>
    </li>
  );
}

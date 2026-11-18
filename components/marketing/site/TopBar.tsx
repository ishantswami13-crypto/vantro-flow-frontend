"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import StarlaneWordmark from "@/components/brand/StarlaneWordmark";
import { MENUS, PLAIN, LOGIN, type Menu } from "./topbar-data";

// The public top bar: a sticky header with the wordmark, six destinations,
// sign in and one call to action. Four destinations open a full-width mega
// menu (columns of links and a featured card). Like the reference, the header
// is a translucent, blurred bar that takes the colour of the section beneath
// it: paper with ink text over light sections, ink with paper text over dark
// ones, switching as you scroll.

type Theme = "light" | "dark";

// React 18 has no boolean `inert`; an empty string sets the attribute.
const inert = (on: boolean) => (on ? ({ inert: "" } as Record<string, string>) : {});

// Lightness (0 to 1) and alpha of a computed background colour, or null when
// the browser reports a format this does not read.
function readBg(v: string): { l: number; a: number } | null {
  const n = v.match(/-?[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  if (v.startsWith("rgb")) return { l: (0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]) / 255, a: n.length > 3 ? n[3] : 1 };
  if (v.startsWith("oklab") || v.startsWith("oklch")) return { l: n[0] > 1 ? n[0] / 100 : n[0], a: v.includes("/") ? n[n.length - 1] : 1 };
  return null;
}

// The theme of the section under the header's middle line, as the reference
// does it: the section (or footer) decides, not a picture or film inside it,
// so the bar stays paper over a dark video on a paper section. A section can
// say so outright with data-nav-theme. Paper when unsure.
function themeUnder(header: HTMLElement, skip: HTMLElement | null): Theme {
  const r = header.getBoundingClientRect();
  const y = Math.max(1, r.top + r.height / 2);
  for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
    if (skip?.contains(el)) continue;
    const sec = el.closest("[data-nav-theme], section, footer") ?? el;
    const said = sec.getAttribute("data-nav-theme");
    if (said === "dark" || said === "light") return said;
    for (let n: Element | null = sec; n && n !== document.documentElement; n = n.parentElement) {
      const bg = readBg(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0.5) return bg.l < 0.45 ? "dark" : "light";
    }
    break;
  }
  return "light";
}

function Chevron() {
  return (
    <svg className="tb-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

export function TopBar() {
  const headerRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const path = usePathname() ?? "/";
  const [theme, setTheme] = useState<Theme>("light");
  const [open, setOpen] = useState<string | null>(null);
  const [login, setLogin] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileSec, setMobileSec] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const closeT = useRef<number | undefined>(undefined);
  const openT = useRef<number | undefined>(undefined);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(window.scrollY > 4);
      if (headerRef.current) setTheme(themeUnder(headerRef.current, wrapRef.current));
    };
    const fn = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    // Sections can paint in after load (fonts, reveals), so read once more.
    const late = window.setTimeout(read, 400);
    window.addEventListener("scroll", fn, { passive: true });
    window.addEventListener("resize", fn);
    return () => { window.removeEventListener("scroll", fn); window.removeEventListener("resize", fn); cancelAnimationFrame(raf); clearTimeout(late); };
  }, [path]);

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
  const active = MENUS.find((m) => m.id === open) ?? null;

  return (
    <div ref={wrapRef} className={`tb tb-${theme}${open ? " tb-has-open" : ""}`}>
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

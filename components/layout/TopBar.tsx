"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { V32_NAV_ITEMS, V32_WORKSPACE_NAV_ITEMS, MORE_NAV_ITEMS, OTHER_PAGES, activeHref } from "@/lib/navigation";
import { getTheme, toggleTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { IconMenu, IconSearch, IconScan, IconSun, IconMoon, IconBell } from "@/components/v32/icons";
import { loadPulse, type Pulse } from "@/lib/pulse";
import { formatRelative, formatDateTime } from "@/lib/format";

const FRESH: Record<string, { tone: string; word: string }> = {
  fresh: { tone: "positive", word: "Up to date" },
  delayed: { tone: "attention", word: "Delayed" },
  stale: { tone: "critical", word: "Stale" },
  none: { tone: "unknown", word: "No source yet" },
};

const GROUPS: { label: string; items: { href: string; label: string; also?: string[] }[] }[] = [
  { label: "Surfaces", items: V32_NAV_ITEMS },
  { label: "Workspace", items: V32_WORKSPACE_NAV_ITEMS },
  { label: "More", items: [...MORE_NAV_ITEMS, ...OTHER_PAGES] },
];
const ALL = GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));

function crumbsFor(pathname: string, pageTitle?: string): { href?: string; label: string }[] {
  const href = activeHref(pathname, ALL);
  if (!href) return pageTitle ? [{ label: pageTitle }] : [];
  const item = ALL.find(i => i.href === href)!;
  const out: { href?: string; label: string }[] = [{ label: item.group }];
  if (pathname === href) out.push({ label: item.label });
  else {
    out.push({ href, label: item.label });
    out.push({ label: pageTitle && pageTitle !== item.label ? pageTitle : "Details" });
  }
  return out;
}

/** The compact top bar: where you are on the left, asking and theme on the
 *  right. On phones it also carries the menu button. */
export default function TopBar({ pageTitle, onMenu, onSearch }: { pageTitle?: string; onMenu: () => void; onSearch: () => void }) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname, pageTitle);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    let live = true;
    loadPulse().then(p => { if (live) setPulse(p); });
    return () => { live = false; };
  }, [pathname]);
  const fresh = pulse ? FRESH[pulse.freshness] || FRESH.none : null;

  useEffect(() => {
    setThemeState(getTheme());
    const on = () => setThemeState(getTheme());
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);

  return (
    <header className="app-topbar">
      <button type="button" onClick={onMenu} className="icon-btn md:hidden" aria-label="Open menu" style={{ marginLeft: -8 }}>
        <IconMenu size={17} />
      </button>
      <nav aria-label="Breadcrumb" className="crumbs flex-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={i} className={`flex items-center gap-1.5 min-w-0 ${i === 0 && crumbs.length > 1 ? "hidden sm:flex" : ""}`}>
              {c.href && !last ? <Link href={c.href} className="truncate">{c.label}</Link>
                : <span className="truncate" aria-current={last ? "page" : undefined}>{c.label}</span>}
              {!last && <span aria-hidden="true" style={{ color: "var(--line-strong)" }}>/</span>}
            </span>
          );
        })}
      </nav>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onSearch} className="icon-btn md:hidden" aria-label="Search">
          <IconSearch size={15} />
        </button>
        {fresh && (
          <Link
            href="/sources"
            className={`chip chip-${fresh.tone} hidden md:inline-flex`}
            style={{ marginRight: 4 }}
            title={pulse?.dataAsOf ? `Business data as of ${formatDateTime(pulse.dataAsOf)}` : "No source has synced yet"}
          >
            {pulse?.source ? `${pulse.source} · ` : ""}{fresh.word}{pulse?.dataAsOf && pulse.freshness !== "none" ? ` · ${formatRelative(pulse.dataAsOf)}` : ""}
          </Link>
        )}
        {pulse && (
          <Link href="/prepared" className="icon-btn relative" aria-label={pulse.needs ? `${pulse.needs} need you` : "Nothing needs you"} title={pulse.needs ? `${pulse.needs} need you` : "Nothing needs you"}>
            <IconBell size={15} />
            {pulse.needs > 0 && (
              <span className="absolute tabular-nums" style={{ top: 2, right: 1, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 99, background: "var(--critical)", color: "var(--bg)", fontSize: 10, fontWeight: 600, lineHeight: "15px", textAlign: "center" }}>
                {pulse.needs > 9 ? "9+" : pulse.needs}
              </span>
            )}
          </Link>
        )}
        {!pathname.startsWith("/scan") && (
          <Link href="/scan" className="ui-btn ui-btn-ghost ui-btn-sm hidden sm:inline-flex" style={{ gap: 6 }}>
            <IconScan size={14} /> Ask Starlane
          </Link>
        )}
        <button
          type="button"
          onClick={() => setThemeState(toggleTheme())}
          className="icon-btn"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
        >
          {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>
      </div>
    </header>
  );
}

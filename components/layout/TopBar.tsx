"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { V32_NAV_ITEMS, V32_WORKSPACE_NAV_ITEMS, MORE_NAV_ITEMS, OTHER_PAGES, activeHref } from "@/lib/navigation";
import { getTheme, toggleTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { IconMenu, IconSearch, IconScan, IconSun, IconMoon } from "@/components/v32/icons";

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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getUser, clearAuth } from "@/lib/api";
import { getSmartHiddenRoutes } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { IdentityAvatar } from "@/components/identity/IdentityAvatar";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import {
  V32_NAV_ITEMS, V32_WORKSPACE_NAV_ITEMS, MORE_NAV_ITEMS, activeHref, type PrimaryNavItem,
} from "@/lib/navigation";
import { listThreads, SCAN_THREADS_EVENT, type ScanThread } from "@/lib/scanStore";
import { getTheme, toggleTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import {
  IconSearch, IconMore, IconSidebar, IconSun, IconMoon, IconUser, IconKeyboard, IconLogout, IconX, IconChevronDown,
} from "@/components/v32/icons";
import StarlaneMark from "@/components/brand/StarlaneMark";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
}

const ALL_ITEMS = [...V32_NAV_ITEMS, ...V32_WORKSPACE_NAV_ITEMS, ...MORE_NAV_ITEMS];

// The rail is dark in both themes: it is the frame, the page is the work.
// Seven surfaces, then the workspace, then a short More. Collapses to icons.
export default function Sidebar({ open, onClose, collapsed, onToggleCollapsed, onSearch, onShortcuts }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenRoutes, setHiddenRoutes] = useState<Set<string>>(new Set());
  const [granted, setGranted] = useState<Set<FeatureKey>>(new Set());
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [recent, setRecent] = useState<ScanThread[]>([]);
  const [theme, setThemeState] = useState<Theme>("dark");
  const accountRef = useRef<HTMLDivElement>(null);

  const current = activeHref(pathname, ALL_ITEMS);
  const moreActive = MORE_NAV_ITEMS.some(n => n.href === current);

  // Keep More open while one of its pages is showing.
  useEffect(() => { if (moreActive) setMoreOpen(true); }, [moreActive]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [accountOpen]);

  // Recent Scan conversations from this browser's store.
  useEffect(() => {
    const load = () => setRecent(listThreads().slice(0, 4));
    load();
    window.addEventListener(SCAN_THREADS_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(SCAN_THREADS_EVENT, load); window.removeEventListener("storage", load); };
  }, []);

  useEffect(() => {
    setThemeState(getTheme());
    const on = () => setThemeState(getTheme());
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);

  useEffect(() => {
    const load = () => {
      setHiddenRoutes(getSmartHiddenRoutes());
      try { setGranted(getGrantedFeatures(getUserContext())); } catch { /* all granted */ }
    };
    const u = getUser();
    if (u) {
      setUserName(u.business_name || u.email?.split("@")[0] || "");
      setUserEmail(u.email || "");
      setIsAdmin(u.email === "ishantswami13@gmail.com");
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("vantro:refresh", load);
    return () => { window.removeEventListener("storage", load); window.removeEventListener("vantro:refresh", load); };
  }, []);

  const handleLogout = () => {
    clearAuth();
    document.cookie = "vantro_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const locked = (href: string) => {
    const key = ROUTE_TO_FEATURE[href];
    return key ? granted.size > 0 && !granted.has(key) : false;
  };
  const moreItems = MORE_NAV_ITEMS.filter(n => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) && !locked(n.href));

  // On phones the rail is a drawer and never collapsed.
  const rail = collapsed && !open;

  function Row({ item }: { item: PrimaryNavItem }) {
    const active = current === item.href;
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        title={rail ? item.label : undefined}
        className={`sb-row ${active ? "sb-row-active" : ""}`}
      >
        <Icon size={16} />
        {!rail && <span className="truncate">{item.label}</span>}
      </Link>
    );
  }

  return (
    <>
      {open && <div className="fixed inset-0 md:hidden lens-backdrop" style={{ zIndex: 29, background: "rgba(0,0,0,0.55)" }} onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label="Starlane"
        data-rail={rail ? "true" : undefined}
        className={[
          "sb fixed md:static top-0 left-0 h-full flex flex-col shrink-0",
          "transition-[transform,width] duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{ width: rail ? 60 : 248, zIndex: 30 }}
      >
        {/* Workspace header */}
        <div className="flex items-center shrink-0" style={{ height: 52, padding: rail ? "0 14px" : "0 10px 0 14px", gap: 10 }}>
          <Link href="/bridge" onClick={onClose} aria-label="Starlane, go to the Bridge" className="flex items-center min-w-0" style={{ gap: 10, color: "#EDECE8" }}>
            <StarlaneMark size={22} />
            {!rail && <span style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.01em", color: "#EDECE8" }}>Starlane</span>}
          </Link>
          {!rail && <span className="flex-1" />}
          {!rail && (
            <button type="button" onClick={onToggleCollapsed} className="sb-icon hidden md:inline-flex" aria-label="Collapse sidebar" title="Collapse sidebar">
              <IconSidebar size={15} />
            </button>
          )}
          <button type="button" onClick={onClose} className="sb-icon md:hidden" aria-label="Close menu"><IconX size={15} /></button>
        </div>

        {/* Search */}
        <div className="shrink-0" style={{ padding: rail ? "2px 10px 10px" : "2px 10px 12px" }}>
          <button type="button" onClick={onSearch} className="sb-search" aria-label="Search or jump to (Ctrl+K)" title={rail ? "Search (Ctrl+K)" : undefined}>
            <IconSearch size={14} />
            {!rail && <><span className="flex-1 text-left truncate">Search or jump to…</span><kbd className="sb-kbd">Ctrl K</kbd></>}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ padding: "0 10px" }}>
          <nav aria-label="Surfaces" className="flex flex-col" style={{ gap: 1 }}>
            {V32_NAV_ITEMS.map(n => <Row key={n.href} item={n} />)}
          </nav>

          <nav aria-label="Workspace" className="flex flex-col" style={{ gap: 1, marginTop: 20 }}>
            {!rail && <p className="sb-label">Workspace</p>}
            {rail && <div className="sb-divider" />}
            {V32_WORKSPACE_NAV_ITEMS.map(n => <Row key={n.href} item={n} />)}
          </nav>

          {moreItems.length > 0 && (
            <nav aria-label="More" className="flex flex-col" style={{ gap: 1, marginTop: 20 }}>
              {rail ? (
                <>
                  <div className="sb-divider" />
                  <button type="button" onClick={() => { setMoreOpen(true); onToggleCollapsed(); }} className={`sb-row ${moreActive ? "sb-row-active" : ""}`} title="More" aria-label="More pages">
                    <IconMore size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen} className="sb-label sb-label-btn">
                    <span>More</span>
                    <IconChevronDown size={12} style={{ transform: moreOpen ? "none" : "rotate(-90deg)", transition: "transform var(--dur-fast) var(--ease)" }} />
                  </button>
                  {moreOpen && moreItems.map(n => <Row key={n.href} item={n} />)}
                  {moreOpen && isAdmin && (
                    <Link href="/admin" onClick={onClose} className={`sb-row ${pathname.startsWith("/admin") ? "sb-row-active" : ""}`}>
                      <span style={{ width: 16 }} /><span>Admin</span>
                    </Link>
                  )}
                </>
              )}
            </nav>
          )}

          {!rail && recent.length > 0 && (
            <nav aria-label="Recent conversations" className="flex flex-col" style={{ gap: 1, marginTop: 18, paddingBottom: 12 }}>
              <p className="sb-label">Recent</p>
              {recent.map(t => {
                const active = pathname === `/scan/${t.id}`;
                return (
                  <Link key={t.id} href={`/scan/${t.id}`} onClick={onClose} aria-current={active ? "page" : undefined} title={t.title}
                    className={`sb-row sb-row-quiet ${active ? "sb-row-active" : ""}`}>
                    <span className="truncate">{t.title}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Account */}
        <div ref={accountRef} className="relative shrink-0" style={{ padding: "8px 10px 10px" }}>
          {rail && (
            <button type="button" onClick={onToggleCollapsed} className="sb-row" aria-label="Expand sidebar" title="Expand sidebar" style={{ marginBottom: 4 }}>
              <IconSidebar size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAccountOpen(v => !v)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className="sb-row w-full"
            style={{ height: 42, gap: 10, padding: "0 8px" }}
            title={rail ? userName || "Account" : undefined}
          >
            <IdentityAvatar name={userName || "?"} size={22} initial />
            {!rail && (
              <>
                <span className="min-w-0 flex-1 text-left" style={{ lineHeight: 1.3 }}>
                  <span className="block truncate" style={{ fontSize: 12.5, fontWeight: 500, color: "#E2E1DC" }}>{userName || "Your account"}</span>
                  {userEmail && userEmail !== userName && <span className="block truncate" style={{ fontSize: 11, color: "#6F6E69" }}>{userEmail}</span>}
                </span>
                <IconChevronDown size={12} style={{ color: "#6F6E69", transform: accountOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease)" }} />
              </>
            )}
          </button>

          {accountOpen && (
            <div role="menu" className="sb-menu pop-in" style={rail ? { left: 64, bottom: 10, width: 248 } : { left: 10, right: 10, bottom: 56 }}>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <IdentityPicker dark />
              </div>
              <div style={{ padding: 4 }}>
                <Link role="menuitem" href="/settings?tab=profile" onClick={() => { setAccountOpen(false); onClose(); }} className="sb-menu-item"><IconUser size={14} /> Profile and settings</Link>
                <button role="menuitem" type="button" onClick={() => setThemeState(toggleTheme())} className="sb-menu-item">
                  {theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />} {theme === "dark" ? "Light theme" : "Dark theme"}
                </button>
                <button role="menuitem" type="button" onClick={() => { setAccountOpen(false); onShortcuts(); }} className="sb-menu-item"><IconKeyboard size={14} /> Keyboard shortcuts</button>
              </div>
              <div style={{ padding: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button role="menuitem" type="button" onClick={handleLogout} className="sb-menu-item"><IconLogout size={14} /> Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

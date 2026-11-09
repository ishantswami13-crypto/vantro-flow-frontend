"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiLogOut, FiX, FiUser, FiSliders, FiCommand, FiSettings } from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";
import { getSmartHiddenRoutes } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { CommandPalette, type SearchableRoute } from "./CommandPalette";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { V32_NAV_ITEMS, V32_APPS_NAV_ITEMS, V32_SECONDARY_NAV_ITEMS, V32_WORKSPACE_NAV_ITEMS, HISTORY_NAV_ITEM, HOME_NAV_ITEM, type PrimaryNavItem } from "@/lib/navigation";
import { listThreads, SCAN_THREADS_EVENT, type ScanThread } from "@/lib/scanStore";
import { useQuery } from "@tanstack/react-query";
import { decisionsApi } from "@/lib/decisions";
import { IconBell, IconSearch, IconMore, IconPlus, IconBookmark, IconBookmarkFilled } from "@/components/v32/icons";
import { listPins, togglePin, PINS_EVENT, type Pin } from "@/lib/pins";

// Everything real that sits outside the Version 32 nav lives in the "More"
// flyout: it is still reachable, but the rail stays as quiet as the design.
// The older screens (GST, khata, inventory, sales and the rest) are no longer
// part of the product; middleware sends their routes home. Only the account
// page is left beside the workspace tools.
const MORE_GROUPS: { label: string; items: { href: string; label: string; badge?: string | null }[] }[] = [
  {
    label: "Account",
    items: [
      { href: "/billing",  label: "Billing" },
    ],
  },
];
const MORE_HREFS = new Set([
  ...V32_WORKSPACE_NAV_ITEMS.map(n => n.href),
  ...MORE_GROUPS.flatMap(g => g.items.map(i => i.href)),
]);

interface SidebarProps { open: boolean; onClose: () => void; slim?: boolean; pageTitle?: string; }

export default function Sidebar({ open, onClose, slim = false, pageTitle }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName]           = useState("User");
  const [businessName, setBusinessName]   = useState("");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [hiddenRoutes, setHiddenRoutes]   = useState<Set<string>>(new Set());
  const [grantedFeatures, setGrantedFeatures] = useState<Set<FeatureKey>>(new Set());
  const [pendingCount, setPendingCount]   = useState<number | null>(null);
  const [moreOpen, setMoreOpen]           = useState(false);
  const [accountOpen, setAccountOpen]     = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [recent, setRecent]               = useState<ScanThread[]>([]);
  const [pins, setPins]                   = useState<Pin[]>([]);
  const [here, setHere]                   = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const isMoreActive = MORE_HREFS.has(pathname) || [...MORE_HREFS].some(h => pathname.startsWith(h + "/"));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node) && moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (accountOpen || moreOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen, moreOpen]);

  // Recent Scan conversations, like Harvey's recent work in its sidebar.
  // They come from this browser's store and refresh when one is added.
  useEffect(() => {
    const load = () => setRecent(listThreads().slice(0, 5));
    load();
    window.addEventListener(SCAN_THREADS_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(SCAN_THREADS_EVENT, load); window.removeEventListener("storage", load); };
  }, []);

  // Pinned pages: kept in this browser for the signed-in user (lib/pins.ts).
  useEffect(() => {
    const load = () => setPins(listPins());
    load();
    window.addEventListener(PINS_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(PINS_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  // The page being viewed, with its query (a Space tab), so it can be pinned as seen.
  useEffect(() => { setHere(pathname + window.location.search); }, [pathname, pageTitle]);

  // Global search shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Escape closes the keyboard-shortcuts reference (CommandPalette handles
  // its own Escape internally).
  useEffect(() => {
    if (!shortcutsOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShortcutsOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcutsOpen]);

  useEffect(() => {
    const loadBizType = () => {
      setHiddenRoutes(getSmartHiddenRoutes());
      try {
        const ctx = getUserContext();
        setGrantedFeatures(getGrantedFeatures(ctx));
      } catch { /* fallback: all granted */ }
    };

    const u = getUser();
    if (u) {
      const emailName = u.email?.split("@")[0] || "User";
      const person = (u as { name?: string; full_name?: string }).name || (u as { full_name?: string }).full_name || "";
      setUserName(person || u.business_name || emailName);
      setBusinessName(u.business_name || "");
      setIsAdmin(u.email === "ishantswami13@gmail.com");
      api.metrics(u.id).then(d => {
        const count = d.metrics?.pending_invoices;
        if (typeof count === "number") setPendingCount(count);
      }).catch(() => {});
    }
    loadBizType();

    window.addEventListener("storage", loadBizType);
    window.addEventListener("vantro:refresh", loadBizType);
    return () => {
      window.removeEventListener("storage", loadBizType);
      window.removeEventListener("vantro:refresh", loadBizType);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    document.cookie = "vantro_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const isRouteLocked = (href: string) => {
    const featureKey = ROUTE_TO_FEATURE[href];
    return featureKey ? grantedFeatures.size > 0 && !grantedFeatures.has(featureKey) : false;
  };

  const searchableRoutes: SearchableRoute[] = [
    { href: "/intelligence", label: "Intelligence", type: "Page" },
    { href: HOME_NAV_ITEM.href, label: HOME_NAV_ITEM.label, type: "Page" as const },
    ...V32_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...V32_APPS_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    { href: HISTORY_NAV_ITEM.href, label: "History", type: "Page" as const },
    ...V32_SECONDARY_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    { href: "/space", label: businessName || "Space", type: "Page" as const },
    { href: "/settings", label: "Settings", type: "Page" as const },
    ...V32_WORKSPACE_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...MORE_GROUPS.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, type: "Page" as const }))),
  ];

  function NavRow({ href, label, Icon, active, onClick }: { href: string; label: string; Icon: PrimaryNavItem["icon"]; active: boolean; onClick?: () => void }) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        title={slim ? label : undefined}
        className={`sb-row ${active ? "is-active" : ""}`}
      >
        <Icon size={16} />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  }

  // Recents, as on the public site's product views: recent conversations
  // first, then the open decisions, so the list shows real work even before
  // the first question. Same cached query as Decisions and Approvals.
  const openDecisions = useQuery({ queryKey: ["decisions", "active"], queryFn: () => decisionsApi.list("active"), staleTime: 60_000 });
  const recentDecisions = (openDecisions.data?.decisions || [])
    .filter(d => ["OPEN", "NEEDS_INFORMATION", "SELECTED", "APPROVED"].includes(d.status))
    .slice(0, Math.max(0, 3 - recent.length))
    .map(d => {
      const who = /from (.+?)\??$/.exec(d.title)?.[1];
      return { id: d.id, title: d.title, label: who ? `Overdue, ${who}` : d.title };
    });

  const pinned = (href: string) => pins.some(p => p.href === href);
  function PinToggle({ href, label }: { href: string; label: string }) {
    const on = pinned(href);
    return (
      <button type="button" className={`sb-pin ${on ? "is-on" : ""}`} aria-pressed={on}
        aria-label={on ? `Unpin ${label}` : `Pin ${label}`} title={on ? "Unpin" : "Pin"}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(href, label); }}>
        {on ? <IconBookmarkFilled size={12} /> : <IconBookmark size={12} />}
      </button>
    );
  }
  const canPinHere = !!pageTitle && !!here && !pinned(here) && !here.startsWith("/bridge");

  const isActive = (href: string) => {
    // Home is the chat: it owns /scan and each conversation; History owns /scan/history.
    if (href === "/bridge") return pathname === "/bridge" || pathname === "/scan" || (pathname.startsWith("/scan/") && pathname !== "/scan/history");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden lens-backdrop" style={{ background: "rgba(20,20,18,0.28)" }} onClick={onClose} />
      )}

      <aside
        className={[
          `sb ${slim ? "sb-slim" : ""} fixed top-0 left-0 z-30 h-full flex flex-col`,
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0 lg:static lg:z-30",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Wordmark, notifications and search, as one quiet row */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "4px 4px 22px 10px" }}>
          <Link href="/bridge" onClick={onClose} aria-label="Starlane home" className="sb-mark">
            <span className="sb-mark-full">Starlane</span>
            <span className="sb-mark-glyph" aria-hidden="true"><StarlaneMark variant="glyph" size={11} /></span>
          </Link>
          <div className="sb-head-icons flex items-center" style={{ gap: 2 }}>
            {/* The dot is the pending follow-up count, so the bell opens them. */}
            <Link
              href="/decisions"
              onClick={onClose}
              aria-label={pendingCount ? `${pendingCount} pending follow-up${pendingCount === 1 ? "" : "s"}` : "Follow-ups"}
              title={pendingCount ? `${pendingCount} pending follow-up${pendingCount === 1 ? "" : "s"}` : "Follow-ups"}
              className="sb-icon-btn relative"
            >
              <IconBell size={15} />
              {pendingCount !== null && pendingCount > 0 && (
                <span className="absolute rounded-full" style={{ width: 6, height: 6, top: 6, right: 7, background: "#D9776F" }} />
              )}
            </Link>
            <button onClick={() => setSearchOpen(true)} className="sb-icon-btn" aria-label="Search Starlane (Ctrl+K)" title="Search (Ctrl+K)">
              <IconSearch size={15} />
            </button>
            <button aria-label="Close menu" onClick={onClose} className="sb-icon-btn lg:hidden">
              <FiX size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ margin: "0 -4px", padding: "0 4px" }}>
          <nav aria-label="Primary" className="flex flex-col" style={{ gap: 1 }}>
            <Link href="/bridge" onClick={onClose} title={slim ? "New question" : undefined} aria-current={isActive("/bridge") ? "page" : undefined} className={`sb-row sb-new ${isActive("/bridge") ? "is-active" : ""}`}>
              <IconPlus size={16} />
              <span className="flex-1 truncate">New question</span>
            </Link>
            {V32_NAV_ITEMS.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon} active={isActive(n.href)} onClick={onClose} />
            ))}
            {/* More: a floating flyout with the rest of the workspace */}
            <button
              ref={moreBtnRef}
              onClick={() => setMoreOpen(v => !v)}
              aria-expanded={moreOpen}
              title={slim ? "More" : undefined}
              className={`sb-row w-full text-left ${isMoreActive || moreOpen ? "is-active" : ""}`}
            >
              <IconMore size={16} />
              <span className="flex-1">More</span>
            </button>
          </nav>

          <nav aria-label="Apps" className="sb-group flex flex-col" style={{ gap: 1 }}>
            <p className="sb-label">Apps</p>
            {V32_APPS_NAV_ITEMS.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon} active={isActive(n.href)} onClick={onClose} />
            ))}
          </nav>

          {!slim && (pins.length > 0 || canPinHere) && (
            <nav aria-label="Pinned" className="sb-group flex flex-col" style={{ gap: 1 }}>
              <p className="sb-label">Pinned</p>
              {pins.map(p => {
                const active = here === p.href;
                return (
                  <div key={p.href} className="sb-pinrow">
                    <Link href={p.href} onClick={onClose} aria-current={active ? "page" : undefined} title={p.label}
                      className={`sb-recent truncate ${active ? "is-active" : ""}`}>{p.label}</Link>
                    <PinToggle href={p.href} label={p.label} />
                  </div>
                );
              })}
              {canPinHere && (
                <button type="button" className="sb-recent sb-pin-here text-left" onClick={() => togglePin(here, pageTitle!)}>
                  <IconBookmark size={12} /> Pin this page
                </button>
              )}
            </nav>
          )}

          <nav aria-label="Recent conversations" className="sb-group flex flex-col" style={{ gap: 1 }}>
            <p className="sb-label">Recents</p>
            {recent.map(t => {
              const active = pathname === `/scan/${t.id}`;
              return (
                <div key={t.id} className="sb-pinrow">
                  <Link
                    href={`/scan/${t.id}`}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    title={t.title}
                    className={`sb-recent truncate ${active ? "is-active" : ""}`}
                  >
                    {t.title}
                  </Link>
                  {!slim && <PinToggle href={`/scan/${t.id}`} label={t.title} />}
                </div>
              );
            })}
            {recentDecisions.map(d => {
              const active = pathname === `/decisions/${d.id}`;
              return (
                <div key={d.id} className="sb-pinrow">
                  <Link
                    href={`/decisions/${d.id}`}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    title={d.title}
                    className={`sb-recent truncate ${active ? "is-active" : ""}`}
                  >
                    {d.label}
                  </Link>
                  {!slim && <PinToggle href={`/decisions/${d.id}`} label={d.label} />}
                </div>
              );
            })}
            <NavRow href={HISTORY_NAV_ITEM.href} label={HISTORY_NAV_ITEM.label} Icon={HISTORY_NAV_ITEM.icon} active={isActive(HISTORY_NAV_ITEM.href)} onClick={onClose} />
          </nav>

          <nav aria-label="Spaces" className="sb-group flex flex-col" style={{ gap: 1 }}>
            <p className="sb-label">Spaces</p>
            {businessName && (
              <Link href="/space" onClick={onClose} title={businessName} aria-current={isActive("/space") ? "page" : undefined} className={`sb-row ${isActive("/space") ? "is-active" : ""}`}>
                <span className="sb-space" aria-hidden="true">{businessName.trim()[0]?.toUpperCase()}</span>
                <span className="flex-1 truncate">{businessName}</span>
              </Link>
            )}
            {V32_SECONDARY_NAV_ITEMS.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon} active={isActive(n.href)} onClick={onClose} />
            ))}
          </nav>

          {moreOpen && (
            <div
              ref={moreRef}
              className="sb-flyout fixed z-40 overflow-hidden pop-in"
              style={{
                left: typeof window !== "undefined" && window.innerWidth < 600 ? 12 : slim ? 60 : 264,
                top: Math.max(12, (moreBtnRef.current?.getBoundingClientRect().top ?? 0) - 8),
              }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: "72vh", padding: 8 }}>
                <div style={{ marginBottom: 10 }}>
                  <p className="sb-label">Workspace</p>
                  {V32_WORKSPACE_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link key={href} href={href} onClick={() => { setMoreOpen(false); onClose(); }} className={`sb-row ${active ? "is-active" : ""}`}>
                        <Icon size={15} />
                        <span className="flex-1 truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
                {MORE_GROUPS.map(({ label, items }) => {
                  const visibleItems = items.filter(n => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) && !isRouteLocked(n.href));
                  if (visibleItems.length === 0) return null;
                  return (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <p className="sb-label">{label}</p>
                      {visibleItems.map(({ href, label: itemLabel, badge }) => {
                        const active = isActive(href);
                        const liveBadge = badge === "live" && pendingCount !== null && pendingCount > 0 ? String(pendingCount) : null;
                        return (
                          <Link key={href} href={href} onClick={() => { setMoreOpen(false); onClose(); }} className={`sb-row ${active ? "is-active" : ""}`}>
                            <span className="flex-1 truncate">{itemLabel}</span>
                            {liveBadge && <span className="sb-count">{liveBadge}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
                {isAdmin && (
                  <Link href="/admin" onClick={() => { setMoreOpen(false); onClose(); }} className="sb-row">
                    Admin
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Settings and the account */}
        <div ref={accountRef} className="relative shrink-0" style={{ paddingTop: 8, marginTop: 8 }}>
          <button
            onClick={() => setAccountOpen(v => !v)}
            aria-expanded={accountOpen}
            aria-label={`Account: ${userName}`}
            className={`sb-row sb-user w-full text-left ${isActive("/settings") ? "is-active" : ""}`}
          >
            <span className="sb-avatar" aria-hidden="true">{(userName.trim()[0] || "S").toUpperCase()}</span>
            <span className="flex-1 truncate">{userName}</span>
          </button>

          {accountOpen && (
            <div className="sb-flyout absolute z-40 overflow-hidden pop-in" style={{ left: 0, right: 0, bottom: 48, width: "auto" }}>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(25,25,23,0.08)" }}>
                <IdentityPicker />
              </div>
              <div style={{ padding: 6 }}>
                {[
                  { href: "/settings", label: "Settings", Icon: FiSettings },
                  { href: "/settings?tab=profile", label: "Profile", Icon: FiUser },
                  { href: "/settings?tab=preferences", label: "Preferences", Icon: FiSliders },
                ].map(({ href, label, Icon }) => (
                  <Link key={href} href={href} onClick={onClose} className="sb-row">
                    <Icon size={13} /> {label}
                  </Link>
                ))}
                <button onClick={() => { setAccountOpen(false); setShortcutsOpen(true); }} className="sb-row w-full text-left">
                  <FiCommand size={13} /> Keyboard shortcuts
                </button>
                <button onClick={handleLogout} className="sb-row w-full text-left">
                  <FiLogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} routes={searchableRoutes} />

      {shortcutsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={() => setShortcutsOpen(false)}>
          <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
          <div
            role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"
            className="relative w-full sm:w-[380px] rounded-xl overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid #E5E5E1", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4" style={{ height: "48px", borderBottom: "1px solid #EDEDE9" }}>
              <p className="text-sm font-medium" style={{ color: "#171717" }}>Keyboard shortcuts</p>
              <button onClick={() => setShortcutsOpen(false)} aria-label="Close" style={{ color: "#868D97" }}><FiX size={16} /></button>
            </div>
            <div className="p-4 space-y-2.5">
              {[
                { keys: "Ctrl/Cmd K", desc: "Open search" },
                { keys: "↑ / ↓", desc: "Move through results" },
                { keys: "Enter", desc: "Open selected result" },
                { keys: "Esc", desc: "Close search or dialog" },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#686868" }}>{s.desc}</span>
                  <kbd className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ color: "#6E6E69", background: "#F2F2EE" }}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

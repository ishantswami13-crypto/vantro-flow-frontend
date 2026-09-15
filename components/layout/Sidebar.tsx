"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiDatabase, FiShield, FiPlus, FiMoreHorizontal, FiSearch,
  FiList, FiTrendingUp, FiSettings, FiLogOut, FiX,
  FiMessageSquare, FiPackage, FiUsers, FiBarChart2,
  FiCamera, FiFileText, FiCreditCard, FiRepeat,
  FiCpu, FiBook, FiShoppingBag, FiUserCheck,
  FiSun, FiActivity, FiUser, FiSliders,
  FiArchive, FiFile, FiDollarSign, FiZap, FiLock, FiAlertTriangle, FiTruck, FiTarget,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";
import { getBusinessType, getSmartHiddenRoutes, type BusinessTypeConfig } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { getRecents, timeAgo, type RecentEntry } from "@/lib/recents";
import { CommandPalette, type SearchableRoute } from "./CommandPalette";
import { PRIMARY_NAV } from "@/lib/navigation";

// Three durable nouns in the permanent rail. Everything else that's real
// still exists and is still reachable — it lives in the More flyout
// instead of competing for space as first-class navigation. Shared with
// BottomNav via lib/navigation.ts so the two surfaces cannot drift.
const PRIMARY = PRIMARY_NAV;

// Grouped for the More flyout only — never expanded inline in the rail.
// CA Partner Portal / Refer & Earn / Payment Plans are deliberately absent:
// commercial/support surfaces, not core intelligence surfaces, per
// explicit product direction. Admin-only and experimental routes are also
// excluded — the user should see the product, not the codebase map.
const MORE_GROUPS: { label: string; items: { href: string; label: string; icon: React.ElementType; badge?: string | null }[] }[] = [
  {
    label: "Business",
    items: [
      { href: "/business-state", label: "Business State", icon: FiTarget },
      { href: "/dashboard",      label: "Overview",       icon: FiSun },
      { href: "/customers",      label: "Customers",      icon: FiUsers },
      { href: "/suppliers",      label: "Suppliers",      icon: FiTruck },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/collections", label: "Collections",   icon: FiList, badge: "live" },
      { href: "/invoice/new", label: "New Invoice",   icon: FiPlus },
      { href: "/bills",       label: "GST Invoices",  icon: FiFile },
      { href: "/bank",        label: "Bank Monitor",  icon: FiDatabase },
      { href: "/ledger",      label: "Bank Ledger",   icon: FiDollarSign },
      { href: "/forecast",    label: "Cash Forecast", icon: FiTrendingUp },
      { href: "/bad-debt",    label: "Bad Debt Radar",icon: FiAlertTriangle },
      { href: "/khata",       label: "Customer Khata",icon: FiBook },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/sales",      label: "Sales",           icon: FiTrendingUp },
      { href: "/purchases",  label: "Purchases",       icon: FiPackage },
      { href: "/orders",     label: "Today's Orders",  icon: FiShoppingBag },
      { href: "/inventory",  label: "Inventory",       icon: FiArchive },
      { href: "/scanner",    label: "Invoice Scanner", icon: FiCamera },
      { href: "/attendance", label: "Staff Attendance",icon: FiUserCheck },
      { href: "/team",       label: "Team",            icon: FiUser },
    ],
  },
  {
    label: "Automation",
    items: [
      { href: "/whatsapp",   label: "WhatsApp",       icon: FiMessageSquare },
      { href: "/dunning",    label: "Auto Follow-Up", icon: FiRepeat },
      { href: "/ai-actions", label: "Action Center",  icon: FiZap },
      { href: "/brain",      label: "Starlane Brain", icon: FiActivity },
      { href: "/ai-chat",    label: "AI Founder",     icon: FiCpu },
      { href: "/ai-train",   label: "AI Training",    icon: FiSliders },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/today",     label: "Today's P&L", icon: FiSun },
      { href: "/analytics", label: "Analytics",    icon: FiBarChart2 },
      { href: "/reports",   label: "Reports",      icon: FiFileText },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing",  label: "Billing",  icon: FiCreditCard },
      { href: "/settings", label: "Settings", icon: FiSettings },
    ],
  },
];
const MORE_HREFS = new Set(MORE_GROUPS.flatMap(g => g.items.map(i => i.href)));

const COLLAPSE_KEY = "vantro_sidebar_collapsed";

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName]           = useState("User");
  const [userPlan, setUserPlan]           = useState<string>("free");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [bizType, setBizType]             = useState<BusinessTypeConfig | null>(null);
  const [hiddenRoutes, setHiddenRoutes]   = useState<Set<string>>(new Set());
  const [grantedFeatures, setGrantedFeatures] = useState<Set<FeatureKey>>(new Set());
  const [pendingCount, setPendingCount]   = useState<number | null>(null);
  const [moreOpen, setMoreOpen]           = useState(false);
  const [accountOpen, setAccountOpen]     = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [collapsed, setCollapsed]         = useState(false);
  const [recents, setRecents]             = useState<RecentEntry[]>([]);
  const accountRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const isMoreActive = MORE_HREFS.has(pathname) || [...MORE_HREFS].some(h => pathname.startsWith(h + "/"));

  // Collapsed preference persists for the session/browser via localStorage
  // — no backend storage for a pure UI preference.
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed(v => {
      try { localStorage.setItem(COLLAPSE_KEY, !v ? "1" : "0"); } catch {}
      return !v;
    });
  }

  useEffect(() => { setRecents(getRecents().filter(r => r.href !== pathname)); }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (moreOpen && moreRef.current && !moreRef.current.contains(e.target as Node) && moreBtnRef.current && !moreBtnRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (accountOpen || moreOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen, moreOpen]);

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

  useEffect(() => {
    const loadBizType = () => {
      setBizType(getBusinessType());
      setHiddenRoutes(getSmartHiddenRoutes());
      try {
        const ctx = getUserContext();
        setGrantedFeatures(getGrantedFeatures(ctx));
        setUserPlan(ctx.plan);
      } catch { /* fallback: all granted */ }
    };

    const u = getUser();
    if (u) {
      const emailName = u.email?.split("@")[0] || "User";
      setUserName(u.business_name || emailName);
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
    { href: "/connections",  label: "Sources",      type: "Page" },
    { href: "/control",      label: "Control",      type: "Page" },
    ...MORE_GROUPS.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, type: "Page" as const }))),
  ];

  function NavRow({ href, label, Icon, active, onClick, collapsedMode }: { href: string; label: string; Icon: React.ElementType; active: boolean; onClick?: () => void; collapsedMode?: boolean }) {
    return (
      <Link
        href={href}
        onClick={onClick}
        title={collapsedMode ? label : undefined}
        className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1"
        style={{
          paddingLeft: collapsedMode ? 0 : "10px",
          paddingRight: collapsedMode ? 0 : "10px",
          justifyContent: collapsedMode ? "center" : "flex-start",
          background: active ? "#262626" : "transparent",
          color: active ? "#F7F7F5" : "#A7A7A2",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: active ? "#F7F7F5" : "#8A8A86" }} />
        {!collapsedMode && <span className="flex-1 truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      )}

      <aside className={[
        "fixed top-0 left-0 z-30 h-full flex flex-col",
        "transition-[width,transform] duration-200 ease-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
        "w-64", // mobile drawer always full width regardless of desktop collapse
        collapsed ? "lg:w-16" : "lg:w-64",
      ].join(" ")}
        style={{ background: "#141414" }}
      >
        {/* Brand + search + collapse control */}
        <div className="flex items-center justify-between px-3.5 shrink-0" style={{ height: "56px" }}>
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/starlane-mark.png" alt="" width={21} height={21} style={{ borderRadius: "5px", flexShrink: 0 }} />
            {!collapsed && (
              <span className="truncate" style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em", color: "#F7F7F5" }}>
                Starlane
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search Starlane (Ctrl+K)"
              title="Search (Ctrl+K)"
              className="p-1.5 rounded-md shrink-0 transition-colors duration-150"
              style={{ color: "#8A8A86" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <FiSearch size={16} strokeWidth={1.75} />
            </button>
          )}
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg" style={{ color: "#6F6F6B" }}>
            <FiX size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 min-h-0">
          {/* Primary action */}
          <Link
            href="/intelligence"
            onClick={onClose}
            title={collapsed ? "New investigation" : undefined}
            className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium mb-4 transition-colors duration-150"
            style={{ paddingLeft: collapsed ? 0 : "10px", paddingRight: collapsed ? 0 : "10px", justifyContent: collapsed ? "center" : "flex-start", color: "#D4D4D0" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <FiPlus size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "#8A8A86" }} />
            {!collapsed && <span>New investigation</span>}
          </Link>

          {/* Primary nav */}
          <div className="space-y-px">
            {PRIMARY.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon}
                active={pathname === n.href || pathname.startsWith(n.href + "/")}
                onClick={onClose} collapsedMode={collapsed} />
            ))}

            {/* More — floating flyout, never expands inline */}
            <div className="relative">
              <button
                ref={moreBtnRef}
                onClick={() => setMoreOpen(v => !v)}
                title={collapsed ? "More" : undefined}
                className="flex items-center gap-2.5 h-9 w-full rounded-[7px] text-[13.5px] font-medium transition-colors duration-150"
                style={{
                  paddingLeft: collapsed ? 0 : "10px", paddingRight: collapsed ? 0 : "10px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: moreOpen ? "rgba(255,255,255,0.06)" : "transparent",
                  color: isMoreActive ? "#F7F7F5" : "#A7A7A2",
                }}
                onMouseEnter={e => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={e => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <FiMoreHorizontal size={16} strokeWidth={1.75} className="shrink-0" style={{ color: isMoreActive ? "#F7F7F5" : "#8A8A86" }} />
                {!collapsed && <span className="flex-1 text-left">More</span>}
              </button>

              {moreOpen && (
                <div
                  ref={moreRef}
                  className="fixed z-40 overflow-hidden"
                  style={{
                    left: collapsed ? "68px" : "260px",
                    top: (moreBtnRef.current?.getBoundingClientRect().top ?? 0) - 8,
                    width: "280px",
                    maxHeight: "70vh",
                    background: "#1B1B1B",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "11px",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                  }}
                >
                  <div className="overflow-y-auto p-2" style={{ maxHeight: "70vh" }}>
                    {MORE_GROUPS.map(({ label, items }) => {
                      const visibleItems = items.filter(n => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) && !isRouteLocked(n.href));
                      if (visibleItems.length === 0) return null;
                      return (
                        <div key={label} className="mb-2.5 last:mb-0">
                          <p className="px-2 mb-1" style={{ fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#62625F" }}>
                            {label}
                          </p>
                          <div className="space-y-px">
                            {visibleItems.map(({ href, label: itemLabel, icon: Icon, badge }) => {
                              const active = pathname === href || pathname.startsWith(href + "/");
                              const liveBadge = badge === "live"
                                ? (pendingCount !== null && pendingCount > 0 ? String(pendingCount) : null)
                                : null;
                              return (
                                <Link
                                  key={href}
                                  href={href}
                                  onClick={() => { setMoreOpen(false); onClose(); }}
                                  className="flex items-center gap-2 rounded-[6px] text-[13px] transition-colors duration-150"
                                  style={{ height: "33px", paddingLeft: "8px", paddingRight: "8px", background: active ? "#262626" : "transparent", color: active ? "#F7F7F5" : "#B0B0AB" }}
                                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                >
                                  <Icon size={14} strokeWidth={1.75} className="shrink-0" style={{ color: active ? "#F7F7F5" : "#6F6F6B" }} />
                                  <span className="flex-1 truncate">{itemLabel}</span>
                                  {liveBadge && (
                                    <span className="text-[10px] font-semibold px-1.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.1)", color: "#A7A7A2" }}>{liveBadge}</span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => { setMoreOpen(false); onClose(); }}
                        className="flex items-center gap-2 rounded-[6px] text-[13px]" style={{ height: "33px", paddingLeft: "8px", color: "#6F6F6B" }}>
                        <FiShield size={14} strokeWidth={1.75} /> Admin
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recents — real investigation objects only, always visible in
              the normal scroll region since More is now an overlay and no
              longer pushes this down. */}
          {!collapsed && recents.length > 0 && (
            <div className="mt-6">
              <p className="px-2.5 mb-1.5" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#62625F" }}>
                Recents
              </p>
              <div>
                {recents.slice(0, 5).map(r => (
                  <Link
                    key={r.href}
                    href={r.href}
                    onClick={onClose}
                    className="flex items-center justify-between gap-2 px-2.5 rounded-[7px] transition-colors duration-150"
                    style={{ height: "31px", color: "#B0B0AB" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <span className="truncate text-[13px]">{r.label}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: "#6F6F6B" }}>{timeAgo(r.at)}</span>
                  </Link>
                ))}
              </div>
              <Link href="/intelligence" onClick={onClose}
                className="block px-2.5 mt-0.5 text-[12px] transition-colors duration-150" style={{ height: "28px", lineHeight: "28px", color: "#6F6F6B" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#A7A7A2")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#6F6F6B")}>
                View all intelligence
              </Link>
            </div>
          )}
        </div>

        {/* Collapse toggle — quiet edge control, above account block */}
        <div className="hidden lg:flex items-center px-3 py-1.5 shrink-0" style={{ justifyContent: collapsed ? "center" : "flex-end" }}>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            className="p-1.5 rounded-md transition-colors duration-150"
            style={{ color: "#6F6F6B" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </button>
        </div>

        {/* Account */}
        <div ref={accountRef} className="relative px-3 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setAccountOpen(v => !v)}
            title={collapsed ? userName : undefined}
            className="flex items-center gap-2.5 w-full rounded-[7px] transition-colors duration-150"
            style={{ padding: "6px 8px", justifyContent: collapsed ? "center" : "flex-start" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: "rgba(255,255,255,0.1)", color: "#F7F7F5" }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium truncate leading-tight" style={{ color: "#F7F7F5" }}>{userName}</p>
                <p className="text-[11px] truncate" style={{ color: "#6F6F6B" }}>
                  {bizType ? bizType.label : (userPlan === "free" ? "Free plan" : userPlan.charAt(0).toUpperCase() + userPlan.slice(1) + " plan")}
                </p>
              </div>
            )}
          </button>

          {accountOpen && (
            <div className="absolute z-40 rounded-lg overflow-hidden" style={{
              left: collapsed ? "68px" : "12px", right: collapsed ? "auto" : "12px", width: collapsed ? "220px" : "auto",
              bottom: "8px", background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              <Link href="/settings" onClick={onClose}
                className="flex items-center gap-2 px-3 h-9 text-[13px] transition-colors duration-150" style={{ color: "#B0B0AB" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                <FiSettings size={14} /> Settings
              </Link>
              <button onClick={handleLogout}
                className="flex items-center gap-2 px-3 h-9 w-full text-[13px] transition-colors duration-150" style={{ color: "#B0B0AB" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#E5807F")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#B0B0AB")}>
                <FiLogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} routes={searchableRoutes} />
    </>
  );
}

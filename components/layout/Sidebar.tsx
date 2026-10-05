"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiLogOut, FiX, FiUser, FiSliders, FiCommand } from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";
import { getSmartHiddenRoutes } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { CommandPalette, type SearchableRoute } from "./CommandPalette";
import { IdentityAvatar } from "@/components/identity/IdentityAvatar";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { V32_NAV_ITEMS, V32_SECONDARY_NAV_ITEMS, type PrimaryNavItem } from "@/lib/navigation";
import { IconBell, IconSearch, IconMore } from "@/components/v32/icons";

// Everything real that sits outside the Version 32 nav lives in the "More"
// flyout: it is still reachable, but the rail stays as quiet as the design.
const MORE_GROUPS: { label: string; items: { href: string; label: string; badge?: string | null }[] }[] = [
  {
    label: "Business",
    items: [
      { href: "/today",          label: "Today" },
      { href: "/business-state", label: "Business State" },
      { href: "/dashboard",      label: "Overview" },
      { href: "/customers",      label: "Customers" },
      { href: "/suppliers",      label: "Suppliers" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/collections", label: "Collections", badge: "live" },
      { href: "/invoice/new", label: "New Invoice" },
      { href: "/bills",       label: "GST Invoices" },
      { href: "/bank",        label: "Bank Monitor" },
      { href: "/ledger",      label: "Bank Ledger" },
      { href: "/forecast",    label: "Cash Forecast" },
      { href: "/bad-debt",    label: "Bad Debt Radar" },
      { href: "/khata",       label: "Customer Khata" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/sales",      label: "Sales" },
      { href: "/purchases",  label: "Purchases" },
      { href: "/orders",     label: "Today's Orders" },
      { href: "/inventory",  label: "Inventory" },
      { href: "/scanner",    label: "Invoice Scanner" },
      { href: "/attendance", label: "Staff Attendance" },
      { href: "/team",       label: "Team" },
    ],
  },
  {
    label: "Automation",
    items: [
      { href: "/whatsapp",   label: "WhatsApp" },
      { href: "/dunning",    label: "Auto Follow-Up" },
      { href: "/ai-actions", label: "Action Center" },
      { href: "/brain",      label: "Starlane Brain" },
      { href: "/ai-chat",    label: "AI Founder" },
      { href: "/ai-train",   label: "AI Training" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/analytics", label: "Analytics" },
      { href: "/reports",   label: "Reports" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing",  label: "Billing" },
    ],
  },
];
const MORE_HREFS = new Set(MORE_GROUPS.flatMap(g => g.items.map(i => i.href)));

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName]           = useState("User");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [hiddenRoutes, setHiddenRoutes]   = useState<Set<string>>(new Set());
  const [grantedFeatures, setGrantedFeatures] = useState<Set<FeatureKey>>(new Set());
  const [pendingCount, setPendingCount]   = useState<number | null>(null);
  const [moreOpen, setMoreOpen]           = useState(false);
  const [accountOpen, setAccountOpen]     = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
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
    ...V32_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...V32_SECONDARY_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...MORE_GROUPS.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, type: "Page" as const }))),
  ];

  function NavRow({ href, label, Icon, active, onClick }: { href: string; label: string; Icon: PrimaryNavItem["icon"]; active: boolean; onClick?: () => void }) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex items-center ${active ? "" : "hover-fade"}`}
        style={{
          gap: 10, padding: "8px 8px", borderRadius: 7, fontSize: 13, lineHeight: "16px",
          background: active ? "rgba(255,255,255,0.09)" : "transparent",
          color: active ? "#F5F4F0" : "#9A9993",
        }}
      >
        <Icon size={16} />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden lens-backdrop" style={{ background: "rgba(20,20,18,0.28)" }} onClick={onClose} />
      )}

      <aside
        className={[
          "fixed top-0 left-0 z-30 h-full flex flex-col",
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: 264, flexShrink: 0, boxSizing: "border-box", background: "#141412", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "22px 16px" }}
      >
        {/* Wordmark, notifications, search */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "4px 8px 22px 8px" }}>
          <Link href="/bridge" onClick={onClose} aria-label="Starlane — The Bridge" className="flex items-baseline" style={{ color: "#F5F4F0" }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 400, letterSpacing: "-0.3px", color: "#F5F4F0" }}>Starlane</span>
          </Link>
          <div className="flex items-center" style={{ gap: 4 }}>
            {/* The dot is the pending follow-up count, so the bell opens them. */}
            <Link
              href="/collections"
              onClick={onClose}
              aria-label={pendingCount ? `${pendingCount} pending follow-up${pendingCount === 1 ? "" : "s"}` : "Follow-ups"}
              title={pendingCount ? `${pendingCount} pending follow-up${pendingCount === 1 ? "" : "s"}` : "Follow-ups"}
              className="hover-fade relative flex items-center justify-center"
              style={{ width: 26, height: 26, borderRadius: 6, color: "#8A8A86" }}
            >
              <IconBell size={15} />
              {pendingCount !== null && pendingCount > 0 && (
                <span className="absolute" style={{ width: 5, height: 5, borderRadius: "50%", top: 4, right: 5, background: "var(--accent)" }} />
              )}
            </Link>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search Starlane (Ctrl+K)"
              title="Search (Ctrl+K)"
              className="hover-fade flex items-center justify-center"
              style={{ width: 26, height: 26, borderRadius: 6, color: "#8A8A86" }}
            >
              <IconSearch size={14} />
            </button>
            <button aria-label="Close menu" onClick={onClose} className="lg:hidden hover-fade flex items-center justify-center" style={{ width: 26, height: 26, borderRadius: 6, color: "#8A8A86" }}>
              <FiX size={14} />
            </button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ margin: "0 -4px", padding: "0 4px" }}>
          <nav aria-label="Primary" className="flex flex-col" style={{ gap: 2 }}>
            {V32_NAV_ITEMS.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon}
                active={isActive(n.href) || (n.href === "/prepared" && pathname.startsWith("/decisions"))}
                onClick={onClose} />
            ))}
          </nav>

          {/* Sources, Agents and Control: real pages outside NAV_ITEMS
              (handoff §2), grouped quietly below a hairline so they still
              highlight when open. */}
          <nav aria-label="Organization" className="flex flex-col" style={{ gap: 2, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {V32_SECONDARY_NAV_ITEMS.map(n => (
              <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon} active={isActive(n.href)} onClick={onClose} />
            ))}

            {/* More — floating flyout, never expands inline */}
            <button
              ref={moreBtnRef}
              onClick={() => setMoreOpen(v => !v)}
              aria-expanded={moreOpen}
              className={`flex items-center w-full text-left ${isMoreActive ? "" : "hover-fade"}`}
              style={{
                gap: 10, padding: "8px 8px", borderRadius: 7, fontSize: 13, lineHeight: "16px",
                background: isMoreActive || moreOpen ? "rgba(255,255,255,0.09)" : "transparent",
                color: isMoreActive || moreOpen ? "#F5F4F0" : "#9A9993",
              }}
            >
              <IconMore size={16} />
              <span className="flex-1">More</span>
            </button>
          </nav>

          {moreOpen && (
            <div
              ref={moreRef}
              className="fixed z-40 overflow-hidden pop-in"
              style={{
                left: 252,
                top: Math.max(12, (moreBtnRef.current?.getBoundingClientRect().top ?? 0) - 160),
                width: 272,
                maxHeight: "72vh",
                background: "#1B1B18",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
              }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: "72vh", padding: 8 }}>
                {MORE_GROUPS.map(({ label, items }) => {
                  const visibleItems = items.filter(n => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) && !isRouteLocked(n.href));
                  if (visibleItems.length === 0) return null;
                  return (
                    <div key={label} style={{ marginBottom: 10 }}>
                      <p style={{ padding: "4px 8px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "1px", color: "#63635F" }}>{label}</p>
                      {visibleItems.map(({ href, label: itemLabel, badge }) => {
                        const active = isActive(href);
                        const liveBadge = badge === "live" && pendingCount !== null && pendingCount > 0 ? String(pendingCount) : null;
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => { setMoreOpen(false); onClose(); }}
                            className={`flex items-center ${active ? "" : "hover-fade"}`}
                            style={{ height: 32, padding: "0 8px", gap: 8, borderRadius: 6, fontSize: 13, background: active ? "rgba(255,255,255,0.09)" : "transparent", color: active ? "#F5F4F0" : "#B9B8B2" }}
                          >
                            <span className="flex-1 truncate">{itemLabel}</span>
                            {liveBadge && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#8A8A86" }}>{liveBadge}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
                {isAdmin && (
                  <Link href="/admin" onClick={() => { setMoreOpen(false); onClose(); }} className="hover-fade flex items-center" style={{ height: 32, padding: "0 8px", borderRadius: 6, fontSize: 13, color: "#B9B8B2" }}>
                    Admin
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User row */}
        <div ref={accountRef} className="relative shrink-0">
          <button
            onClick={() => setAccountOpen(v => !v)}
            aria-expanded={accountOpen}
            className="hover-fade flex items-center w-full text-left"
            style={{ gap: 10, padding: "10px 8px 4px 8px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, borderRadius: 0 }}
          >
            <IdentityAvatar name={userName} size={26} />
            <span className="truncate" style={{ fontSize: 13, color: "#B9B8B2" }}>{userName}</span>
          </button>

          {accountOpen && (
            <div className="absolute z-40 overflow-hidden pop-in" style={{
              left: 0, right: 0, bottom: 44, background: "#1B1B18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <IdentityPicker dark />
              </div>
              {[
                { href: "/settings?tab=profile", label: "Profile", Icon: FiUser },
                { href: "/settings?tab=preferences", label: "Preferences", Icon: FiSliders },
              ].map(({ href, label, Icon }) => (
                <Link key={href} href={href} onClick={onClose} className="hover-fade flex items-center" style={{ gap: 8, height: 36, padding: "0 12px", fontSize: 13, color: "#B9B8B2" }}>
                  <Icon size={13} /> {label}
                </Link>
              ))}
              <button onClick={() => { setAccountOpen(false); setShortcutsOpen(true); }} className="hover-fade flex items-center w-full" style={{ gap: 8, height: 36, padding: "0 12px", fontSize: 13, color: "#B9B8B2" }}>
                <FiCommand size={13} /> Keyboard shortcuts
              </button>
              <button onClick={handleLogout} className="hover-fade flex items-center w-full" style={{ gap: 8, height: 36, padding: "0 12px", fontSize: 13, color: "#B9B8B2", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <FiLogOut size={13} /> Sign out
              </button>
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
              <button onClick={() => setShortcutsOpen(false)} aria-label="Close" style={{ color: "#8A8A86" }}><FiX size={16} /></button>
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
                  <kbd className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ color: "#8A8A86", background: "#F2F2EE" }}>{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiGlobe, FiDatabase, FiShield, FiPlus, FiChevronDown, FiMoreHorizontal,
  FiList, FiTrendingUp, FiSettings, FiLogOut, FiX,
  FiMessageSquare, FiPackage, FiUsers, FiBarChart2,
  FiCamera, FiFileText, FiCreditCard, FiRepeat,
  FiCpu, FiBook, FiShoppingBag, FiUserCheck,
  FiSun, FiActivity, FiUser, FiSliders,
  FiArchive, FiFile, FiDollarSign, FiZap, FiLock, FiAlertTriangle, FiTruck, FiTarget,
} from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";
import { getBusinessType, getSmartHiddenRoutes, type BusinessTypeConfig } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { getRecents, timeAgo, type RecentEntry } from "@/lib/recents";

// Three durable nouns in the permanent rail. Everything else that's real
// (40+ working routes) still exists and is still reachable — it lives
// behind "More" instead of competing for space as first-class navigation.
// Business State, Dashboard, New Invoice and the rest are real, working
// pages; they're just not premium-shell-level primary nouns.
const PRIMARY = [
  { href: "/intelligence", label: "Intelligence", icon: FiGlobe },
  { href: "/connections",  label: "Sources",      icon: FiDatabase },
  { href: "/control",      label: "Control",      icon: FiShield },
];

// Everything else real, grouped only inside the More panel (never in the
// permanent rail) so 40+ working routes stay reachable without turning the
// primary nav into an ERP menu.
const MORE_NAV = [
  { href: "/business-state", label: "Business State",  icon: FiTarget,        badge: null,   group: "core" },
  { href: "/dashboard",      label: "Overview",        icon: FiSun,           badge: null,   group: "core" },
  { href: "/invoice/new",    label: "New Invoice",     icon: FiPlus,          badge: null,   group: "core" },
  { href: "/collections",    label: "Collections",     icon: FiList,          badge: null,   group: "money" },
  { href: "/customers",      label: "Customers",       icon: FiUsers,         badge: null,   group: "money" },
  { href: "/suppliers",      label: "Suppliers",       icon: FiTruck,         badge: null,   group: "money" },
  { href: "/khata",          label: "Customer Khata",  icon: FiBook,          badge: null,   group: "money" },
  { href: "/bills",          label: "GST Invoices",    icon: FiFile,          badge: null,   group: "money" },
  { href: "/bank",           label: "Bank Monitor",    icon: FiDatabase,      badge: null,   group: "money" },
  { href: "/ledger",         label: "Bank Ledger",     icon: FiDollarSign,    badge: null,   group: "money" },
  { href: "/forecast",       label: "Cash Forecast",   icon: FiTrendingUp,    badge: null,   group: "money" },
  { href: "/bad-debt",       label: "Bad Debt Radar",  icon: FiAlertTriangle, badge: null,   group: "money" },
  { href: "/sales",          label: "Sales",           icon: FiTrendingUp,    badge: null,   group: "ops" },
  { href: "/purchases",      label: "Purchases",       icon: FiPackage,       badge: null,   group: "ops" },
  { href: "/orders",         label: "Today's Orders",  icon: FiShoppingBag,   badge: null,   group: "ops" },
  { href: "/inventory",      label: "Inventory",       icon: FiArchive,       badge: null,   group: "ops" },
  { href: "/scanner",        label: "Invoice Scanner", icon: FiCamera,        badge: null,   group: "ops" },
  { href: "/attendance",     label: "Staff Attendance",icon: FiUserCheck,     badge: null,   group: "ops" },
  { href: "/team",           label: "Team",            icon: FiUser,          badge: null,   group: "ops" },
  { href: "/whatsapp",       label: "WhatsApp",        icon: FiMessageSquare, badge: null,   group: "automation" },
  { href: "/dunning",        label: "Auto Follow-Up",  icon: FiRepeat,        badge: null,   group: "automation" },
  { href: "/ai-actions",     label: "Action Center",   icon: FiZap,           badge: null,   group: "automation" },
  { href: "/brain",          label: "Starlane Brain",  icon: FiActivity,      badge: null,   group: "automation" },
  { href: "/ai-chat",        label: "AI Founder",      icon: FiCpu,           badge: null,   group: "automation" },
  { href: "/ai-train",       label: "AI Training",     icon: FiSliders,       badge: null,   group: "automation" },
  { href: "/neural-engine",  label: "Neural Engine",   icon: FiZap,           badge: null,   group: "automation" },
  { href: "/today",          label: "Today's P&L",     icon: FiSun,           badge: null,   group: "insights" },
  { href: "/analytics",      label: "Analytics",       icon: FiBarChart2,     badge: null,   group: "insights" },
  { href: "/reports",        label: "Reports",         icon: FiFileText,      badge: null,   group: "insights" },
  { href: "/network",        label: "Starlane Network", icon: FiGlobe,        badge: null,   group: "network" },
  { href: "/industry",       label: "My Industry",     icon: FiShoppingBag,   badge: null,   group: "network" },
  { href: "/crm",            label: "CRM",             icon: FiUsers,         badge: null,   group: "network" },
  { href: "/my-id",          label: "My Starlane ID",  icon: FiShield,        badge: null,   group: "account" },
  { href: "/billing",        label: "Billing",         icon: FiCreditCard,    badge: null,   group: "account" },
  { href: "/settings",       label: "Settings",        icon: FiSettings,      badge: null,   group: "account" },
];

const MORE_GROUPS = [
  { key: "core",       label: "Business" },
  { key: "money",      label: "Money & collections" },
  { key: "ops",        label: "Sales & inventory" },
  { key: "automation", label: "Automation" },
  { key: "insights",   label: "Insights" },
  { key: "network",    label: "Network" },
  { key: "account",    label: "Account" },
];

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
  const [showLocked, setShowLocked]       = useState(false);
  const [moreOpen, setMoreOpen]           = useState(false);
  const [accountOpen, setAccountOpen]     = useState(false);
  const [recents, setRecents]             = useState<RecentEntry[]>([]);
  const accountRef = useRef<HTMLDivElement>(null);

  // Re-read on every navigation — DashboardLayout writes a fresh entry to
  // the same localStorage key on each page visit, before this reads it.
  // getRecents() itself only ever returns real investigation objects
  // (/intelligence/<id>) — see lib/recents.ts.
  useEffect(() => { setRecents(getRecents().filter(r => r.href !== pathname)); }, [pathname]);

  // Keep "More" expanded automatically while a route inside it is active,
  // so navigating there doesn't look like the item vanished.
  useEffect(() => {
    if (MORE_NAV.some(n => pathname === n.href || pathname.startsWith(n.href + "/"))) setMoreOpen(true);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    if (accountOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen]);

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
  const visibleMore = MORE_NAV.filter(n => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)));
  const lockedItems = visibleMore.filter(n => isRouteLocked(n.href));

  function NavRow({ href, label, Icon, badge, indent }: { href: string; label: string; Icon: React.ElementType; badge?: string | null; indent?: boolean }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={onClose}
        className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium transition-colors duration-150"
        style={{
          paddingLeft: indent ? "30px" : "10px",
          paddingRight: "10px",
          background: active ? "#262626" : "transparent",
          color: active ? "#F7F7F5" : "#A7A7A2",
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Icon size={16} strokeWidth={1.75} className="shrink-0" style={{ color: active ? "#F7F7F5" : "#8A8A86" }} />
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "#A7A7A2" }}>
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      )}

      <aside className={[
        "fixed top-0 left-0 z-30 h-full w-64 flex flex-col",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
        style={{ background: "#141414" }}
      >
        {/* Brand — small mark + wordmark, no divider, no badge, no plan label here */}
        <div className="flex items-center justify-between px-4 shrink-0" style={{ height: "58px" }}>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/starlane-mark.png" alt="" width={21} height={21} style={{ borderRadius: "5px" }} />
            <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em", color: "#F7F7F5" }}>
              Starlane
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg" style={{ color: "#6F6F6B" }}>
            <FiX size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 min-h-0">
          {/* Primary action — start work, not "talk to AI". Real
              destination: the actual signal list, this product's one true
              investigation surface today. */}
          <Link
            href="/intelligence"
            onClick={onClose}
            className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium mb-4 transition-colors duration-150"
            style={{ paddingLeft: "10px", paddingRight: "10px", color: "#D4D4D0" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <FiPlus size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "#8A8A86" }} />
            <span>New investigation</span>
          </Link>

          {/* Primary nav — three durable nouns only */}
          <div className="space-y-px">
            {PRIMARY.map(n => <NavRow key={n.href} href={n.href} label={n.label} Icon={n.icon} />)}

            {/* More — disclosure, not a giant permanent list */}
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="flex items-center gap-2.5 h-9 w-full rounded-[7px] text-[13.5px] font-medium transition-colors duration-150"
              style={{ paddingLeft: "10px", paddingRight: "10px", color: "#A7A7A2" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <FiMoreHorizontal size={16} strokeWidth={1.75} className="shrink-0" style={{ color: "#8A8A86" }} />
              <span className="flex-1 text-left">More</span>
              <FiChevronDown size={13} className="shrink-0 transition-transform duration-150" style={{ transform: moreOpen ? "rotate(180deg)" : "none", color: "#6F6F6B" }} />
            </button>

            {moreOpen && (
              <div className="pt-1 pb-1">
                {MORE_GROUPS.map(({ key, label }) => {
                  const items = visibleMore.filter(n => n.group === key && !isRouteLocked(n.href));
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className="mb-2">
                      <p className="px-2.5 mb-0.5" style={{ fontSize: "10.5px", fontWeight: 500, color: "#62625F", paddingLeft: "30px" }}>
                        {label}
                      </p>
                      <div className="space-y-px">
                        {items.map(({ href, label: itemLabel, icon: Icon, badge }) => {
                          const liveBadge = href === "/collections"
                            ? (pendingCount !== null && pendingCount > 0 ? String(pendingCount) : null)
                            : badge;
                          return <NavRow key={href} href={href} label={itemLabel} Icon={Icon} badge={liveBadge} indent />;
                        })}
                      </div>
                    </div>
                  );
                })}

                {lockedItems.length > 0 && (
                  <div className="mb-1">
                    <button
                      onClick={() => setShowLocked(v => !v)}
                      className="w-full flex items-center gap-1.5 mb-0.5 py-0.5"
                      style={{ paddingLeft: "30px", fontSize: "10.5px", fontWeight: 500, color: "#62625F" }}
                    >
                      <span>Unlock more ({lockedItems.length})</span>
                    </button>
                    {showLocked && (
                      <div className="space-y-px">
                        {lockedItems.map(({ href, label: itemLabel, icon: Icon }) => (
                          <Link
                            key={href}
                            href="/billing"
                            onClick={onClose}
                            title={`Upgrade to unlock ${itemLabel}`}
                            className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium"
                            style={{ paddingLeft: "30px", paddingRight: "10px", color: "#62625F" }}
                          >
                            <Icon size={15} className="shrink-0" style={{ color: "#4A4A47" }} />
                            <span className="flex-1 truncate">{itemLabel}</span>
                            <FiLock size={10} className="shrink-0" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <Link href="/admin" onClick={onClose}
                    className="flex items-center gap-2.5 h-9 rounded-[7px] text-[13.5px] font-medium"
                    style={{ paddingLeft: "30px", paddingRight: "10px", color: "#62625F" }}>
                    <FiShield size={15} className="shrink-0" />
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Recents — real investigation objects only (see
              lib/recents.ts). No card, no per-row icon; a plain row with a
              title and a relative time. */}
          {recents.length > 0 && (
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
                    style={{ height: "32px", color: "#B0B0AB" }}
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
                View history
              </Link>
            </div>
          )}
        </div>

        {/* Account — quiet, sticky, one subtle top border. Sign out lives
            in a small menu, not a permanently visible row. */}
        <div ref={accountRef} className="relative px-3 py-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setAccountOpen(v => !v)}
            className="flex items-center gap-2.5 w-full rounded-[7px] transition-colors duration-150"
            style={{ padding: "6px 8px" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: "rgba(255,255,255,0.1)", color: "#F7F7F5" }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium truncate leading-tight" style={{ color: "#F7F7F5" }}>{userName}</p>
              <p className="text-[11px] truncate" style={{ color: "#6F6F6B" }}>
                {bizType ? bizType.label : (userPlan === "free" ? "Free plan" : userPlan.charAt(0).toUpperCase() + userPlan.slice(1) + " plan")}
              </p>
            </div>
          </button>

          {accountOpen && (
            <div className="absolute left-3 right-3 bottom-[calc(100%+4px)] rounded-lg overflow-hidden" style={{ background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
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
    </>
  );
}

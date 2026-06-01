"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiGrid, FiList, FiTrendingUp, FiSettings, FiLogOut, FiX,
  FiMessageSquare, FiPackage, FiUsers, FiBarChart2,
  FiCamera, FiFileText, FiCreditCard, FiRepeat, FiShield,
  FiCpu, FiGlobe, FiBook, FiShoppingBag, FiUserCheck,
  FiSun, FiActivity, FiUser, FiSliders, FiDatabase,
  FiArchive, FiFile, FiDollarSign, FiZap, FiLock, FiAlertTriangle, FiPlus, FiTruck,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { api, getUser, clearAuth } from "@/lib/api";
import { getBusinessType, getSmartHiddenRoutes, type BusinessTypeConfig } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";

const NAV = [
  // ── Command Center
  { href: "/dashboard",      label: "Dashboard",       icon: FiGrid,          badge: null,   group: "core" },
  { href: "/invoice/new",    label: "New Invoice",     icon: FiPlus,          badge: null,   group: "core" },
  { href: "/collections",    label: "Collections",     icon: FiList,          badge: null,   group: "core" },
  { href: "/customers",      label: "Customers",       icon: FiUsers,         badge: null,   group: "core" },
  { href: "/suppliers",      label: "Suppliers",       icon: FiTruck,         badge: null,   group: "core" },
  { href: "/whatsapp",       label: "WhatsApp",        icon: FiMessageSquare, badge: null,   group: "core" },
  { href: "/dunning",        label: "Auto Follow-Up",  icon: FiRepeat,        badge: null,   group: "core" },
  // ── Intelligence
  { href: "/ai-actions",     label: "Action Center",   icon: FiZap,           badge: "NEW",  group: "intelligence" },
  { href: "/today",          label: "Today's P&L",     icon: FiSun,           badge: null,   group: "intelligence" },
  { href: "/brain",          label: "Atlas Brain",    icon: FiActivity,      badge: "AI",   group: "intelligence" },
  { href: "/ai-chat",        label: "AI Founder",      icon: FiCpu,           badge: null,   group: "intelligence" },
  { href: "/ai-train",       label: "AI Training",     icon: FiSliders,       badge: "AI",   group: "intelligence" },
  { href: "/neural-engine",  label: "Neural Engine",   icon: FiZap,           badge: null,   group: "intelligence" },
  { href: "/forecast",       label: "Cash Forecast",   icon: FiTrendingUp,    badge: null,   group: "intelligence" },
  { href: "/ledger",         label: "Bank Ledger",     icon: FiDollarSign,    badge: null,   group: "intelligence" },
  { href: "/analytics",      label: "Analytics",       icon: FiBarChart2,     badge: null,   group: "intelligence" },
  { href: "/reports",        label: "Reports",         icon: FiFileText,      badge: null,   group: "intelligence" },
  // ── Network
  { href: "/network",        label: "Atlas Network",  icon: FiGlobe,         badge: "NEW",  group: "network" },
  { href: "/industry",       label: "My Industry",     icon: FiShoppingBag,   badge: null,   group: "network" },
  { href: "/crm",            label: "CRM",             icon: FiUsers,         badge: null,   group: "network" },
  // ── Operations
  { href: "/bills",          label: "GST Invoices",    icon: FiFile,          badge: "NEW",  group: "ops" },
  { href: "/khata",          label: "Customer Khata",  icon: FiBook,          badge: null,   group: "ops" },
  { href: "/sales",          label: "Sales",           icon: FiTrendingUp,    badge: null,   group: "ops" },
  { href: "/purchases",      label: "Purchases",       icon: FiPackage,       badge: null,   group: "ops" },
  { href: "/orders",         label: "Today's Orders",  icon: FiShoppingBag,   badge: "NEW",  group: "ops" },
  { href: "/attendance",     label: "Staff Attendance",icon: FiUserCheck,     badge: null,   group: "ops" },
  { href: "/team",           label: "Team",            icon: FiUser,          badge: null,   group: "ops" },
  { href: "/bank",           label: "Bank Monitor",    icon: FiDatabase,      badge: "NEW",  group: "ops" },
  { href: "/inventory",      label: "Inventory",       icon: FiArchive,       badge: null,   group: "ops" },
  { href: "/scanner",        label: "Invoice Scanner", icon: FiCamera,        badge: null,   group: "ops" },
  { href: "/bad-debt",       label: "Bad Debt Radar",  icon: FiAlertTriangle, badge: null,   group: "ops" },
  // ── Account
  { href: "/my-id",          label: "My Atlas ID",    icon: FiShield,        badge: null,   group: "account" },
  { href: "/billing",        label: "Billing",         icon: FiCreditCard,    badge: null,   group: "account" },
  { href: "/settings",       label: "Settings",        icon: FiSettings,      badge: null,   group: "account" },
];

const GROUPS = [
  { key: "core",         label: "Core" },
  { key: "intelligence", label: "AI" },
  { key: "network",      label: "Network" },
  { key: "ops",          label: "Operations" },
  { key: "account",      label: "Account" },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName]           = useState("User");
  const [bizName, setBizName]             = useState("My Business");
  const [userPlan, setUserPlan]           = useState<string>("free");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [bizType, setBizType]             = useState<BusinessTypeConfig | null>(null);
  const [hiddenRoutes, setHiddenRoutes]   = useState<Set<string>>(new Set());
  const [grantedFeatures, setGrantedFeatures] = useState<Set<FeatureKey>>(new Set());
  const [pendingCount, setPendingCount]   = useState<number | null>(null);

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
      setBizName(u.email || "");
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

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        />
      )}

      <aside className={[
        "fixed top-0 left-0 z-30 h-full w-56 flex flex-col",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
        style={{
          background: "#080808",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo — wordmark only, no icon */}
        <div className="flex items-center justify-between px-5 h-14 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span
              className="font-semibold tracking-tight"
              style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}
            >
              Atlas
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <FiX size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
          {GROUPS.map(({ key, label }) => {
            const items = NAV.filter(n => {
              if (n.group !== key) return false;
              if (hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) return false;
              return true;
            });
            if (items.length === 0) return null;
            return (
              <div key={key} className="mb-3">
                <p
                  className="px-2 mb-1"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  {label}
                </p>
                <div className="space-y-px">
                  {items.map(({ href, label: itemLabel, icon: Icon, badge }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    const liveBadge = href === "/collections"
                      ? (pendingCount !== null && pendingCount > 0 ? String(pendingCount) : null)
                      : badge;

                    const featureKey = ROUTE_TO_FEATURE[href];
                    const isLocked = featureKey
                      ? grantedFeatures.size > 0 && !grantedFeatures.has(featureKey)
                      : false;

                    if (isLocked) {
                      return (
                        <Link
                          key={href}
                          href="/billing"
                          onClick={onClose}
                          title={`Upgrade to unlock ${itemLabel}`}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        >
                          <Icon size={14} className="shrink-0" style={{ color: "rgba(255,255,255,0.15)" }} />
                          <span className="flex-1 line-through">{itemLabel}</span>
                          <FiLock size={10} className="shrink-0" />
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative"
                        style={{
                          background: active ? "rgba(255,255,255,0.07)" : "transparent",
                          color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                          }
                        }}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                            style={{ background: "rgba(255,255,255,0.6)" }}
                          />
                        )}
                        <Icon
                          size={14}
                          className="shrink-0"
                          style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.35)" }}
                        />
                        <span className="flex-1">{itemLabel}</span>
                        {liveBadge && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.45)",
                            }}
                          >
                            {liveBadge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-2.5 pb-1">
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              <FiShield size={13} className="shrink-0" />
              Admin
            </Link>
          </div>
        )}

        {/* User card */}
        <div
          className="px-2.5 py-3 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.55)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
            }}
          >
            {/* Flat monogram avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[12px] font-semibold truncate leading-none"
                style={{ color: "#ffffff" }}
              >
                {userName}
              </p>
              <p
                className="text-[10px] mt-0.5 truncate"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {bizType ? `${bizType.label}` : (userPlan === "free" ? "Free plan" : userPlan.charAt(0).toUpperCase() + userPlan.slice(1) + " plan")}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-1.5 mt-0.5 w-full rounded-lg text-[11px] font-medium transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(245,66,77,0.7)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)";
            }}
          >
            <FiLogOut size={11} className="shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

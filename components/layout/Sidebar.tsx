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
  FiArchive, FiFile, FiDollarSign, FiZap,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { getUser, clearAuth } from "@/lib/api";
import { getBusinessType, getSmartHiddenRoutes, type BusinessTypeConfig } from "@/lib/businessTypes";

// feature flag key → which sidebar items require that flag
const NAV = [
  // ── Command Center
  { href: "/dashboard",      label: "Dashboard",       icon: FiGrid,          badge: null,   group: "core" },
  { href: "/collections",    label: "Collections",     icon: FiList,          badge: "12",   group: "core" },
  { href: "/whatsapp",       label: "WhatsApp",        icon: FiMessageSquare, badge: null,   group: "core" },
  { href: "/dunning",        label: "Auto Follow-Up",  icon: FiRepeat,        badge: null,   group: "core" },
  // ── Intelligence
  { href: "/today",          label: "Today's P&L",     icon: FiSun,           badge: "NEW",  group: "intelligence" },
  { href: "/brain",          label: "Vantro Brain",    icon: FiActivity,      badge: "AI",   group: "intelligence" },
  { href: "/ai-chat",        label: "AI Founder",      icon: FiCpu,           badge: null,   group: "intelligence" },
  { href: "/ai-train",       label: "AI Training",     icon: FiSliders,       badge: "AI",   group: "intelligence" },
  { href: "/neural-engine",  label: "Neural Engine",   icon: FiZap,           badge: null,   group: "intelligence" },
  { href: "/forecast",       label: "Cash Forecast",   icon: FiTrendingUp,    badge: null,   group: "intelligence" },
  { href: "/ledger",         label: "Bank Ledger",     icon: FiDollarSign,    badge: null,   group: "intelligence" },
  { href: "/analytics",      label: "Analytics",       icon: FiBarChart2,     badge: null,   group: "intelligence" },
  { href: "/reports",        label: "Reports",         icon: FiFileText,      badge: null,   group: "intelligence" },
  // ── Network
  { href: "/network",        label: "Vantro Network",  icon: FiGlobe,         badge: "NEW",  group: "network" },
  { href: "/industry",       label: "My Industry",     icon: FiShoppingBag,   badge: null,   group: "network" },
  { href: "/crm",            label: "CRM",             icon: FiUsers,         badge: null,   group: "network" },
  // ── Operations
  { href: "/bills",          label: "GST Invoices",    icon: FiFile,          badge: "NEW",  group: "ops" },
  { href: "/khata",          label: "Customer Khata",  icon: FiBook,          badge: null,   group: "ops" },
  { href: "/purchases",      label: "Purchases",       icon: FiPackage,       badge: null,   group: "ops" },
  { href: "/orders",         label: "Today's Orders",  icon: FiShoppingBag,   badge: "NEW",  group: "ops" },
  { href: "/attendance",     label: "Staff Attendance",icon: FiUserCheck,     badge: null,   group: "ops" },
  { href: "/team",           label: "Team",            icon: FiUser,          badge: null,   group: "ops" },
  { href: "/bank",           label: "Bank Monitor",    icon: FiDatabase,      badge: "NEW",  group: "ops" },
  { href: "/inventory",      label: "Inventory",       icon: FiArchive,       badge: null,   group: "ops" },
  { href: "/scanner",        label: "Invoice Scanner", icon: FiCamera,        badge: null,   group: "ops" },
  // ── Account
  { href: "/my-id",          label: "My Vantro ID",    icon: FiShield,        badge: null,   group: "account" },
  { href: "/billing",        label: "Billing",         icon: FiCreditCard,    badge: null,   group: "account" },
  { href: "/settings",       label: "Settings",        icon: FiSettings,      badge: null,   group: "account" },
];

const GROUPS = [
  { key: "core",         label: "Collections" },
  { key: "intelligence", label: "AI Intelligence" },
  { key: "network",      label: "Network" },
  { key: "ops",          label: "Operations" },
  { key: "account",      label: "Account" },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName]           = useState("User");
  const [bizName, setBizName]             = useState("My Business");
  const [isAdmin, setIsAdmin]             = useState(false);
  const [bizType, setBizType]             = useState<BusinessTypeConfig | null>(null);
  const [hiddenRoutes, setHiddenRoutes]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadBizType = () => {
      setBizType(getBusinessType());
      setHiddenRoutes(getSmartHiddenRoutes());
    };

    const u = getUser();
    if (u) {
      const emailName = u.email?.split("@")[0] || "User";
      setUserName(u.business_name || emailName);
      setBizName(u.email || "");
      setIsAdmin(u.email === "ishantswami13@gmail.com");
    }
    loadBizType();

    // Re-read when localStorage changes (e.g. after onboarding completes)
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
        <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside className={[
        "fixed top-0 left-0 z-30 h-full w-60 flex flex-col sidebar-glass",
        "transition-transform duration-300 ease-out",
        "lg:translate-x-0 lg:static lg:z-auto",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}>

        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <div>
              <p className="font-bold text-sm text-primary tracking-tight leading-none">Vantro</p>
              <p className="text-2xs text-muted mt-0.5">Business OS</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-muted hover:text-primary rounded focus-ring">
            <FiX size={17} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {GROUPS.map(({ key, label }) => {
            const items = NAV.filter(n => {
              if (n.group !== key) return false;
              // Smart filter: uses industry type + onboarding YES/NO answers combined
              if (hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) return false;
              return true;
            });
            if (items.length === 0) return null;
            return (
              <div key={key} className="mb-4">
                <p className="px-2.5 mb-1.5 section-label">{label}</p>
                <div className="space-y-0.5">
                  {items.map(({ href, label: itemLabel, icon: Icon, badge }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link key={href} href={href} onClick={onClose}
                        className={[
                          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring relative overflow-hidden",
                          active ? "bg-accent-dim text-accent" : "text-secondary hover:text-primary hover:bg-surface-2",
                        ].join(" ")}>
                        {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-accent rounded-r-full" />}
                        <Icon size={17} className={[
                          "shrink-0 transition-all duration-200",
                          active ? "text-accent drop-shadow-[0_0_6px_rgba(0,102,255,0.7)]" : "text-muted group-hover:text-secondary",
                        ].join(" ")} />
                        <span className="flex-1">{itemLabel}</span>
                        {badge && (
                          <span className={[
                            "text-2xs font-bold font-mono min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full",
                            badge === "AI"  ? "bg-accent-dim text-accent border border-accent/20"
                            : badge === "NEW" ? "bg-success-dim text-success border border-success/20"
                            : "bg-danger-dim text-danger border border-danger/20",
                          ].join(" ")}>
                            {badge}
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
          <div className="px-3 pb-2">
            <Link href="/admin" onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-accent hover:bg-accent-dim transition-all w-full">
              <FiShield size={13} className="shrink-0" />
              Admin
            </Link>
          </div>
        )}

        {/* User card + Sign Out */}
        <div className="px-3 py-3 border-t border-white/5 shrink-0">
          <Link href="/settings" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{userName}</p>
              <p className="text-2xs text-muted truncate">
                {bizType ? `${bizType.emoji} ${bizType.label}` : bizName}
              </p>
            </div>
            <FiSettings size={12} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
          {/* Sign Out — visually separated from nav */}
          <div className="mt-1 px-3">
            <button onClick={handleLogout}
              className="flex items-center gap-2 py-1.5 text-2xs font-medium text-muted/60 hover:text-danger transition-colors focus-ring w-full">
              <FiLogOut size={11} className="shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

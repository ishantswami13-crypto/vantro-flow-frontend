"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiGrid, FiList, FiTrendingUp, FiSettings, FiLogOut, FiX, FiZap,
  FiMessageSquare, FiPackage, FiUsers, FiBarChart2,
  FiCamera, FiFileText, FiCreditCard, FiRepeat, FiShield,
} from "react-icons/fi";
import { getUser, clearAuth } from "@/lib/api";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",       icon: FiGrid,          badge: null,  group: "main" },
  { href: "/collections", label: "Collections",     icon: FiList,          badge: "12",  group: "main" },
  { href: "/whatsapp",    label: "WhatsApp",         icon: FiMessageSquare, badge: null,  group: "main" },
  { href: "/dunning",     label: "Auto Follow-Up",   icon: FiRepeat,        badge: null,  group: "main" },
  { href: "/forecast",    label: "Cash Forecast",   icon: FiTrendingUp,    badge: null,  group: "insights" },
  { href: "/analytics",   label: "Analytics",       icon: FiBarChart2,     badge: null,  group: "insights" },
  { href: "/reports",     label: "Reports",         icon: FiFileText,      badge: null,  group: "insights" },
  { href: "/inventory",   label: "Inventory",       icon: FiPackage,       badge: null,  group: "tools" },
  { href: "/crm",         label: "CRM",             icon: FiUsers,         badge: null,  group: "tools" },
  { href: "/scanner",     label: "Invoice Scanner", icon: FiCamera,        badge: null,  group: "tools" },
  { href: "/ai-chat",     label: "AI Assistant",    icon: FiZap,           badge: "AI",  group: "tools" },
  { href: "/my-id",        label: "My Vantro ID",    icon: FiShield,        badge: null,  group: "account" },
  { href: "/billing",     label: "Billing",         icon: FiCreditCard,    badge: null,  group: "account" },
  { href: "/settings",    label: "Settings",        icon: FiSettings,      badge: null,  group: "account" },
];

const GROUPS = [
  { key: "main",    label: "Collections" },
  { key: "insights",label: "Insights" },
  { key: "tools",   label: "Tools" },
  { key: "account", label: "Account" },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("User");
  const [bizName, setBizName]   = useState("My Business");
  const [isAdmin, setIsAdmin]   = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setUserName(u.business_name || u.email?.split("@")[0] || "User");
      setBizName(u.business_name || "My Business");
      setIsAdmin(u.email === "ishantswami13@gmail.com");
    }
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
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
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
            <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiZap size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-primary tracking-tight leading-none">Vantro Flow</p>
              <p className="text-2xs text-muted mt-0.5">Collections OS</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 text-muted hover:text-primary rounded focus-ring">
            <FiX size={17} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {GROUPS.map(({ key, label }) => {
            const items = NAV.filter(n => n.group === key);
            return (
              <div key={key} className="mb-4">
                <p className="px-2.5 mb-1.5 section-label">{label}</p>
                <div className="space-y-0.5">
                  {items.map(({ href, label: itemLabel, icon: Icon, badge }) => {
                    const active = pathname === href || pathname.startsWith(href + "/");
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onClose}
                        className={[
                          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-ring relative overflow-hidden",
                          active
                            ? "bg-accent-dim text-accent"
                            : "text-secondary hover:text-primary hover:bg-surface-2",
                        ].join(" ")}
                      >
                        {active && (
                          <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-accent rounded-r-full" />
                        )}
                        <Icon
                          size={17}
                          className={["shrink-0 transition-all duration-200",
                            active ? "text-accent drop-shadow-[0_0_6px_rgba(0,102,255,0.7)]" : "text-muted group-hover:text-secondary",
                          ].join(" ")}
                        />
                        <span className="flex-1">{itemLabel}</span>
                        {badge && (
                          <span className={[
                            "text-2xs font-bold font-mono min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full",
                            badge === "AI"
                              ? "bg-accent-dim text-accent border border-accent/20"
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

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/5 shrink-0 space-y-1">
          <Link href="/settings" onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">{userName}</p>
              <p className="text-2xs text-muted truncate">{bizName}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:text-danger hover:bg-danger-dim transition-all focus-ring w-full"
          >
            <FiLogOut size={15} className="shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

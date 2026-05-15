"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiGrid, FiList, FiTrendingUp, FiSettings, FiLogOut, FiX, FiZap,
} from "react-icons/fi";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",     icon: FiGrid,       badge: null },
  { href: "/collections", label: "Collections",   icon: FiList,       badge: "12" },
  { href: "/forecast",    label: "Cash Forecast", icon: FiTrendingUp, badge: null },
  { href: "/settings",    label: "Settings",      icon: FiSettings,   badge: null },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="px-2.5 mb-3 section-label">Navigation</p>
          {NAV.map(({ href, label, icon: Icon, badge }) => {
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
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-2xs font-bold font-mono min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-danger-dim text-danger border border-danger/20">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/5 shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-surface-2 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center text-xs font-bold text-white shrink-0">
              R
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary truncate">Rajesh Kumar</p>
              <p className="text-2xs text-muted truncate">Kumar Traders</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted hover:text-danger hover:bg-danger-dim transition-all focus-ring"
          >
            <FiLogOut size={15} className="shrink-0" />
            Sign Out
          </Link>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiGrid, FiList, FiTrendingUp, FiSettings, FiLogOut, FiX, FiZap,
} from "react-icons/fi";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",    icon: FiGrid },
  { href: "/collections", label: "Collections",  icon: FiList },
  { href: "/forecast",    label: "Cash Forecast", icon: FiTrendingUp },
  { href: "/settings",   label: "Settings",     icon: FiSettings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed top-0 left-0 z-30 h-full w-64 bg-surface border-r border-border flex flex-col",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-accent rounded flex items-center justify-center">
              <FiZap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-primary tracking-tight">Vantro Flow</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-secondary hover:text-primary focus-ring rounded p-0.5">
            <FiX size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="px-2 mb-2 text-2xs font-semibold text-muted uppercase tracking-wider">Navigation</p>
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={[
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 focus-ring",
                      active
                        ? "bg-accent-dim text-accent"
                        : "text-secondary hover:text-primary hover:bg-surface-2",
                    ].join(" ")}
                  >
                    <Icon size={16} className="shrink-0" />
                    {label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-border shrink-0">
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-secondary hover:text-danger hover:bg-danger-dim transition-colors duration-150 focus-ring"
          >
            <FiLogOut size={16} className="shrink-0" />
            Logout
          </Link>
        </div>
      </aside>
    </>
  );
}

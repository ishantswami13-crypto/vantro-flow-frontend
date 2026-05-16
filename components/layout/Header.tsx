"use client";

import { useEffect, useState } from "react";
import { FiMenu, FiBell, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";
import { getUser } from "@/lib/api";

interface HeaderProps { onMenuToggle: () => void; pageTitle?: string; }

export default function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  const [displayName, setDisplayName] = useState("User");
  const [bizName, setBizName]         = useState("");

  useEffect(() => {
    const u = getUser();
    if (u) {
      setDisplayName(u.business_name || u.email?.split("@")[0] || "User");
      setBizName(u.business_name || "");
    }
  }, []);

  return (
    <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface-2 border border-border text-secondary hover:text-primary hover:bg-surface-3 transition-all focus-ring"
          aria-label="Open menu"
        >
          <FiMenu size={17} />
        </button>
        {pageTitle && (
          <div className="hidden sm:flex items-center gap-2.5">
            <h1 className="text-sm font-bold text-primary tracking-tight">{pageTitle}</h1>
            <span className="status-live text-xs text-success">Live</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface-2 border border-border text-secondary hover:text-primary hover:bg-surface-3 transition-all focus-ring"
          aria-label="Sync data"
        >
          <FiRefreshCw size={15} />
        </button>
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface-2 border border-border text-secondary hover:text-primary hover:bg-surface-3 transition-all focus-ring"
          aria-label="Notifications"
        >
          <FiBell size={15} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-bg" />
        </button>

        <Link href="/settings" className="ml-1 flex items-center gap-2 px-2 py-1.5 rounded-xl bg-surface-2 border border-border hover:bg-surface-3 transition-all cursor-pointer">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-success flex items-center justify-center text-xs font-bold text-white shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-primary leading-none truncate max-w-[80px]">{displayName}</p>
            {bizName && <p className="text-2xs text-muted mt-0.5 truncate max-w-[80px]">{bizName}</p>}
          </div>
        </Link>
      </div>
    </header>
  );
}

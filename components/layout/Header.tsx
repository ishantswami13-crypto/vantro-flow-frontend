"use client";

import { useState, useEffect } from "react";
import { FiMenu, FiRefreshCw } from "react-icons/fi";
import Link from "next/link";
import { getUser } from "@/lib/api";
import { IdentityAvatar } from "@/components/identity/IdentityAvatar";

interface HeaderProps { onMenuToggle: () => void; pageTitle?: string; }

// Global light utility header — the ONLY structural dark surface in the
// shell is the left sidebar. This bar is a quiet breadcrumb/context strip,
// not a second "page title" moment (the real title lives in page content).
export default function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  const [displayName, setDisplayName] = useState("User");
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) setDisplayName(u.business_name || u.email?.split("@")[0] || "User");
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("vantro:refresh"));
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header
      className="relative flex items-center justify-between px-4 lg:px-5 shrink-0 z-10"
      style={{ height: "56px", background: "#F7F7F4", borderBottom: "1px solid rgba(20,20,20,0.07)" }}
    >
      {/* Left — contextual breadcrumb, not a giant title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{ color: "#8A8A86" }}
          aria-label="Open menu"
        >
          <FiMenu size={16} />
        </button>
        {pageTitle && (
          <h1 className="text-[13px] font-medium truncate" style={{ color: "#686868", letterSpacing: "-0.005em" }}>
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "#8A8A86" }}
          aria-label="Sync data"
          title="Refresh"
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(20,20,20,0.05)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <FiRefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>

        <Link
          href="/settings"
          className="ml-1 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
          style={{ color: "#686868" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(20,20,20,0.05)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <IdentityAvatar name={displayName} size={24} />
          <div className="hidden sm:block">
            <p className="text-[11px] font-medium leading-none truncate max-w-[80px]" style={{ color: "#171717" }}>
              {displayName}
            </p>
          </div>
        </Link>
      </div>
      {/* Hairline in the user's colour — quiet, but present on every page. */}
      <span aria-hidden="true" className="pointer-events-none absolute left-0 right-0 bottom-[-1px] h-[1.5px]" style={{ background: "var(--id-gradient-h, transparent)", opacity: 0.85 }} />
    </header>
  );
}

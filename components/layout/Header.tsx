"use client";

import { useEffect, useState, useRef } from "react";
import { FiMenu, FiBell, FiRefreshCw, FiCheck, FiAlertCircle, FiTrendingUp, FiX } from "react-icons/fi";
import Link from "next/link";
import { getUser } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface Notif {
  id: string;
  type: "payment" | "overdue" | "forecast" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NOTIF_ICON: Record<string, { icon: typeof FiCheck; color: string }> = {
  payment:  { icon: FiCheck,       color: "#10D98A" },
  overdue:  { icon: FiAlertCircle, color: "#F5424D" },
  forecast: { icon: FiTrendingUp,  color: "#1A6FFF" },
  system:   { icon: FiBell,        color: "#F5A524" },
};

interface HeaderProps { onMenuToggle: () => void; pageTitle?: string; }

export default function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  const [displayName, setDisplayName] = useState("User");
  const [bizName, setBizName]         = useState("");
  const [showNotifs, setShowNotifs]   = useState(false);
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setDisplayName(u.business_name || u.email?.split("@")[0] || "User");
      setBizName(u.business_name || "");
    }
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  const fetchNotifs = async () => {
    setLoadingNotifs(true);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${API}/api/notifications/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success && Array.isArray(d.notifications)) {
        setNotifs(d.notifications);
      }
    } catch {
      // silently fail — use empty state
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleBellClick = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && notifs.length === 0) fetchNotifs();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger a full page data refresh via custom event
    window.dispatchEvent(new CustomEvent("vantro:refresh"));
    setTimeout(() => setRefreshing(false), 800);
  };

  const unread = notifs.filter(n => !n.read).length;

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
          onClick={handleRefresh}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-surface-2 border border-border text-secondary hover:text-primary hover:bg-surface-3 transition-all focus-ring"
          aria-label="Sync data"
          title="Refresh data"
        >
          <FiRefreshCw size={15} className={refreshing ? "animate-spin text-accent" : ""} />
        </button>

        {/* Bell + Notifications panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className={`relative w-9 h-9 flex items-center justify-center rounded-xl border transition-all focus-ring ${
              showNotifs
                ? "bg-accent-dim border-accent/40 text-accent"
                : "bg-surface-2 border-border text-secondary hover:text-primary hover:bg-surface-3"
            }`}
            aria-label="Notifications"
          >
            <FiBell size={15} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-bg" />
            )}
            {unread === 0 && notifs.length === 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-bg" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 bg-surface-1 border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FiBell size={13} className="text-accent" />
                  <p className="text-xs font-bold text-primary">Notifications</p>
                  {unread > 0 && (
                    <span className="text-2xs font-bold bg-danger text-white px-1.5 py-0.5 rounded-full">{unread}</span>
                  )}
                </div>
                <button onClick={() => setShowNotifs(false)} className="text-muted hover:text-primary">
                  <FiX size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="py-8 text-center">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted">Loading...</p>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-3">
                      <FiBell size={18} className="text-muted opacity-50" />
                    </div>
                    <p className="text-sm font-semibold text-secondary mb-1">Koi notification nahi abhi</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Payment milte hi yahan dikhega. Enable karein notifications taaki instantly pata chale.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifs.map(n => {
                      const { icon: Icon, color } = NOTIF_ICON[n.type] ?? NOTIF_ICON.system;
                      return (
                        <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-surface-2 transition-colors ${!n.read ? "bg-accent/3" : ""}`}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                            <Icon size={13} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary leading-tight">{n.title}</p>
                            <p className="text-2xs text-muted mt-0.5 leading-relaxed">{n.body}</p>
                            <p className="text-2xs text-muted/60 mt-1">{timeAgo(n.time)}</p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                <button onClick={fetchNotifs} className="text-2xs text-accent hover:underline">
                  Refresh
                </button>
                <Link href="/settings" onClick={() => setShowNotifs(false)} className="text-2xs text-muted hover:text-primary transition-colors">
                  Notification settings →
                </Link>
              </div>
            </div>
          )}
        </div>

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

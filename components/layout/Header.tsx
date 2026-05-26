"use client";

import { useEffect, useState, useRef } from "react";
import { FiMenu, FiBell, FiRefreshCw, FiCheck, FiAlertCircle, FiTrendingUp, FiX } from "react-icons/fi";
import Link from "next/link";
import { getUser } from "@/lib/api";
import { isDemoMode } from "@/lib/demo";

interface Notif {
  id: string;
  type: "payment" | "overdue" | "forecast" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const DEMO_NOTIFS: Notif[] = [
  { id: "1", type: "overdue",  title: "Mehta Fabrics — 62 days overdue",      body: "₹8,40,000 still pending. High priority — call today.",           time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),          read: false },
  { id: "2", type: "overdue",  title: "Sharma Steel — 45 days overdue",        body: "₹5,20,000 pending. Last attempt: 12 May.",                       time: new Date(Date.now() - 1000 * 60 * 90).toISOString(),          read: false },
  { id: "3", type: "payment",  title: "Joshi Electronics — Payment Received",  body: "₹1,42,000 received. Invoice auto-marked paid.",                  time: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),     read: true  },
  { id: "4", type: "forecast", title: "Cash Runway Alert",                     body: "Current runway: 12 days. ₹5L+ collections needed this week.",    time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),     read: true  },
  { id: "5", type: "system",   title: "AI Briefing Ready",                     body: "5 priority calls identified for today.",                         time: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),     read: true  },
];

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

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
  forecast: { icon: FiTrendingUp,  color: "#ffffff" },
  system:   { icon: FiBell,        color: "rgba(255,255,255,0.5)" },
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
    if (isDemoMode()) {
      setNotifs(DEMO_NOTIFS);
      setLoadingNotifs(false);
      return;
    }

    setLoadingNotifs(true);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${API}/api/notifications/recent`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success && Array.isArray(d.notifications) && d.notifications.length > 0) {
        setNotifs(d.notifications);
      } else {
        generateLocalNotifs(token);
      }
    } catch {
      const token = localStorage.getItem("vantro_token") || "";
      generateLocalNotifs(token);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const generateLocalNotifs = async (token: string) => {
    try {
      const user = getUser();
      if (!user?.id) return;
      const r = await fetch(`${API}/api/invoices?user_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      const invoices = d.invoices || [];
      const generated: Notif[] = [];

      const overdue = invoices
        .filter((inv: any) => inv.days_overdue > 0 && inv.payment_status === "Pending")
        .sort((a: any, b: any) => b.days_overdue - a.days_overdue)
        .slice(0, 3);

      overdue.forEach((inv: any, i: number) => {
        generated.push({
          id: `inv-${i}`,
          type: "overdue",
          title: `${inv.customer_name} — ${inv.days_overdue} days overdue`,
          body: `₹${Number(inv.invoice_amount).toLocaleString("en-IN")} pending.`,
          time: new Date(Date.now() - 1000 * 60 * (30 + i * 60)).toISOString(),
          read: i > 0,
        });
      });

      if (generated.length > 0) setNotifs(generated);
    } catch {
      // silent
    }
  };

  const handleBellClick = () => {
    setShowNotifs(v => !v);
    if (!showNotifs && notifs.length === 0) fetchNotifs();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("vantro:refresh"));
    setTimeout(() => setRefreshing(false), 800);
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <header
      className="h-12 flex items-center justify-between px-4 lg:px-5 shrink-0 z-10"
      style={{
        background: "#080808",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.45)" }}
          aria-label="Open menu"
        >
          <FiMenu size={16} />
        </button>
        {pageTitle && (
          <h1
            className="text-[13px] font-semibold tracking-tight hidden sm:block"
            style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "-0.01em" }}
          >
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.35)" }}
          aria-label="Sync data"
          title="Refresh"
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
        >
          <FiRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Bell + panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: showNotifs ? "#ffffff" : "rgba(255,255,255,0.35)" }}
            aria-label="Notifications"
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)")}
            onMouseLeave={e => { if (!showNotifs) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"; }}
          >
            <FiBell size={14} />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-[#080808]"
                style={{ background: "#F5424D" }}
              />
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden animate-fade-in"
              style={{
                background: "#111111",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
              }}
            >
              {/* Panel header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold" style={{ color: "#ffffff" }}>Notifications</p>
                  {unread > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#F5424D", color: "#fff" }}
                    >
                      {unread}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifs(false)}
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  <FiX size={13} />
                </button>
              </div>

              {/* Panel body */}
              <div className="max-h-72 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="py-8 text-center">
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                      style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "transparent" }}
                    />
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="py-8 text-center px-4">
                    <FiBell size={20} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                    <p className="text-[12px] font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>No notifications</p>
                    <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                      Payments and alerts will appear here.
                    </p>
                  </div>
                ) : (
                  <div>
                    {notifs.map((n, i) => {
                      const { icon: Icon, color } = NOTIF_ICON[n.type] ?? NOTIF_ICON.system;
                      return (
                        <div
                          key={n.id}
                          className="flex gap-3 px-4 py-3 transition-colors"
                          style={{
                            borderBottom: i < notifs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                            background: !n.read ? "rgba(255,255,255,0.02)" : "transparent",
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${color}14` }}
                          >
                            <Icon size={12} style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold leading-tight" style={{ color: "#ffffff" }}>{n.title}</p>
                            <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{n.body}</p>
                            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{timeAgo(n.time)}</p>
                          </div>
                          {!n.read && (
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                              style={{ background: "#4F6EF7" }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panel footer */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <button
                  onClick={fetchNotifs}
                  className="text-[11px] transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ffffff")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                >
                  Refresh
                </button>
                <Link
                  href="/settings"
                  onClick={() => setShowNotifs(false)}
                  className="text-[11px] transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ffffff")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                >
                  Settings →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <Link
          href="/settings"
          className="ml-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#ffffff";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)";
          }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0"
            style={{ background: "rgba(255,255,255,0.1)", color: "#ffffff" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold leading-none truncate max-w-[80px]" style={{ color: "#ffffff" }}>
              {displayName}
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}

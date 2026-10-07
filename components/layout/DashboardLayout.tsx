"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { CommandPalette, type SearchableRoute } from "./CommandPalette";
import { Modal } from "@/components/ui/Modal";
import { V32_NAV_ITEMS, V32_WORKSPACE_NAV_ITEMS, MORE_NAV_ITEMS, OTHER_PAGES } from "@/lib/navigation";
import { IconInfo } from "@/components/v32/icons";
import InstallPrompt from "@/components/ui/InstallPrompt";
import PaymentCelebration from "@/components/PaymentCelebration";
import { usePathname } from "next/navigation";
import { isDemoMode, exitDemoMode } from "@/lib/demo";
import { hydrateUserContext } from "@/lib/featureGating";
import { api, authenticatedFetch, authHeaders, isLoggedIn } from "@/lib/api";
import { recordRecent } from "@/lib/recents";
import { useApplyIdentity } from "@/components/identity/useIdentity";
import Link from "next/link";


interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

// Convert base64url VAPID key to Uint8Array (required by PushManager)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData, (c) => c.charCodeAt(0)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Get VAPID public key from backend
    const keyRes = await authenticatedFetch('/api/notifications/vapid-key');
    const keyData = await keyRes.json();
    if (!keyData.success || !keyData.publicKey) return; // not configured

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — just re-send to backend in case it changed
      await authenticatedFetch('/api/notifications/subscribe', {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ subscription: existing.toJSON() }),
      });
      return;
    }

    const applicationServerKey = toArrayBuffer(urlBase64ToUint8Array(keyData.publicKey));
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await authenticatedFetch('/api/notifications/subscribe', {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (err) {
    // Silently fail — push is a nice-to-have
    console.warn("Push subscription failed:", err);
  }
}

const SEARCHABLE: SearchableRoute[] = [
  ...V32_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const, context: "Surface" })),
  ...V32_WORKSPACE_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const, context: "Workspace" })),
  ...MORE_NAV_ITEMS.map(n => ({ href: n.href, label: n.label, type: "Page" as const })),
  { href: "/intelligence", label: "Intelligence", type: "Page" as const },
  ...OTHER_PAGES.map(n => ({ href: n.href, label: n.label, type: "Page" as const, context: "Older page" })),
];

const SHORTCUTS = [
  { keys: "Ctrl K", desc: "Search or jump to a page" },
  { keys: "Ctrl \\", desc: "Collapse or expand the sidebar" },
  { keys: "↑ ↓", desc: "Move through results" },
  { keys: "Enter", desc: "Open the selected result" },
  { keys: "Esc", desc: "Close a dialog or panel" },
];

const COLLAPSE_KEY = "starlane_sidebar_collapsed";

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const pathname = usePathname();
  // Keeps the user's colour identity (--id-* CSS variables) on :root.
  useApplyIdentity();

  useEffect(() => { setIsDemo(isDemoMode()); }, []);

  // The rail starts collapsed on narrow windows (the desktop app's 960px
  // minimum) unless the person chose otherwise.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(COLLAPSE_KEY); } catch { /* per-browser nicety */ }
    setCollapsed(saved === null ? window.innerWidth < 1100 : saved === "1");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      try { window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* per-browser nicety */ }
      return !c;
    });
  }, []);

  // Ctrl/Cmd+K opens search anywhere; Ctrl/Cmd+\ folds the rail.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(true); }
      else if (e.key === "\\") { e.preventDefault(); toggleCollapsed(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  // Cards with .hover-lift carry a soft light that follows the cursor; this
  // one listener feeds it the pointer position. Fine pointers only.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".hover-lift") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  // Real working-memory: record the page actually visited, keyed off the
  // same pageTitle every screen already passes in. No server-side activity
  // log exists yet, so this is client-recorded — real navigation history,
  // not a fabricated "recent activity" feed.
  useEffect(() => { recordRecent(pathname, pageTitle); }, [pathname, pageTitle]);

  // Hydrate feature-gating context from DB on every app load
  // This ensures cross-device correctness — localStorage may be stale or empty
  useEffect(() => {
    if (!isLoggedIn()) return;
    api.auth.me()
      .then(d => {
        if (d.user) {
          // Persist updated user (plan may have changed on another device too)
          localStorage.setItem("vantro_user", JSON.stringify(d.user));
          hydrateUserContext(d.user);
        }
      })
      .catch(() => {}); // silently fail — offline is fine
  }, []);

  // Register service worker for PWA / offline support — production only.
  // The SW's fetch handler caches JS chunks cache-first with no
  // revalidation (see public/sw.js), which is safe in production only
  // because Next.js content-hashes chunk filenames there — a changed file
  // gets a new URL, so the cache naturally busts. In dev, chunk filenames
  // stay stable across rebuilds, so a dev-mode SW install permanently
  // serves stale JS after every code change until someone manually clears
  // it, surfacing as "Cannot read properties of undefined" runtime errors
  // that have nothing to do with the actual app code. Also proactively
  // unregisters any SW a previous dev session may have already installed.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  }, []);

  // Push notification permission request — show banner once if not yet granted
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Wait 45 seconds before nudging — let user settle in first
      const t = setTimeout(() => setShowNotifBanner(true), 45000);
      return () => clearTimeout(t);
    }
    if (Notification.permission === "granted") {
      // Auto-subscribe in background
      if (isLoggedIn()) subscribeToPush();
    }
  }, []);

  const handleEnableNotifications = async () => {
    setShowNotifBanner(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      if (isLoggedIn()) subscribeToPush();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onSearch={() => { setSidebarOpen(false); setPaletteOpen(true); }}
        onShortcuts={() => setShortcutsOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar pageTitle={pageTitle} onMenu={() => setSidebarOpen(true)} onSearch={() => setPaletteOpen(true)} />

        {/* Demo notice: a quiet strip, sentence case, never alarming. */}
        {isDemo && (
          <div className="flex items-center justify-between gap-3 px-5 shrink-0" style={{ height: 34, background: "var(--surface-2)", borderBottom: "1px solid var(--line)" }}>
            <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--ink-2)" }}>
              <IconInfo size={13} />
              Sample data for a demonstration, not your business
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/signup" onClick={() => exitDemoMode()} className="text-xs font-medium" style={{ color: "var(--ink)" }}>
                Sign up to use your own data
              </Link>
              <button onClick={() => { exitDemoMode(); window.location.href = "/login"; }} className="text-xs" style={{ color: "var(--ink-2)" }}>
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Push notification permission banner */}
        {showNotifBanner && !isDemo && (
          <div className="px-5 flex items-center justify-between gap-3 shrink-0" style={{ height: 40, background: "var(--surface)", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
            <span style={{ color: "var(--body)" }}>Get a notification the moment a payment lands.</span>
            <div className="flex gap-1 shrink-0">
              <button onClick={handleEnableNotifications} className="ui-btn ui-btn-primary ui-btn-sm">Enable</button>
              <button onClick={() => setShowNotifBanner(false)} className="ui-btn ui-btn-ghost ui-btn-sm">Later</button>
            </div>
          </div>
        )}

        <main id="main" className="app-main v32-main">
          <div key={pathname} className="v32-wrap page-in">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} routes={SEARCHABLE} />

      <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard shortcuts" footer={<button className="ui-btn ui-btn-secondary" onClick={() => setShortcutsOpen(false)}>Close</button>}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          {SHORTCUTS.map(k => (
            <div key={k.keys} className="flex items-center justify-between" style={{ fontSize: 13 }}>
              <span style={{ color: "var(--ink-2)" }}>{k.desc}</span>
              <kbd className="kbd">{k.keys}</kbd>
            </div>
          ))}
        </div>
      </Modal>

      <InstallPrompt />
      {!isDemo && <PaymentCelebration />}
    </div>
  );
}

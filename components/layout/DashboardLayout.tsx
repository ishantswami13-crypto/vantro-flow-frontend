"use client";

import { useState, useEffect } from "react";
import { FiInfo } from "react-icons/fi";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import PaymentCelebration from "@/components/PaymentCelebration";
import { usePathname } from "next/navigation";
import { isDemoMode, exitDemoMode } from "@/lib/demo";
import { hydrateUserContext } from "@/lib/featureGating";
import { api, authenticatedFetch } from "@/lib/api";
import { recordRecent } from "@/lib/recents";
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
        headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (err) {
    // Silently fail — push is a nice-to-have
    console.warn("Push subscription failed:", err);
  }
}

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setIsDemo(isDemoMode()); }, []);

  // Real working-memory: record the page actually visited, keyed off the
  // same pageTitle every screen already passes in. No server-side activity
  // log exists yet, so this is client-recorded — real navigation history,
  // not a fabricated "recent activity" feed.
  useEffect(() => { recordRecent(pathname, pageTitle); }, [pathname, pageTitle]);

  // Hydrate feature-gating context from DB on every app load
  // This ensures cross-device correctness — localStorage may be stale or empty
  useEffect(() => {
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
      subscribeToPush();
    }
  }, []);

  const handleEnableNotifications = async () => {
    setShowNotifBanner(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      subscribeToPush();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(true)} pageTitle={pageTitle} />

        {/* Demo mode notice — a quiet horizontal disclosure strip, not an
            all-caps terminal-style alert. Truthful, low-key, sentence case. */}
        {isDemo && (
          <div className="flex items-center justify-between gap-3 px-4 py-1.5 shrink-0" style={{ background: "#FAFAF8", borderBottom: "1px solid #EDEDE9" }}>
            <span className="text-xs flex items-center gap-1.5" style={{ color: "#8A8A86" }}>
              <FiInfo size={11} />
              Simulated demonstration — sample data, not your business
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/signup"
                onClick={() => exitDemoMode()}
                className="text-xs font-medium transition-colors"
                style={{ color: "#686868" }}>
                Sign up to save real data →
              </Link>
              <button onClick={() => { exitDemoMode(); window.location.href = "/login"; }}
                className="text-xs transition-colors" style={{ color: "#8A8A86" }}>
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Push notification permission banner */}
        {showNotifBanner && !isDemo && (
          <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 flex items-center justify-between gap-3 text-sm shrink-0">
            <span className="text-accent font-medium">
              Payment milte hi notification aayega — abhi enable karein
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleEnableNotifications}
                className="bg-white text-black px-3 py-1 rounded-lg text-xs font-semibold hover:bg-white/90"
              >
                Enable
              </button>
              <button
                onClick={() => setShowNotifBanner(false)}
                className="text-muted px-2 py-1 text-xs hover:text-primary"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* pb-20 on mobile to clear bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 pb-24 lg:pb-5 page-fade">
          {children}
        </main>
      </div>

      <BottomNav onMenuToggle={() => setSidebarOpen(true)} />
      <InstallPrompt />
      {!isDemo && <PaymentCelebration />}
    </div>
  );
}

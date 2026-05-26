"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";
import PaymentCelebration from "@/components/PaymentCelebration";
import { isDemoMode, exitDemoMode } from "@/lib/demo";
import { hydrateUserContext } from "@/lib/featureGating";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

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

async function subscribeToPush(token: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Get VAPID public key from backend
    const keyRes = await fetch(`${API}/api/notifications/vapid-key`);
    const keyData = await keyRes.json();
    if (!keyData.success || !keyData.publicKey) return; // not configured

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — just re-send to backend in case it changed
      await fetch(`${API}/api/notifications/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: existing.toJSON() }),
      });
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });

    await fetch(`${API}/api/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  useEffect(() => { setIsDemo(isDemoMode()); }, []);

  // Hydrate feature-gating context from DB on every app load
  // This ensures cross-device correctness — localStorage may be stale or empty
  useEffect(() => {
    const token = localStorage.getItem("vantro_token");
    if (!token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.user) {
          // Persist updated user (plan may have changed on another device too)
          localStorage.setItem("vantro_user", JSON.stringify(d.user));
          hydrateUserContext(d.user);
        }
      })
      .catch(() => {}); // silently fail — offline is fine
  }, []);

  // Register service worker for PWA / offline support
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
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
      const token = localStorage.getItem("vantro_token");
      if (token) subscribeToPush(token);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setShowNotifBanner(false);
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = localStorage.getItem("vantro_token");
      if (token) subscribeToPush(token);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(true)} pageTitle={pageTitle} />

        {/* Demo mode banner */}
        {isDemo && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between gap-3 text-sm shrink-0">
            <span className="text-yellow-400 font-medium text-xs">
              👀 Demo Mode — You're exploring Vantro with sample data. Sign up to save real data.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/signup"
                onClick={() => exitDemoMode()}
                className="bg-yellow-500 text-black px-3 py-1 rounded-lg text-xs font-bold hover:bg-yellow-400 transition-colors">
                Sign Up Free
              </Link>
              <button onClick={() => { exitDemoMode(); window.location.href = "/login"; }}
                className="text-yellow-500/60 text-xs hover:text-yellow-400 transition-colors">
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
                className="text-text-muted px-2 py-1 text-xs hover:text-text"
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

      <BottomNav />
      <InstallPrompt />
      {!isDemo && <PaymentCelebration />}
    </div>
  );
}

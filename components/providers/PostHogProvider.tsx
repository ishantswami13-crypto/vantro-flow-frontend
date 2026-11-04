"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getUser } from "@/lib/api";

type PostHogModule = typeof import("@/lib/posthog");

// Analytics load after the page is interactive, and only when a key is
// configured, so posthog-js stays out of the bundle every page downloads
// first (it was most of the public site's unused JavaScript).
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ph = useRef<PostHogModule | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    let cancelled = false;
    const load = () => import("@/lib/posthog").then((mod) => {
      if (cancelled) return;
      mod.initPostHog();
      ph.current = mod;

      // Identify logged-in user as soon as analytics is ready
      const user = getUser();
      if (user?.id) {
        mod.posthog.identify(user.id, {
          email:         user.email,
          name:          user.business_name,
          plan:          user.plan,
          phone:         user.phone,
          created_at:    user.created_at,
        });
      }
      mod.posthog.capture("$pageview", { $current_url: window.location.href });
    });
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(load, { timeout: 3000 }); else setTimeout(load, 1500);
    return () => { cancelled = true; };
  }, []);

  // Track every later page navigation
  useEffect(() => {
    const mod = ph.current;
    if (!mod?.posthog.__loaded) return;
    mod.posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}

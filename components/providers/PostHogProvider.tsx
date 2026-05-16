"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initPostHog, posthog } from "@/lib/posthog";
import { getUser } from "@/lib/api";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initPostHog();

    // Identify logged-in user immediately on mount
    const user = getUser();
    if (user?.id) {
      posthog.identify(user.id, {
        email:         user.email,
        name:          user.business_name,
        plan:          user.plan,
        phone:         user.phone,
        created_at:    user.created_at,
      });
    }
  }, []);

  // Track every page navigation
  useEffect(() => {
    if (!posthog.__loaded) return;
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}

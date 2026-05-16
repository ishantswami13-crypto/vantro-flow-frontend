import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,   // manual, so we can include page title
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,     // hide passwords/sensitive text in recordings
      maskInputOptions: { password: true },
    },
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") ph.debug();
    },
  });
}

export { posthog };

"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { api, isLoggedIn } from "@/lib/api";
import { applyCachedRegion, getRegion, onRegionChange, setRegion, type Region } from "@/lib/locale";

// useLayoutEffect warns during server render; on the server nothing runs anyway.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * The business's region, re-rendering when it changes. Use it in components
 * that write a currency symbol or tax label outside fetched data (input
 * labels, placeholders).
 */
export function useRegion(): Region {
  const [r, setR] = useState<Region>(getRegion);
  useIsoLayoutEffect(() => {
    applyCachedRegion();
    setR(getRegion());
    return onRegionChange(setR);
  }, []);
  return r;
}

/**
 * Keeps the region current for the signed-in app. Applies this device's
 * cached region before data loads, then asks the backend. Returns a number
 * that changes only when the backend's region differs from what the page
 * already rendered with, so the layout can re-mount the page once.
 */
export function useRegionSync(): number {
  const [version, setVersion] = useState(0);
  useIsoLayoutEffect(() => { applyCachedRegion(); }, []);
  useEffect(() => {
    const off = onRegionChange(() => setVersion((v) => v + 1));
    if (isLoggedIn()) {
      api.region.get()
        .then(({ region }) => { setRegion(region); })
        .catch(() => { /* offline or older backend: keep the cached region */ });
    }
    return off;
  }, []);
  return version;
}

// One shared, short-lived read of the Bridge for the shell on every page:
// how fresh the business data is and how many things need a person.
// Real numbers only; null when it can't be read (the shell then shows nothing).

import { request, isLoggedIn } from "@/lib/api";
import type { BridgeView } from "../packages/contracts/src/features";

export type Pulse = {
  freshness: BridgeView["freshness"];
  dataAsOf: string | null;
  source: string | null;
  needs: number;
};

let cache: { at: number; value: Pulse | null } | null = null;
let inflight: Promise<Pulse | null> | null = null;

export function loadPulse(): Promise<Pulse | null> {
  if (typeof window === "undefined" || !isLoggedIn()) return Promise.resolve(null);
  if (cache && Date.now() - cache.at < 60_000) return Promise.resolve(cache.value);
  if (inflight) return inflight;
  inflight = request<BridgeView>("/api/client/bridge")
    .then((b) => {
      const src = b.sources.find((s) => s.lastSuccessAt) || b.sources[0] || null;
      const value: Pulse = {
        freshness: b.freshness,
        dataAsOf: b.dataAsOf || src?.lastSuccessAt || null,
        source: src?.name || null,
        needs: (b.attention?.watch?.urgent || 0) + (b.attention?.decisions || 0),
      };
      cache = { at: Date.now(), value };
      return value;
    })
    .catch(() => { cache = { at: Date.now(), value: null }; return null; })
    .finally(() => { inflight = null; });
  return inflight;
}

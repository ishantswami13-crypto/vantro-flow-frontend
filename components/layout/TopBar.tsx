"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FiMenu } from "react-icons/fi";
import { request, isLoggedIn } from "@/lib/api";
import { isDemoMode } from "@/lib/demo";
import { IconSearch, IconBell } from "@/components/v32/icons";
import { openCommandPalette } from "./Sidebar";
import type { BridgeView } from "../../packages/contracts/src/features";

// One shared, short-lived read of the Bridge for the top bar on every page:
// how fresh the business data is and how many things need a person.
type Pulse = { freshness: BridgeView["freshness"]; dataAsOf: string | null; source: string | null; health: string | null; needs: number };
let cache: { at: number; value: Pulse | null } | null = null;
let inflight: Promise<Pulse | null> | null = null;

function loadPulse(): Promise<Pulse | null> {
  if (cache && Date.now() - cache.at < 60_000) return Promise.resolve(cache.value);
  if (inflight) return inflight;
  inflight = request<BridgeView>("/api/client/bridge")
    .then((b) => {
      const src = b.sources.find((s) => s.lastSuccessAt) || b.sources[0] || null;
      const value: Pulse = {
        freshness: b.freshness,
        dataAsOf: b.dataAsOf || src?.lastSuccessAt || null,
        source: src?.name || null,
        health: src?.health || null,
        needs: (b.attention.watch.urgent || 0) + (b.attention.decisions || 0),
      };
      cache = { at: Date.now(), value };
      return value;
    })
    .catch(() => { cache = { at: Date.now(), value: null }; return null; })
    .finally(() => { inflight = null; });
  return inflight;
}

export function ago(iso: string | null): string | null {
  if (!iso) return null;
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s)) return null;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

const FRESH: Record<string, { tone: string; word: string }> = {
  fresh: { tone: "success", word: "Live" },
  delayed: { tone: "warning", word: "Delayed" },
  stale: { tone: "danger", word: "Stale" },
  none: { tone: "neutral", word: "No source" },
};

export default function TopBar({ onMenuToggle, pageTitle }: { onMenuToggle: () => void; pageTitle?: string }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [mac, setMac] = useState(false);
  // The Bridge states freshness in its own header; do not say it twice.
  const onBridge = usePathname() === "/bridge";

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    if (!isLoggedIn() || isDemoMode()) return;
    let live = true;
    loadPulse().then((p) => { if (live) setPulse(p); });
    return () => { live = false; };
  }, []);

  const f = pulse ? FRESH[pulse.freshness] || FRESH.none : null;
  const when = pulse ? ago(pulse.dataAsOf) : null;

  return (
    <header className="sl-topbar">
      <button onClick={onMenuToggle} className="lg:hidden sl-icon-btn" aria-label="Open menu"><FiMenu size={16} /></button>
      <p className="sl-topbar-title truncate">{pageTitle}</p>

      <button onClick={openCommandPalette} className="sl-search-trigger" aria-label="Search Starlane">
        <IconSearch size={13} />
        <span className="flex-1 text-left truncate">Search or jump to…</span>
        <kbd className="sl-kbd hidden sm:inline">{mac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      <div className="flex items-center gap-1.5 shrink-0">
        {f && !onBridge && (
          <Link
            href="/sources"
            className={`sl-chip sl-chip--${f.tone}`}
            title={pulse?.dataAsOf ? `Business data as of ${new Date(pulse.dataAsOf).toLocaleString("en-IN")}` : "No source has synced yet"}
          >
            <span className="sl-dot" aria-hidden="true" />
            <span className="hidden md:inline">{pulse?.source ? `${pulse.source} · ` : ""}</span>
            {f.word}{when && pulse?.freshness !== "none" ? ` · ${when}` : ""}
          </Link>
        )}
        <Link href="/prepared" className="sl-icon-btn relative" aria-label={pulse?.needs ? `${pulse.needs} need you` : "Prepared"} title={pulse?.needs ? `${pulse.needs} need you` : "Nothing needs you"}>
          <IconBell size={15} />
          {pulse && pulse.needs > 0 && <span className="sl-badge">{pulse.needs > 9 ? "9+" : pulse.needs}</span>}
        </Link>
      </div>
    </header>
  );
}

import type React from "react";
import {
  IconBridge, IconScan, IconDiscover, IconWatch, IconMissions, IconSimulate,
  IconMemory, IconPrepared, IconSources, IconAgents, IconControl, IconSettings,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
}

// Primary nav — the Version 32 NAV_ITEMS, in the design's exact order
// (Starlane.html / STARLANE_FRONTEND_HANDOFF.md §2).
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",   label: "The Bridge", icon: IconBridge },
  { href: "/scan",     label: "Scan",       icon: IconScan },
  { href: "/discover", label: "Discover",   icon: IconDiscover },
  { href: "/watch",    label: "Watch",      icon: IconWatch },
  { href: "/missions", label: "Missions",   icon: IconMissions },
  { href: "/simulate", label: "Simulate",   icon: IconSimulate },
  { href: "/memory",   label: "Memory",     icon: IconMemory },
  { href: "/prepared", label: "Prepared",   icon: IconPrepared },
];

// Second group: Sources, Agents and Control are real pages in the design but
// are not in NAV_ITEMS (handoff §2 open gap). Resolved with option (a): a
// quiet second group below a divider, so those pages still highlight.
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/sources",  label: "Sources",  icon: IconSources },
  { href: "/agents",   label: "Agents",   icon: IconAgents },
  { href: "/control",  label: "Control",  icon: IconControl },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

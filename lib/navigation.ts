import type React from "react";
import {
  IconBridge, IconScan, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconDiscover, IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconSettings,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
}

// Primary nav: six places, the way Harvey keeps a few tools plus History and
// Library in its sidebar. Everything else stays one click away under More.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",       label: "The Bridge", icon: IconBridge },
  { href: "/scan",         label: "Scan",       icon: IconScan },
  { href: "/watch",        label: "Watch",      icon: IconWatch },
  { href: "/missions",     label: "Missions",   icon: IconMissions },
  { href: "/library",      label: "Library",    icon: IconLibrary },
  { href: "/scan/history", label: "History",    icon: IconHistory },
];

// The rest of the Version 32 pages, first in the More flyout. They keep
// their icons so the flyout reads like the rail.
export const V32_WORKSPACE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/discover", label: "Discover", icon: IconDiscover },
  { href: "/prepared", label: "Prepared", icon: IconPrepared },
  { href: "/simulate", label: "Simulate", icon: IconSimulate },
  { href: "/memory",   label: "Memory",   icon: IconMemory },
  { href: "/sources",  label: "Sources",  icon: IconSources },
  { href: "/agents",   label: "Agents",   icon: IconAgents },
  { href: "/control",  label: "Control",  icon: IconControl },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

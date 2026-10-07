import type React from "react";
import {
  IconBridge, IconScan, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconDiscover, IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconSettings, IconAudit,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
  /** Shortcut digit for Ctrl/Cmd+1..7 on the primary surfaces. */
  key?: string;
}

// The seven surfaces Starlane is built around, in the order work flows:
// connect reality, read it, watch it, try options, decide, act, remember.
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { href: "/bridge",   label: "Bridge",   icon: IconBridge,   key: "1" },
  { href: "/scan",     label: "Scan",     icon: IconScan,     key: "2" },
  { href: "/watch",    label: "Watch",    icon: IconWatch,    key: "3" },
  { href: "/simulate", label: "Simulate", icon: IconSimulate, key: "4" },
  { href: "/prepared", label: "Prepared", icon: IconPrepared, key: "5" },
  { href: "/missions", label: "Missions", icon: IconMissions, key: "6" },
  { href: "/memory",   label: "Memory",   icon: IconMemory,   key: "7" },
];

// How Starlane is run: who works, what it reads, what it may do, what it did.
export const OPERATE_NAV: PrimaryNavItem[] = [
  { href: "/agents",        label: "Agents",   icon: IconAgents },
  { href: "/sources",       label: "Sources",  icon: IconSources },
  { href: "/control",       label: "Control",  icon: IconControl },
  { href: "/control/audit", label: "Audit",    icon: IconAudit },
  { href: "/settings",      label: "Settings", icon: IconSettings },
];

// Scan's own pages, reachable from Scan and the command palette.
export const SCAN_NAV: PrimaryNavItem[] = [
  { href: "/library",      label: "Library",  icon: IconLibrary },
  { href: "/scan/history", label: "History",  icon: IconHistory },
  { href: "/discover",     label: "Discover", icon: IconDiscover },
];

// Kept for older imports.
export const V32_NAV_ITEMS = PRIMARY_NAV;
export const V32_WORKSPACE_NAV_ITEMS = [...SCAN_NAV, ...OPERATE_NAV];

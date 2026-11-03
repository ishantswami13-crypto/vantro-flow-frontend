import type React from "react";
import {
  IconBridge, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconDiscover, IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconDecision, IconChart,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
}

// The rail follows Harvey's layout: a short top group (New question sits
// above it in the sidebar and is Home), then Apps, Recents and Workspace.
// Routes are unchanged; only where they sit is.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/prepared",  label: "Approvals",  icon: IconPrepared },
  { href: "/decisions", label: "Decisions",  icon: IconDecision },
  { href: "/command",   label: "Command Center", icon: IconChart },
];

// What Starlane keeps running, like Harvey's "Apps".
export const V32_APPS_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/watch",    label: "Monitors",  icon: IconWatch },
  { href: "/missions", label: "Tasks",     icon: IconMissions },
  { href: "/simulate", label: "Scenarios", icon: IconSimulate },
];

// Reference material, like Harvey's "Spaces".
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/library",      label: "Library",      icon: IconLibrary },
  { href: "/sources",      label: "Data sources", icon: IconSources },
];

export const HISTORY_NAV_ITEM: PrimaryNavItem = { href: "/scan/history", label: "View history", icon: IconHistory };
export const HOME_NAV_ITEM: PrimaryNavItem = { href: "/bridge", label: "Home", icon: IconBridge };

// The rest of the workspace, first in the "All tools" flyout.
export const V32_WORKSPACE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/discover", label: "Discover", icon: IconDiscover },
  { href: "/memory",   label: "Memory",   icon: IconMemory },
  { href: "/agents",   label: "Agents",   icon: IconAgents },
  { href: "/control",  label: "Controls", icon: IconControl },
];

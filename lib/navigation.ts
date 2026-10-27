import type React from "react";
import {
  IconBridge, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconDiscover, IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconDecision,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
}

// Primary nav, in plain words: where you ask (Home, the chat), what
// is waiting on a person (Approvals, Decisions) and what Starlane keeps
// running (Monitors, Tasks). Routes are unchanged; only the names are.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",    label: "Home",       icon: IconBridge },
  { href: "/prepared",  label: "Approvals",  icon: IconPrepared },
  { href: "/decisions", label: "Decisions",  icon: IconDecision },
  { href: "/watch",     label: "Monitors",   icon: IconWatch },
  { href: "/missions",  label: "Tasks",      icon: IconMissions },
];

// Reference material and tools, in a second, quieter group.
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/simulate",     label: "Scenarios",    icon: IconSimulate },
  { href: "/library",      label: "Library",      icon: IconLibrary },
  { href: "/scan/history", label: "History",      icon: IconHistory },
  { href: "/sources",      label: "Data sources", icon: IconSources },
];

// The rest of the workspace, first in the "All tools" flyout.
export const V32_WORKSPACE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/discover", label: "Discover", icon: IconDiscover },
  { href: "/memory",   label: "Memory",   icon: IconMemory },
  { href: "/agents",   label: "Agents",   icon: IconAgents },
  { href: "/control",  label: "Controls", icon: IconControl },
];

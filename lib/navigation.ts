import type React from "react";
import {
  IconBridge, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconDiscover, IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconDecision, IconChart, IconBank,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
}

// The rail follows the product view on the public site: a short top group
// (New question sits above it and is Home), then Apps, Recents and Spaces,
// with everything else under More. Routes are unchanged; only where they sit.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/agents",  label: "Agents",         icon: IconAgents },
  { href: "/library", label: "Vault",          icon: IconLibrary },
  { href: "/command", label: "Command Center", icon: IconChart },
];

// The working apps, like the site's "Collections Intelligence".
export const V32_APPS_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/review",    label: "Receivables Review", icon: IconChart },
  { href: "/decisions", label: "Decisions", icon: IconDecision },
  { href: "/prepared",  label: "Approvals", icon: IconPrepared },
  { href: "/watch",     label: "Monitors",  icon: IconWatch },
  { href: "/reconcile", label: "Bank matching", icon: IconBank },
];

// Under Spaces, after the business itself.
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/sources", label: "Data sources", icon: IconSources },
];

export const HISTORY_NAV_ITEM: PrimaryNavItem = { href: "/scan/history", label: "View history", icon: IconHistory };
export const HOME_NAV_ITEM: PrimaryNavItem = { href: "/bridge", label: "Home", icon: IconBridge };

// The rest of the workspace, first in the "All tools" flyout.
export const V32_WORKSPACE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/missions",  label: "Tasks",     icon: IconMissions },
  { href: "/workflows", label: "Workflows", icon: IconAgents },
  { href: "/simulate",  label: "Scenarios", icon: IconSimulate },
  { href: "/discover",  label: "Discover",  icon: IconDiscover },
  { href: "/memory",    label: "Memory",    icon: IconMemory },
  { href: "/control",   label: "Controls",  icon: IconControl },
];

import type React from "react";
import {
  IconBridge, IconScan, IconWatch, IconMissions, IconLibrary, IconHistory,
  IconPrepared, IconSimulate, IconMemory, IconSources, IconAgents, IconControl, IconSettings,
  IconAudit, IconUsers, IconInvoice, IconChart, IconBox, IconRupee,
} from "@/components/v32/icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: (p: { size?: number; className?: string; style?: React.CSSProperties }) => React.ReactElement;
  /** Extra path prefixes that light this item up (e.g. /decisions under Prepared). */
  also?: string[];
}

// The seven surfaces: how Starlane sees, checks, tries, prepares, acts and
// remembers. They are the whole primary navigation.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",   label: "Bridge",   icon: IconBridge },
  { href: "/scan",     label: "Scan",     icon: IconScan },
  { href: "/watch",    label: "Watch",    icon: IconWatch },
  { href: "/simulate", label: "Simulate", icon: IconSimulate },
  { href: "/prepared", label: "Prepared", icon: IconPrepared, also: ["/decisions"] },
  { href: "/missions", label: "Missions", icon: IconMissions },
  { href: "/memory",   label: "Memory",   icon: IconMemory },
];

// The workspace: who works for you, where data comes from, the rules,
// the record and your account.
export const V32_WORKSPACE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/agents",        label: "Agents",   icon: IconAgents },
  { href: "/sources",       label: "Sources",  icon: IconSources },
  { href: "/control",       label: "Control",  icon: IconControl },
  { href: "/control/audit", label: "Audit",    icon: IconAudit },
  { href: "/settings",      label: "Settings", icon: IconSettings },
];

// "More": the handful of business pages people still reach for. Every other
// older page stays reachable by its link and from Ctrl+K, but is off the rail.
export const MORE_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/collections",  label: "Collections",   icon: IconRupee },
  { href: "/customers",    label: "Customers",     icon: IconUsers },
  { href: "/bills",        label: "Invoices",      icon: IconInvoice },
  { href: "/forecast",     label: "Cash forecast", icon: IconChart },
  { href: "/inventory",    label: "Inventory",     icon: IconBox },
  { href: "/reports",      label: "Reports",       icon: IconChart },
  { href: "/library",      label: "Library",       icon: IconLibrary },
  { href: "/scan/history", label: "History",       icon: IconHistory },
];

// Older pages: not on the rail, still searchable from Ctrl+K.
export const OTHER_PAGES: { href: string; label: string }[] = [
  { href: "/discover",       label: "Discover" },
  { href: "/today",          label: "Today" },
  { href: "/business-state", label: "Business state" },
  { href: "/dashboard",      label: "Overview" },
  { href: "/suppliers",      label: "Suppliers" },
  { href: "/invoice/new",    label: "New invoice" },
  { href: "/bank",           label: "Bank monitor" },
  { href: "/ledger",         label: "Bank ledger" },
  { href: "/bad-debt",       label: "Bad debt radar" },
  { href: "/khata",          label: "Customer khata" },
  { href: "/sales",          label: "Sales" },
  { href: "/purchases",      label: "Purchases" },
  { href: "/orders",         label: "Today's orders" },
  { href: "/scanner",        label: "Invoice scanner" },
  { href: "/attendance",     label: "Staff attendance" },
  { href: "/team",           label: "Team" },
  { href: "/whatsapp",       label: "WhatsApp" },
  { href: "/dunning",        label: "Auto follow-up" },
  { href: "/ai-actions",     label: "Action center" },
  { href: "/brain",          label: "Starlane brain" },
  { href: "/analytics",      label: "Analytics" },
  { href: "/billing",        label: "Billing" },
];

/** Is `href` the active nav item for `pathname`? The most specific item wins,
 *  so /control/audit lights Audit, not Control, and /scan/history lights History. */
export function activeHref(pathname: string, items: { href: string; also?: string[] }[]): string | null {
  let best: string | null = null;
  let bestLen = -1;
  for (const it of items) {
    for (const h of [it.href, ...(it.also || [])]) {
      if ((pathname === h || pathname.startsWith(h + "/")) && h.length > bestLen) {
        best = it.href;
        bestLen = h.length;
      }
    }
  }
  return best;
}

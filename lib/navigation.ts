import {
  FiGlobe, FiDatabase, FiShield, FiCompass, FiSearch, FiEye, FiTarget,
  FiSliders, FiClock, FiCheckSquare, FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: IconType;
}

// The single source of truth for Starlane's primary information
// architecture. Both the desktop Sidebar and the mobile BottomNav render
// their primary nav from this same array — previously each maintained
// its own copy, which is exactly how the BottomNav drifted out of sync
// with the sidebar's real IA in the first place (see git history: the
// old BottomNav pointed at /dashboard, /collections, /whatsapp, /ai-chat,
// none of which are part of the product's real navigation anymore).
//
// KEPT AS-IS for the mobile BottomNav (see BottomNav.tsx) — a 3-item
// compact IA is what fits a bottom tab bar. The desktop Sidebar's primary
// nav now renders V32_NAV_ITEMS instead (see below); redesigning the
// mobile bottom nav to the 8-item V32 IA is out of scope for this pass
// and flagged for the next phase.
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { href: "/intelligence", label: "Intelligence", icon: FiGlobe },
  { href: "/sources",      label: "Sources",      icon: FiDatabase },
  { href: "/control",      label: "Control",      icon: FiShield },
];

// Starlane Version 32 (frozen design) primary nav — see
// STARLANE_FRONTEND_HANDOFF.md §2 NAV_ITEMS, in exact order. Bridge/Scan/
// Discover/Watch/Missions/Simulate/Memory/Prepared are Phase 3/4 page
// content (out of scope this pass) — each route currently renders a thin
// honest "not built yet" stub (see app/<route>/page.tsx) rather than
// 404ing, so the sidebar is fully clickable today.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",   label: "The Bridge", icon: FiCompass },
  { href: "/scan",     label: "Scan",       icon: FiSearch },
  { href: "/discover", label: "Discover",   icon: FiEye },
  { href: "/watch",    label: "Watch",      icon: FiTarget },
  { href: "/missions", label: "Missions",   icon: FiCheckSquare },
  { href: "/simulate", label: "Simulate",   icon: FiSliders },
  { href: "/memory",   label: "Memory",     icon: FiClock },
  { href: "/prepared", label: "Prepared",   icon: FiCheckSquare },
];

// Second nav group (handoff §2 "open architecture gap"): Sources, Agents,
// and Control are real pages that were reachable with no sidebar row ever
// highlighting, per the handoff's explicit callout. Resolved here via
// option (a) from the handoff: a labelled second group below a divider.
// Label chosen: "ENTERPRISE" (uppercase small-caps, matching the V32
// section-label style) — these three surfaces are org-wide/governance
// concerns rather than day-to-day investigation work, which is what the
// 8 V32_NAV_ITEMS above are for.
export const V32_SECONDARY_NAV_LABEL = "ENTERPRISE";
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/sources", label: "Sources", icon: FiDatabase },
  { href: "/agents",  label: "Agents",  icon: FiUsers },
  { href: "/control", label: "Control", icon: FiShield },
];

// Shared active-route check: exact match, or a sub-route of a primary
// item (e.g. /intelligence/abc123 is still "Intelligence" active).
export function isPrimaryNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

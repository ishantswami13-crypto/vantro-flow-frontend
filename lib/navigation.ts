import {
  FiDatabase, FiShield, FiCompass, FiSearch, FiEye, FiTarget,
  FiSliders, FiClock, FiCheckSquare, FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: IconType;
}

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

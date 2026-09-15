import { FiGlobe, FiDatabase, FiShield } from "react-icons/fi";
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
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { href: "/intelligence", label: "Intelligence", icon: FiGlobe },
  { href: "/connections",  label: "Sources",      icon: FiDatabase },
  { href: "/control",      label: "Control",      icon: FiShield },
];

// Shared active-route check: exact match, or a sub-route of a primary
// item (e.g. /intelligence/abc123 is still "Intelligence" active).
export function isPrimaryNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

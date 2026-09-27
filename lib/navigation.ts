import {
  FiDatabase, FiCompass, FiSearch, FiEye, FiTarget,
  FiSliders, FiClock, FiCheckSquare, FiSettings,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: IconType;
}

// Starlane is seven features — the same seven, in the same order, as the
// desktop and phone apps. Discover, Agents and Control are no longer in the
// sidebar (their pages still answer at their URLs); what was useful in them
// lives in Watch, Missions and Sources.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/bridge",   label: "The Bridge", icon: FiCompass },
  { href: "/scan",     label: "Scan",       icon: FiSearch },
  { href: "/watch",    label: "Watch",      icon: FiEye },
  { href: "/missions", label: "Missions",   icon: FiTarget },
  { href: "/simulate", label: "Simulate",   icon: FiSliders },
  { href: "/memory",   label: "Memory",     icon: FiClock },
  { href: "/prepared", label: "Prepared",   icon: FiCheckSquare },
];

// Utilities, not features.
export const V32_SECONDARY_NAV_LABEL = "UTILITIES";
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/sources",  label: "Sources",  icon: FiDatabase },
  { href: "/settings", label: "Settings", icon: FiSettings },
];

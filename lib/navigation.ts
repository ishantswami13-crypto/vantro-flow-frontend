import {
  FiDatabase, FiShield, FiCompass, FiSearch, FiTarget, FiSettings,
  FiSliders, FiClock, FiCheckSquare, FiUsers, FiSun, FiGitBranch,
} from "react-icons/fi";
import type { IconType } from "react-icons";

export interface PrimaryNavItem {
  href: string;
  label: string;
  icon: IconType;
}

// Primary nav: Today, then the seven surfaces in the order of the loop
// (Bridge -> Scan -> Watch -> Simulate -> Prepared -> Missions -> Memory).
// Each surface answers one question. Decisions live inside Prepared (the
// queue of things that need a person) and open at /decisions/[id];
// Discover (supplier and customer lenses) is under More.
export const V32_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/today",    label: "Today",      icon: FiSun },
  { href: "/bridge",   label: "Bridge",     icon: FiCompass },
  { href: "/scan",     label: "Scan",       icon: FiSearch },
  { href: "/watch",    label: "Watch",      icon: FiTarget },
  { href: "/simulate", label: "Simulate",   icon: FiSliders },
  { href: "/prepared", label: "Prepared",   icon: FiCheckSquare },
  { href: "/missions", label: "Missions",   icon: FiGitBranch },
  { href: "/memory",   label: "Memory",     icon: FiClock },
];

// Second group: org-wide and governance surfaces (connected systems, the
// agents that work for the company, controls and approvals), then settings.
export const V32_SECONDARY_NAV_LABEL = "ENTERPRISE";
export const V32_SECONDARY_NAV_ITEMS: PrimaryNavItem[] = [
  { href: "/sources",  label: "Sources",  icon: FiDatabase },
  { href: "/agents",   label: "Agents",   icon: FiUsers },
  { href: "/control",  label: "Control",  icon: FiShield },
  { href: "/settings", label: "Settings", icon: FiSettings },
];

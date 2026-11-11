// Pinned pages for the sidebar, like "Pinned" on the public site's product
// views. Kept in this browser per signed-in user: there is no server-side
// store for pins yet, so they do not follow you to another device.

import { getUser } from "@/lib/api";

export type Pin = { href: string; label: string; at: string };
export const PINS_EVENT = "starlane:pins";
const MAX = 12;

function key(): string | null {
  const id = getUser()?.id;
  return id ? `starlane_pins:${id}` : null;
}

export function listPins(): Pin[] {
  if (typeof window === "undefined") return [];
  const k = key(); if (!k) return [];
  try {
    const v = JSON.parse(localStorage.getItem(k) || "[]");
    return Array.isArray(v) ? v.filter((p) => p && typeof p.href === "string" && p.href.startsWith("/") && typeof p.label === "string") : [];
  } catch { return []; }
}

function save(pins: Pin[]) {
  const k = key(); if (!k) return;
  try { localStorage.setItem(k, JSON.stringify(pins.slice(0, MAX))); } catch { /* storage unavailable: pins just won't persist */ }
  window.dispatchEvent(new Event(PINS_EVENT));
}

export const isPinned = (href: string) => listPins().some((p) => p.href === href);

export function togglePin(href: string, label: string): boolean {
  const pins = listPins();
  if (pins.some((p) => p.href === href)) { save(pins.filter((p) => p.href !== href)); return false; }
  save([{ href, label: label.trim().slice(0, 80) || href, at: new Date().toISOString() }, ...pins]);
  return true;
}

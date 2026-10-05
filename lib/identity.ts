// Per-user accent — Version 32 USER_ACCENTS (handoff §3). Ten curated,
// muted, enterprise-safe colours; one stable accent per user, used at low
// coverage (~5–10%): the avatar, the active subnav underline, link hover,
// selected-row tints and the notification dot. Deterministic from the user
// id so it is stable across sessions and devices; a user can pick a
// different one (kept in this browser only — a per-viewer preference).

export interface Identity {
  key: string;
  name: string;
  color: string;
  /** Kept for older callers that read three stops; all three are the accent. */
  stops: [string, string, string];
}

const accent = (key: string, name: string, color: string): Identity => ({ key, name, color, stops: [color, color, color] });

export const IDENTITIES: Identity[] = [
  accent("indigo",         "Indigo",         "#696D86"),
  accent("sage",           "Sage",           "#66765F"),
  accent("slate_teal",     "Slate teal",     "#557476"),
  accent("stone_blue",     "Stone blue",     "#647384"),
  accent("aubergine",      "Aubergine",      "#756775"),
  accent("clay",           "Clay",           "#876C61"),
  accent("olive",          "Olive",          "#77755B"),
  accent("graphite_green", "Graphite green", "#617068"),
  accent("dust_rose",      "Dust rose",      "#846D70"),
  accent("deep_sand",      "Deep sand",      "#847661"),
];

/** DEFAULT_ACCENT = indigo. */
export const DEFAULT_ACCENT = IDENTITIES[0];

const STORAGE_KEY = "starlane_accent";
export const IDENTITY_EVENT = "starlane-identity-change";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function defaultIdentityFor(seed: string | null | undefined): Identity {
  if (!seed) return DEFAULT_ACCENT;
  return IDENTITIES[hash(seed) % IDENTITIES.length];
}

export function chosenIdentity(seed: string | null | undefined): Identity {
  try {
    const key = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const picked = key ? IDENTITIES.find(i => i.key === key) : undefined;
    if (picked) return picked;
  } catch {
    // storage unavailable (private mode) — fall back to the derived one
  }
  return defaultIdentityFor(seed);
}

export function saveIdentity(key: string) {
  try { window.localStorage.setItem(STORAGE_KEY, key); } catch { /* per-viewer nicety only */ }
  window.dispatchEvent(new Event(IDENTITY_EVENT));
}

/** Solid accent; the name is kept so older call sites keep working. */
export function identityGradient(identity: Identity): string {
  return identity.color;
}

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

// Writes the accent onto :root as CSS variables so any component (or plain
// CSS) can use it without prop drilling.
export function applyIdentity(identity: Identity) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  root.setProperty("--accent", identity.color);
  root.setProperty("--accent-rgb", rgb(identity.color));
  root.setProperty("--id-a", identity.color);
  root.setProperty("--id-b", identity.color);
  root.setProperty("--id-c", identity.color);
  root.setProperty("--id-gradient", identity.color);
  root.setProperty("--id-gradient-h", identity.color);
}

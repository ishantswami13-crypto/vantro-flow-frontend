// Per-user colour identity — every account gets its own soft gradient that
// shows up wherever the app refers to "you": avatars, the active nav marker,
// text selection, and the primary "ask Starlane" actions. Deterministic from
// the user id so it is stable across sessions and devices; a user can pick a
// different one (kept in this browser only — a per-viewer preference).

export interface Identity {
  key: string;
  name: string;
  stops: [string, string, string];
}

// Curated, low-saturation gradients that sit well on the warm off-white
// canvas and the near-black sidebar. Three stops each so the blend reads as
// a wash of colour rather than a hard two-tone.
export const IDENTITIES: Identity[] = [
  { key: "dusk",      name: "Dusk",      stops: ["#F4B18C", "#D98BA6", "#8C7BD1"] },
  { key: "tide",      name: "Tide",      stops: ["#9FD8CB", "#6FA8DC", "#5B6BC9"] },
  { key: "saffron",   name: "Saffron",   stops: ["#F6D38A", "#EFA46B", "#D7667A"] },
  { key: "moss",      name: "Moss",      stops: ["#C9DDA0", "#8DBF9A", "#4F8C83"] },
  { key: "orchid",    name: "Orchid",    stops: ["#F2C2E0", "#C49BE0", "#7F86D8"] },
  { key: "ember",     name: "Ember",     stops: ["#F7B9A1", "#E27D6A", "#A9546B"] },
  { key: "glacier",   name: "Glacier",   stops: ["#D6ECF2", "#9CC7E4", "#7B93D6"] },
  { key: "clay",      name: "Clay",      stops: ["#E9CDB3", "#C99A83", "#8C6F7E"] },
  { key: "lagoon",    name: "Lagoon",    stops: ["#B7E4C7", "#74C3B5", "#3F8FA8"] },
  { key: "twilight",  name: "Twilight",  stops: ["#C3C8F0", "#8E97DA", "#5C5F9E"] },
];

const STORAGE_KEY = "starlane_identity";
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
  if (!seed) return IDENTITIES[0];
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

export function identityGradient(identity: Identity, angle = 135): string {
  const [a, b, c] = identity.stops;
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 52%, ${c} 100%)`;
}

// Writes the identity onto :root as CSS variables so any component (or
// plain CSS) can use it without prop drilling.
export function applyIdentity(identity: Identity) {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  const [a, b, c] = identity.stops;
  root.setProperty("--id-a", a);
  root.setProperty("--id-b", b);
  root.setProperty("--id-c", c);
  root.setProperty("--id-gradient", identityGradient(identity));
  root.setProperty("--id-gradient-h", identityGradient(identity, 90));
}

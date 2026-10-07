// Theme preference: dark by default (app/tokens.css), light on request.
// Kept in this browser only; app/layout.tsx applies it before first paint.

export type Theme = "dark" | "light";
const KEY = "starlane_theme";
export const THEME_EVENT = "starlane-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { window.localStorage.setItem(KEY, theme); } catch { /* per-browser nicety only */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

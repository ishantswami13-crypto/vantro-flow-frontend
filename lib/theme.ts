// Theme preference: warm-white workspace by default (app/tokens.css), dark on
// request. The sidebar is black in both.
// Kept in this browser only; app/layout.tsx applies it before first paint.

export type Theme = "dark" | "light";
const KEY = "starlane_theme";
export const THEME_EVENT = "starlane-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
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

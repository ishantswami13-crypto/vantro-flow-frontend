// Two ways into the app, like the two cards on the public site's home page:
// "For Finance Teams" opens the month-end close workspace (/space) and
// "For Owners" opens Receivables Review (/review). The one a person last
// used is remembered in this browser per user; until then, the role they
// gave at sign-up picks one.

import { api, getUser } from "@/lib/api";

export type DashboardKind = "finance" | "owner";

export const DASHBOARDS: Record<DashboardKind, { href: string; label: string; title: string; body: string }> = {
  finance: {
    href: "/space",
    label: "For finance teams",
    title: "Month-end close",
    body: "Close faster on one record across ledgers, bank and stock, with agents doing the matching and first pass.",
  },
  owner: {
    href: "/review",
    label: "For owners",
    title: "Receivables Review",
    body: "Know who owes you and what cash is at risk, and approve the next step from your phone.",
  },
};

const key = () => { const id = getUser()?.id; return id ? `starlane_dashboard:${id}` : null; };

export function readDashboard(): DashboardKind | null {
  if (typeof window === "undefined") return null;
  try { const k = key(); const v = k ? localStorage.getItem(k) : null; return v === "finance" || v === "owner" ? v : null; } catch { return null; }
}

export function rememberDashboard(kind: DashboardKind) {
  try { const k = key(); if (k) localStorage.setItem(k, kind); } catch { /* storage off: the choice lasts this page only */ }
}

/** The sign-up roles: Finance, Operations, Procurement and Technology work in the close; Founder/CEO, Sales and Other own the receivables. */
export function dashboardForRole(role: string | null | undefined): DashboardKind | null {
  if (!role) return null;
  return ["Finance", "Operations", "Procurement", "Technology"].includes(role) ? "finance" : "owner";
}

/** Where a signed-in person starts: the view they last used, else the one their role suggests, else Home. */
export async function landingPath(): Promise<string> {
  const saved = readDashboard();
  if (saved) return DASHBOARDS[saved].href;
  try {
    const s = await api.onboarding.state();
    const kind = dashboardForRole(s.profile?.role);
    if (kind) { rememberDashboard(kind); return DASHBOARDS[kind].href; }
  } catch { /* the state is optional; Home always works */ }
  return "/bridge";
}

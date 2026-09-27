// The public product guide covers Starlane's seven features, in the order of
// the signed-in app's sidebar (lib/navigation.ts). Every page states the real
// status of what it describes — see STATUS below.

export type Status = "live" | "not_built";

export const STATUS: Record<Status, { label: string; note: string }> = {
  live: { label: "Live", note: "Built and working in Starlane, on your company’s own data." },
  not_built: { label: "Not built yet", note: "Part of Starlane's design; there is nothing behind it yet, and Starlane does not pretend otherwise." },
};

export interface GuideLink { href: string; label: string; status?: Status }
// Starlane's seven features — the same order as the signed-in app's sidebar.
export const GUIDE: { group: string; links: GuideLink[] }[] = [
  { group: "Start", links: [{ href: "/product", label: "Overview" }] },
  {
    group: "Features",
    links: [
      { href: "/product/bridge", label: "The Bridge", status: "live" },
      { href: "/product/scan", label: "Scan", status: "live" },
      { href: "/product/watch", label: "Watch", status: "live" },
      { href: "/product/missions", label: "Missions", status: "live" },
      { href: "/product/simulate", label: "Simulate", status: "live" },
      { href: "/product/memory", label: "Memory", status: "live" },
      { href: "/product/prepared", label: "Prepared", status: "live" },
    ],
  },
];

export const FLAT_GUIDE = GUIDE.flatMap((g) => g.links);

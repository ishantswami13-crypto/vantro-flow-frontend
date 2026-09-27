// The public product guide mirrors the signed-in app's sidebar
// (lib/navigation.ts + components/layout/Sidebar.tsx) so a visitor learns
// Starlane in the same shape they will use it. Every page states the real
// status of what it describes — see STATUS below.

export type Status = "live" | "live_limited" | "preview" | "in_testing" | "connector_required" | "roadmap" | "not_built";

export const STATUS: Record<Status, { label: string; note: string }> = {
  live: { label: "Live", note: "Available to every Starlane company today." },
  live_limited: { label: "Live, limited", note: "Working on real data, read-only, rolling out to companies one at a time." },
  preview: { label: "Preview", note: "Built and tested outside production; not switched on for companies yet." },
  in_testing: { label: "In testing", note: "Built; not yet published for download." },
  connector_required: { label: "Needs a connector", note: "Designed; waits for a data source Starlane cannot read yet." },
  roadmap: { label: "Roadmap", note: "Designed, not built." },
  not_built: { label: "Not built yet", note: "Named in the product, with nothing behind it yet." },
};

export interface GuideLink { href: string; label: string; status?: Status }
export const GUIDE: { group: string; links: GuideLink[] }[] = [
  { group: "Start", links: [{ href: "/product", label: "Overview" }] },
  {
    group: "Every day",
    links: [
      { href: "/product/bridge", label: "The Bridge", status: "live" },
      { href: "/product/briefing", label: "Owner briefing", status: "live_limited" },
      { href: "/product/decisions", label: "Decisions & approvals", status: "live" },
      { href: "/product/ask", label: "Ask Starlane", status: "live" },
    ],
  },
  {
    group: "Intelligence",
    links: [
      { href: "/product/watch", label: "Watch", status: "live" },
      { href: "/product/discover", label: "Discover", status: "live" },
      { href: "/product/simulate", label: "Simulate", status: "live" },
      { href: "/product/memory", label: "Memory & Prepared", status: "live" },
    ],
  },
  {
    group: "Agents",
    links: [
      { href: "/product/agents", label: "Agents" },
      { href: "/product/collections", label: "Collections", status: "live" },
    ],
  },
  {
    group: "Company",
    links: [
      { href: "/product/sources", label: "Sources" },
      { href: "/product/control", label: "Control & trust", status: "live" },
      { href: "/product/modules", label: "Business modules", status: "live" },
    ],
  },
  { group: "Apps", links: [{ href: "/product/apps", label: "Desktop & mobile", status: "in_testing" }] },
];

export const FLAT_GUIDE = GUIDE.flatMap((g) => g.links);

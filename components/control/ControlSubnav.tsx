"use client";

import { Subnav } from "@/components/v32/ui";

// Shared 8-tab subnav reused across all three Control boards (Control.dc.html,
// ControlApprovals.dc.html, ControlAudit.dc.html) per STARLANE_FRONTEND_HANDOFF.md
// §14 — same tab set, different active tab per board. Overview/Users & Roles/
// Permissions/Automation/Monitoring/Security are in-page tabs on /control;
// Approvals and Audit are their own routes.
export type ControlTab =
  | "overview"
  | "decisions"
  | "users"
  | "permissions"
  | "approvals"
  | "automation"
  | "monitoring"
  | "audit"
  | "security";

const TABS: { key: ControlTab; label: string; href: string }[] = [
  { key: "overview", label: "Overview", href: "/control?tab=overview" },
  { key: "decisions", label: "Decisions", href: "/control/decisions" },
  { key: "users", label: "Users & Roles", href: "/control?tab=users" },
  { key: "permissions", label: "Permissions", href: "/control?tab=permissions" },
  { key: "approvals", label: "Approvals", href: "/control/approvals" },
  { key: "automation", label: "Automation", href: "/control?tab=automation" },
  { key: "audit", label: "Audit", href: "/control/audit" },
];

export function ControlSubnav({ active }: { active: ControlTab }) {
  return <Subnav label="Control" active={active} items={TABS.map((t) => ({ key: t.key, label: t.label, href: t.href }))} />;
}

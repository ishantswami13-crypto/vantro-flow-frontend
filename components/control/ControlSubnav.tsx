"use client";

import { PageHeader, Subnav } from "@/components/v32/ui";

// One tab set across every Control board: Overview, Users and roles,
// Permissions and Automation are in-page tabs on /control; Decisions,
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
  { key: "approvals", label: "Approvals", href: "/control/approvals" },
  { key: "decisions", label: "Decisions", href: "/control/decisions" },
  { key: "permissions", label: "Permissions", href: "/control?tab=permissions" },
  { key: "users", label: "Users and roles", href: "/control?tab=users" },
  { key: "automation", label: "Automation", href: "/control?tab=automation" },
  { key: "audit", label: "Audit log", href: "/control/audit" },
];

export function ControlSubnav({ active, counts }: { active: ControlTab; counts?: Partial<Record<ControlTab, number | null>> }) {
  return (
    <Subnav
      label="Control"
      active={active}
      items={TABS.map((t) => ({ key: t.key, label: t.label, href: t.href, count: counts?.[t.key] ?? null }))}
    />
  );
}

/** The Control title row and tabs, the same on every Control board. */
export function ControlHeader({ active, subtitle, right, counts }: {
  active: ControlTab;
  subtitle: React.ReactNode;
  right?: React.ReactNode;
  counts?: Partial<Record<ControlTab, number | null>>;
}) {
  return (
    <>
      <PageHeader title="Control" subtitle={subtitle} right={right} />
      <ControlSubnav active={active} counts={counts} />
    </>
  );
}

/** Content column for every Control board: left aligned, ~1180px. */
export function ControlPage({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>{children}</div>;
}

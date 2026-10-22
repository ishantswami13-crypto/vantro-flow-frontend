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
    <div className="flex flex-col" style={{ gap: 18 }}>
      <PageHeader title="Control" subtitle={subtitle} right={right} />
      <ControlSubnav active={active} counts={counts} />
    </div>
  );
}

/** Content column for every Control board: left aligned, ~1180px; 24px
 *  between sections after the title block. */
export function ControlPage({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>{children}</div>;
}

/** A Control section: a small tracked label, an optional one-line hint and
 *  a right slot, then rows on the canvas. */
export function ControlSection({ title, hint, right, children }: { title: string; hint?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-end justify-between flex-wrap" style={{ gap: 12, marginBottom: 10 }}>
        <div className="min-w-0">
          <h2 className="section-label" style={{ margin: 0 }}>{title}</h2>
          {hint && <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 640 }}>{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

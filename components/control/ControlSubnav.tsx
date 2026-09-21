"use client";

import Link from "next/link";

// Shared 8-tab subnav reused across all three Control boards (Control.dc.html,
// ControlApprovals.dc.html, ControlAudit.dc.html) per STARLANE_FRONTEND_HANDOFF.md
// §14 — same tab set, different active tab per board. Overview/Users & Roles/
// Permissions/Automation/Monitoring/Security are in-page tabs on /control;
// Approvals and Audit are their own routes.
export type ControlTab =
  | "overview"
  | "users"
  | "permissions"
  | "approvals"
  | "automation"
  | "monitoring"
  | "audit"
  | "security";

const TABS: { key: ControlTab; label: string; href: string }[] = [
  { key: "overview", label: "Overview", href: "/control?tab=overview" },
  { key: "users", label: "Users & Roles", href: "/control?tab=users" },
  { key: "permissions", label: "Permissions", href: "/control?tab=permissions" },
  { key: "approvals", label: "Approvals", href: "/control/approvals" },
  { key: "automation", label: "Automation", href: "/control?tab=automation" },
  { key: "monitoring", label: "Monitoring", href: "/control?tab=monitoring" },
  { key: "audit", label: "Audit", href: "/control/audit" },
  { key: "security", label: "Security", href: "/control?tab=security" },
];

export function ControlSubnav({ active }: { active: ControlTab }) {
  return (
    <nav
      aria-label="Control"
      style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid #EBEAE6", marginBottom: 4, overflowX: "auto" }}
    >
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className="hover-dim"
          style={{
            padding: "8px 2px",
            fontSize: 13,
            fontWeight: t.key === active ? 500 : 400,
            color: t.key === active ? "#191917" : "#63635F",
            background: "none",
            border: "none",
            borderBottomColor: t.key === active ? "#696D86" : "transparent",
            borderBottomWidth: 2,
            borderBottomStyle: "solid",
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

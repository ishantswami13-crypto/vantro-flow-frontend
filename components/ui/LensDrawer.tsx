"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";

// Canonical Lens drawer — the universal right-side entity drawer described
// in STARLANE_FRONTEND_HANDOFF.md §9. Built on top of the existing
// Drawer.tsx shell (which already has the ESC-to-close, click-outside-to-
// close, focus-trap, and focus-return-to-trigger behavior the handoff
// flags as missing from the static mockup) rather than a fourth drawer
// implementation. Visual chrome (avatar, Fraunces name, status color,
// action row, lens_section fact rows) follows the frozen spec; only the
// underlying data is real — every value passed in must come from an
// actual `api.*` response, never invented content (see handoff §15/§16).

export interface LensFactRow {
  label: string;
  value: string;
}

export interface LensSection {
  label: string;
  rows: LensFactRow[];
}

export interface LensAction {
  label: string;
  onClick: () => void;
}

export interface LensDrawerProps {
  entityType: string; // e.g. "Customer", "Supplier"
  name: string;
  statusLabel?: string;
  statusColor?: string; // defaults to the accent color
  sections: LensSection[];
  actions?: LensAction[]; // defaults to Watch (customers only) and Open Prepared; never a button that does nothing
  accent?: string; // hex, defaults to DEFAULT_ACCENT indigo
  onClose: () => void;
}

const DEFAULT_ACCENT = "var(--accent, var(--status-info))";

export function LensDrawer({
  entityType,
  name,
  statusLabel,
  statusColor,
  sections,
  actions,
  accent = DEFAULT_ACCENT,
  onClose,
}: LensDrawerProps) {
  const titleId = "lens-drawer-title";
  const router = useRouter();
  // Watch's default action (when the caller doesn't override `actions`)
  // opens the real Watch page's "New watch" flow pre-filled with this
  // entity, via query params /watch reads on mount — see app/watch/page.tsx.
  // Only offered for entityType "Customer", since that's the only
  // metric_key (customer_exposure_amount) the backend evaluator supports
  // an entity_name filter for; other entity types get no Watch button so
  // this never claims a capability that doesn't exist for them yet.
  const defaultWatchAction: LensAction | null = entityType === "Customer"
    ? {
        label: "Watch",
        onClick: () => router.push(`/watch?prefill_metric=customer_exposure_amount&prefill_entity=${encodeURIComponent(name)}`),
      }
    : null;
  // Simulate has no default action here: Simulate V1 (lib/routes/scenarios.js)
  // only makes sense pre-filled with a real invoice, and this generic drawer
  // has no entity-specific invoice to offer by default. Callers that do have
  // a real associated invoice (e.g. app/customers/page.tsx) add their own
  // "Simulate" action via the `actions` prop instead of relying on this
  // default list — see the dead-button audit note in that file.
  const resolvedActions: LensAction[] =
    actions && actions.length > 0
      ? actions
      : [
          ...(defaultWatchAction ? [defaultWatchAction] : []),
          // Missions start from a decision (Handle it), so the honest
          // default is to open the decisions that need you.
          { label: "Open Prepared", onClick: () => router.push("/prepared") },
        ];

  return (
    <Drawer
      titleId={titleId}
      title={name}
      onClose={onClose}
      eyebrow={entityType}
      leading={<span aria-hidden="true" className="shrink-0" style={{ width: 30, height: 30, borderRadius: "50%", background: accent }} />}
      subtitle={statusLabel ? <span style={{ fontSize: 11, color: statusColor || accent }}>{statusLabel}</span> : undefined}
      actions={resolvedActions.map(a => (
        <button key={a.label} type="button" onClick={a.onClick} className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>
          {a.label}
        </button>
      ))}
    >
      <div>
        {sections.map(section => (
          <div key={section.label} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: 0, color: "var(--text-secondary)", marginBottom: 8 }}>{section.label}</div>
            {section.rows.map(row => (
              <div key={row.label} className="flex items-baseline justify-between gap-3" style={{ padding: "7px 0", borderBottom: "1px solid var(--border-default)" }}>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{row.label}</span>
                <span className="text-right" style={{ fontSize: 13, color: "var(--text-primary)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        ))}
        {sections.length === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>No further detail is available for this entity yet.</p>
        )}
      </div>
    </Drawer>
  );
}

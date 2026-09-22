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
  actions?: LensAction[]; // defaults to Ask/Watch/Simulate/Create Mission per §9, no-ops unless supplied
  accent?: string; // hex, defaults to DEFAULT_ACCENT indigo
  onClose: () => void;
}

const DEFAULT_ACCENT = "#696D86";

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
  // Only wired for entityType "Customer" today, since that's the only
  // metric_key (customer_exposure_amount) the backend evaluator supports
  // an entity_name filter for; other entity types fall back to a no-op so
  // this never claims a capability that doesn't exist for them yet.
  const defaultWatchAction: LensAction = {
    label: "Watch",
    onClick: () => {
      if (entityType !== "Customer") return;
      router.push(`/watch?prefill_metric=customer_exposure_amount&prefill_entity=${encodeURIComponent(name)}`);
    },
  };
  // Simulate has no default action here: Simulate V1 (lib/routes/scenarios.js)
  // only makes sense pre-filled with a real invoice, and this generic drawer
  // has no entity-specific invoice to offer by default. Callers that do have
  // a real associated invoice (e.g. app/customers/page.tsx) add their own
  // "Simulate" action via the `actions` prop instead of relying on this
  // default list — see the dead-button audit note in that file.
  const resolvedActions: LensAction[] =
    actions && actions.length > 0
      ? actions
      : [{ label: "Ask", onClick: () => {} }, defaultWatchAction, { label: "Create Mission", onClick: () => {} }];

  return (
    <Drawer titleId={titleId} title={name} onClose={onClose}>
      <div className="-m-4">
        {/* Header block — entity type + avatar + name + status. The Drawer
            shell already renders its own close button + h2, so this repeats
            the name visually (Fraunces, 20px) below that accessible header,
            matching the V32 identity-block layout. */}
        <div className="px-2 pb-4 mb-4" style={{ borderBottom: "1px solid #EBEAE6" }}>
          <p className="v32-section-label mb-3">{entityType}</p>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 rounded-full"
              style={{ width: 30, height: 30, background: accent, border: "1px solid rgba(25,25,23,0.14)" }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate" style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 20, color: "#191917" }}>
                {name}
              </p>
              {statusLabel && (
                <p className="text-[11px] mt-0.5" style={{ color: statusColor || accent }}>{statusLabel}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {resolvedActions.map(a => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="btn-secondary-v32 px-3 py-1.5 text-[12px]"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-2 space-y-5">
          {sections.map(section => (
            <div key={section.label}>
              <p className="v32-section-label mb-2">{section.label}</p>
              <div>
                {section.rows.map(row => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                    style={{ borderBottom: "1px solid #F3F2EE" }}
                  >
                    <span className="text-[12.5px]" style={{ color: "#63635F" }}>{row.label}</span>
                    <span className="text-[13px] text-right" style={{ color: "#191917", fontFamily: "'IBM Plex Mono', Menlo, monospace" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <p className="v32-meta">No further detail is available for this entity yet.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@/components/v32/icons";

interface DrawerProps {
  titleId: string;
  title: string;
  onClose: () => void;
  onBack?: () => void; // Escape pops one level when provided; closes entirely otherwise
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
  /** Small uppercase label above the title ("CUSTOMER", "EVIDENCE"). */
  eyebrow?: React.ReactNode;
  /** Shown left of the title (the Lens avatar). */
  leading?: React.ReactNode;
  /** One line under the title (status, record). */
  subtitle?: React.ReactNode;
  /** Row of actions under the title block. */
  actions?: React.ReactNode;
  /** Fixed footer bar (the Evidence trust caption). */
  footer?: React.ReactNode;
  titleSize?: number;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Generic slide-over (desktop) / full-screen (mobile, below `lg`) container.
// role="dialog" aria-modal="true", focus trap, Escape pops/closes, restores
// focus to the triggering element on close.
export function Drawer({ titleId, title, onClose, onBack, children, breadcrumb, eyebrow, leading, subtitle, actions, footer, titleSize = 18 }: DrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    headingRef.current?.focus();
    return () => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (onBack) onBack();
        else onClose();
        return;
      }
      if (e.key === "Tab" && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(el => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onBack, onClose]);

  // Portalled to <body> so the fixed backdrop covers the whole app (sidebar
  // and header included) instead of being trapped in the page's stacking
  // context.
  if (typeof document === "undefined") return null;
  // Version 32 shell (handoff §9/§10): 560px panel from the right, white,
  // a hairline edge and a deep shadow, the page dimmed behind.
  return createPortal(
    <>
      <div
        className="hidden lg:block fixed inset-0 z-40 lens-backdrop"
        style={{ background: "rgb(14 14 13 / 0.28)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-50 flex flex-col inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[560px] lens-drawer"
        style={{ background: "var(--elevated)", borderLeft: "1px solid var(--line)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="shrink-0" style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)" }}>
          <div className="flex items-center justify-between gap-3" style={{ marginBottom: 12 }}>
            <div className="min-w-0" style={breadcrumb ? { fontSize: 12, color: "var(--ink-2)" } : undefined}>
              {breadcrumb || (typeof eyebrow === "string" ? <span className="section-label" style={{ margin: 0 }}>{eyebrow}</span> : eyebrow)}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="icon-btn"
              style={{ marginRight: -6 }}
            >
              <IconX size={15} />
            </button>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            {leading}
            <div className="min-w-0">
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="outline-none"
                style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: titleSize, color: "var(--ink)", margin: 0, lineHeight: 1.25 }}
              >
                {title}
              </h2>
              {subtitle && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 12 }}>{actions}</div>}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: "16px 24px" }}>{children}</div>
        {footer && (
          <div className="shrink-0" style={{ padding: "12px 24px", borderTop: "1px solid var(--line)", fontSize: 11.5, color: "var(--ink-2)" }}>
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

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
export function Drawer({ titleId, title, onClose, onBack, children, breadcrumb, eyebrow, leading, subtitle, actions, footer, titleSize = 20 }: DrawerProps) {
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
  // #E5E4DF hairline, soft shadow, the page dimmed behind at 28%.
  return createPortal(
    <>
      <div
        className="hidden lg:block fixed inset-0 z-40 lens-backdrop"
        style={{ background: "rgba(20,20,18,0.28)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-50 flex flex-col inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[560px] lens-drawer"
        style={{ background: "#FFFFFF", borderLeft: "1px solid #E5E4DF", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
      >
        <div className="shrink-0" style={{ padding: "24px 28px 18px 28px", borderBottom: "1px solid #EBEAE6" }}>
          <div className="flex items-center justify-between gap-3" style={{ marginBottom: 14 }}>
            <div className="min-w-0" style={breadcrumb ? { fontSize: 12, color: "#63635F" } : { fontSize: 11, letterSpacing: 0, color: "#63635F" }}>
              {breadcrumb || eyebrow}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="hover-dim shrink-0 flex items-center justify-center"
              style={{ width: 28, height: 28, marginRight: -6, color: "#63635F" }}
            >
              <FiX size={16} strokeWidth={1.6} />
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
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: titleSize, color: "#191917", margin: 0, lineHeight: 1.25 }}
              >
                {title}
              </h2>
              {subtitle && <div style={{ fontSize: 12, color: "#63635F", marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 14 }}>{actions}</div>}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 28px" }}>{children}</div>
        {footer && (
          <div className="shrink-0" style={{ padding: "14px 28px", borderTop: "1px solid #EBEAE6", fontSize: 11.5, color: "#63635F" }}>
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

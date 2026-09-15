"use client";

import React, { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

interface DrawerProps {
  titleId: string;
  title: string;
  onClose: () => void;
  onBack?: () => void; // Escape pops one level when provided; closes entirely otherwise
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Generic slide-over (desktop) / full-screen (mobile, below `lg`) container.
// role="dialog" aria-modal="true", focus trap, Escape pops/closes, restores
// focus to the triggering element on close.
export function Drawer({ titleId, title, onClose, onBack, children, breadcrumb }: DrawerProps) {
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

  return (
    <>
      {/* Backdrop — click-to-close on desktop only; no visible backdrop on the
          full-screen mobile variant, so it's hidden below `lg`. */}
      <div
        className="hidden lg:block fixed inset-0 z-40 motion-safe:animate-fade-in"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "fixed z-50 bg-surface flex flex-col",
          // Mobile: full-screen. Desktop (lg+): slide-over panel from the right.
          "inset-0",
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[560px] lg:border-l lg:border-border",
          "motion-safe:animate-fade-in-scale",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 px-4 h-14 shrink-0 border-b border-border">
          <div className="min-w-0 flex-1">
            {breadcrumb}
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-sm font-bold text-primary truncate outline-none"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-2 focus-ring"
          >
            <FiX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}

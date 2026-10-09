"use client";

import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { IconX } from "@/components/v32/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons, right-aligned. Put the one primary action last. */
  footer?: React.ReactNode;
  width?: number;
}

/** The one centred dialog: focus trapped, Escape and backdrop close it. */
export function Modal({ open, onClose, title, description, children, footer, width = 440 }: ModalProps) {
  const titleId = useId();
  const ref = useFocusTrap<HTMLDivElement>(onClose, open);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    (root?.querySelector<HTMLElement>("[data-autofocus]") || root?.querySelector<HTMLElement>("input, textarea, select") || root?.querySelector<HTMLElement>("button"))?.focus();
  }, [open, ref]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 flex items-start justify-center px-4" style={{ zIndex: "var(--z-modal)" as unknown as number, paddingTop: "14vh" }}>
      <div className="fixed inset-0 lens-backdrop" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full pop-in"
        style={{ maxWidth: width, background: "var(--elevated)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-start justify-between gap-4" style={{ padding: "18px 20px 0" }}>
          <div className="min-w-0">
            <h2 id={titleId} style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{title}</h2>
            {description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn" style={{ marginRight: -6, marginTop: -4 }}>
            <IconX size={15} />
          </button>
        </div>
        {children && <div style={{ padding: "14px 20px 0" }}>{children}</div>}
        <div className="flex items-center justify-end gap-2" style={{ padding: "18px 20px 18px" }}>{footer}</div>
      </div>
    </div>,
    document.body
  );
}

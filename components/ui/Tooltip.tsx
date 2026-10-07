"use client";

import React, { useId, useState } from "react";

/** A small label on hover or keyboard focus. Use for icon-only buttons and
 *  terse figures; never hide information people need to act. */
export function Tooltip({ label, children, side = "top" }: { label: React.ReactNode; children: React.ReactElement; side?: "top" | "bottom" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pos: React.CSSProperties = side === "top"
    ? { bottom: "calc(100% + 6px)", left: "50%", translate: "-50% 0" }
    : side === "bottom"
      ? { top: "calc(100% + 6px)", left: "50%", translate: "-50% 0" }
      : { left: "calc(100% + 8px)", top: "50%", translate: "0 -50%" };
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {React.cloneElement(children, { "aria-describedby": open ? id : undefined } as Record<string, unknown>)}
      {open && (
        <span role="tooltip" id={id} className="absolute pointer-events-none whitespace-nowrap fade-once"
          style={{ ...pos, zIndex: "var(--z-tooltip)" as unknown as number, padding: "4px 8px", fontSize: 11.5, color: "var(--ink)", background: "var(--elevated)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", boxShadow: "var(--shadow-md)" }}>
          {label}
        </span>
      )}
    </span>
  );
}

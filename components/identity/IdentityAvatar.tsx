"use client";

import React from "react";
import { useIdentity } from "./useIdentity";

// The user's accent mark (Version 32): a solid circle in their own accent
// with a faint ring. The sidebar shows it plain, as drawn; elsewhere it can
// carry the user's initial in Fraunces.
export function IdentityAvatar({ name, size = 26, rounded = "full", className = "", initial = false }: {
  name: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
  initial?: boolean;
}) {
  const identity = useIdentity();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 select-none ${rounded === "full" ? "rounded-full" : "rounded-md"} ${className}`}
      style={{
        width: size,
        height: size,
        background: identity.color,
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#FFFFFF",
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: Math.round(size * 0.46),
        fontWeight: 400,
      }}
    >
      {initial ? (name || "?").charAt(0).toUpperCase() : null}
    </span>
  );
}

"use client";

import React from "react";
import { useIdentity } from "./useIdentity";

// The user's gradient mark with their initial — used everywhere the app
// shows "you" (sidebar account, header), so the colour becomes recognisable.
export function IdentityAvatar({ name, size = 28, rounded = "full", className = "" }: {
  name: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
}) {
  const identity = useIdentity();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center shrink-0 select-none ${rounded === "full" ? "rounded-full" : "rounded-md"} ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${identity.stops[0]} 0%, ${identity.stops[1]} 52%, ${identity.stops[2]} 100%)`,
        color: "#FFFFFF",
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: Math.round(size * 0.46),
        fontWeight: 400,
        textShadow: "0 1px 1px rgba(0,0,0,0.12)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
      }}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

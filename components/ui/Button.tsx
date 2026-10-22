"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success" | "whatsapp";
type Size    = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  fullWidth?: boolean;
  icon?:     React.ReactNode;
}

// One button family (app/globals.css .ui-btn-*). "success" is kept as an
// alias of primary for older call sites; WhatsApp keeps its brand green.
const VARIANTS: Record<Variant, string> = {
  primary:   "ui-btn-primary",
  secondary: "ui-btn-secondary",
  danger:    "ui-btn-danger",
  ghost:     "ui-btn-ghost",
  success:   "ui-btn-primary",
  whatsapp:  "bg-[#25D366] hover:bg-[#1EBE5A] text-[#06140B]",
};

const SIZES: Record<Size, string> = {
  xs: "ui-btn-sm",
  sm: "ui-btn-sm",
  md: "",
  lg: "ui-btn-lg",
};

export default function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={["ui-btn", VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : "", className].join(" ")}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="w-3.5 h-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0 inline-flex">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

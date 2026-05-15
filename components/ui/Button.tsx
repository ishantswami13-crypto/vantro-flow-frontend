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

const VARIANTS: Record<Variant, string> = {
  primary:   "btn-primary text-white border-transparent",
  secondary: "bg-surface-2 text-secondary hover:text-primary hover:bg-surface-3 border border-border hover:border-border-2 transition-all",
  danger:    "bg-gradient-danger text-white border-transparent shadow-danger",
  ghost:     "bg-transparent text-muted hover:text-primary hover:bg-surface-2 border border-transparent transition-all",
  success:   "bg-gradient-success text-white border-transparent shadow-success",
  whatsapp:  "bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent shadow-[0_2px_12px_rgba(37,211,102,0.3)]",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-3 text-xs rounded-lg gap-1.5",
  sm: "h-8 px-3.5 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-sm font-semibold rounded-xl gap-2.5",
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
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium border transition-all duration-150 focus-ring cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

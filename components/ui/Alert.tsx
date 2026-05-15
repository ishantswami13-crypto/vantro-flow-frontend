import React from "react";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle } from "react-icons/fi";

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?:  AlertVariant;
  title?:    string;
  children:  React.ReactNode;
  className?: string;
}

const CFG: Record<AlertVariant, { bg: string; border: string; icon: React.ReactNode; titleColor: string }> = {
  info:    {
    bg: "bg-accent-dim",    border: "border-accent/30",
    icon: <FiInfo className="text-accent" size={15} />,          titleColor: "text-accent",
  },
  success: {
    bg: "bg-success-dim",  border: "border-success/30",
    icon: <FiCheckCircle className="text-success" size={15} />,  titleColor: "text-success",
  },
  warning: {
    bg: "bg-warning-dim",  border: "border-warning/30",
    icon: <FiAlertTriangle className="text-warning" size={15} />, titleColor: "text-warning",
  },
  danger:  {
    bg: "bg-danger-dim",   border: "border-danger/30",
    icon: <FiXCircle className="text-danger" size={15} />,       titleColor: "text-danger",
  },
};

export function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  const c = CFG[variant];
  return (
    <div className={[
      "flex gap-3 p-4 rounded-xl border relative overflow-hidden",
      c.bg, c.border, className,
    ].join(" ")}>
      {/* Accent line */}
      <div className={["absolute left-0 top-0 bottom-0 w-0.5", `bg-${variant === "info" ? "accent" : variant}`].join(" ")} />
      <span className="shrink-0 mt-0.5">{c.icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        {title && <p className={["text-sm font-bold", c.titleColor].join(" ")}>{title}</p>}
        <p className="text-sm text-secondary leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

import React from "react";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle } from "react-icons/fi";

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, { border: string; icon: React.ReactNode; titleColor: string }> = {
  info:    { border: "border-accent/40 bg-accent-dim",   icon: <FiInfo className="text-accent" />,         titleColor: "text-accent" },
  success: { border: "border-success/40 bg-success-dim", icon: <FiCheckCircle className="text-success" />, titleColor: "text-success" },
  warning: { border: "border-warning/40 bg-warning-dim", icon: <FiAlertTriangle className="text-warning" />, titleColor: "text-warning" },
  danger:  { border: "border-danger/40 bg-danger-dim",   icon: <FiXCircle className="text-danger" />,      titleColor: "text-danger" },
};

export function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  const s = styles[variant];
  return (
    <div className={["flex gap-3 p-4 rounded-lg border", s.border, className].join(" ")}>
      <span className="shrink-0 mt-0.5">{s.icon}</span>
      <div className="flex flex-col gap-0.5">
        {title && <p className={["text-sm font-semibold", s.titleColor].join(" ")}>{title}</p>}
        <p className="text-sm text-secondary">{children}</p>
      </div>
    </div>
  );
}

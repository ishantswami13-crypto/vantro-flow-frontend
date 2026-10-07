import React from "react";
import { IconSparkle } from "@/components/v32/icons";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: React.ReactNode;
  /** One next step, when there is a real one. */
  action?: React.ReactNode;
  className?: string;
}

// Honest "nothing here" state. Empty is a legitimate business state: no
// section ever substitutes a made-up number or sample row to avoid it.
export function EmptyState({ icon, title, message, action, className = "" }: EmptyStateProps) {
  return (
    <div className={["flex flex-col items-center text-center", className].join(" ")} style={{ padding: "40px 16px", gap: 10 }}>
      <span aria-hidden="true" className="inline-flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, color: "var(--ink-2)", background: "var(--surface-2)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
        {icon || <IconSparkle size={17} />}
      </span>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{title}</p>
      {message && <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", maxWidth: 420, lineHeight: 1.55 }}>{message}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

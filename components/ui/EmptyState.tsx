import React from "react";
import { FiInbox } from "react-icons/fi";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  className?: string;
}

// Honest "nothing here" state. Empty is a legitimate business state — this
// component exists so no section ever substitutes a fabricated number or
// sample row just to avoid looking blank.
export function EmptyState({ icon, title, message, className = "" }: EmptyStateProps) {
  return (
    <div className={["card-premium p-6 flex flex-col items-center text-center gap-2", className].join(" ")}>
      <span className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted">
        {icon || <FiInbox size={18} aria-hidden="true" />}
      </span>
      <p className="text-sm font-semibold text-secondary">{title}</p>
      {message && <p className="text-2xs text-muted">{message}</p>}
    </div>
  );
}

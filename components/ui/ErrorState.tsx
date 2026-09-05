import React from "react";
import { FiAlertOctagon } from "react-icons/fi";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

// Generic section/page-level error with a working recovery path. Never
// render stale or mock data behind this — this component IS the honest
// state when a fetch fails.
export function ErrorState({ title = "Couldn't load this", message, onRetry, className = "" }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={["card-premium p-6 flex flex-col items-center text-center gap-3", className].join(" ")}
    >
      <span className="w-10 h-10 rounded-full bg-danger-dim border border-danger/25 flex items-center justify-center text-danger">
        <FiAlertOctagon size={18} aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-bold text-primary">{title}</p>
        {message && <p className="text-2xs text-muted mt-1">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

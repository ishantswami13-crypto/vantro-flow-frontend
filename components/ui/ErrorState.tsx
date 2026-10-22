import React from "react";
import { IconAlert } from "@/components/v32/icons";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

// Section or page error with a working way out. Never show stale or sample
// data behind it: this is the honest state when a request fails.
export function ErrorState({ title = "Couldn't load this", message, onRetry, className = "" }: ErrorStateProps) {
  return (
    <div role="alert" className={["flex flex-col items-center text-center", className].join(" ")} style={{ padding: "36px 16px", gap: 10 }}>
      <span aria-hidden="true" className="inline-flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 10, color: "var(--critical)", background: "rgb(var(--tk-critical) / 0.10)" }}>
        <IconAlert size={17} />
      </span>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{title}</p>
      {message && <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", maxWidth: 440, lineHeight: 1.55 }}>{message}</p>}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">Try again</Button>}
    </div>
  );
}

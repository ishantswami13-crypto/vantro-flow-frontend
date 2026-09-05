import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { RankedAction } from "@/lib/api";

const PRIORITY_VARIANT: Record<RankedAction["priority"], "danger" | "warning" | "accent" | "muted"> = {
  urgent: "danger", high: "warning", medium: "accent", low: "muted",
};

// Presents a RankedAction framed as "what changed" (compact, timestamp-forward)
// — distinct emphasis from ActionCard's "what to do" framing (action-forward,
// with approve/reject buttons). Used for the Signals section only.
export function Signal({ action }: { action: RankedAction }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-border bg-surface-2">
      <Badge variant={PRIORITY_VARIANT[action.priority]}>{action.priority}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-primary leading-snug">{action.title}</p>
        <p className="text-2xs text-muted mt-0.5">
          {new Date(action.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </p>
      </div>
    </div>
  );
}

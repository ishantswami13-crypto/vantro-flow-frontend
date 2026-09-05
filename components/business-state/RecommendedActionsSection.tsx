import React from "react";
import { ActionCard } from "./ActionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RankedAction } from "@/lib/api";

const TOP_N = 10;

interface RecommendedActionsSectionProps {
  rankedActions: RankedAction[];
  onOpenCustomer?: (customerId: string, name: string, phone?: string) => void;
}

export function RecommendedActionsSection({ rankedActions, onOpenCustomer }: RecommendedActionsSectionProps) {
  if (rankedActions.length === 0) {
    return <EmptyState title="No recommended actions right now" message="You're all caught up." />;
  }

  const visible = rankedActions.slice(0, TOP_N);

  return (
    <div className="space-y-3">
      {visible.map(a => (
        <ActionCard key={a.id} action={a} onOpenCustomer={onOpenCustomer} />
      ))}
      {rankedActions.length > TOP_N && (
        <p className="text-2xs text-muted text-center">
          +{rankedActions.length - TOP_N} more pending action{rankedActions.length - TOP_N === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

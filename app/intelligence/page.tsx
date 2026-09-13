"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiGlobe, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/components/intelligence/format";
import { api, type IntelligenceSignal } from "@/lib/api";

// The entry point for Starlane's continuous external-world watch. Mirrors
// the honesty pattern already established by ExternalConditionsSection: a
// list of real signals when they exist, or an explicit, calm "nothing
// material" state — never a fabricated all-clear and never a blank screen.
function eventTypeLabel(type: string | null): string {
  if (!type) return "External event";
  return type.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function SignalCard({ signal, onOpen }: { signal: IntelligenceSignal; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="card-premium p-4 w-full text-left group cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="warning">Supplier exposure detected</Badge>
            <Badge variant="muted">{eventTypeLabel(signal.event_type)}</Badge>
          </div>
          <p className="text-sm font-bold text-primary truncate">{signal.event_title || "External event"}</p>
          <p className="text-2xs text-muted mt-1 leading-relaxed line-clamp-2">{signal.why_exists}</p>
          <p className="text-2xs text-muted mt-2 font-mono">Detected {formatDateTime(signal.first_detected_at)}</p>
        </div>
        <FiChevronRight className="text-muted shrink-0 mt-1 group-hover:text-primary transition-colors" size={18} />
      </div>
    </button>
  );
}

export default function IntelligencePage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["intelligence-signals"],
    queryFn: () => api.intelligence.signals(),
    staleTime: 15_000,
  });

  const resetMutation = useMutation({
    mutationFn: () => api.demo2xa.reset(),
    onMutate: () => { setResetting(true); setResetMessage(null); },
    onSuccess: () => {
      setResetMessage("Demo reset — the earthquake event has been re-triggered through the real relevance pipeline.");
      refetch();
    },
    onError: () => setResetMessage("Reset failed — check the backend log."),
    onSettled: () => setResetting(false),
  });

  // Multiple transmission channels can legitimately fire for the same
  // (event, supplier) pair — e.g. both SUPPLY_SHOCK and DEMAND_SHOCK. That's
  // real, correct backend behavior, but showing 3 near-identical cards for
  // one real-world story would clutter the entry point. Group for display
  // only; the impact view below still operates on one real signal id.
  const activeSignals = (data?.signals || []).filter((s) => s.status === "CANDIDATE" || s.status === "ACTIVE" || s.status === "UPDATED");
  const seen = new Set<string>();
  const signals = activeSignals.filter((s) => {
    const key = `${s.world_event_id}:${s.related_entity_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <DashboardLayout pageTitle="Intelligence">
      <PageHeader
        title="External Intelligence"
        subtitle="Starlane is continuously watching your business and the outside world for anything that could affect it."
      />

      {isLoading && <LoadingState label="Checking for external signals" rows={2} />}

      {isError && (
        <ErrorState title="Couldn't load external intelligence" message="Check your connection and try again." onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && signals.length === 0 && (
        <EmptyState
          icon={<FiGlobe size={18} />}
          title="No material external risks currently affecting your operating model"
          message="Starlane is watching your recorded supplier and customer locations against real-world events. Nothing material is active right now."
        />
      )}

      {!isLoading && !isError && signals.length > 0 && (
        <div className="space-y-3">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} onOpen={() => router.push(`/intelligence/${s.id}`)} />
          ))}
        </div>
      )}

      {/* Internal demo control — not a customer-facing product feature.
          Deliberately understated (muted text link, not a button) so it
          never reads as part of the normal product surface. */}
      <div className="mt-10 pt-4 border-t border-border flex items-center justify-between">
        <p className="text-2xs text-muted">Internal — 2xA meeting demo control</p>
        <Button
          variant="ghost"
          size="xs"
          icon={<FiRefreshCw size={12} className={resetting ? "animate-spin" : ""} />}
          loading={resetting}
          onClick={() => resetMutation.mutate()}
        >
          Reset 2xA demo
        </Button>
      </div>
      {resetMessage && <p className="text-2xs text-muted mt-2">{resetMessage}</p>}
    </DashboardLayout>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FiChevronRight, FiRefreshCw } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { formatDateTime, confidenceFromScore } from "@/components/intelligence/format";
import { api, type IntelligenceSignal } from "@/lib/api";

// Real-status labels only — CANDIDATE/ACTIVE/UPDATED are the only statuses
// the backend actually emits today (see IntelligenceSignal in lib/api.ts).
// No "Needs attention / Monitoring / Resolved" grouping is added here: the
// backend doesn't yet distinguish those as real states, and inventing the
// grouping in the frontend would be exactly the kind of fabricated status
// this product explicitly refuses to show.
function statusLabel(status: string): string {
  if (status === "CANDIDATE") return "New";
  if (status === "UPDATED") return "Updated";
  if (status === "ACTIVE") return "Active";
  return status;
}

// The entry point for Starlane's continuous external-world watch. Mirrors
// the honesty pattern already established by ExternalConditionsSection: a
// list of real signals when they exist, or an explicit, calm "nothing
// material" state — never a fabricated all-clear and never a blank screen.
function humanReason(signal: IntelligenceSignal): string {
  return signal.related_entity_type === "supplier" ? "This external event matched a verified supplier location exposure." : "This external event matched a recorded business exposure.";
}

// A row, not a card — hairline separation, open canvas, no boxed gallery
// tile. External events get a small restrained accent mark (Starlane's
// world-context signature, used sparingly); internal-only signals stay
// neutral graphite.
function SignalRow({ signal, onOpen }: { signal: IntelligenceSignal; onOpen: () => void }) {
  const isExternal = Boolean(signal.event_type);
  const confidence = confidenceFromScore(signal.plausibility_confidence);

  const metaParts = [
    isExternal ? "External event" : "Internal signal",
    signal.related_entity_type ? `${signal.related_entity_type.charAt(0).toUpperCase()}${signal.related_entity_type.slice(1)} risk` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left group flex items-start gap-4 py-6"
      style={{ borderBottom: "1px solid #E5E5E1" }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#FAFAF8")}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <span
        aria-hidden="true"
        className="mt-1.5 rounded-full shrink-0"
        style={{ width: 6, height: 6, background: isExternal ? "#4F6EF7" : "#D8D8D3" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[12px]" style={{ color: "#8A8A86" }}>{metaParts.join(" · ")}</p>
        <p className="text-[15px] font-medium mt-1" style={{ color: "#171717" }}>{signal.event_title || "External event"}</p>
        <p className="text-[13px] mt-1 leading-[1.5] max-w-[640px] line-clamp-2" style={{ color: "#686868" }}>{humanReason(signal)}</p>
        <p className="text-[12px] mt-2" style={{ color: "#8A8A86" }}>
          Updated {formatDateTime(signal.last_updated_at || signal.first_detected_at)}
          {confidence !== "UNKNOWN" && ` · ${confidence.charAt(0)}${confidence.slice(1).toLowerCase()} confidence`}
          {` · ${statusLabel(signal.status)}`}
        </p>
      </div>
      <FiChevronRight className="shrink-0 mt-1.5 transition-colors" size={16} style={{ color: "#B5B5B0" }} />
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
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-8">
        <h1 className="text-[28px] lg:text-[32px] leading-[1.15] mb-2" style={{ color: "#171717", fontWeight: 500, letterSpacing: "-0.01em" }}>
          Intelligence
        </h1>
        <p className="text-[14px] max-w-[700px] mb-9" style={{ color: "#686868" }}>
          Changes, risks and opportunities Starlane has detected across your organization and the external environment.
        </p>

        {isLoading && (
          <div>
            {[0, 1, 2].map(i => (
              <div key={i} className="py-6" style={{ borderBottom: "1px solid #E5E5E1" }}>
                <div className="skeleton h-3 w-32 mb-3" />
                <div className="skeleton h-4 w-72 mb-2" />
                <div className="skeleton h-3 w-full max-w-[500px]" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Intelligence is temporarily unavailable"
            message="We couldn't load the latest intelligence. Existing business data remains available."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && signals.length === 0 && (
          <div className="py-16 text-center relative overflow-hidden">
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
              style={{ fontSize: "clamp(56px, 16vw, 140px)", fontWeight: 600, color: "#171717", opacity: 0.03, letterSpacing: "-0.04em", whiteSpace: "nowrap" }}
            >
              Starlane
            </span>
            <div className="relative">
              <p className="text-[15px] font-medium" style={{ color: "#171717" }}>No material changes detected</p>
              <p className="text-[13px] mt-1.5 max-w-[440px] mx-auto" style={{ color: "#8A8A86" }}>
                Starlane hasn't identified a material change from the evidence currently available.
              </p>
            </div>
          </div>
        )}

        {!isLoading && !isError && signals.length > 0 && (
          <div>
            {signals.map((s) => (
              <SignalRow key={s.id} signal={s} onOpen={() => router.push(`/intelligence/${s.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Internal demo control — not a customer-facing product feature.
          Deliberately understated (muted text link, not a button) so it
          never reads as part of the normal product surface. */}
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 pb-8 mt-2 pt-4 border-t border-border flex items-center justify-between">
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

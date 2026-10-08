"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { Chevron, PageHeader, SectionTitle, SkeletonRows } from "@/components/v32/ui";
import { IconRefresh } from "@/components/v32/icons";
import { formatDateTime, confidenceFromScore, humanizeCode } from "@/components/intelligence/format";
import { OFFLINE_LINE } from "@/components/scan/humaneError";
import { api, type IntelligenceSignal } from "@/lib/api";

// Real-status labels only: CANDIDATE, ACTIVE and UPDATED are the only
// statuses the backend emits today (IntelligenceSignal in lib/api.ts). No
// "Needs attention / Monitoring / Resolved" grouping is invented here.
const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  CANDIDATE: { label: "New", tone: "info" },
  UPDATED: { label: "Updated", tone: "attention" },
  ACTIVE: { label: "Active", tone: "neutral" },
};

// The entry point for Starlane's external-world watch: real signals when
// they exist, or an explicit, calm "nothing material" state, never a
// fabricated all-clear and never a blank screen.
function humanReason(signal: IntelligenceSignal): string {
  return signal.related_entity_type === "supplier"
    ? "This event matched a verified supplier location you depend on."
    : "This event matched a recorded business exposure.";
}

// Strip leading warning emoji some agents put in titles; status is a chip.
function cleanTitle(t: string | null | undefined): string {
  return (t || "External event").replace(/^[\p{Extended_Pictographic}️\s]+/u, "").trim() || "External event";
}

// Signal, event, exposed through, confidence, status, updated. One template
// for the header and every row so the columns share alignment lines.
const COLS = "minmax(0,1fr) 148px 132px 104px 112px 132px";

function SignalRow({ signal }: { signal: IntelligenceSignal }) {
  const isExternal = Boolean(signal.event_type);
  const confidence = confidenceFromScore(signal.plausibility_confidence);
  const status = STATUS[signal.status] || { label: humanizeCode(signal.status), tone: "neutral" as StatusTone };
  const updated = signal.last_updated_at || signal.first_detected_at;

  return (
    <Link href={`/intelligence/${signal.id}`} role="row" className="wk-row" style={{ gridTemplateColumns: COLS }}>
      <div className="min-w-0" role="cell">
        <div className="wk-title md:truncate">{cleanTitle(signal.event_title)}</div>
        <div className="wk-sub line-clamp-2 md:truncate">{signal.why_exists || humanReason(signal)}</div>
      </div>
      <div className="wk-cells md:contents">
        <div role="cell" className="wk-sub md:truncate">{isExternal ? humanizeCode(signal.event_type) || "External event" : "Internal signal"}</div>
        <div role="cell" className="wk-sub md:truncate">{signal.related_entity_type ? humanizeCode(signal.related_entity_type) : "—"}</div>
        <div role="cell" className="wk-sub">{confidence !== "UNKNOWN" ? humanizeCode(confidence) : <span style={{ color: "var(--ink-3)" }}>Not known yet</span>}</div>
        <div role="cell"><StatusChip tone={status.tone}>{status.label}</StatusChip></div>
        <div role="cell" className="ml-auto md:ml-0 md:text-right" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          <span className="inline-flex items-center" style={{ gap: 6 }}>
            <span className="tabular-nums">{formatDateTime(updated)}</span>
            <Chevron size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}

const DEMO_CONTROLS_ENABLED = process.env.NEXT_PUBLIC_DEMO_CONTROLS === "true";

export default function IntelligencePage() {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["intelligence-signals"],
    queryFn: () => api.intelligence.signals(),
    staleTime: 15_000,
  });

  const resetMutation = useMutation({
    mutationFn: () => api.demo2xa.reset(),
    onMutate: () => setResetMessage(null),
    onSuccess: () => {
      setResetMessage("Demo reset. The earthquake event was re-triggered through the real relevance pipeline.");
      refetch();
    },
    onError: () => setResetMessage("Reset didn't go through. Try again in a moment."),
  });

  // Several transmission channels can fire for the same (event, supplier)
  // pair; that is correct backend behaviour, but one real-world story should
  // read as one row. Grouped for display only.
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
      <div className="page-stack" style={{ width: "100%", maxWidth: "var(--content-max)" }}>
        <PageHeader
          title="Intelligence"
          subtitle="Outside events that reach your suppliers or customers, and what they put at risk."
        />

        <section>
          <SectionTitle>Open signals{!isLoading && !isError && signals.length > 0 && <span className="wk-count">{signals.length}</span>}</SectionTitle>

          {isLoading && <SkeletonRows rows={3} height={56} />}

          {isError && (
            <ErrorState title="Couldn't load intelligence" message={OFFLINE_LINE} onRetry={() => refetch()} />
          )}

          {!isLoading && !isError && signals.length === 0 && (
            <p className="wk-empty">
              No outside event reaches your business in the evidence Starlane has. A signal shows here as soon as one matches a supplier or customer you depend on.
            </p>
          )}

          {!isLoading && !isError && signals.length > 0 && (
            <div className="wk-list" role="table" aria-label="Open signals">
              <div className="wk-head" role="row" style={{ gridTemplateColumns: COLS }}>
                <span role="columnheader">Signal</span>
                <span role="columnheader">Event</span>
                <span role="columnheader">Reaches</span>
                <span role="columnheader">Confidence</span>
                <span role="columnheader">Status</span>
                <span role="columnheader" style={{ textAlign: "right" }}>Updated</span>
              </div>
              {signals.map((s) => <SignalRow key={s.id} signal={s} />)}
            </div>
          )}
        </section>

        {/* Internal demo control, not a customer feature. The backend only
            honours it for admins on non-production deployments with
            DEMO_RESET_ENABLED=true, so it renders only where the deployment
            opts in; otherwise it would be a dead control. */}
        {DEMO_CONTROLS_ENABLED && (
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Internal: 2xA meeting demo control{resetMessage ? ` · ${resetMessage}` : ""}</span>
            <Button variant="ghost" size="sm" icon={<IconRefresh size={13} />} loading={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
              Reset 2xA demo
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

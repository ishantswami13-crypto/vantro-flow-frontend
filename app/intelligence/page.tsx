"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { EmptyLine, PageHeader, SkeletonRows } from "@/components/v32/ui";
import { IconArrowRight, IconRefresh, IconWatch } from "@/components/v32/icons";
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

function SignalRow({ signal }: { signal: IntelligenceSignal }) {
  const isExternal = Boolean(signal.event_type);
  const confidence = confidenceFromScore(signal.plausibility_confidence);
  const status = STATUS[signal.status] || { label: humanizeCode(signal.status), tone: "neutral" as StatusTone };
  const meta = [
    isExternal ? humanizeCode(signal.event_type) || "External event" : "Internal signal",
    signal.related_entity_type ? `${humanizeCode(signal.related_entity_type)} risk` : null,
    `Updated ${formatDateTime(signal.last_updated_at || signal.first_detected_at)}`,
    confidence !== "UNKNOWN" ? `${humanizeCode(confidence)} confidence` : "Confidence not known yet",
  ].filter(Boolean);

  return (
    <li>
      <Link href={`/intelligence/${signal.id}`} className="row-hover flex items-start" style={{ gap: 16, padding: "16px 12px", margin: "0 -12px", borderRadius: "var(--radius-md)", textDecoration: "none" }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <span style={{ fontSize: 15, color: "var(--ink)" }}>{cleanTitle(signal.event_title)}</span>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: 680 }}>{humanReason(signal)}</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{meta.join(" · ")}</p>
        </div>
        <span aria-hidden="true" className="row-chevron shrink-0" style={{ color: "var(--ink-3)", marginTop: 4, display: "inline-flex", transition: "transform 160ms var(--ease)" }}><IconArrowRight size={14} /></span>
      </Link>
    </li>
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
      <div style={{ width: "100%", maxWidth: "var(--content-max)" }}>
        <PageHeader
          title="Intelligence"
          subtitle="Outside events that reach your suppliers or customers, and what they put at risk."
        />

        <div style={{ marginTop: 24 }}>
          {isLoading && <SkeletonRows rows={3} height={84} />}

          {isError && (
            <ErrorState title="Couldn't load intelligence" message={OFFLINE_LINE} onRetry={() => refetch()} />
          )}

          {!isLoading && !isError && signals.length === 0 && (
            <EmptyLine
              icon={<IconWatch size={17} />}
              title="No material change detected"
              body="Starlane hasn't found an outside event that reaches your business in the evidence it has. New signals appear here as soon as one matches."
            />
          )}

          {!isLoading && !isError && signals.length > 0 && (
            <>
              <div className="flex items-baseline justify-between" style={{ fontSize: 12, color: "var(--ink-3)", paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
                <span>Open signals</span>
                <span className="tabular-nums">{signals.length}</span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {signals.map((s) => <SignalRow key={s.id} signal={s} />)}
              </ul>
            </>
          )}
        </div>

        {/* Internal demo control, not a customer feature. The backend only
            honours it for admins on non-production deployments with
            DEMO_RESET_ENABLED=true, so it renders only where the deployment
            opts in; otherwise it would be a dead control. */}
        {DEMO_CONTROLS_ENABLED && (
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
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

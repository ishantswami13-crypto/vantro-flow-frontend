"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ControlSubnav } from "@/components/control/ControlSubnav";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, Notice, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { decisionsApi, relTime } from "@/lib/decisions";

// Execution control plane for Starlane decisions: pilot mode and kill
// switches. Enforced by the backend outside any model; this page only reads
// and sets them for the signed-in business.

const ACTION_CLASSES: { key: string; label: string }[] = [
  { key: "HOLD_CREDIT", label: "Credit holds" },
  { key: "CONTACT_CUSTOMER", label: "Customer messages" },
  { key: "OFFER_PAYMENT_PLAN", label: "Payment plans" },
  { key: "CREATE_DUNNING_RULES", label: "Reminder rules" },
  { key: "CHANGE_PAYMENT_TERMS", label: "Payment terms" },
  { key: "CREATE_PO", label: "Purchase orders" },
];

export default function DecisionControlsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["decision-controls"], queryFn: decisionsApi.controls });
  const [confirmLive, setConfirmLive] = useState(false);
  const set = useMutation({
    mutationFn: decisionsApi.setControls,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decision-controls"] });
      qc.invalidateQueries({ queryKey: ["decisions-today"] });
      setConfirmLive(false);
    },
  });
  const c = q.data;
  const stopped = (scope: string, key: string) => !!c?.controls.find((x) => x.scope === scope && x.scope_key === key && x.stopped);
  const tenantStopped = stopped("TENANT", "tenant");
  const agentStopped = c ? stopped("AGENT", c.agent.key) : false;

  return (
    <DashboardLayout pageTitle="Control">
      <div className="max-w-[1000px] mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <h1 className="text-[30px] lg:text-[34px] mb-4" style={{ color: C.ink }}>Control</h1>
        <ControlSubnav active="decisions" />

        {q.isLoading && <Skeleton rows={2} />}
        {q.isError && <div className="mt-6"><ErrorState title="Couldn't load controls" message={(q.error as Error).message} onRetry={() => q.refetch()} /></div>}
        {set.isError && <div className="mt-6"><Notice tone="bad" title="Change not saved">{(set.error as Error).message}</Notice></div>}

        {c && (
          <>
            {c.globalStop && (
              <div className="mt-6"><Notice tone="bad" title="Operator stop is on">Starlane&apos;s operator has paused all decision actions. This overrides the settings below.</Notice></div>
            )}

            <section className="mt-8">
              <SectionLabel>Pilot mode</SectionLabel>
              <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: `1px solid ${C.line}` }}>
                <div className="flex flex-wrap items-center gap-3">
                  {c.pilotMode === "SHADOW" ? <Pill tone="accent">Shadow</Pill> : <Pill tone="good">Live</Pill>}
                  <p className="text-[13px] flex-1 min-w-[240px]" style={{ color: C.body }}>
                    {c.pilotMode === "SHADOW"
                      ? "Approved decisions are recorded exactly as they would run, but nothing is changed. Use this to see how Starlane would act before trusting it."
                      : "Approved decisions are carried out and each step is checked in the system it changed. Customer messages are still prepared for your approval."}
                  </p>
                  {c.pilotMode === "SHADOW" ? (
                    confirmLive ? (
                      <div className="flex gap-2">
                        <Button size="sm" loading={set.isPending} onClick={() => set.mutate({ pilotMode: "LIVE" })}>Yes, go live</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmLive(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirmLive(true)}>Switch to live</Button>
                    )
                  ) : (
                    <Button size="sm" variant="secondary" loading={set.isPending} onClick={() => set.mutate({ pilotMode: "SHADOW" })}>Back to shadow</Button>
                  )}
                </div>
                <p className="text-[12px] mt-3" style={{ color: C.faint }}>
                  Customer messages: {c.externalSendEnabled ? "can be sent after your approval" : "drafts only, sending is switched off"}. Autonomy ceiling: {c.autonomyCeiling}. Every action still needs your approval.
                </p>
              </div>
            </section>

            <section className="mt-8">
              <SectionLabel>Stop switches</SectionLabel>
              <div className="rounded-2xl" style={{ background: "var(--surface)", border: `1px solid ${C.line}` }}>
                {[
                  { scope: "TENANT", key: "tenant", label: "Stop everything", detail: "No analysis runs and no action executes for this business." },
                  { scope: "AGENT", key: c.agent.key, label: "Stop the decision engine", detail: `${c.agent.key} ${c.agent.version} (${c.agent.model}).` },
                  ...ACTION_CLASSES.map((a) => ({ scope: "ACTION_CLASS", key: a.key, label: `Stop ${a.label.toLowerCase()}`, detail: "Decisions that need this action cannot run." })),
                ].map((row, i) => {
                  const on = row.scope === "TENANT" ? tenantStopped : row.scope === "AGENT" ? agentStopped : stopped(row.scope, row.key);
                  const rec = c.controls.find((x) => x.scope === row.scope && x.scope_key === row.key);
                  return (
                    <div key={`${row.scope}:${row.key}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}>
                      <div className="flex-1 min-w-[220px]">
                        <p className="text-[13px]" style={{ color: C.ink, fontWeight: 500 }}>{row.label}</p>
                        <p className="text-[12px]" style={{ color: C.faint }}>{row.detail}{rec ? ` Last changed ${relTime(rec.set_at)}.` : ""}</p>
                      </div>
                      {on && <Pill tone="bad">Stopped</Pill>}
                      <Button
                        size="xs"
                        variant={on ? "secondary" : "ghost"}
                        loading={set.isPending && set.variables?.scope === row.scope && set.variables?.scopeKey === row.key}
                        onClick={() => set.mutate({ scope: row.scope, scopeKey: row.key, stopped: !on, reason: on ? undefined : `${row.label} (set in Control)` })}
                      >
                        {on ? "Resume" : "Stop"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

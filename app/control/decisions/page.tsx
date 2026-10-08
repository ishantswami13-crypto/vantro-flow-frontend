"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ControlHeader, ControlPage } from "@/components/control/ControlSubnav";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { SkeletonRows } from "@/components/v32/ui";
import { IconAlert } from "@/components/v32/icons";
import { OFFLINE } from "@/components/connectors/health";
import { formatDateTime, formatRelative } from "@/lib/format";
import { decisionsApi } from "@/lib/decisions";

// Execution control plane for Starlane decisions: pilot mode and stop
// switches. Enforced by the backend outside any model; this page only reads
// and sets them for the signed-in business (GET/POST /api/decisions/controls).

const ACTION_CLASSES: { key: string; label: string }[] = [
  { key: "HOLD_CREDIT", label: "Credit holds" },
  { key: "CONTACT_CUSTOMER", label: "Customer messages" },
  { key: "OFFER_PAYMENT_PLAN", label: "Payment plans" },
  { key: "CREATE_DUNNING_RULES", label: "Reminder rules" },
  { key: "CHANGE_PAYMENT_TERMS", label: "Payment terms" },
  { key: "CREATE_PO", label: "Purchase orders" },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{title}</h2>
      {hint && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-3)", maxWidth: 640 }}>{hint}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start" style={{ gap: 10, padding: "12px 14px", borderRadius: 8, background: "rgb(var(--tk-critical) / 0.08)", border: "1px solid rgb(var(--tk-critical) / 0.25)" }}>
      <span style={{ color: "var(--critical)", display: "inline-flex", marginTop: 1 }}><IconAlert size={15} /></span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
}

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
  const shadow = c?.pilotMode === "SHADOW";

  const rows = c ? [
    { scope: "TENANT", key: "tenant", label: "Stop everything", detail: "No analysis runs and no action executes for this business." },
    { scope: "AGENT", key: c.agent.key, label: "Stop the decision engine", detail: `${c.agent.key} ${c.agent.version} (${c.agent.model}).` },
    ...ACTION_CLASSES.map((a) => ({ scope: "ACTION_CLASS", key: a.key, label: `Stop ${a.label.toLowerCase()}`, detail: "Decisions that need this action cannot run." })),
  ] : [];

  return (
    <DashboardLayout pageTitle="Control">
      <style>{`
        .sw-row { display: grid; align-items: center; gap: 8px 16px; padding: 12px 10px; border-bottom: 1px solid var(--line); min-height: 56px;
          grid-template-columns: minmax(0, 1fr) auto; }
        @media (min-width: 760px) { .sw-row { grid-template-columns: minmax(0, 1fr) 90px 96px; } }
      `}</style>
      <ControlPage>
        <ControlHeader active="decisions" subtitle="Pilot mode and stop switches. The backend enforces these outside any model." />

        {q.isLoading && <SkeletonRows rows={4} height={56} />}
        {q.isError && <ErrorState title="Couldn't load decision controls" message={OFFLINE} onRetry={() => q.refetch()} />}
        {set.isError && <Notice title="That change wasn't saved">{OFFLINE}</Notice>}

        {c && (
          <div className="fade-once flex flex-col" style={{ gap: 36 }}>
            {c.globalStop && (
              <Notice title="Operator stop is on">Starlane&apos;s operator has paused all decision actions. This overrides the settings below.</Notice>
            )}

            <Section title="Pilot mode">
              <div className="ui-panel flex flex-wrap items-start" style={{ padding: 18, gap: 16 }}>
                <div className="min-w-0" style={{ flex: "1 1 320px" }}>
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{shadow ? "Shadow" : "Live"}</span>
                    <StatusChip tone={shadow ? "info" : "positive"}>{shadow ? "Nothing is changed" : "Approved decisions run"}</StatusChip>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
                    {shadow
                      ? "Approved decisions are recorded exactly as they would run, but nothing is changed. Use this to see how Starlane would act before trusting it."
                      : "Approved decisions are carried out and each step is checked in the system it changed. Customer messages are still prepared for your approval."}
                  </p>
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>
                    Customer messages: {c.externalSendEnabled ? "can be sent after your approval" : "drafts only, sending is switched off"}. Autonomy ceiling: {c.autonomyCeiling}. Every action still needs your approval.
                  </p>
                </div>
                {shadow
                  ? <Button variant="secondary" onClick={() => setConfirmLive(true)}>Switch to live</Button>
                  : <Button variant="secondary" loading={set.isPending && set.variables?.pilotMode === "SHADOW"} onClick={() => set.mutate({ pilotMode: "SHADOW" })}>Back to shadow</Button>}
              </div>
            </Section>

            <Section title="Stop switches" hint="A stop takes effect immediately and stays on until you resume it.">
              <div style={{ borderTop: "1px solid var(--line)" }}>
                {rows.map((row) => {
                  const on = row.scope === "TENANT" ? tenantStopped : row.scope === "AGENT" ? agentStopped : stopped(row.scope, row.key);
                  const rec = c.controls.find((x) => x.scope === row.scope && x.scope_key === row.key);
                  const busy = set.isPending && set.variables?.scope === row.scope && set.variables?.scopeKey === row.key;
                  return (
                    <div key={`${row.scope}:${row.key}`} className="sw-row">
                      <div className="min-w-0">
                        <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: row.scope === "TENANT" ? 500 : 400 }}>{row.label}</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                          {row.detail}
                          {rec ? <span title={formatDateTime(rec.set_at)}> Last changed {formatRelative(rec.set_at)}.</span> : null}
                        </div>
                      </div>
                      <div className="hidden md:block">{on ? <StatusChip tone="critical">Stopped</StatusChip> : <StatusChip tone="positive">Running</StatusChip>}</div>
                      <div className="flex items-center justify-end" style={{ gap: 8 }}>
                        <span className="md:hidden">{on && <StatusChip tone="critical">Stopped</StatusChip>}</span>
                        <Button
                          size="sm"
                          variant={on ? "secondary" : row.scope === "TENANT" ? "danger" : "ghost"}
                          loading={busy}
                          onClick={() => set.mutate({ scope: row.scope, scopeKey: row.key, stopped: !on, reason: on ? undefined : `${row.label} (set in Control)` })}
                        >
                          {on ? "Resume" : "Stop"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}
      </ControlPage>

      <Modal
        open={confirmLive}
        onClose={() => setConfirmLive(false)}
        title="Switch to live?"
        description="Approved decisions will be carried out and each step checked in the system it changed. Every action still needs your approval, and you can go back to shadow at any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLive(false)}>Cancel</Button>
            <Button variant="primary" loading={set.isPending && set.variables?.pilotMode === "LIVE"} onClick={() => set.mutate({ pilotMode: "LIVE" })}>Go live</Button>
          </>
        }
      />
    </DashboardLayout>
  );
}

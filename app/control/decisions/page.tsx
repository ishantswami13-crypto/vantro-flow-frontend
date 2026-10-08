"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ControlHeader, ControlPage, ControlSection as Section } from "@/components/control/ControlSubnav";
import { controlStyles as cs } from "@/components/control/Authority";
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

  type SwitchRow = { scope: string; key: string; label: string; detail?: string };
  const engineRows: SwitchRow[] = c ? [
    { scope: "TENANT", key: "tenant", label: "Everything", detail: "No analysis runs and no action executes for this business." },
    { scope: "AGENT", key: c.agent.key, label: "Decision engine", detail: `${c.agent.key} ${c.agent.version} (${c.agent.model})` },
  ] : [];
  const actionRows: SwitchRow[] = ACTION_CLASSES.map((a) => ({ scope: "ACTION_CLASS", key: a.key, label: a.label }));

  const switchRow = (row: SwitchRow) => {
    if (!c) return null;
    const on = row.scope === "TENANT" ? tenantStopped : row.scope === "AGENT" ? agentStopped : stopped(row.scope, row.key);
    const rec = c.controls.find((x) => x.scope === row.scope && x.scope_key === row.key);
    // With everything stopped, a switch that is still on cannot run either.
    const held = !on && row.scope !== "TENANT" && (tenantStopped || c.globalStop);
    const busy = set.isPending && set.variables?.scope === row.scope && set.variables?.scopeKey === row.key;
    const meta = [row.detail, rec ? `Last changed ${formatRelative(rec.set_at)}` : null].filter(Boolean).join(" · ");
    return (
      <div key={`${row.scope}:${row.key}`} className="sw-row ops-row ops-static">
        <div className="min-w-0">
          <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: row.scope === "TENANT" ? 500 : 400 }}>{row.label}</div>
          {meta && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }} title={rec ? formatDateTime(rec.set_at) : undefined}>{meta}</div>}
        </div>
        <div className="hidden md:block">{on ? <StatusChip tone="critical">Stopped</StatusChip> : held ? <StatusChip tone="unknown" title="Everything is stopped, so this cannot run either">Held</StatusChip> : <StatusChip tone="positive" className="chip-quiet">Running</StatusChip>}</div>
        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <span className="md:hidden">{on && <StatusChip tone="critical">Stopped</StatusChip>}</span>
          <Button
            size="sm"
            variant={on ? "secondary" : "ghost"}
            loading={busy}
            onClick={() => set.mutate({ scope: row.scope, scopeKey: row.key, stopped: !on, reason: on ? undefined : `Stop ${row.label.toLowerCase()} (set in Control)` })}
          >
            {on ? "Resume" : "Stop"}
          </Button>
        </div>
      </div>
    );
  };

  const stoppedActions = c ? ACTION_CLASSES.filter((a) => stopped("ACTION_CLASS", a.key)).length : 0;

  // "Everything": the one switch that halts all analysis and execution.
  const masterRow = () => {
    if (!c) return null;
    const rec = c.controls.find((x) => x.scope === "TENANT" && x.scope_key === "tenant");
    const busy = set.isPending && set.variables?.scope === "TENANT";
    return (
      <div className={cs.master}>
        <div className="min-w-0">
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <span className={cs.masterName}>Everything</span>
            {tenantStopped ? <StatusChip tone="critical">Stopped</StatusChip> : <StatusChip tone="positive" className="chip-quiet">Running</StatusChip>}
          </div>
          <div className={cs.masterDetail} title={rec ? formatDateTime(rec.set_at) : undefined}>
            No analysis runs and no action executes for this business.{rec ? ` Last changed ${formatRelative(rec.set_at)}.` : ""}
          </div>
        </div>
        <Button
          variant={tenantStopped ? "secondary" : "danger"}
          loading={busy}
          onClick={() => set.mutate({ scope: "TENANT", scopeKey: "tenant", stopped: !tenantStopped, reason: tenantStopped ? undefined : "Stop everything (set in Control)" })}
        >
          {tenantStopped ? "Resume everything" : "Stop everything"}
        </Button>
      </div>
    );
  };

  return (
    <DashboardLayout pageTitle="Decisions">
      <style>{`
        .sw-row { display: grid; align-items: center; gap: 8px 16px; padding: 10px 0; min-height: 46px;
          grid-template-columns: minmax(0, 1fr) auto; }
        @media (min-width: 760px) { .sw-row { grid-template-columns: minmax(0, 1fr) 96px 84px; } }
      `}</style>
      <ControlPage>
        <ControlHeader active="decisions" subtitle="Pilot mode and stop switches, enforced by the backend outside any model." />

        {q.isLoading && <SkeletonRows rows={4} height={56} />}
        {q.isError && <ErrorState title="Couldn't load decision controls" message={OFFLINE} onRetry={() => q.refetch()} />}
        {set.isError && <Notice title="That change wasn't saved">{OFFLINE}</Notice>}

        {c && (
          <div className="fade-once flex flex-col" style={{ gap: 36 }}>
            {c.globalStop && (
              <Notice title="Operator stop is on">Starlane&apos;s operator has paused all decision actions. This overrides the settings below.</Notice>
            )}

            <section className={cs.band} aria-labelledby="pilot-title">
              <div className={cs.bandHead}>
                <h2 id="pilot-title" className="section-label section-label-lead">Pilot mode</h2>
              </div>
              <div className={cs.mode}>
                <div className="min-w-0" style={{ flex: "1 1 360px" }}>
                  <div className={cs.modeLine}>
                    <span className={cs.modeName}>{shadow ? "Shadow" : "Live"}</span>
                    <StatusChip tone={shadow ? "info" : "positive"} className="chip-quiet">{shadow ? "Nothing is changed" : "Approved decisions run"}</StatusChip>
                  </div>
                  <p className={cs.modeBody}>
                    {shadow
                      ? "Approved decisions are recorded exactly as they would run, but nothing is changed. Use this to see how Starlane would act before trusting it."
                      : "Approved decisions are carried out and each step is checked in the system it changed. Customer messages are still prepared for your approval."}
                  </p>
                </div>
                {shadow
                  ? <Button variant="secondary" onClick={() => setConfirmLive(true)}>Switch to live</Button>
                  : <Button variant="secondary" loading={set.isPending && set.variables?.pilotMode === "SHADOW"} onClick={() => set.mutate({ pilotMode: "SHADOW" })}>Back to shadow</Button>}
              </div>
              <dl className={cs.bandFacts}>
                <div><dt>Customer messages</dt><dd>{c.externalSendEnabled ? "Sent after your approval" : "Drafts only, sending is off"}</dd></div>
                <div><dt>Autonomy ceiling</dt><dd className="num">{c.autonomyCeiling}</dd></div>
                <div><dt>Approval</dt><dd>Every action</dd></div>
              </dl>
            </section>

            <Section title="Stop switches" hint="A stop takes effect immediately and stays on until you resume it.">
              {masterRow()}
              <div className="ops-list" style={{ borderTop: "none" }}>{engineRows.filter((r) => r.scope !== "TENANT").map(switchRow)}</div>
            </Section>

            <Section title="Stop by action" hint={stoppedActions ? `${stoppedActions} stopped. Decisions that need a stopped action cannot run.` : "Decisions that need a stopped action cannot run."}>
              <div className={cs.switchGrid}>{actionRows.map(switchRow)}</div>
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

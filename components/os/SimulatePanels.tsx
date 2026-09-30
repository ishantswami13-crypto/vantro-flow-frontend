"use client";

// SIMULATE: replay an automation over history before it runs. Each weekly
// replay only sees data known on that date (the backend asserts it), so the
// replay cannot peek at payments that came later.

import React, { useState } from "react";
import { C, Pill, Skeleton, Stat } from "@/components/decisions/ui";
import { osApi, Workflow, Replay, WORKFLOW_STATUS_LABEL } from "@/lib/os";
import { money, pct, shortDate } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, useLoad } from "./shared";

export function WorkflowReplays() {
  const { data, error, loading } = useLoad(() => osApi.workflows("PROPOSED,SHADOW,WITH_APPROVAL,PAUSED"));
  const list = data?.workflows || [];
  return (
    <Panel title="Automation replays" subtitle="What a workflow would have done over the last months, using only what was known each week.">
      {loading && <Skeleton rows={2} />}
      <ErrorLine error={error ? errorText(error) : null} />
      {!loading && !error && list.length === 0 && <Muted>No workflow to replay. Run a scan to see what could be automated.</Muted>}
      {list.map((w) => <ReplayRow key={w.id} w={w} />)}
    </Panel>
  );
}

function ReplayRow({ w }: { w: Workflow }) {
  const [sim, setSim] = useState<Replay | null>(w.simulation);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rerun = async () => {
    setBusy(true); setErr(null);
    try { setSim((await osApi.simulate(w.id)).simulation); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{w.name}</p>
          <p className="text-[12px]" style={{ color: C.faint }}>{w.trigger.description}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Pill tone="accent">{WORKFLOW_STATUS_LABEL[w.status] || w.status}</Pill>
          <Btn onClick={rerun} disabled={busy}>{busy ? "Replaying…" : "Replay again"}</Btn>
        </div>
      </div>
      <ErrorLine error={err} />
      {!sim && <Muted>Not replayed yet.</Muted>}
      {sim && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Would have fired" value={sim.episodes} sub={`${sim.perMonth} a month`} />
            <Stat label="Amount it covered" value={money(sim.amountTriggered)} />
            <Stat label="Paid anyway in 7 days" value={`${sim.paidWithinWindowWithoutAction}`} sub={`baseline ${pct(sim.baselineRate)}`} />
            <Stat label="Checking time saved" value={`${sim.humanHoursPerMonth}h`} sub="a month, estimate" />
          </div>
          <p className="text-[12px] mt-3" style={{ color: C.muted }}>
            {sim.replays} weekly replays over {sim.lookbackDays} days. Future data: {sim.leakage}.
          </p>
          <p className="text-[12px] mt-1" style={{ color: C.warn }}>{sim.cannotSay}</p>
          {sim.sample.length > 0 && (
            <details className="mt-2">
              <summary className="text-[12.5px] cursor-pointer" style={{ color: C.accent }}>Show {sim.sample.length} example firings</summary>
              <table className="w-full mt-2 text-[12px]" style={{ color: C.body }}>
                <thead><tr style={{ color: C.faint }}><th className="text-left font-normal">Week of</th><th className="text-left font-normal">Customer</th><th className="text-right font-normal">Owed</th><th className="text-right font-normal">Paid in 7 days</th></tr></thead>
                <tbody>
                  {sim.sample.map((s, i) => (
                    <tr key={i}><td>{shortDate(s.asOf)}</td><td>{s.customer}</td><td className="text-right">{money(s.amount)}</td><td className="text-right">{s.paidWithinWindow ? "yes" : "no"}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      )}
    </Row>
  );
}

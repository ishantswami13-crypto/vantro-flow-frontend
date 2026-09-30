"use client";

// MEMORY: what Starlane has learned. Workflow outcomes are checked in the
// ledger (a payment arrived, not "a message was prepared") and compared
// with what was expected without any action. Knowledge stays split by kind:
// a person's remark is never shown as a measured pattern.

import React, { useState } from "react";
import { C, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { osApi, KIND_LABEL, KnowledgeItem } from "@/lib/os";
import { money, pct, shortDate } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, useLoad } from "./shared";

const REC_LABEL: Record<string, string> = {
  KEEP_MEASURING: "Keep measuring",
  MOVE_TO_APPROVAL: "Move to approval",
  EXPAND: "Expand",
  STOP: "Stop",
  MODIFY: "Change trigger or tone",
};
const MODE_LABEL: Record<string, string> = { SHADOW: "In shadow (nothing sent)", LIVE: "Approved and sent by a person" };

export function MemoryLearning() {
  const { data, error, loading, reload } = useLoad(() => osApi.memory());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const verify = async () => {
    setBusy(true); setErr(null); setNote(null);
    try {
      const r = await osApi.verify();
      setNote(r.checked ? `Checked ${r.checked}: ${r.met} paid, ${r.notMet} not paid, ${r.pending} not due yet.` : "Nothing is due to be checked yet.");
      reload();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const kinds = Object.entries(data?.knowledge || {}) as [string, KnowledgeItem[]][];
  const order = ["LEARNED_PATTERN", "OBSERVED_FACT", "SOURCE_CLAIM", "HUMAN_OBSERVATION", "HYPOTHESIS", "INFERENCE", "SEMANTIC_DEFINITION", "POLICY"];
  kinds.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

  return (
    <div className="space-y-4">
      <Panel
        title="Did it work?"
        subtitle="Each follow-up is checked against the ledger after 7 days and compared with how often customers paid without one."
        right={<Btn onClick={verify} disabled={busy}>{busy ? "Checking…" : "Check outcomes now"}</Btn>}
      >
        {loading && <Skeleton rows={2} />}
        {note && <p className="text-[12.5px] mb-2" style={{ color: C.good }}>{note}</p>}
        <ErrorLine error={err || (error ? errorText(error) : null)} />
        {data && data.outcomes.length === 0 && <Muted>No outcome has been checked yet. The first check is 7 days after the first approval; nothing is claimed before then.</Muted>}
        {data?.outcomes.map((o) => (
          <Row key={o.workflowId}>
            <p className="text-[14px] mb-2" style={{ color: C.ink, fontWeight: 600 }}>{o.name}</p>
            {Object.entries(o.byMode).map(([mode, m]) => (
              <div key={mode} className="mb-2">
                <p className="text-[12px]" style={{ color: C.faint }}>{MODE_LABEL[mode] || mode}</p>
                <p className="text-[13px]" style={{ color: C.body }}>
                  {m.met} of {m.resolved} paid within 7 days: <strong style={{ fontWeight: 600 }}>{pct(m.observedRate)}</strong> observed against <strong style={{ fontWeight: 600 }}>{pct(m.expectedRate)}</strong> expected without a reminder
                  {m.interval80 ? ` (likely range ${pct(m.interval80[0])} to ${pct(m.interval80[1])})` : ""}. {money(m.collected)} collected.
                </p>
                <p className="text-[12.5px] mt-1" style={{ color: C.body }}><Pill tone="accent">{REC_LABEL[m.recommendation] || m.recommendation}</Pill> <span className="ml-1">{m.why}</span></p>
              </div>
            ))}
          </Row>
        ))}
        {data && data.recentOutcomes.length > 0 && (
          <Row>
            <SectionLabel>Recently checked</SectionLabel>
            {data.recentOutcomes.slice(0, 8).map((i) => (
              <p key={i.id} className="text-[12.5px]" style={{ color: C.body }}>
                {i.target} · {money(i.amount, i.currency)} · <span style={{ color: i.outcomeStatus === "MET" ? C.good : i.outcomeStatus === "NOT_MET" ? C.bad : C.muted }}>{i.outcomeStatus === "MET" ? `paid${i.outcome?.collected ? ` ${money(i.outcome.collected, i.currency)}` : ""}` : i.outcomeStatus === "NOT_MET" ? "not paid" : "could not tell"}</span>
                {i.verifyAfter ? ` · checked after ${shortDate(i.verifyAfter)}` : ""}
              </p>
            ))}
          </Row>
        )}
      </Panel>

      <Panel title="What Starlane knows" subtitle="Kept apart by where it came from. Only learned patterns are measured, and each shows its sample size.">
        {data && kinds.length === 0 && <Muted>Nothing yet. Teach Starlane on the Bridge, or let a workflow run and be checked.</Muted>}
        {kinds.map(([kind, items]) => (
          <Row key={kind}>
            <SectionLabel>{KIND_LABEL[kind] || kind}</SectionLabel>
            {items.slice(0, 6).map((k) => (
              <div key={k.id} className="mb-2">
                <p className="text-[13px]" style={{ color: k.status === "QUARANTINED" ? C.faint : C.ink }}>{k.statement}</p>
                <p className="text-[11.5px]" style={{ color: C.faint }}>
                  {k.sample_count != null ? `${k.sample_count} cases · ` : ""}
                  {k.scope?.name ? `about ${k.scope.name} · ` : ""}
                  {k.authority === "engine" ? "measured by Starlane" : k.authority === "document" ? "from a document" : "said by a person"}
                  {k.status === "QUARANTINED" ? " · quarantined, not used" : ""}
                </p>
              </div>
            ))}
          </Row>
        ))}
      </Panel>
    </div>
  );
}

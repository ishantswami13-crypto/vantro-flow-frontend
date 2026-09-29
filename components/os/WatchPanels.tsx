"use client";

// WATCH: the morning brief and business objectives. Health and forecast
// are computed by the backend (seeded simulation over payment behaviour);
// autopilot only runs a workflow a person already deployed.

import React, { useState } from "react";
import Link from "next/link";
import { C, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { osApi, Objective, AutopilotMode, AUTOPILOT_LABEL, HEALTH_LABEL } from "@/lib/os";
import { relTime } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, healthTone, useLoad } from "./shared";

const BRIEF_TONE = { positive: "good", negative: "bad", attention: "warn", neutral: "neutral" } as const;

export function WatchBrief() {
  const { data, error, loading } = useLoad(() => osApi.brief());
  return (
    <Panel title="Today's brief" subtitle="Only what changed or needs someone. Everything on track is left out.">
      {loading && <Skeleton rows={2} />}
      <ErrorLine error={error ? errorText(error) : null} />
      {data && (
        <ul className="space-y-2">
          {data.lines.map((l, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="mt-[6px] h-[7px] w-[7px] rounded-full shrink-0" style={{ background: { good: C.good, bad: C.bad, warn: C.warn, neutral: C.faint }[BRIEF_TONE[l.tone] || "neutral"] }} aria-hidden />
              <span className="text-[13.5px] leading-[1.55]" style={{ color: C.ink }}>{l.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const MODES: AutopilotMode[] = ["WATCH", "RECOMMEND", "PREPARE", "EXECUTE_WITH_APPROVAL"];

export function ObjectivesPanel() {
  const objectives = useLoad(() => osApi.objectives());
  const templates = useLoad(() => osApi.templates());
  const [target, setTarget] = useState("15");
  const [horizon, setHorizon] = useState("30");
  const [mode, setMode] = useState<AutopilotMode>("PREPARE");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const collections = templates.data?.templates.find((t) => t.key === "COLLECTIONS_AUTOPILOT");
  const blocked = (templates.data?.templates || []).filter((t) => t.availability === "BLOCKED");
  const hasCollections = (objectives.data?.objectives || []).some((o) => o.templateKey === "COLLECTIONS_AUTOPILOT" && o.status === "ACTIVE");

  const create = async () => {
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await osApi.createObjective({ templateKey: "COLLECTIONS_AUTOPILOT", metricKey: "overdue_share_pct", operator: "<=", target: Number(target), horizonDays: Number(horizon), autopilotMode: mode });
      setResult(`${r.evaluation.explanation}${r.autopilot?.why ? ` ${r.autopilot.why}` : ""}`);
      objectives.reload();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const reevaluate = async () => {
    setBusy(true); setErr(null);
    try { await osApi.evaluateObjectives(); objectives.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const list = objectives.data?.objectives || [];
  return (
    <Panel
      title="Objectives"
      subtitle="A target the business is steering towards, checked against the ledger and forecast forward."
      right={list.length > 0 ? <Btn onClick={reevaluate} disabled={busy}>Check again</Btn> : undefined}
    >
      {objectives.loading && <Skeleton rows={2} />}
      {list.map((o) => <ObjectiveRow key={o.id} o={o} />)}

      {collections && !hasCollections && (
        <Row>
          <SectionLabel>Collections autopilot</SectionLabel>
          <p className="text-[12.5px] mb-2" style={{ color: C.muted }}>{collections.detail}</p>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex flex-wrap gap-2 items-center text-[12.5px]" style={{ color: C.body }}>
            <span>Keep overdue share at most</span>
            <input type="number" min={0} max={100} value={target} onChange={(e) => setTarget(e.target.value)} className="w-[64px] rounded-md px-2 py-[5px]" style={{ border: `1px solid ${C.line}` }} aria-label="Target percent" />
            <span>% within</span>
            <input type="number" min={7} max={180} value={horizon} onChange={(e) => setHorizon(e.target.value)} className="w-[64px] rounded-md px-2 py-[5px]" style={{ border: `1px solid ${C.line}` }} aria-label="Horizon days" />
            <span>days, and</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as AutopilotMode)} className="rounded-md px-2 py-[5px]" style={{ border: `1px solid ${C.line}` }} aria-label="Autopilot mode">
              {MODES.map((m) => <option key={m} value={m}>{AUTOPILOT_LABEL[m].toLowerCase()}</option>)}
            </select>
            <Btn primary type="submit" disabled={busy}>{busy ? "Checking…" : "Set objective"}</Btn>
          </form>
          <p className="text-[11.5px] mt-2" style={{ color: C.faint }}>Acting within policy without approval is not offered. Every reminder waits for a person.</p>
        </Row>
      )}
      {result && <p className="text-[12.5px] mt-2" style={{ color: C.body }}>{result}</p>}
      <ErrorLine error={err || (objectives.error ? errorText(objectives.error) : null)} />

      {blocked.length > 0 && (
        <Row>
          <SectionLabel>Not available yet</SectionLabel>
          <ul className="space-y-1">
            {blocked.map((t) => <li key={t.key} className="text-[12.5px]" style={{ color: C.muted }}><span style={{ color: C.body, fontWeight: 500 }}>{t.name}:</span> {t.detail}</li>)}
          </ul>
        </Row>
      )}
    </Panel>
  );
}

function ObjectiveRow({ o }: { o: Objective }) {
  const f = o.latest?.forecast;
  const last = f?.points?.[f.points.length - 1];
  const unit = o.metric.endsWith("_pct") ? "%" : "";
  return (
    <Row>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div style={{ minWidth: 0 }}>
          <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{o.name} {o.operator === "<=" ? "at most" : "at least"} {o.target}{unit}</p>
          <p className="text-[12px] mt-[2px]" style={{ color: C.faint }}>Within {o.horizonDays} days · {AUTOPILOT_LABEL[o.autopilotMode]} · checked {relTime(o.lastEvaluatedAt)}</p>
        </div>
        <Pill tone={healthTone(o.health)}>{HEALTH_LABEL[o.health] || o.health}</Pill>
      </div>
      {f?.explanation && <p className="text-[13px] mt-2 leading-[1.55]" style={{ color: C.body }}>{f.explanation}</p>}
      {f?.points && f.points.length > 0 && (
        <div className="flex gap-3 mt-2 flex-wrap">
          {f.points.map((p) => (
            <div key={p.day} className="text-[11.5px]" style={{ color: C.muted }}>
              <span style={{ color: C.faint }}>day {p.day}</span> <span style={{ color: C.ink, fontWeight: 500 }}>{p.p50}{unit}</span> <span style={{ color: C.faint }}>({p.p10} to {p.p90}{unit})</span>
            </div>
          ))}
        </div>
      )}
      {o.latest?.confidence && o.latest.confidence.reasons.length > 0 && (
        <p className="text-[12px] mt-1" style={{ color: C.warn }}>Confidence {o.latest.confidence.level.toLowerCase()}: {o.latest.confidence.reasons.join("; ")}</p>
      )}
      {last && o.workflowId && (
        <p className="text-[12px] mt-2"><Link href="/missions" className="underline" style={{ color: C.accent }}>The overdue follow-up workflow works towards this</Link></p>
      )}
      {!f && <Muted>Not evaluated yet.</Muted>}
    </Row>
  );
}

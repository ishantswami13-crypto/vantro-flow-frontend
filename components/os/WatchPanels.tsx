"use client";

// WATCH: the morning brief and business objectives. Health and forecast
// are computed by the backend (seeded simulation over payment behaviour);
// autopilot only runs a workflow a person already deployed.

import React, { useState } from "react";
import Link from "next/link";
import { osApi, Objective, AutopilotMode, AUTOPILOT_LABEL, HEALTH_LABEL } from "@/lib/os";
import { formatRelative, formatCount } from "@/lib/format";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/v32/ui";
import { IconArrowRight } from "@/components/v32/icons";
import { useLoad } from "./shared";
import { QuietError, QuietLine, SectionHead, plain } from "./bridge/kit";

const BRIEF_CHIP: Record<string, { tone: StatusTone; label: string } | undefined> = {
  negative: { tone: "critical", label: "Off track" },
  attention: { tone: "attention", label: "Needs a look" },
};

export function WatchBrief() {
  const { data, error, loading, reload } = useLoad(() => osApi.brief());
  return (
    <section aria-labelledby="brief-h" className="min-w-0">
      <SectionHead id="brief-h" title="Today's brief" meta={data?.generatedAt ? formatRelative(data.generatedAt) : undefined} />
      <p style={{ margin: "-4px 0 12px", fontSize: 13, color: "var(--ink-2)" }}>Only what changed or needs someone. Everything on track is left out.</p>
      {loading && !data && <SkeletonRows rows={3} height={44} />}
      {error && !data ? <QuietError onRetry={reload} /> : null}
      {data && (data.lines.length === 0 ? (
        <QuietLine>Nothing to report today.</QuietLine>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", borderTop: "1px solid var(--line)" }}>
          {data.lines.map((l, i) => {
            const chip = BRIEF_CHIP[l.tone];
            return (
              <li key={i} className="flex items-start" style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <span className="flex-1 min-w-0 tabular-nums" style={{ fontSize: 13.5, lineHeight: 1.55, color: l.tone === "positive" || l.tone === "neutral" ? "var(--body)" : "var(--ink)" }}>{plain(l.text)}</span>
                {chip && <StatusChip tone={chip.tone} className="shrink-0">{chip.label}</StatusChip>}
              </li>
            );
          })}
        </ul>
      ))}
    </section>
  );
}

const MODES: AutopilotMode[] = ["WATCH", "RECOMMEND", "PREPARE", "EXECUTE_WITH_APPROVAL"];

const HEALTH_TONE: Record<string, StatusTone> = { ON_TRACK: "positive", AT_RISK: "attention", OFF_TRACK: "critical", UNKNOWN: "unknown" };

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
    } catch { setErr("Couldn't set the objective. Check your connection and try again."); } finally { setBusy(false); }
  };

  const reevaluate = async () => {
    setBusy(true); setErr(null);
    try { await osApi.evaluateObjectives(); objectives.reload(); } catch { setErr("Couldn't check the objectives again. Try again in a moment."); } finally { setBusy(false); }
  };

  const list = objectives.data?.objectives || [];
  return (
    <section aria-labelledby="obj-h" className="min-w-0">
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <SectionHead id="obj-h" title="Objectives" meta={list.length ? formatCount(list.length) : undefined} />
        {list.length > 0 && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={reevaluate} disabled={busy}>{busy ? "Checking…" : "Check again"}</button>}
      </div>
      <p style={{ margin: "-4px 0 12px", fontSize: 13, color: "var(--ink-2)" }}>A target the business is steering towards, checked against the ledger and forecast forward.</p>

      {objectives.loading && !objectives.data && <SkeletonRows rows={2} height={56} />}
      {objectives.error && !objectives.data ? <QuietError onRetry={objectives.reload} /> : null}

      {list.length > 0 && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)" }}>
          {list.map((o, i) => <ObjectiveRow key={o.id} o={o} first={i === 0} />)}
        </div>
      )}

      {objectives.data && collections && !hasCollections && (
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: "18px 20px", marginTop: list.length ? 16 : 0 }}>
          <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{collections.name}</div>
          <p style={{ margin: "4px 0 14px", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{collections.detail}</p>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 13, color: "var(--body)" }}>
            <span>Keep overdue share at most</span>
            <input type="number" min={0} max={100} value={target} onChange={(e) => setTarget(e.target.value)} className="ui-input tabular-nums" style={{ width: 72 }} aria-label="Target percent" />
            <span>% within</span>
            <input type="number" min={7} max={180} value={horizon} onChange={(e) => setHorizon(e.target.value)} className="ui-input tabular-nums" style={{ width: 72 }} aria-label="Horizon in days" />
            <span>days, and</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as AutopilotMode)} className="ui-input" style={{ width: "auto" }} aria-label="Autopilot mode">
              {MODES.map((m) => <option key={m} value={m}>{AUTOPILOT_LABEL[m].toLowerCase()}</option>)}
            </select>
            <button type="submit" className="ui-btn ui-btn-secondary" disabled={busy}>{busy ? "Checking…" : "Set objective"}</button>
          </form>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-3)" }}>Acting within policy without approval is not offered. Every reminder waits for a person.</p>
        </div>
      )}

      {objectives.data && list.length === 0 && !collections && (
        <QuietLine>No objective is set. Objectives become available once your books are connected.</QuietLine>
      )}

      {result && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{plain(result)}</p>}
      {err && <div style={{ marginTop: 10 }}><QuietError message={err} compact /></div>}

      {blocked.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 6 }}>Not available yet</div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }} className="flex flex-col">
            {blocked.map((t) => (
              <li key={t.key} style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, padding: "4px 0" }}>
                <span style={{ color: "var(--body)" }}>{t.name}.</span> {t.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ObjectiveRow({ o, first }: { o: Objective; first: boolean }) {
  const f = o.latest?.forecast;
  const unit = o.metric.endsWith("_pct") ? "%" : "";
  const p = f?.breachProbability;
  return (
    <div style={{ padding: "18px 20px", borderTop: first ? undefined : "1px solid var(--line)" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="min-w-0">
          <div className="tabular-nums" style={{ fontSize: 14.5, color: "var(--ink)", fontWeight: 500 }}>
            {o.name} {o.operator === "<=" ? "at most" : "at least"} {o.target}{unit}
          </div>
          <div className="tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>
            Within {formatCount(o.horizonDays)} days · {AUTOPILOT_LABEL[o.autopilotMode]} · {o.lastEvaluatedAt ? `checked ${formatRelative(o.lastEvaluatedAt)}` : "not checked yet"}
          </div>
        </div>
        <StatusChip tone={HEALTH_TONE[o.health] || "unknown"}>{HEALTH_LABEL[o.health] || "Not known yet"}</StatusChip>
      </div>

      {f?.explanation && <p className="tabular-nums" style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--body)" }}>{plain(f.explanation)}</p>}
      {p != null && o.health !== "OFF_TRACK" && (
        <p className="tabular-nums" style={{ margin: "6px 0 0", fontSize: 13, color: p >= 0.5 ? "var(--critical)" : p >= 0.2 ? "var(--warning)" : "var(--ink-2)" }}>
          {Math.round(p * 100)}% chance of missing the target{f?.breachInDays != null ? `, most likely in about ${formatCount(f.breachInDays)} days` : ""}.
        </p>
      )}

      {f?.points && f.points.length > 0 && (
        <div className="grid tabular-nums" style={{ gridTemplateColumns: `repeat(${Math.min(f.points.length, 4)}, minmax(0, 1fr))`, gap: 12, marginTop: 14, padding: "12px 14px", borderRadius: 8, background: "var(--surface-2)" }}>
          {f.points.slice(0, 4).map((pt) => (
            <div key={pt.day} className="min-w-0">
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Day {pt.day}</div>
              <div style={{ fontSize: 15, color: "var(--ink)", marginTop: 2 }}>{pt.p50}{unit}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{pt.p10}–{pt.p90}{unit} likely</div>
            </div>
          ))}
        </div>
      )}

      {o.latest?.confidence && o.latest.confidence.reasons.length > 0 && (
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>
          Confidence {o.latest.confidence.level.toLowerCase()}: {o.latest.confidence.reasons.join("; ")}.
        </p>
      )}
      {o.workflowId && (
        <Link href="/missions" className="hover-dim inline-flex items-center" style={{ gap: 4, marginTop: 10, fontSize: 12.5, color: "var(--ink-2)" }}>
          The overdue follow-up workflow works towards this<IconArrowRight size={12} />
        </Link>
      )}
      {!f && <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>Not evaluated yet.</p>}
    </div>
  );
}

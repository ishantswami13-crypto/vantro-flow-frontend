"use client";

// MEMORY: what Starlane knows and what it has learned. Knowledge stays split
// by kind, and every item says where it came from: a person's remark is never
// shown as a measured pattern, and only learned patterns carry a sample size.
// Workflow outcomes are checked in the ledger (a payment arrived, not "a
// message was prepared") and compared with what was expected without any
// action. Data: GET /api/os/memory, GET/POST /api/os/knowledge,
// POST /api/os/knowledge/:id/retire, POST /api/os/workflows/verify.

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { EmptyLine, Figure, SkeletonRows } from "@/components/v32/ui";
import { IconMemory, IconSparkle } from "@/components/v32/icons";
import { osApi, KIND_LABEL, type KnowledgeItem, type MemoryResponse, type OutcomeMode } from "@/lib/os";
import { pct } from "@/lib/decisions";
import { formatCount, formatDate, inrWhole } from "@/lib/format";
import { Section, InlineError } from "@/components/scan/ui";
import { humaneError } from "@/components/scan/humaneError";
import { useLoad } from "./shared";

const KIND_ORDER = ["LEARNED_PATTERN", "OBSERVED_FACT", "SOURCE_CLAIM", "HUMAN_OBSERVATION", "HYPOTHESIS", "INFERENCE", "SEMANTIC_DEFINITION", "POLICY"];

// What each kind means, in one line, so the reader knows how far to trust it.
const KIND_HELP: Record<string, string> = {
  LEARNED_PATTERN: "Measured by Starlane from outcomes checked in your ledger. Each shows how many cases it rests on.",
  OBSERVED_FACT: "Read directly from your ledger.",
  SOURCE_CLAIM: "Stated in a document. Not checked against the ledger.",
  HUMAN_OBSERVATION: "What someone told Starlane. Shown beside decisions as context, never used as a fact.",
  HYPOTHESIS: "A hunch to test. Starlane doesn't act on it until the data supports it.",
  INFERENCE: "Reasoned from other items, not measured.",
  SEMANTIC_DEFINITION: "What your terms mean.",
  POLICY: "Rules you set. Starlane follows them.",
};

// Kinds a person added, which they can also take back (the backend only
// retires these: HUMAN_KINDS in lib/domain/os/knowledge.js).
const HUMAN_KINDS = new Set(["HUMAN_OBSERVATION", "SOURCE_CLAIM", "HYPOTHESIS"]);
const TEACH_KINDS = [
  { kind: "HUMAN_OBSERVATION", label: "Something I know" },
  { kind: "SOURCE_CLAIM", label: "From a document" },
  { kind: "HYPOTHESIS", label: "A hunch to test" },
];

function authorityLabel(k: KnowledgeItem): string {
  if (k.authority === "engine") return "Measured by Starlane";
  if (k.authority === "document") return "From a document";
  return "Said by a person";
}

function confidenceText(c: KnowledgeItem["confidence"]): string | null {
  if (c == null || c === "") return null;
  if (typeof c === "number") return `${Math.round(c <= 1 ? c * 100 : c)}% confidence`;
  const s = String(c).toUpperCase();
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return `${s.charAt(0)}${s.slice(1).toLowerCase()} confidence`;
  if (s === "UNVERIFIED") return "Not verified";
  return null;
}

/** Everything Starlane knows, grouped by where it came from, with a filter. */
export function MemoryKnowledge() {
  const { data, error, loading, reload } = useLoad(() => osApi.memory());
  const [filter, setFilter] = useState<string>("ALL");
  const [err, setErr] = useState<string | null>(null);

  const groups = useMemo(() => {
    const entries = Object.entries(data?.knowledge || {}) as [string, KnowledgeItem[]][];
    return entries
      .filter(([, items]) => items && items.length > 0)
      .sort((a, b) => (KIND_ORDER.indexOf(a[0]) + 99) % 99 - (KIND_ORDER.indexOf(b[0]) + 99) % 99);
  }, [data]);
  const total = groups.reduce((n, [, items]) => n + items.length, 0);
  const shown = filter === "ALL" ? groups : groups.filter(([k]) => k === filter);

  const forget = async (k: KnowledgeItem) => {
    setErr(null);
    try { await osApi.retireKnowledge(k.id); reload(); } catch (e) { setErr(humaneError(e)); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <Section
        title="What Starlane knows"
        count={data ? total : null}
        subtitle="Kept apart by where it came from. Only measured patterns drive suggestions; what people say is context."
      >
        <div style={{ paddingTop: 16 }}>
          {loading && !data && <SkeletonRows rows={4} height={56} />}
          {!loading && error != null && <InlineError onRetry={reload}>{humaneError(error)}</InlineError>}
          {err && <div style={{ marginBottom: 12 }}><InlineError>{err}</InlineError></div>}

          {data && total === 0 && (
            <EmptyLine
              icon={<IconMemory size={17} />}
              title="Starlane doesn't know anything yet"
              body="Patterns appear once a workflow has run and its outcomes have been checked in your ledger. You can also tell Starlane something the data can't show, below."
            />
          )}

          {data && groups.length > 1 && (
            <div role="tablist" aria-label="Filter by kind" className="flex flex-wrap" style={{ gap: 6, marginBottom: 8 }}>
              <FilterChip on={filter === "ALL"} onClick={() => setFilter("ALL")} label="All" count={total} />
              {groups.map(([kind, items]) => (
                <FilterChip key={kind} on={filter === kind} onClick={() => setFilter(kind)} label={KIND_LABEL[kind] || kind} count={items.length} />
              ))}
            </div>
          )}

          {shown.map(([kind, items]) => (
            <div key={kind} style={{ marginTop: 20 }}>
              <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>
                  {KIND_LABEL[kind] || kind}
                  <span className="tabular-nums" style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: 8 }}>{items.length}</span>
                </h3>
              </div>
              {KIND_HELP[kind] && <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>{KIND_HELP[kind]}</p>}
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {items.map((k) => <KnowledgeRow key={k.id} k={k} onForget={HUMAN_KINDS.has(k.kind) ? () => forget(k) : undefined} />)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <TeachForm onSaved={reload} />
    </div>
  );
}

function FilterChip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button" role="tab" aria-selected={on} onClick={onClick}
      className="inline-flex items-center"
      style={{
        gap: 6, height: 28, padding: "0 10px", borderRadius: "var(--radius-sm)", fontSize: 12.5, cursor: "pointer",
        border: `1px solid ${on ? "var(--line-emphasis)" : "var(--line-card)"}`,
        background: on ? "var(--selected)" : "transparent", color: on ? "var(--ink)" : "var(--ink-2)",
      }}
    >
      {label}<span className="tabular-nums" style={{ color: "var(--ink-3)" }}>{count}</span>
    </button>
  );
}

function KnowledgeRow({ k, onForget }: { k: KnowledgeItem; onForget?: () => void }) {
  const quarantined = k.status === "QUARANTINED";
  const parts: string[] = [authorityLabel(k)];
  if (k.sample_count != null) parts.push(`${formatCount(k.sample_count)} ${k.sample_count === 1 ? "case" : "cases"}`);
  const conf = confidenceText(k.confidence);
  if (conf) parts.push(conf);
  if (k.scope?.name) parts.push(`About ${k.scope.name}`);
  if (k.source?.type === "DOCUMENT" && k.source.ref) parts.push(k.source.ref);
  parts.push(k.last_verified_at ? `Checked ${formatDate(k.last_verified_at)}` : `Added ${formatDate(k.created_at)}`);

  return (
    <li className="flex items-start justify-between" style={{ gap: 16, padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="min-w-0">
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: quarantined ? "var(--ink-3)" : "var(--ink)" }}>{k.statement}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{parts.join(" · ")}</p>
      </div>
      <div className="flex items-center shrink-0" style={{ gap: 6 }}>
        {quarantined && <StatusChip tone="critical" title="It reads like an instruction to Starlane, so it is not used.">Quarantined, not used</StatusChip>}
        {onForget && <button type="button" onClick={onForget} className="ui-btn ui-btn-ghost ui-btn-sm" aria-label={`Forget: ${k.statement}`}>Forget</button>}
      </div>
    </li>
  );
}

/** Tell Starlane something the data can't show. Saved as what a person said. */
function TeachForm({ onSaved }: { onSaved: () => void }) {
  const [statement, setStatement] = useState("");
  const [kind, setKind] = useState("HUMAN_OBSERVATION");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null); setNote(null);
    try {
      const r = await osApi.teach({ statement, kind, scope: about.trim() ? { type: "customer", name: about.trim() } : { type: "business" } });
      setNote(r.note);
      setStatement(""); setAbout("");
      onSaved();
    } catch (e) { setErr(humaneError(e)); } finally { setBusy(false); }
  };

  const ok = statement.trim().length >= 5;
  return (
    <Section title="Teach Starlane" subtitle="Tell Starlane something the data can't show. It's kept as what a person said, shown next to decisions, and never written into messages or rules.">
      <form onSubmit={(e) => { e.preventDefault(); if (ok) submit(); }} style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
        <label htmlFor="teach-statement" className="sr-only">What Starlane should know</label>
        <textarea
          id="teach-statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="For example: Sharma Hardware pays after the 10th, once their own customers have paid."
          className="ui-input"
          style={{ resize: "vertical", fontSize: 14 }}
        />
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <label htmlFor="teach-kind" className="sr-only">Kind</label>
          <select id="teach-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="ui-input" style={{ width: "auto", minWidth: 170 }}>
            {TEACH_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <label htmlFor="teach-about" className="sr-only">About a customer (optional)</label>
          <input id="teach-about" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="About a customer (optional)" maxLength={120} className="ui-input" style={{ flex: "1 1 180px", minWidth: 0 }} />
          <Button type="submit" variant="secondary" loading={busy} disabled={!ok}>{busy ? "Saving" : "Save"}</Button>
        </div>
        {note && <p role="status" style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>{note}</p>}
        {err && <InlineError>{err}</InlineError>}
      </form>
    </Section>
  );
}

const REC: Record<string, { label: string; tone: StatusTone }> = {
  KEEP_MEASURING: { label: "Keep measuring", tone: "info" },
  MOVE_TO_APPROVAL: { label: "Move to approval", tone: "positive" },
  EXPAND: { label: "Expand", tone: "positive" },
  STOP: { label: "Stop", tone: "critical" },
  MODIFY: { label: "Change trigger or tone", tone: "attention" },
};
const MODE: Record<string, { label: string; tone: StatusTone }> = {
  SHADOW: { label: "In shadow, nothing sent", tone: "info" },
  LIVE: { label: "Approved and sent by a person", tone: "neutral" },
};

/** Did it work? Each follow-up checked against the ledger after 7 days. */
export function MemoryOutcomes() {
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
    } catch (e) { setErr(humaneError(e)); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <Section
        title="Did it work?"
        subtitle="Each follow-up is checked against the ledger after 7 days and compared with how often customers paid without one."
        right={<Button variant="secondary" size="sm" onClick={verify} loading={busy}>{busy ? "Checking" : "Check outcomes now"}</Button>}
      >
        <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && !data && <SkeletonRows rows={2} height={64} />}
          {note && <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>{note}</p>}
          {err && <InlineError onRetry={verify}>{err}</InlineError>}
          {!loading && error != null && <InlineError onRetry={reload}>{humaneError(error)}</InlineError>}
          {data && data.outcomes.length === 0 && (
            <EmptyLine
              icon={<IconSparkle size={17} />}
              title="No outcome has been checked yet"
              body="The first check runs 7 days after the first approved follow-up. Nothing is claimed before then."
              action={<Link href="/missions" className="ui-btn ui-btn-secondary ui-btn-sm">See missions</Link>}
            />
          )}
          {data?.outcomes.map((o) => (
            <div key={o.workflowId} style={{ padding: "4px 0 8px" }}>
              <div style={{ fontSize: 15, color: "var(--ink)" }}>{o.name}</div>
              {Object.entries(o.byMode).map(([mode, m]) => <OutcomeBlock key={mode} mode={mode} m={m} />)}
            </div>
          ))}
        </div>
      </Section>

      {data && data.recentOutcomes.length > 0 && <RecentOutcomes items={data.recentOutcomes} />}
    </div>
  );
}

function OutcomeBlock({ mode, m }: { mode: string; m: OutcomeMode }) {
  const md = MODE[mode] || { label: mode, tone: "neutral" as StatusTone };
  const rec = REC[m.recommendation] || { label: m.recommendation, tone: "neutral" as StatusTone };
  return (
    <div style={{ marginTop: 12 }}>
      <StatusChip tone={md.tone}>{md.label}</StatusChip>
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "20px 24px", marginTop: 16 }}>
        <Figure value={pct(m.observedRate)} label="Paid within 7 days" />
        <Figure value={<span style={{ color: "var(--ink-2)" }}>{pct(m.expectedRate)}</span>} label="Expected without a reminder" />
        <Figure value={`${formatCount(m.met)} of ${formatCount(m.resolved)}`} label="Follow-ups paid" />
        <Figure value={inrWhole(m.collected)} label="Collected" />
      </div>
      {m.interval80 && (
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>Likely range {pct(m.interval80[0])} to {pct(m.interval80[1])} (80% interval).</p>
      )}
      <div className="flex items-start flex-wrap" style={{ gap: 10, marginTop: 14 }}>
        <StatusChip tone={rec.tone}>{rec.label}</StatusChip>
        <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--body)", flex: "1 1 280px" }}>{m.why}</span>
      </div>
    </div>
  );
}

function RecentOutcomes({ items }: { items: MemoryResponse["recentOutcomes"] }) {
  return (
    <Section title="Recently checked" count={items.length}>
      <div role="table" aria-label="Recently checked follow-ups">
        <div role="row" className="hidden md:grid" style={{ gridTemplateColumns: COLS, gap: 16, padding: "10px 0", fontSize: 12, color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
          <span role="columnheader">Customer</span>
          <span role="columnheader" style={{ textAlign: "right" }}>Amount</span>
          <span role="columnheader">Result</span>
          <span role="columnheader" style={{ textAlign: "right" }}>Checked after</span>
        </div>
        {items.slice(0, 12).map((i) => {
          const result = i.outcomeStatus === "MET"
            ? { tone: "positive" as StatusTone, label: i.outcome?.collected ? `Paid ${inrWhole(i.outcome.collected)}` : "Paid" }
            : i.outcomeStatus === "NOT_MET" ? { tone: "critical" as StatusTone, label: "Not paid" }
            : { tone: "unknown" as StatusTone, label: "Couldn't tell" };
          // Four cells: a two-by-two stack on phones, one row of four from md up.
          return (
            <div role="row" key={i.id} className="grid items-center grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_140px_150px_130px]" style={{ gap: "6px 16px", padding: "12px 0", borderBottom: "1px solid var(--line)", minHeight: 48 }}>
              <span role="cell" className="truncate" style={{ fontSize: 14, color: "var(--ink)" }}>{i.target}</span>
              <span role="cell" className="tabular-nums" style={{ textAlign: "right", fontSize: 13.5, color: "var(--ink)" }}>{inrWhole(i.amount)}</span>
              <span role="cell"><StatusChip tone={result.tone}>{result.label}</StatusChip></span>
              <span role="cell" className="tabular-nums" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink-3)" }}>{i.verifyAfter ? formatDate(i.verifyAfter) : "Not known yet"}</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const COLS = "minmax(0,1fr) 140px 150px 130px";

/** Kept for older imports: knowledge and outcomes on one screen. */
export function MemoryLearning() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <MemoryOutcomes />
      <MemoryKnowledge />
    </div>
  );
}

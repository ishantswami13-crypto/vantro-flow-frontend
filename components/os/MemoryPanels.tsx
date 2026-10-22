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
import { Figure, SkeletonRows } from "@/components/v32/ui";
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

function confidenceText(c: KnowledgeItem["confidence"]): string | null {
  if (c == null || c === "") return null;
  if (typeof c === "number") return `${Math.round(c <= 1 ? c * 100 : c)}% confidence`;
  const s = String(c).toUpperCase();
  if (s === "HIGH" || s === "MEDIUM" || s === "LOW") return `${s.charAt(0)}${s.slice(1).toLowerCase()} confidence`;
  if (s === "UNVERIFIED") return "Not verified";
  return null;
}

// The four provenances the owner must never confuse, in trust order. Each
// says plainly how far Starlane leans on it.
const PRIMARY: { kind: string; label: string; trust: string }[] = [
  { kind: "LEARNED_PATTERN", label: "Learned", trust: "Measured from checked outcomes. Drives suggestions." },
  { kind: "OBSERVED_FACT", label: "Observed", trust: "Read directly from your ledger." },
  { kind: "SOURCE_CLAIM", label: "From documents", trust: "Stated in a document, not checked against the ledger." },
  { kind: "HUMAN_OBSERVATION", label: "Human corrections", trust: "What people told Starlane. Context only, never a fact." },
];
const GROUP_LABEL: Record<string, string> = Object.fromEntries(PRIMARY.map((p) => [p.kind, p.label]));
const GROUP_USE: Record<string, string> = {
  LEARNED_PATTERN: "Drives suggestions",
  OBSERVED_FACT: "Used as fact",
  SOURCE_CLAIM: "Used with caution",
  HUMAN_OBSERVATION: "Context only",
  HYPOTHESIS: "Not acted on",
  INFERENCE: "Not measured",
  SEMANTIC_DEFINITION: "Shapes wording",
  POLICY: "Always followed",
};

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
  const countOf = (kind: string) => groups.find(([k]) => k === kind)?.[1].length || 0;
  const others = groups.filter(([k]) => !PRIMARY.some((p) => p.kind === k));
  const shown = filter === "ALL" ? groups : groups.filter(([k]) => k === filter);

  const forget = async (k: KnowledgeItem) => {
    setErr(null);
    try { await osApi.retireKnowledge(k.id); reload(); } catch (e) { setErr(humaneError(e)); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <section aria-label="What Starlane knows">
        {loading && !data && <SkeletonRows rows={4} height={56} />}
        {!loading && error != null && <InlineError onRetry={reload}>{humaneError(error)}</InlineError>}
        {err && <div style={{ marginBottom: 12 }}><InlineError>{err}</InlineError></div>}

        {data && (
          <div role="group" aria-label="Where Starlane's knowledge came from" className="mem-prov">
            {PRIMARY.map((p) => {
              const n = countOf(p.kind);
              const on = filter === p.kind;
              return (
                <button key={p.kind} type="button" aria-pressed={on} disabled={n === 0} onClick={() => setFilter(on ? "ALL" : p.kind)} className="mem-prov-cell">
                  <span className="mem-prov-n num">{formatCount(n)}</span>
                  <span className="mem-prov-label">{p.label}</span>
                  <span className="mem-prov-trust">{p.trust}</span>
                </button>
              );
            })}
          </div>
        )}

        {data && total === 0 && (
          <p className="wk-empty" style={{ marginTop: 12 }}>Starlane doesn&apos;t know anything yet. Patterns appear once a workflow has run and its outcomes have been checked in your ledger; you can also tell Starlane something the data can&apos;t show, below.</p>
        )}

        {data && total > 0 && (filter !== "ALL" || others.length > 0) && (
          <div className="flex flex-wrap items-center" style={{ gap: "4px 18px", marginTop: 14 }}>
            {filter !== "ALL" && <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ marginLeft: -10 }} onClick={() => setFilter("ALL")}>Show everything <span className="num-quiet" style={{ color: "var(--ink-3)" }}>{formatCount(total)}</span></button>}
            {others.map(([kind, items]) => (
              <FilterChip key={kind} on={filter === kind} onClick={() => setFilter(filter === kind ? "ALL" : kind)} label={KIND_LABEL[kind] || kind} count={items.length} />
            ))}
          </div>
        )}

        {shown.map(([kind, items]) => (
          <div key={kind} className="mem-group">
            <div className="mem-group-head">
              <h3 className="mem-group-title">{GROUP_LABEL[kind] || KIND_LABEL[kind] || kind}<span className="wk-count">{items.length}</span></h3>
              {GROUP_USE[kind] && <span className="mem-group-use">{GROUP_USE[kind]}</span>}
            </div>
            {KIND_HELP[kind] && <p className="meta" style={{ margin: "2px 0 10px" }}>{KIND_HELP[kind]}</p>}
            <div role="table" aria-label={GROUP_LABEL[kind] || KIND_LABEL[kind] || kind} className="wk-list wk-flat">
              <div role="row" className="wk-head" style={{ gridTemplateColumns: K_COLS }}>
                <span role="columnheader">Statement</span>
                <span role="columnheader">Basis</span>
                <span role="columnheader">About</span>
                <span role="columnheader">{kind === "LEARNED_PATTERN" || kind === "OBSERVED_FACT" ? "Checked" : "Added"}</span>
                <span role="columnheader" />
              </div>
              {items.map((k) => <KnowledgeRow key={k.id} k={k} onForget={HUMAN_KINDS.has(k.kind) ? () => forget(k) : undefined} />)}
            </div>
          </div>
        ))}
      </section>

      <TeachForm onSaved={reload} />
    </div>
  );
}

const K_COLS = "minmax(0,1fr) 180px 150px 96px 64px";

function FilterChip({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button" aria-pressed={on} onClick={onClick}
      className="hover-dim inline-flex items-center"
      style={{
        gap: 5, height: 28, padding: 0, fontSize: 12.5, cursor: "pointer", border: 0, background: "transparent",
        color: on ? "var(--ink)" : "var(--ink-2)", fontWeight: on ? 500 : 400,
        boxShadow: on ? "inset 0 -1px 0 var(--ink)" : "none",
      }}
    >
      {label}<span className="num-quiet" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{count}</span>
    </button>
  );
}

function basisOf(k: KnowledgeItem): { main: string; sub: string | null } {
  const conf = confidenceText(k.confidence);
  if (k.authority === "engine") {
    return { main: k.sample_count != null ? `${formatCount(k.sample_count)} ${k.sample_count === 1 ? "case" : "cases"}` : "Measured by Starlane", sub: conf };
  }
  if (k.authority === "document") return { main: k.source?.ref || "A document", sub: conf };
  return { main: "Said by a person", sub: conf };
}

function KnowledgeRow({ k, onForget }: { k: KnowledgeItem; onForget?: () => void }) {
  const quarantined = k.status === "QUARANTINED";
  const basis = basisOf(k);
  const when = k.last_verified_at || k.created_at;
  return (
    <div role="row" className="wk-row mem-k-row" style={{ gridTemplateColumns: K_COLS }}>
      <div role="cell" className="min-w-0">
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: quarantined ? "var(--ink-3)" : "var(--ink)", maxWidth: "68ch" }}>{k.statement}</p>
        {quarantined && <div style={{ marginTop: 4 }}><StatusChip tone="critical" title="It reads like an instruction to Starlane, so it is not used.">Quarantined, not used</StatusChip></div>}
      </div>
      <div role="cell" className="min-w-0 mem-k-cell">
        <div className={k.authority === "engine" && k.sample_count != null ? "num-quiet" : undefined} style={{ fontSize: 12.5, color: "var(--ink)" }}>{basis.main}</div>
        {basis.sub && <div className="wk-meta">{basis.sub}</div>}
      </div>
      <div role="cell" className="min-w-0 mem-k-cell truncate" style={{ fontSize: 12.5, color: k.scope?.name ? "var(--ink-2)" : "var(--ink-3)" }}>{k.scope?.name || "Whole business"}</div>
      <div role="cell" className="mem-k-cell" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{formatDate(when)}</div>
      <div role="cell" className="mem-k-cell md:text-right">
        {onForget && <button type="button" onClick={onForget} className="ui-btn ui-btn-ghost ui-btn-sm mem-forget" aria-label={`Forget: ${k.statement}`}>Forget</button>}
      </div>
    </div>
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
      <form onSubmit={(e) => { e.preventDefault(); if (ok) submit(); }} style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
        <label htmlFor="teach-statement" className="sr-only">What Starlane should know</label>
        <textarea
          id="teach-statement"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="For example: Sharma Hardware pays after the 10th, once their own customers have paid."
          className="ui-input"
          style={{ resize: "vertical", fontSize: 13.5, height: "auto", padding: "8px 10px", lineHeight: 1.5 }}
        />
        <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <label htmlFor="teach-kind" className="sr-only">Kind</label>
          <select id="teach-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="ui-input" style={{ width: "auto", minWidth: 170 }}>
            {TEACH_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <label htmlFor="teach-about" className="sr-only">About a customer (optional)</label>
          <input id="teach-about" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="About a customer (optional)" maxLength={120} className="ui-input" style={{ flex: "1 1 180px", minWidth: 0 }} />
          <Button type="submit" variant="secondary" loading={busy} disabled={!ok}>{busy ? "Saving" : "Teach Starlane"}</Button>
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
        title="Follow-up outcomes"
        subtitle="Each follow-up is checked against the ledger after 7 days and compared with how often customers paid without one."
        right={<Button variant="secondary" size="sm" onClick={verify} loading={busy}>{busy ? "Checking" : "Check outcomes now"}</Button>}
      >
        <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && !data && <SkeletonRows rows={2} height={64} />}
          {note && <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>{note}</p>}
          {err && <InlineError onRetry={verify}>{err}</InlineError>}
          {!loading && error != null && <InlineError onRetry={reload}>{humaneError(error)}</InlineError>}
          {data && data.outcomes.length === 0 && (
            <p className="wk-empty">No outcome has been checked yet. The first check runs 7 days after the first approved follow-up; nothing is claimed before then. <Link className="underline" href="/missions">View missions</Link></p>
          )}
          {data?.outcomes.map((o) => (
            <div key={o.workflowId} style={{ padding: "12px 0 16px", borderBottom: "1px solid var(--line)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{o.name}</div>
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
    <div style={{ marginTop: 4 }}>
      <div className="meta">{md.label}</div>
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "20px 24px", marginTop: 14 }}>
        <Figure value={pct(m.observedRate)} label="Paid within 7 days" />
        <Figure value={<span style={{ color: "var(--ink-2)" }}>{pct(m.expectedRate)}</span>} label="Expected without a reminder" />
        <Figure value={<>{formatCount(m.met)}<span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-3)" }}> of </span>{formatCount(m.resolved)}</>} label="Follow-ups paid" />
        <Figure value={inrWhole(m.collected)} label="Collected" />
      </div>
      {m.interval80 && (
        <p className="meta" style={{ margin: "12px 0 0" }}>Likely range <span className="num">{pct(m.interval80[0])}</span> to <span className="num">{pct(m.interval80[1])}</span> (80% interval).</p>
      )}
      <div className="wk-attn" style={{ marginTop: 16, padding: "2px 0" }}>
        <div className="meta">Recommendation</div>
        <div style={{ fontSize: 13.5, color: "var(--ink)", marginTop: 2 }}>{rec.label}</div>
        <p className="prose-measure" style={{ margin: "2px 0 0", fontSize: 13, color: "var(--body)" }}>{m.why}</p>
      </div>
    </div>
  );
}

function RecentOutcomes({ items }: { items: MemoryResponse["recentOutcomes"] }) {
  return (
    <Section title="Recently checked" count={items.length}>
      <div role="table" aria-label="Recently checked follow-ups">
        <div role="row" className="hidden md:grid" style={{ gridTemplateColumns: COLS, gap: 16, padding: "8px 0", fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
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
            <div role="row" key={i.id} className="grid items-center grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_140px_150px_130px]" style={{ gap: "6px 16px", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
              <span role="cell" className="truncate" style={{ fontSize: 13, color: "var(--ink)" }}>{i.target}</span>
              <span role="cell" className="num" style={{ textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>{inrWhole(i.amount)}</span>
              <span role="cell"><StatusChip tone={result.tone}>{result.label}</StatusChip></span>
              <span role="cell" style={{ textAlign: "right", fontSize: 12, color: "var(--ink-3)" }}>{i.verifyAfter ? formatDate(i.verifyAfter) : "Not known yet"}</span>
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

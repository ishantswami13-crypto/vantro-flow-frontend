"use client";

// BRIDGE: what Starlane is connected to, what each connector can really do,
// how fresh it is, and what people have taught it.

import React, { useState } from "react";
import { osApi, KnowledgeItem } from "@/lib/os";
import { formatRelative, formatCount } from "@/lib/format";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/v32/ui";
import { useLoad } from "./shared";
import { QuietError } from "./bridge/kit";

const C = { ink: "var(--ink)", body: "var(--body)", muted: "var(--ink-2)", faint: "var(--ink-3)", line: "var(--line)", good: "var(--positive)", warn: "var(--warning)", bad: "var(--critical)" };
const FRESH_TONE: Record<string, StatusTone> = { FRESH: "positive", AGING: "attention", STALE: "critical" };
const FRESH_LABEL: Record<string, string> = { FRESH: "Fresh", AGING: "Ageing", STALE: "Stale" };

function healthTone(h?: string | null): StatusTone {
  if (h === "CONNECTED") return "positive";
  if (h === "DEGRADED" || h === "RATE_LIMITED") return "attention";
  if (h === "STALE" || h === "FAILED" || h === "AUTH_EXPIRED" || h === "DISCONNECTED") return "critical";
  return "unknown";
}
const sentence = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function Panel({ title, subtitle, right, children }: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="fade-once" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "20px 22px" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
        <div className="min-w-0">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, color: "var(--ink)" }}>{title}</h2>
          {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "14px 0", borderTop: "1px solid var(--line)" }}>{children}</div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "var(--ink-3)" }}>{children}</p>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{children}</p>;
}
const OPS = ["READ", "SEARCH", "SUBSCRIBE", "WRITE", "EXECUTE"] as const;

export function BridgeHealthPanel() {
  const { data, error, loading, reload } = useLoad(() => osApi.bridge());
  if (loading && !data) return <Panel title="Connections"><SkeletonRows rows={3} /></Panel>;
  if (error || !data) return <Panel title="Connections"><QuietError onRetry={reload} compact /></Panel>;
  return (
    <Panel
      title="Connections"
      subtitle={data.freshness.detail}
      right={<StatusChip tone={FRESH_TONE[data.freshness.status] || "unknown"}>{FRESH_LABEL[data.freshness.status] || "Not known yet"}</StatusChip>}
    >
      {data.connectors.map((k) => (
        <Row key={k.key}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13.5px]" style={{ color: C.ink, fontWeight: 500 }}>{k.name}</p>
            <div className="flex gap-2 items-center">
              {k.lastSyncAt && <span className="text-[12px] tabular-nums" style={{ color: C.faint }}>Synced {formatRelative(k.lastSyncAt)}</span>}
              <StatusChip tone={healthTone(k.health)}>{sentence(k.health)}</StatusChip>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {OPS.map((op) => {
              const c = k.contract[op];
              const what = c.what && c.what.length ? `: ${c.what.join(", ")}` : "";
              return (
                <StatusChip key={op} tone={c.supported ? "info" : "unknown"} title={c.supported ? `${sentence(op)}${what}` : `${sentence(op)} is not supported`}>
                  <span style={{ textDecoration: c.supported ? "none" : "line-through" }}>{sentence(op)}</span>
                </StatusChip>
              );
            })}
          </div>
          {k.lastError && <p className="text-[12.5px] mt-2" style={{ color: C.bad }}>The last sync didn&apos;t complete. Starlane is working from the previous sync until it does.</p>}
          {k.limitations.length > 0 && (
            <ul className="text-[12px] mt-2 space-y-0.5" style={{ color: C.muted }}>
              {k.limitations.map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
          {k.confidenceEffect !== "n/a" && k.confidenceEffect !== "none" && (
            <p className="text-[12px] mt-1" style={{ color: C.warn }}>Confidence in findings from this source is {k.confidenceEffect}.</p>
          )}
        </Row>
      ))}

      <Row>
        <SectionLabel>What Starlane understood</SectionLabel>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {data.discovered.map((d) => (
            <span key={d.entity} className="text-[13px]" style={{ color: d.count ? C.ink : C.faint }}>
              <span className="tabular-nums" style={{ fontWeight: 500 }}>{d.count == null ? "Not known" : formatCount(d.count)}</span> {d.entity}
            </span>
          ))}
        </div>
        {data.missing.length > 0 && (
          <ul className="mt-2 space-y-1">
            {data.missing.map((m) => <li key={m} className="text-[12.5px]" style={{ color: C.muted }}>{m}</li>)}
          </ul>
        )}
      </Row>

      <Row>
        <SectionLabel>Same customer under two names?</SectionLabel>
        {data.entityResolution.candidates.length === 0
          ? <Muted>No likely duplicates found. {data.entityResolution.rule}</Muted>
          : (
            <ul className="space-y-1">
              {data.entityResolution.candidates.slice(0, 5).map((c) => (
                <li key={c.normalized} className="text-[12.5px]" style={{ color: C.body }}>
                  {c.names.join(" / ")} <span style={{ color: C.faint }}>({c.evidence})</span>
                </li>
              ))}
              <li className="text-[12px]" style={{ color: C.faint }}>{data.entityResolution.rule}</li>
            </ul>
          )}
      </Row>

      <Row>
        <SectionLabel>How Starlane reads your data</SectionLabel>
        <ul className="space-y-1">
          {Object.entries(data.semantics.definitions).filter(([k]) => k !== "baseCurrency").map(([k, v]) => (
            <li key={k} className="text-[12.5px]" style={{ color: C.body }}>{v}</li>
          ))}
          {data.semantics.authority.map((a) => (
            <li key={a.fact} className="text-[12.5px]" style={{ color: C.body }}>{a.fact}: {a.source} is the authority.</li>
          ))}
          {data.semantics.authorityRule && <li className="text-[12.5px]" style={{ color: C.body }}>{data.semantics.authorityRule}</li>}
        </ul>
      </Row>

      {data.crossSource && data.crossSource.keptFromTally > 0 && (
        <Row>
          <SectionLabel>Bills that came from both Tally and a file</SectionLabel>
          <p className="text-[12.5px]" style={{ color: C.body }}>
            {data.crossSource.keptFromTally} bill{data.crossSource.keptFromTally === 1 ? " was" : "s were"} in both. Each is counted once, from Tally.
            {data.crossSource.disagreements.length ? ` ${data.crossSource.disagreements.length} disagreed with the file:` : " The two copies agreed."}
          </p>
          {data.crossSource.disagreements.length > 0 && (
            <ul className="mt-1 space-y-1">
              {data.crossSource.disagreements.slice(0, 10).map((d) => (
                <li key={`${d.customer}|${d.bill}`} className="text-[12.5px]" style={{ color: C.warn }}>{d.customer}, bill {d.bill}: {d.detail}.</li>
              ))}
            </ul>
          )}
        </Row>
      )}
    </Panel>
  );
}

const TEACH_KINDS = [
  { kind: "HUMAN_OBSERVATION", label: "Something I know" },
  { kind: "SOURCE_CLAIM", label: "From a document" },
  { kind: "HYPOTHESIS", label: "A hunch to test" },
];

export function TeachStarlanePanel() {
  const { data, error, loading, reload } = useLoad(() => osApi.knowledge());
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
      reload();
    } catch { setErr("Couldn't save that. Check your connection and try again."); } finally { setBusy(false); }
  };

  const retire = async (k: KnowledgeItem) => {
    try { await osApi.retireKnowledge(k.id); reload(); } catch { setErr("Couldn't forget that item. Check your connection and try again."); }
  };

  const human = (data?.knowledge || []).filter((k) => ["HUMAN_OBSERVATION", "SOURCE_CLAIM", "HYPOTHESIS"].includes(k.kind));

  return (
    <Panel title="Teach Starlane" subtitle="Tell Starlane something the data cannot show. It is kept as what a person said, shown next to decisions, and never written into messages or rules.">
      <form onSubmit={(e) => { e.preventDefault(); if (statement.trim().length >= 5) submit(); }} className="space-y-2">
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="For example: Sharma Hardware pays after the 10th because their own customers pay them then."
          className="ui-input w-full"
          style={{ resize: "vertical", height: "auto", padding: "8px 10px" }}
          aria-label="What Starlane should know"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="ui-input" style={{ width: "auto" }} aria-label="Kind">
            {TEACH_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="About a customer (optional)" maxLength={120} className="ui-input flex-1 min-w-[160px]" aria-label="About a customer" />
          <button type="submit" className="ui-btn ui-btn-secondary" disabled={busy || statement.trim().length < 5}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
      {note && <p className="text-[12.5px] mt-2" style={{ color: C.good }}>{note}</p>}
      {(err || error) ? <div className="mt-2"><QuietError message={err || "Couldn't load what Starlane has been taught."} onRetry={err ? undefined : reload} compact /></div> : null}
      {!loading && human.length > 0 && (
        <div className="mt-3">
          {human.slice(0, 8).map((k) => (
            <Row key={k.id}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <p className="text-[13px]" style={{ color: k.status === "QUARANTINED" ? C.faint : C.ink }}>{k.statement}</p>
                  <div className="flex gap-2 mt-1 flex-wrap items-center">
                    <StatusChip tone="neutral">{TEACH_KINDS.find((t) => t.kind === k.kind)?.label || sentence(k.kind)}</StatusChip>
                    {k.scope?.name && <span className="text-[11.5px]" style={{ color: C.faint }}>about {k.scope.name}</span>}
                    {k.status === "QUARANTINED" && <StatusChip tone="critical" title="It reads like an instruction to Starlane, so it is not used.">Not used</StatusChip>}
                  </div>
                </div>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => retire(k)}>Forget</button>
              </div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

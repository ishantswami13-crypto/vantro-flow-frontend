"use client";

// BRIDGE: what Starlane is connected to, what each connector can really do,
// how fresh it is, and what people have taught it.

import React, { useState } from "react";
import { C, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { osApi, KnowledgeItem } from "@/lib/os";
import { relTime } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, healthTone, useLoad } from "./shared";

const FRESH_TONE: Record<string, "good" | "warn" | "bad"> = { FRESH: "good", AGING: "warn", STALE: "bad" };
const OPS = ["READ", "SEARCH", "SUBSCRIBE", "WRITE", "EXECUTE"] as const;

export function BridgeHealthPanel() {
  const { data, error, loading } = useLoad(() => osApi.bridge());
  if (loading) return <Panel title="Connections"><Skeleton rows={3} /></Panel>;
  if (error || !data) return <Panel title="Connections"><ErrorLine error={errorText(error)} /></Panel>;
  return (
    <Panel
      title="Connections"
      subtitle={data.freshness.detail}
      right={<Pill tone={FRESH_TONE[data.freshness.status] || "neutral"}>{data.freshness.status.toLowerCase()}</Pill>}
    >
      {data.connectors.map((k) => (
        <Row key={k.key}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[13.5px]" style={{ color: C.ink, fontWeight: 500 }}>{k.name}</p>
            <div className="flex gap-2 items-center">
              {k.lastSyncAt && <span className="text-[11.5px]" style={{ color: C.faint }}>synced {relTime(k.lastSyncAt)}</span>}
              <Pill tone={healthTone(k.health)}>{k.health.replace(/_/g, " ").toLowerCase()}</Pill>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {OPS.map((op) => {
              const c = k.contract[op];
              const what = c.what && c.what.length ? `: ${c.what.join(", ")}` : "";
              return (
                <Pill key={op} tone={c.supported ? "accent" : "neutral"} title={c.supported ? `${op}${what}` : `${op} not supported`}>
                  <span style={{ textDecoration: c.supported ? "none" : "line-through" }}>{op.toLowerCase()}</span>
                </Pill>
              );
            })}
          </div>
          {k.lastError && <p className="text-[12px] mt-2" style={{ color: C.bad }}>{k.lastError}</p>}
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
              <span style={{ fontWeight: 600 }}>{d.count ?? "?"}</span> {d.entity}
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
        </ul>
      </Row>
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
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const retire = async (k: KnowledgeItem) => {
    try { await osApi.retireKnowledge(k.id); reload(); } catch (e) { setErr(errorText(e)); }
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
          className="w-full text-[13px] rounded-md px-3 py-2"
          style={{ border: `1px solid ${C.line}`, color: C.ink, resize: "vertical" }}
          aria-label="What Starlane should know"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="text-[12.5px] rounded-md px-2 py-[6px]" style={{ border: `1px solid ${C.line}` }} aria-label="Kind">
            {TEACH_KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="About a customer (optional)" maxLength={120} className="text-[12.5px] rounded-md px-2 py-[6px] flex-1 min-w-[160px]" style={{ border: `1px solid ${C.line}` }} />
          <Btn primary type="submit" disabled={busy || statement.trim().length < 5}>{busy ? "Saving…" : "Save"}</Btn>
        </div>
      </form>
      {note && <p className="text-[12.5px] mt-2" style={{ color: C.good }}>{note}</p>}
      <ErrorLine error={err || (error ? errorText(error) : null)} />
      {!loading && human.length > 0 && (
        <div className="mt-3">
          {human.slice(0, 8).map((k) => (
            <Row key={k.id}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <p className="text-[13px]" style={{ color: k.status === "QUARANTINED" ? C.faint : C.ink }}>{k.statement}</p>
                  <div className="flex gap-2 mt-1 flex-wrap items-center">
                    <Pill tone="neutral">{TEACH_KINDS.find((t) => t.kind === k.kind)?.label || k.kind}</Pill>
                    {k.scope?.name && <span className="text-[11.5px]" style={{ color: C.faint }}>about {k.scope.name}</span>}
                    {k.status === "QUARANTINED" && <Pill tone="bad" title="It reads like an instruction to Starlane, so it is not used.">Quarantined</Pill>}
                  </div>
                </div>
                <Btn onClick={() => retire(k)}>Forget</Btn>
              </div>
            </Row>
          ))}
        </div>
      )}
    </Panel>
  );
}

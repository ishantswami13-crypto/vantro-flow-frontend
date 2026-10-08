"use client";

import { useQuery } from "@tanstack/react-query";
import { osApi, type BridgeOverview } from "@/lib/os";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/v32/ui";
import { formatCount, formatRelative } from "@/lib/format";
import { OFFLINE } from "./health";

// Sources > Data quality. What Starlane understood from the connected
// systems, read from GET /api/os/bridge (backend lib/routes/os.js): counts
// per entity, likely duplicate customers, cross-source disagreements and how
// the data is read. Display only; nothing here is computed in the browser.

// backend lib/domain/decisions/sourceHealth.js: FRESH, AGING, STALE, UNKNOWN.
const FRESH: Record<string, { label: string; tone: "positive" | "attention" | "critical" | "unknown" }> = {
  FRESH: { label: "Current", tone: "positive" },
  AGING: { label: "Ageing", tone: "attention" },
  STALE: { label: "Out of date", tone: "critical" },
  UNKNOWN: { label: "Not known yet", tone: "unknown" },
};

function Block({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="dq-block">
      <div className="dq-block-head">
        <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{title}</h3>
        {hint && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Line({ children, tone }: { children: React.ReactNode; tone?: "warning" }) {
  return (
    <li style={{ fontSize: 13, color: tone === "warning" ? "var(--warning)" : "var(--body)", lineHeight: 1.55, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      {children}
    </li>
  );
}

export function DataQuality() {
  const q = useQuery<BridgeOverview>({ queryKey: ["sources-data-quality"], queryFn: () => osApi.bridge(), staleTime: 30_000 });

  if (q.isLoading) return <SkeletonRows rows={4} />;
  if (q.isError || !q.data) {
    return <ErrorState title="Couldn't load data quality" message={OFFLINE} onRetry={() => q.refetch()} />;
  }
  const d = q.data;
  const definitions = Object.entries(d.semantics.definitions).filter(([k]) => k !== "baseCurrency");

  return (
    <div className="fade-once">
      <style>{`
        .dq-block { display: grid; grid-template-columns: minmax(0, 260px) minmax(0, 1fr); gap: 32px; padding: 22px 0; border-top: 1px solid var(--line); }
        .dq-block:first-child { border-top: none; padding-top: 6px; }
        .dq-block ul { list-style: none; margin: 0; padding: 0; }
        .dq-block li:last-child { border-bottom: none !important; }
        @media (max-width: 860px) { .dq-block { grid-template-columns: minmax(0, 1fr); gap: 10px; } }
      `}</style>

      <Block title="Freshness" hint={d.freshness.lastUpdateAt ? `Updated ${formatRelative(d.freshness.lastUpdateAt)}` : undefined}>
        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
          <StatusChip tone={(FRESH[d.freshness.status] || FRESH.UNKNOWN).tone}>{(FRESH[d.freshness.status] || FRESH.UNKNOWN).label}</StatusChip>
          <span style={{ fontSize: 13, color: "var(--body)" }}>{d.freshness.detail}</span>
        </div>
      </Block>

      <Block title="What Starlane understood" hint="Counted from the rows your sources sent.">
        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 18 }}>
          {d.discovered.map((x) => (
            <div key={x.entity} className="min-w-0">
              <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.1, color: x.count ? "var(--ink)" : "var(--ink-3)" }}>
                {x.count == null ? "—" : formatCount(x.count)}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4 }}>{x.entity.replace(/^./, (c) => c.toUpperCase())}</div>
            </div>
          ))}
        </div>
        {d.missing.length > 0 && (
          <ul style={{ marginTop: 14 }}>
            {d.missing.map((m) => <Line key={m} tone="warning">{m}</Line>)}
          </ul>
        )}
      </Block>

      <Block title="Same customer under two names?" hint={d.entityResolution.rule}>
        {d.entityResolution.candidates.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>No likely duplicates found.</p>
        ) : (
          <ul>
            {d.entityResolution.candidates.slice(0, 8).map((c) => (
              <Line key={c.normalized}>
                <span style={{ color: "var(--ink)" }}>{c.names.join(" and ")}</span>
                <span style={{ color: "var(--ink-3)" }}> · {c.evidence}</span>
              </Line>
            ))}
          </ul>
        )}
      </Block>

      {d.crossSource && d.crossSource.keptFromTally > 0 && (
        <Block title="In both Tally and a file" hint="Each bill is counted once, from Tally.">
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--body)" }}>
            {formatCount(d.crossSource.keptFromTally)} bill{d.crossSource.keptFromTally === 1 ? " was" : "s were"} in both.
            {d.crossSource.disagreements.length ? ` ${d.crossSource.disagreements.length} disagreed with the file.` : " The two copies agreed."}
          </p>
          {d.crossSource.disagreements.length > 0 && (
            <ul>
              {d.crossSource.disagreements.slice(0, 10).map((x) => (
                <Line key={`${x.customer}|${x.bill}`}>
                  <span style={{ color: "var(--ink)" }}>{x.customer}</span>, bill {x.bill}: <span style={{ color: "var(--warning)" }}>{x.detail}</span>
                </Line>
              ))}
            </ul>
          )}
        </Block>
      )}

      <Block title="How Starlane reads your data">
        <ul>
          {definitions.map(([k, v]) => <Line key={k}>{v}</Line>)}
          {d.semantics.authority.map((a) => <Line key={a.fact}>{a.fact}: {a.source} is the authority.</Line>)}
          {d.semantics.authorityRule && <Line>{d.semantics.authorityRule}</Line>}
        </ul>
      </Block>
    </div>
  );
}

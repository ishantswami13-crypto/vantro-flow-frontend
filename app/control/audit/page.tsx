"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, SkeletonRows, SearchField } from "@/components/v32/ui";
import { IconAudit } from "@/components/v32/icons";
import { StatusChip, toneForStatus } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { ControlHeader, ControlPage } from "@/components/control/ControlSubnav";
import { OFFLINE } from "@/components/connectors/health";
import { formatDateTime } from "@/lib/format";
import { api, type AuditEvent } from "@/lib/api";

// Control > Audit log. A real, chronological, per-business trail from
// GET /api/audit: audit_logs (financial changes, written by
// audit.service.js) merged with decision_events (who acted, through which
// agent and model, and the result). Ledger rows carry no actor or result,
// and those cells read "—" rather than an invented value. Older pages load
// through the route's `before` cursor (50 per page).

const PAGE = 50;
type SourceFilter = "all" | "decision" | "ledger";

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function objectLabel(e: AuditEvent): React.ReactNode {
  if (e.source === "decision" && e.entity_id) {
    return <Link className="hover-dim" style={{ color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--line-strong)", textUnderlineOffset: 3 }} href={`/decisions/${e.entity_id}`}>Decision</Link>;
  }
  if (!e.entity_type) return "—";
  return <>{humanize(e.entity_type)}{e.entity_id ? <span style={{ color: "var(--ink-3)" }}> · {e.entity_id.slice(0, 8)}</span> : null}</>;
}

export default function AuditPage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  const q = useInfiniteQuery({
    queryKey: ["control-audit"],
    queryFn: ({ pageParam }) => api.audit.list(pageParam || undefined),
    initialPageParam: "" as string,
    getNextPageParam: (last) => (last.events.length >= PAGE ? last.events[last.events.length - 1]?.created_at : undefined),
    staleTime: 15_000,
  });

  const all = useMemo(() => {
    const seen = new Set<string>();
    return (q.data?.pages || []).flatMap((p) => p.events).filter((e) => {
      const k = `${e.source || "ledger"}:${e.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [q.data]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return all.filter((e) => {
      if (source !== "all" && (e.source || "ledger") !== source) return false;
      if (!needle) return true;
      return [e.action, e.title, e.actor, e.entity_type, e.model, e.result].some((v) => v && String(v).toLowerCase().replace(/_/g, " ").includes(needle));
    });
  }, [all, query, source]);

  const FILTERS: { key: SourceFilter; label: string }[] = [
    { key: "all", label: "All" }, { key: "decision", label: "Decisions" }, { key: "ledger", label: "Ledger" },
  ];

  return (
    <DashboardLayout pageTitle="Audit log">
      <style>{`
        .au-grid { display: grid; column-gap: 16px; align-items: baseline; grid-template-columns: minmax(0, 1fr) auto; }
        .au-head { display: none; }
        .au-row { padding: 10px 10px; border-bottom: 1px solid var(--line); min-height: 46px; font-size: 13px; }
        .au-desk { display: none; }
        .au-mobile { font-size: 12px; color: var(--ink-3); margin-top: 3px; }
        @media (min-width: 900px) {
          .au-grid { grid-template-columns: 136px minmax(0, 2fr) 150px 150px 150px 110px; }
          .au-head { display: grid; padding: 0 10px 8px; font-size: 12px; color: var(--ink-3); border-bottom: 1px solid var(--line); }
          .au-desk { display: block; }
          .au-mobile { display: none; }
        }
        .seg { display: inline-flex; padding: 2px; border-radius: 8px; background: var(--surface-2); box-shadow: inset 0 0 0 1px var(--line); }
        .seg button { height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 6px; color: var(--ink-2); background: none; border: none; cursor: pointer; }
        .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 0 0 1px var(--line-card); }
      `}</style>
      <ControlPage>
        <ControlHeader active="audit" subtitle="Every decision step and financial change: who acted, through which agent, and what happened." />

        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
            <SearchField id="audit-search" value={query} onChange={setQuery} placeholder="Filter by action, actor or result" />
          </div>
          <div className="seg" role="group" aria-label="Source">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" aria-pressed={source === f.key} onClick={() => setSource(f.key)}>{f.label}</button>
            ))}
          </div>
          {q.data && <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: "auto" }} className="tabular-nums">{rows.length} of {all.length} loaded</span>}
        </div>

        <div className="fade-once">
          {q.isLoading && <SkeletonRows rows={6} height={46} />}
          {q.isError && <ErrorState title="Couldn't load the audit log" message={OFFLINE} onRetry={() => q.refetch()} />}

          {q.data && all.length === 0 && (
            <EmptyLine icon={<IconAudit size={17} />} title="No audit events yet" body="Decision steps and financial changes appear here as they happen." />
          )}
          {q.data && all.length > 0 && rows.length === 0 && (
            <EmptyLine icon={<IconAudit size={17} />} title="No events match" body="Try a different word, or show all sources." action={<Button variant="ghost" size="sm" onClick={() => { setQuery(""); setSource("all"); }}>Clear filters</Button>} />
          )}

          {rows.length > 0 && (
            <div role="table" aria-label="Audit log">
              <div role="row" className="au-grid au-head">
                <span role="columnheader">Time</span><span role="columnheader">Action</span><span role="columnheader">Actor</span>
                <span role="columnheader">Object</span><span role="columnheader">Source</span><span role="columnheader">Result</span>
              </div>
              {rows.map((e) => (
                <div role="row" key={`${e.source}:${e.id}`} className="au-grid au-row row-hover">
                  <span role="cell" className="au-desk tabular-nums" style={{ color: "var(--ink-2)", fontSize: 12.5 }}>{formatDateTime(e.created_at)}</span>
                  <span role="cell" className="min-w-0">
                    <span style={{ color: "var(--ink)" }}>{humanize(e.action)}</span>
                    {e.title && <span style={{ color: "var(--ink-2)" }}> · {e.title}</span>}
                    <span className="au-mobile block">{formatDateTime(e.created_at)}{e.actor ? ` · ${e.actor}` : ""}</span>
                  </span>
                  <span role="cell" className="au-desk truncate" style={{ color: e.actor ? "var(--body)" : "var(--ink-3)" }}>{e.actor || "—"}</span>
                  <span role="cell" className="au-desk truncate" style={{ color: "var(--body)" }}>{objectLabel(e)}</span>
                  <span role="cell" className="au-desk truncate" style={{ color: "var(--ink-2)" }}>{e.source === "decision" ? (e.model || "Starlane") : "Ledger"}</span>
                  <span role="cell">{e.result ? <StatusChip tone={toneForStatus(e.result)}>{humanize(e.result)}</StatusChip> : <span className="au-desk" style={{ color: "var(--ink-3)" }}>—</span>}</span>
                </div>
              ))}
            </div>
          )}

          {q.hasNextPage && (
            <div style={{ marginTop: 16 }}>
              <Button variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load older events</Button>
            </div>
          )}
          {q.isFetchNextPageError && <p role="alert" style={{ fontSize: 12.5, color: "var(--critical)", marginTop: 10 }}>Older events didn&apos;t load. {OFFLINE}</p>}
        </div>
      </ControlPage>
    </DashboardLayout>
  );
}

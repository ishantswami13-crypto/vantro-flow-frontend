"use client";

// What Watch raised, on the web: the same events as the desktop and phone
// apps (GET /api/client/watch). Each is raised once with its evidence, closed
// by Starlane when it stops being true, or dismissed by the owner here.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import { inrWhole, formatClock, formatCount, formatDate, formatDateTime } from "@/lib/format";
import { Subnav, SkeletonRows, IconTile } from "@/components/v32/ui";
import { IconChevronDown, IconRupee, IconPromise, IconSync, IconWatch } from "@/components/v32/icons";
import { StatusChip } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { QuietError, QuietLine, SectionHead, plain } from "@/components/os/bridge/kit";
import type { WatchEvent, WatchList, EvidenceItem } from "../../packages/contracts/src/features";

const RESOLUTION: Record<string, string> = {
  paid_or_removed: "Paid or no longer in your books", moved_to_next_band: "Moved to a later overdue band", sync_recovered: "Sync recovered",
  promise_closed: "Promise closed", dismissed_by_owner: "Dismissed by you", cleared: "Condition cleared",
};
const KIND: Record<string, string> = { fact: "Fact", calculated: "Calculated", assumption: "Assumption", estimate: "Estimate", model: "Model" };

function factValue(f: EvidenceItem): string {
  const v = f.value;
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return f.unit === "INR" ? inrWhole(v) : formatCount(v);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return formatDateTime(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDate(s);
  return s;
}

function money(e: WatchEvent): string | null {
  const f = e.evidence?.facts?.find((x) => x.unit === "INR" && typeof x.value === "number");
  return f && typeof f.value === "number" ? inrWhole(f.value) : null;
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "invoice_overdue") return <IconRupee size={15} />;
  if (kind === "promise_broken") return <IconPromise size={15} />;
  if (kind === "sync_failed" || kind === "sync_stale") return <IconSync size={15} />;
  return <IconWatch size={15} />;
}

export default function WatchEvents() {
  const notify = useToast();
  const [state, setState] = useState<"active" | "closed">("active");
  const [data, setData] = useState<WatchList | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setData(null);
    setFailed(false);
    request<WatchList>(`/api/client/watch?state=${state}`).then((d) => setData(d)).catch(() => setFailed(true));
  }, [state]);
  useEffect(() => { load(); }, [load]);

  async function move(e: WatchEvent, to: "acknowledged" | "dismissed") {
    try {
      await request(`/api/client/watch/${e.id}/state`, { method: "POST", body: JSON.stringify({ state: to }) });
      notify(to === "dismissed" ? "Dismissed" : "Marked as seen", "positive");
      load();
    } catch {
      notify("Couldn't update that item. Check your connection and try again.", "critical");
    }
  }

  const c = data?.counts || {};
  const activeCount = (c.open || 0) + (c.acknowledged || 0);
  const closedCount = (c.resolved || 0) + (c.dismissed || 0);

  return (
    <section aria-labelledby="watch-events-h" className="flex flex-col" style={{ gap: 12 }}>
      <div>
        <SectionHead id="watch-events-h" title="What Watch raised" />
        <p style={{ margin: "-4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>Changes Starlane noticed in your books. Each closes on its own when it stops being true.</p>
      </div>
      <Subnav
        label="Raised items"
        active={state}
        onChange={(k) => { setOpen(null); setState(k as "active" | "closed"); }}
        items={[
          { key: "active", label: "Needs attention", count: data ? activeCount : null },
          { key: "closed", label: "Resolved", count: data ? closedCount : null },
        ]}
      />

      {failed ? <QuietError onRetry={load} />
        : !data ? <SkeletonRows rows={3} height={64} />
        : data.events.length === 0 ? (
          <QuietLine>
            {state === "active"
              ? "Nothing needs attention right now. Invoices slipping into later overdue bands, missed promises and sync problems appear here."
              : "Nothing has been resolved yet."}
          </QuietLine>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", overflow: "hidden" }}>
            {data.events.map((e, i) => {
              const isOpen = open === e.id;
              const amt = money(e);
              const live = e.state === "open" || e.state === "acknowledged";
              return (
                <li key={e.id} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    aria-expanded={isOpen}
                    className="row-hover w-full text-left flex items-start"
                    style={{ gap: 14, padding: "14px 18px" }}
                  >
                    <IconTile size={32}><KindIcon kind={e.kind} /></IconTile>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center flex-wrap" style={{ gap: 8 }}>
                        <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.45 }}>{plain(e.title)}</span>
                        {e.severity === "critical" && <StatusChip tone="critical">Critical</StatusChip>}
                        {e.severity === "high" && <StatusChip tone="critical">Urgent</StatusChip>}
                        {e.state === "acknowledged" && <StatusChip tone="neutral">Seen</StatusChip>}
                        {e.state === "dismissed" && <StatusChip tone="neutral">Dismissed</StatusChip>}
                        {e.state === "resolved" && <StatusChip tone="positive">Resolved</StatusChip>}
                      </span>
                      {(e.detail || e.resolution) && (
                        <span className="block tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>
                          {[plain(e.detail), e.resolution ? RESOLUTION[e.resolution] || plain(e.resolution) : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 flex flex-col items-end" style={{ gap: 4 }}>
                      {amt && <span className="tabular-nums" style={{ fontSize: 13.5, color: "var(--ink)" }}>{amt}</span>}
                      <span className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)" }}>{formatClock(e.resolvedAt || e.firstSeenAt)}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 hidden sm:inline-flex" style={{ color: "var(--ink-3)", marginTop: 2, transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 160ms" }}>
                      <IconChevronDown size={14} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="flex flex-col px-[18px] pb-[18px] sm:pl-16" style={{ gap: 14 }}>
                      {e.evidence?.summary && <p style={{ margin: 0, fontSize: 13, color: "var(--body)", lineHeight: 1.55 }}>{plain(e.evidence.summary)}</p>}
                      {e.evidence?.facts?.length > 0 && (
                        <dl style={{ margin: 0, borderTop: "1px solid var(--line)" }}>
                          {e.evidence.facts.map((f, j) => (
                            <div key={j} className="flex items-baseline" style={{ gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                              <dt className="flex-1 min-w-0" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f.label}</dt>
                              <dd className="tabular-nums text-right" style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>{factValue(f)}</dd>
                              <dd className="shrink-0 hidden sm:block" style={{ margin: 0, width: 80, textAlign: "right", fontSize: 11.5, color: "var(--ink-3)" }}>{KIND[f.kind] || f.kind}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {(e.entity?.type === "invoice" || live) && (
                        <div className="flex flex-wrap" style={{ gap: 8 }}>
                          {e.entity?.type === "invoice" && (
                            <Link href={`/scan?invoice=${encodeURIComponent(e.entity.id)}`} className="ui-btn ui-btn-secondary ui-btn-sm">Why: open in Scan</Link>
                          )}
                          {e.entity?.type === "invoice" && (e.missionId ? (
                            <Link href={`/missions/${e.missionId}`} className="ui-btn ui-btn-secondary ui-btn-sm">Open its mission</Link>
                          ) : live ? (
                            <Link href={`/missions/new?invoice=${encodeURIComponent(e.entity.id)}`} className="ui-btn ui-btn-secondary ui-btn-sm">Start a mission to collect</Link>
                          ) : null)}
                          {e.state === "open" && <button type="button" onClick={() => void move(e, "acknowledged")} className="ui-btn ui-btn-ghost ui-btn-sm">Mark as seen</button>}
                          {live && <button type="button" onClick={() => void move(e, "dismissed")} className="ui-btn ui-btn-ghost ui-btn-sm">Dismiss</button>}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}

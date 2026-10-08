"use client";

// What Watch raised, on the web: the same events as the desktop and phone
// apps (GET /api/client/watch). Each is raised once with its evidence, closed
// by Starlane when it stops being true, or dismissed by the owner here.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import { inrWhole, formatClock, formatCount, formatDate, formatDateTime } from "@/lib/format";
import { Subnav, SkeletonRows } from "@/components/v32/ui";
import { IconChevronDown } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
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

const AREA: Record<string, string> = {
  invoice_overdue: "Collections", promise_broken: "Payment promise", sync_failed: "Sources", sync_stale: "Sources", watch_triggered: "Your watch",
};

function statusOf(e: WatchEvent): { tone: StatusTone; label: string } | null {
  if (e.state === "resolved") return { tone: "positive", label: "Resolved" };
  if (e.state === "dismissed") return { tone: "neutral", label: "Dismissed" };
  if (e.severity === "critical") return { tone: "critical", label: "Critical" };
  if (e.severity === "high") return { tone: "critical", label: "Urgent" };
  if (e.state === "acknowledged") return { tone: "neutral", label: "Seen" };
  return null;
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
    <section aria-labelledby="watch-events-h">
      <SectionHead id="watch-events-h" title="What Watch raised" />
      <p className="meta" style={{ margin: "-2px 0 8px" }}>Changes Starlane noticed in your books. Each closes on its own when it stops being true.</p>
      <Subnav
        label="Raised items"
        active={state}
        onChange={(k) => { setOpen(null); setState(k as "active" | "closed"); }}
        items={[
          { key: "active", label: "Needs attention", count: data ? activeCount : null },
          { key: "closed", label: "Resolved", count: data ? closedCount : null },
        ]}
      />

      <div style={{ marginTop: 12 }}>
        {failed ? <QuietError onRetry={load} />
          : !data ? <SkeletonRows rows={3} height={56} />
          : data.events.length === 0 ? (
            <QuietLine>
              {state === "active"
                ? "Nothing needs attention right now. Invoices slipping into later overdue bands, missed promises and sync problems appear here."
                : "Nothing has been resolved yet."}
            </QuietLine>
          ) : (
            <ul className="rf-list">
              {data.events.map((e) => {
                const isOpen = open === e.id;
                const amt = money(e);
                const live = e.state === "open" || e.state === "acknowledged";
                const st = statusOf(e);
                const sub = [plain(e.detail), e.resolution ? RESOLUTION[e.resolution] || plain(e.resolution) : null].filter(Boolean).join(" · ");
                const when = e.resolvedAt || e.firstSeenAt;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      aria-expanded={isOpen}
                      className="rf-row rf-change"
                      style={isOpen ? { background: "var(--surface-2)", boxShadow: "-8px 0 0 var(--surface-2), 8px 0 0 var(--surface-2)" } : undefined}
                    >
                      <span className="rf-kind rf-desk">{AREA[e.kind] || "Watch"}</span>
                      <span className="min-w-0 block">
                        <span className="rf-title block">{plain(e.title)}</span>
                        {sub && <span className="rf-sub block">{sub}</span>}
                        <span className="rf-mob">
                          <span>{AREA[e.kind] || "Watch"}</span>
                          {st && <StatusChip tone={st.tone}>{st.label}</StatusChip>}
                          <span>{formatClock(when)}</span>
                        </span>
                      </span>
                      <span className="rf-desk">{st && <StatusChip tone={st.tone}>{st.label}</StatusChip>}</span>
                      <span className="rf-fig">{amt || ""}</span>
                      <span className="rf-time rf-desk" title={formatDateTime(when)}>{formatClock(when)}</span>
                      <span aria-hidden="true" className="rf-desk" style={{ alignSelf: "center", color: "var(--ink-3)", transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform var(--dur-fast) var(--ease)" }}>
                        <IconChevronDown size={14} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="rf-evidence fade-once">
                        {e.evidence?.summary && <p className="rf-sub" style={{ margin: 0, color: "var(--body)" }}>{plain(e.evidence.summary)}</p>}
                        {e.evidence?.facts?.length > 0 && (
                          <dl style={{ margin: "10px 0 0", borderTop: "1px solid var(--line)" }}>
                            {e.evidence.facts.map((f, j) => (
                              <div key={j} className="flex items-baseline" style={{ gap: 12, padding: "6px 0", borderBottom: "1px solid var(--line-hairline)" }}>
                                <dt className="flex-1 min-w-0" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f.label}</dt>
                                <dd className="num text-right" style={{ margin: 0, fontSize: 12.5, color: "var(--ink)" }}>{factValue(f)}</dd>
                                <dd className="shrink-0 hidden sm:block" style={{ margin: 0, width: 84, textAlign: "right", fontSize: 11, color: "var(--ink-3)" }}>{KIND[f.kind] || f.kind}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {(e.entity?.type === "invoice" || live) && (
                          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
                            {e.entity?.type === "invoice" && (
                              <Link href={`/scan?invoice=${encodeURIComponent(e.entity.id)}`} className="ui-btn ui-btn-secondary ui-btn-sm">Ask why in Scan</Link>
                            )}
                            {e.entity?.type === "invoice" && (e.missionId ? (
                              <Link href={`/missions/${e.missionId}`} className="ui-btn ui-btn-secondary ui-btn-sm">View its mission</Link>
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
      </div>
    </section>
  );
}

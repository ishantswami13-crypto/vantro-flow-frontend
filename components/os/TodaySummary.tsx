"use client";

// The few lines a person needs each morning, counted by the backend
// (GET /api/os/today) from real rows: what needs you, what Starlane is
// handling, which source needs attention, what is being watched. Nothing
// else. Each line opens the surface that answers it.

import Link from "next/link";
import { osApi } from "@/lib/os";
import { StatusChip } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/v32/ui";
import { IconArrowRight } from "@/components/v32/icons";
import { useLoad } from "./shared";
import { QuietError, plain } from "./bridge/kit";

export function TodaySummary() {
  const { data, error, loading, reload } = useLoad(() => osApi.today());
  return (
    <section className="mb-6" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px" }} aria-label="What needs you today">
      <div className="flex items-center justify-between" style={{ gap: 12, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, color: "var(--ink)" }}>Today</h2>
        {data && (data.pilotMode === "SHADOW"
          ? <StatusChip tone="info" title="Nothing changes outside Starlane">Shadow mode</StatusChip>
          : <StatusChip tone="positive">Live</StatusChip>)}
      </div>
      {loading && !data && <SkeletonRows rows={2} height={36} />}
      {error && !data ? <QuietError message="Couldn't load today's summary. Your data is unchanged." onRetry={reload} compact /> : null}
      {data && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {data.lines.map((l, i) => {
            const text = (
              <span className="tabular-nums" style={{ fontSize: 14.5, lineHeight: 1.55, color: l.key === "stable" ? "var(--ink-2)" : "var(--ink)" }}>{plain(l.text)}</span>
            );
            const chip = l.tone === "attention" ? <StatusChip tone="attention" className="shrink-0">Needs you</StatusChip> : null;
            return (
              <li key={l.key} style={{ borderTop: i ? "1px solid var(--line)" : undefined }}>
                {l.href ? (
                  <Link href={l.href} className="row-hover flex items-center" style={{ gap: 12, padding: "10px 8px", margin: "0 -8px", borderRadius: 8 }}>
                    <span className="flex-1 min-w-0">{text}</span>{chip}
                    <span aria-hidden="true" className="shrink-0 inline-flex" style={{ color: "var(--ink-3)" }}><IconArrowRight size={13} /></span>
                  </Link>
                ) : (
                  <div className="flex items-center" style={{ gap: 12, padding: "10px 0" }}><span className="flex-1 min-w-0">{text}</span>{chip}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

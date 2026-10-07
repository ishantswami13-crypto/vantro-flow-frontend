"use client";

// The few lines a person needs each morning, counted by the backend
// (GET /api/os/today) from real rows: what needs you, what Starlane is
// handling, which source needs attention, what is being watched. Nothing
// else. Each line opens the surface that answers it.

import Link from "next/link";
import { C, Pill, Skeleton } from "@/components/decisions/ui";
import { osApi } from "@/lib/os";
import { errorText, useLoad } from "./shared";

export function TodaySummary() {
  const { data, error, loading, reload } = useLoad(() => osApi.today());
  return (
    <section className="rounded-[8px] mb-6" style={{ background: "var(--bg-elevated)", border: `1px solid ${C.line}`, padding: "18px 20px" }} aria-label="What needs you today">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: C.faint, fontWeight: 500 }}>Today</p>
        {data && <Pill tone={data.pilotMode === "SHADOW" ? "accent" : "good"}>{data.pilotMode === "SHADOW" ? "Shadow mode: nothing changes outside Starlane" : "Live"}</Pill>}
      </div>
      {loading && <Skeleton rows={2} />}
      {error ? (
        <p className="text-[13px]" role="alert" style={{ color: C.bad }}>
          Starlane could not load today&apos;s summary ({errorText(error)}). Your data is unchanged.{" "}
          <button type="button" className="underline" onClick={reload}>Try again</button>
        </p>
      ) : null}
      {data && (
        <ul className="space-y-1.5">
          {data.lines.map((l) => {
            const color = l.tone === "attention" ? C.warn : l.tone === "positive" ? C.good : C.body;
            const text = <span className="text-[15px] leading-[1.5]" style={{ color, fontWeight: l.key === "stable" ? 400 : 500 }}>{l.text}</span>;
            return <li key={l.key}>{l.href ? <Link href={l.href} className="hover-dim">{text}</Link> : text}</li>;
          })}
        </ul>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isDemoMode } from "@/lib/demo";
import { decisionsApi, daysUntil } from "@/lib/decisions";
import { inrWhole, formatCount } from "@/lib/format";
import { StatusChip } from "@/components/ui/Badge";
import { Chevron } from "@/components/v32/ui";
import { stakeOf } from "@/components/os/shared";
import { QuietError, plain } from "@/components/os/bridge/kit";

// The one thing on Today that asks for judgement: decisions with a window.
// Shows nothing in demo mode and says so plainly when the summary can't load.
export default function TodayDecisionsCard() {
  const demo = typeof window !== "undefined" && isDemoMode();
  const q = useQuery({ queryKey: ["decisions-today"], queryFn: decisionsApi.today, staleTime: 30_000, enabled: !demo });
  if (demo) return null;
  if (q.isLoading) return <div className="skeleton h-20 w-full mb-5" style={{ borderRadius: 12 }} />;
  if (q.isError) {
    return <div className="mb-5"><QuietError message="Couldn't load your decisions right now." onRetry={() => q.refetch()} compact /></div>;
  }
  const t = q.data!;
  const top = t.top[0];
  const waiting = t.command.open + t.command.needsInformation + t.command.awaitingApproval + t.command.readyToRun;
  const meta = top ? (() => {
    const d = daysUntil(top.deadline);
    const stake = stakeOf(top.materiality as Record<string, unknown> | null);
    const money = stake != null ? (top.currency && top.currency !== "INR" ? `${top.currency} ${formatCount(Math.round(stake))}` : inrWhole(stake)) : null;
    return [
      d == null ? null : d <= 0 ? "Decide today" : `Decide within ${d} day${d === 1 ? "" : "s"}`,
      money ? `${money} at stake if ignored` : null,
      top.recommendation ? `Suggests ${top.recommendation.label.toLowerCase()}` : null,
    ].filter(Boolean).join(" · ");
  })() : "";

  return (
    <Link
      href={top ? `/decisions/${top.id}` : t.receivables.invoices ? "/decisions" : "/decisions/import"}
      className="row-hover block mb-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 20px" }}
    >
      <div className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
        <span className="tabular-nums">{waiting ? `${formatCount(waiting)} decision${waiting === 1 ? " needs" : "s need"} you` : "No decisions waiting"}</span>
        {t.pilotMode === "SHADOW" && <StatusChip tone="info">Shadow mode</StatusChip>}
        <span className="ml-auto inline-flex"><Chevron size={14} /></span>
      </div>
      {top ? (
        <>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>{plain(top.title)}</p>
          {meta && <p className="tabular-nums" style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>{meta}</p>}
        </>
      ) : (
        <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--ink-2)" }}>
          {t.command.underWatch
            ? `${formatCount(t.command.underWatch)} decision${t.command.underWatch === 1 ? " is" : "s are"} being checked against what actually happens.`
            : t.receivables.invoices ? "No material decision currently requires attention." : "Upload your receivables file so Starlane can find decisions in your own data."}
        </p>
      )}
    </Link>
  );
}

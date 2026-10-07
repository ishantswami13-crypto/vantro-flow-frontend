"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FiChevronRight } from "react-icons/fi";
import { isDemoMode } from "@/lib/demo";
import { decisionsApi, money, daysUntil } from "@/lib/decisions";
import { C, Pill } from "@/components/decisions/ui";
import { stakeOf } from "@/components/os/shared";

// The one thing on Today that asks for judgement: decisions with a window.
// Shows nothing in demo mode and says so plainly when the summary can't load.
export default function TodayDecisionsCard() {
  const demo = typeof window !== "undefined" && isDemoMode();
  const q = useQuery({ queryKey: ["decisions-today"], queryFn: decisionsApi.today, staleTime: 30_000, enabled: !demo });
  if (demo) return null;
  if (q.isLoading) return <div className="skeleton h-20 w-full rounded-2xl mb-5" />;
  if (q.isError) {
    return (
      <p className="text-[12px] mb-5" style={{ color: C.faint }}>
        Decisions couldn&apos;t be loaded right now. <Link className="underline" href="/decisions">Open Decisions</Link>
      </p>
    );
  }
  const t = q.data!;
  const top = t.top[0];
  const waiting = t.command.open + t.command.needsInformation + t.command.awaitingApproval + t.command.readyToRun;
  return (
    <Link href={top ? `/decisions/${top.id}` : t.receivables.invoices ? "/decisions" : "/decisions/import"} className="hover-lift block rounded-[8px] px-5 py-4 mb-5" style={{ background: "var(--bg-elevated)", border: `1px solid ${C.line}` }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: C.faint }}>
        <span>{waiting ? `${waiting} decision${waiting === 1 ? " needs" : "s need"} you` : "No decisions waiting"}</span>
        {t.pilotMode === "SHADOW" && <Pill tone="accent">Shadow mode</Pill>}
        <FiChevronRight className="ml-auto" size={14} />
      </div>
      {top ? (
        <>
          <p className="text-[15px] mt-1.5" style={{ color: C.ink, fontWeight: 500 }}>{top.title}</p>
          <p className="text-[12px] mt-1" style={{ color: C.muted }}>
            {(() => {
              const d = daysUntil(top.deadline);
              const stake = stakeOf(top.materiality as Record<string, unknown> | null);
              return [d == null ? null : d <= 0 ? "Decide today" : `Decide within ${d} day${d === 1 ? "" : "s"}`, stake != null ? `${money(stake, top.currency)} at stake if ignored` : null, top.recommendation ? `suggests ${top.recommendation.label.toLowerCase()}` : null].filter(Boolean).join(" · ");
            })()}
          </p>
        </>
      ) : (
        <p className="text-[13px] mt-1.5" style={{ color: C.muted }}>
          {t.command.underWatch
            ? `${t.command.underWatch} decision${t.command.underWatch === 1 ? " is" : "s are"} being checked against what actually happens.`
            : t.receivables.invoices ? "No material decision currently requires attention." : "Upload your receivables file so Starlane can find decisions in your own data."}
        </p>
      )}
    </Link>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiMessageSquare } from "react-icons/fi";
import {
  describeChanges, fmtLakh, readAndRecordPulse, readDoneToday, sinceLabel, writeDoneToday,
  type PulseChange, type PulseSnapshot,
} from "@/lib/dailyPulse";

export interface TodayCall {
  name: string;
  amount: number;
  days: number;
  contact: string;
}

export interface TodayPromise {
  name: string;
  amount: number;
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// The top of the home page, built as a daily ritual rather than a dashboard:
// 1. who you are and what today is (serif greeting in your colour),
// 2. what moved since you last looked (a reason to open the app each day),
// 3. a short list you can actually finish, with a clear "done for today".
// It never invents numbers: everything shown is either a backend figure or
// the owner's own ticks, and it says so when there is nothing yet.
export default function DailyRitual({
  userId, ownerName, pulse, calls, promises, pendingApprovals,
}: {
  userId: string | null;
  ownerName: string;
  pulse: Omit<PulseSnapshot, "at"> | null;
  calls: TodayCall[];
  promises: TodayPromise[];
  pendingApprovals: number | null;
}) {
  const [prev, setPrev] = useState<PulseSnapshot | null | undefined>(undefined);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    setDone(readDoneToday(userId));
  }, [userId]);

  // Record the pulse once per page load, as soon as real numbers arrive.
  useEffect(() => {
    if (!userId || !pulse || prev !== undefined) return;
    setPrev(readAndRecordPulse(userId, pulse));
  }, [userId, pulse, prev]);

  const changes: PulseChange[] = useMemo(
    () => (prev && pulse ? describeChanges(prev, pulse) : []),
    [prev, pulse],
  );

  const items = useMemo(() => [
    ...promises.map(p => ({ id: `promise:${p.name}`, kind: "promise" as const, name: p.name, amount: p.amount, detail: "promised to pay today", contact: "" })),
    ...calls
      .filter(c => !promises.some(p => p.name === c.name))
      .slice(0, 3)
      .map(c => ({ id: `call:${c.name}`, kind: "call" as const, name: c.name, amount: c.amount, detail: `${c.days} days overdue`, contact: c.contact })),
  ], [calls, promises]);

  const doneCount = items.filter(i => done.includes(i.id)).length;
  const allDone = items.length > 0 && doneCount === items.length;

  function toggle(id: string) {
    if (!userId) return;
    const next = done.includes(id) ? done.filter(d => d !== id) : [...done, id];
    setDone(next);
    writeDoneToday(userId, next);
  }

  const dateLine = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const needsYou = items.length - doneCount + (pendingApprovals || 0);

  return (
    <section aria-label="Your day" className="space-y-8">
      {/* ── Greeting ── */}
      <header>
        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">{dateLine}</p>
        <h1 className="text-[34px] sm:text-[40px] leading-[1.08] text-gray-900 mt-2">
          {greeting()}, <span className="id-gradient-text">{ownerName}</span>.
        </h1>
        <p className="text-[15px] text-gray-600 mt-3 max-w-[60ch]">
          {pulse === null
            ? "Your numbers are loading."
            : allDone && !pendingApprovals
              ? "You're clear for today. Anything new will be waiting here tomorrow."
              : needsYou > 0
                ? <>{fmtLakh(pulse.outstanding)} is out with customers, and <span className="text-gray-900">{needsYou} thing{needsYou === 1 ? "" : "s"}</span> need you today.</>
                : <>{fmtLakh(pulse.outstanding)} is out with customers. Nothing needs you right now.</>}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Since you were last here ── */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 relative overflow-hidden">
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] id-gradient" />
          <p className="text-[13px] font-medium text-gray-500">
            {prev ? `Since ${sinceLabel(prev.at)}` : "Since you were last here"}
          </p>
          {prev === undefined ? (
            <p className="text-sm text-gray-400 mt-3">Checking what changed…</p>
          ) : prev === null ? (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">
              This is your first look from this device. From your next visit, this spot shows what moved in between: money collected, new invoices, anything slipping.
            </p>
          ) : changes.length === 0 ? (
            <p className="text-sm text-gray-600 mt-3">Nothing moved. Collections, invoices and overdue amounts are where you left them.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {changes.map(c => (
                <li key={c.key} className="flex items-baseline gap-2.5">
                  <span aria-hidden className={[
                    "w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-2px]",
                    c.tone === "good" ? "bg-emerald-500" : c.tone === "bad" ? "bg-rose-500" : "bg-gray-400",
                  ].join(" ")} />
                  <span className="text-[15px] text-gray-900">{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          {pendingApprovals !== null && pendingApprovals > 0 && (
            <Link href="/control/approvals"
              className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 group hover:border-gray-300 transition-colors">
              <span className="text-sm text-gray-900">
                {pendingApprovals} decision{pendingApprovals === 1 ? "" : "s"} waiting for your approval
              </span>
              <FiArrowRight size={14} className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          )}
        </div>

        {/* ── Today's short list ── */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-gray-500">Today&apos;s list</p>
            {items.length > 0 && (
              <p className="text-xs text-gray-500 tabular-nums">{doneCount} of {items.length} done</p>
            )}
          </div>
          {items.length > 0 && (
            <div className="mt-2.5 h-1 rounded-full bg-gray-200 overflow-hidden" role="progressbar"
              aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount} aria-label="Today's list progress">
              <div className="h-full id-gradient rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${(doneCount / items.length) * 100}%` }} />
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-gray-500 mt-4 leading-relaxed">
              No calls or promises for today. When customers owe you, the few worth calling first will appear here.
            </p>
          ) : allDone ? (
            <div className="mt-5 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full id-gradient flex items-center justify-center shrink-0">
                <FiCheck size={15} className="text-white" />
              </span>
              <div>
                <p className="text-[15px] text-gray-900">All {items.length} done. That&apos;s today handled.</p>
                <button onClick={() => { if (userId) { setDone([]); writeDoneToday(userId, []); } }}
                  className="text-xs text-gray-500 hover:text-gray-900 mt-1 transition-colors">
                  Show the list again
                </button>
              </div>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-gray-200 border-y border-gray-200">
              {items.map(item => {
                const isDone = done.includes(item.id);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3.5">
                    <button onClick={() => toggle(item.id)}
                      aria-pressed={isDone}
                      aria-label={isDone ? `Mark ${item.name} not done` : `Mark ${item.name} done`}
                      className={[
                        "w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all",
                        isDone ? "id-gradient" : "border border-gray-300 hover:border-gray-500",
                      ].join(" ")}>
                      {isDone && <FiCheck size={12} className="text-white" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={["text-sm truncate", isDone ? "text-gray-400 line-through" : "text-gray-900"].join(" ")}>
                        {item.kind === "promise" ? "Confirm payment from " : "Call "}{item.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.amount > 0 ? `${fmtLakh(item.amount)} · ` : ""}{item.detail}
                      </p>
                    </div>
                    {item.contact && !isDone && (
                      <a href={`https://wa.me/91${item.contact}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shrink-0">
                        <FiMessageSquare size={11} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

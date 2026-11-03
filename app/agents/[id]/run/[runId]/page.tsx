"use client";

// Agent run detail. Read from GET /api/os/agents/:key/runs/:runId, which
// returns one row of the agent_runs ledger for the signed-in workspace: when
// it ran, how long it took, what it found, and any error. Unknown runs say
// so instead of rendering made-up detail. The working capital agent's output
// is laid out week by week; other agents show their recorded summary.

import Link from "next/link";
import { useParams } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { osApi, type AgentRun } from "@/lib/os";
import { useLoad, errorText } from "@/components/os/shared";
import { EmptyLine, ErrorBanner, SkeletonRows, StatusDot, Sep, ago } from "@/components/v32/ui";

const WORKING_CAPITAL = "starlane.working_capital";

type Week = { week: number; from: string; to: string; moneyIn: number; moneyOut: number; net: number; cumulativeNet: number };
type Chase = { invoiceId: string; number: string | null; customer: string; outstanding: number; daysLate: number | null };
type Payable = { purchaseId: string; supplier: string; billNumber: string | null; outstanding: number; dueDate: string | null; when: string; daysLate?: number };

function money(n: unknown, currency = "INR"): string {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? "−" : "";
  const abs = Math.abs(v);
  if (currency === "INR") return `${sign}₹${abs.toLocaleString("en-IN")}`;
  return `${sign}${currency} ${abs.toLocaleString("en-US")}`;
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "#63635F", marginBottom: 6 }}>{children}</div>;
}

function Row({ left, right, tone }: { left: React.ReactNode; right: React.ReactNode; tone?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between" style={{ columnGap: 12, rowGap: 2, padding: "7px 0", borderBottom: "1px solid #EBEAE6", fontSize: 12.5 }}>
      <span style={{ color: "#43433F", minWidth: 0 }}>{left}</span>
      <span style={{ color: tone || "#191917", textAlign: "right", marginLeft: "auto" }}>{right}</span>
    </div>
  );
}

function WorkingCapitalOutput({ out }: { out: Record<string, unknown> }) {
  const currency = String(out.currency || "INR");
  const weeks = (out.weeks as Week[]) || [];
  const chase = (out.chaseFirst as Chase[]) || [];
  const payables = (out.payablesSoonest as Payable[]) || [];
  const unknowns = (out.unknowns as string[]) || [];
  return (
    <div className="flex flex-col lg:flex-row" style={{ gap: 32 }}>
      <div className="flex flex-col" style={{ flex: 1.3, minWidth: 0, gap: 22 }}>
        <div>
          <Label>Week by week</Label>
          {weeks.map((w) => (
            <Row
              key={w.week}
              left={`Week ${w.week} · ${shortDay(w.from)}${w.to !== w.from ? ` to ${shortDay(w.to)}` : ""}`}
              right={<>{money(w.moneyIn, currency)} in · {money(w.moneyOut, currency)} out · <span style={{ color: w.cumulativeNet < 0 ? "#A64F4B" : "#477054" }}>{money(w.cumulativeNet, currency)} so far</span></>}
            />
          ))}
        </div>
        <div>
          <Label>Already late: chase first</Label>
          {chase.length === 0 ? <div style={{ fontSize: 12.5, color: "#6E6E69" }}>No overdue invoices.</div> : chase.map((c) => (
            <Row key={c.invoiceId} left={`${c.customer}${c.number ? ` · ${c.number}` : ""}`} right={`${money(c.outstanding, currency)}${c.daysLate != null ? ` · ${c.daysLate} days late` : ""}`} />
          ))}
        </div>
        <div>
          <Label>Suppliers due soonest</Label>
          {payables.length === 0 ? <div style={{ fontSize: 12.5, color: "#6E6E69" }}>No unpaid purchases.</div> : payables.map((p) => (
            <Row
              key={p.purchaseId}
              left={`${p.supplier}${p.billNumber ? ` · ${p.billNumber}` : ""}`}
              right={`${money(p.outstanding, currency)} · ${p.when === "OVERDUE" ? `${p.daysLate ?? 0} days overdue` : p.when === "NO_DUE_DATE" ? "no due date" : `due ${p.dueDate ? shortDay(p.dueDate) : ""}`}`}
              tone={p.when === "OVERDUE" ? "#A64F4B" : undefined}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col" style={{ flex: 1, maxWidth: 300, minWidth: 0, gap: 20 }}>
        <div>
          <Label>Next {String(out.horizonDays ?? 30)} days</Label>
          <Row left="Due in" right={money(out.moneyIn, currency)} />
          <Row left="Owed out" right={money(out.moneyOut, currency)} />
          <Row left="Net" right={money(out.net, currency)} tone={Number(out.net) < 0 ? "#A64F4B" : "#477054"} />
        </div>
        {unknowns.length > 0 && (
          <div>
            <Label>Not known</Label>
            {unknowns.map((u) => <div key={u} style={{ fontSize: 12.5, color: "#43433F", lineHeight: 1.55, padding: "5px 0" }}>{u}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function statusOf(r: AgentRun) {
  if (r.status === "completed") return { label: "Completed", color: "#477054" };
  if (r.status === "failed") return { label: "Failed", color: "#A64F4B" };
  return { label: "Running", color: "#6E6E69" };
}

export default function AgentRunDetail() {
  const params = useParams<{ id: string; runId: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const runId = params?.runId ? decodeURIComponent(params.runId) : "";
  const { data, error, loading } = useLoad(() => osApi.agentRun(id, runId));
  const notFound = !!error && (error as { status?: number }).status === 404;
  const r = data?.run;

  return (
    <DashboardLayout pageTitle="Agent run">
      <Link href={`/agents/${encodeURIComponent(id)}`} className="hover-dim flex items-center" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
        <FiChevronLeft size={13} /> Agent
      </Link>

      {loading && <SkeletonRows rows={3} />}
      {notFound && <EmptyLine title="Run not found." body={`No run "${runId}" is recorded for this agent in your workspace.`} />}
      {!!error && !notFound && <ErrorBanner>This run could not be loaded: {errorText(error)}</ErrorBanner>}

      {r && (() => {
        const st = statusOf(r);
        const out = (r.output || {}) as Record<string, unknown>;
        return (
          <div className="fade-once flex flex-col" style={{ gap: 22 }}>
            <div>
              <h1 style={{ margin: "0 0 4px", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 24, letterSpacing: "-0.01em", color: "#191917" }}>
                {r.startedAt ? `Run ${ago(r.startedAt)}` : "Run"}
              </h1>
              <div className="flex items-center flex-wrap" style={{ gap: 6, fontSize: 12.5, color: "#63635F" }}>
                <StatusDot label={st.label} color={st.color} />
                {r.durationMs != null && <><Sep /> {r.durationMs < 1000 ? `${r.durationMs} ms` : `${(r.durationMs / 1000).toFixed(1)} s`}</>}
                {r.startedAt && <><Sep /> {new Date(r.startedAt).toLocaleString()}</>}
              </div>
            </div>
            {r.summary && <div style={{ fontSize: 14, color: "#43433F", lineHeight: 1.6, maxWidth: 720 }}>{r.summary}</div>}
            {r.error && <ErrorBanner>{r.error}</ErrorBanner>}
            {r.agentKey === WORKING_CAPITAL && r.output ? <WorkingCapitalOutput out={out} /> : null}
          </div>
        );
      })()}
    </DashboardLayout>
  );
}

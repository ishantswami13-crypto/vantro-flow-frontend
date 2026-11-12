"use client";

// One agent run as the server recorded it: status, the answer and its
// citations, every model and tool step in order, approvals and handoffs.
// Used by the run page and inside the studio's Test stage.

import { Fragment, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { platformApi, RISK_LABEL, type ExecutionDetail, type Step } from "@/lib/platform";
import { Button } from "@/components/v32/ui";
import { ExecStatusChip, Chip, duration, when, PlatformErrorBanner, Loading, useAction, InlineError, money } from "@/components/platform/ui";

const LIVE = new Set(["queued", "running", "awaiting_approval"]);

export function useExecution(id: string | null) {
  return useQuery({
    queryKey: ["platform", "execution", id],
    queryFn: () => platformApi.execution(id as string).then((r) => r.execution),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && !LIVE.has(q.state.data.status) ? false : 1500),
  });
}

function stepLabel(s: Step): string {
  if (s.kind === "model") return "Model";
  if (s.kind === "tool") return s.name ? `Tool: ${s.name}` : "Tool";
  if (s.kind === "approval") return "Approval";
  return s.name || "System";
}

function show(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export function StepList({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!steps.length) return <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No steps recorded yet.</p>;
  return (
    <div className="pf-list">
      {steps.map((s) => (
        <Fragment key={s.key}>
          <button type="button" className="pf-row w-full text-left" aria-expanded={open === s.key} onClick={() => setOpen(open === s.key ? null : s.key)}>
            <div className="pf-row-main">
              <div className="pf-row-title">{stepLabel(s)}</div>
              <div className="pf-row-sub">{s.status}{s.durationMs != null ? ` · ${duration(s.durationMs)}` : ""}{s.error ? ` · ${s.error}` : ""}</div>
            </div>
            <Chip tone={s.status === "completed" ? "good" : s.status === "failed" ? "bad" : s.status === "blocked" || s.status === "dry_run" ? "warn" : undefined}>{s.status === "dry_run" ? "dry run (test)" : s.status}</Chip>
          </button>
          {open === s.key && (
            <div style={{ padding: "0 16px 14px", display: "grid", gap: 8 }}>
              {s.input != null && <div><div className="pf-hint" style={{ fontSize: 12, color: "#8F8A81", marginBottom: 4 }}>Input</div><pre className="pf-pre">{show(s.input)}</pre></div>}
              {s.output != null && <div><div className="pf-hint" style={{ fontSize: 12, color: "#8F8A81", marginBottom: 4 }}>Output</div><pre className="pf-pre">{show(s.output)}</pre></div>}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export function RunBody({ ex }: { ex: ExecutionDetail }) {
  return (
    <div className="pf-stack">
      {ex.status === "failed" && (
        <div className="pf-note is-warn" role="alert">
          <strong style={{ fontWeight: 500 }}>{(ex.errorClass || "Failed").replace(/_/g, " ").toLowerCase()}</strong>{ex.errorMessage ? `: ${ex.errorMessage}` : ""}
        </div>
      )}
      {ex.status === "awaiting_approval" && (
        <div className="pf-note is-warn">This run is paused until someone decides on {ex.approvals.filter((a) => a.status === "pending").length || "an"} approval request. <Link href="/approvals" style={{ textDecoration: "underline" }}>Open approvals</Link></div>
      )}
      {ex.output?.text && (
        <section>
          <h3 className="hv-block-title">Result</h3>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, color: "#1F1D1A" }}>{ex.output.text}</div>
          {ex.output.note && <p style={{ fontSize: 12.5, color: "#8C6826", marginTop: 8 }}>{ex.output.note}</p>}
          {!!ex.output.citations?.length && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#8F8A81", marginBottom: 6 }}>Sources</div>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {ex.output.citations.map((c, i) => <Chip key={`${c.documentId}-${c.chunk}-${i}`}>[{i + 1}] {c.title} · {c.collectionName}</Chip>)}
              </div>
            </div>
          )}
          {ex.output.data && Object.keys(ex.output.data).length > 0 && <pre className="pf-pre" style={{ marginTop: 12 }}>{show(ex.output.data)}</pre>}
        </section>
      )}
      {ex.approvals.length > 0 && (
        <section>
          <h3 className="hv-block-title">Approvals</h3>
          <div className="pf-list">
            {ex.approvals.map((a) => (
              <Link key={a.id} href={`/approvals?id=${a.id}`} className="pf-row">
                <div className="pf-row-main">
                  <div className="pf-row-title">{a.summary}</div>
                  <div className="pf-row-sub">{RISK_LABEL[a.risk]} · approver: {a.approverRole}{a.decidedBy ? ` · decided by ${a.decidedBy} ${when(a.decidedAt)}` : ""}{a.decisionNote ? ` · "${a.decisionNote}"` : ""}</div>
                </div>
                <Chip tone={a.status === "approved" ? "good" : a.status === "rejected" ? "bad" : a.status === "pending" ? "warn" : undefined}>{a.status}</Chip>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3 className="hv-block-title">Steps</h3>
        <StepList steps={ex.steps} />
      </section>
      {ex.children.length > 0 && (
        <section>
          <h3 className="hv-block-title">Handed off to</h3>
          <div className="pf-list">
            {ex.children.map((c) => (
              <Link key={c.id} href={`/command/runs/${c.id}`} className="pf-row">
                <div className="pf-row-main"><div className="pf-row-title">Run {c.id.slice(0, 8)}</div><div className="pf-row-sub">{when(c.createdAt)}</div></div>
                <ExecStatusChip status={c.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function RunSide({ ex, canRun }: { ex: ExecutionDetail; canRun: boolean }) {
  const qc = useQueryClient();
  const router = useRouter();
  const act = useAction();
  return (
    <aside className="hv-side">
      <div className="hv-pane">
        <div className="hv-pane-head"><h3>Run</h3><ExecStatusChip status={ex.status} /></div>
        <dl className="hv-props">
          <dt>Agent</dt><dd><Link href={`/agents/studio/${ex.agentId}`} style={{ textDecoration: "underline" }}>{ex.agentName}</Link></dd>
          <dt>Mode</dt><dd>{ex.mode === "test" ? "Test (writes are dry runs)" : "Live"}</dd>
          <dt>Version</dt><dd>{ex.agentVersion != null ? `v${ex.agentVersion}` : "Draft"}</dd>
          <dt>Trigger</dt><dd>{ex.trigger}</dd>
          <dt>Requested by</dt><dd>{ex.requestedByEmail || "–"}</dd>
          <dt>Created</dt><dd>{when(ex.createdAt)}</dd>
          <dt>Duration</dt><dd>{duration(ex.durationMs)}</dd>
          <dt>Attempts</dt><dd>{ex.attempts} of {ex.maxAttempts}</dd>
          <dt>Model</dt><dd>{ex.modelUsed || "–"}</dd>
          <dt>Calls</dt><dd>{ex.modelCalls} model, {ex.toolCalls} tool</dd>
          <dt>Tokens</dt><dd>{(ex.inputTokens + ex.outputTokens).toLocaleString()}</dd>
          {"cost" in ex && ex.cost && (<><dt>Model cost</dt><dd title={ex.cost.available ? undefined : ex.cost.reason}>{ex.cost.available ? money(ex.cost.value, ex.cost.currency) : "Not measured"}</dd></>)}
          {ex.parentExecutionId && (<><dt>Handed off from</dt><dd><Link href={`/command/runs/${ex.parentExecutionId}`} style={{ textDecoration: "underline" }}>Parent run</Link></dd></>)}
        </dl>
      </div>
      {Object.keys(ex.input || {}).length > 0 && (
        <div className="hv-pane">
          <div className="hv-pane-head"><h3>Input</h3></div>
          <pre className="pf-pre">{show(ex.input)}</pre>
        </div>
      )}
      {canRun && (
        <div className="hv-pane flex flex-wrap" style={{ gap: 8 }}>
          {LIVE.has(ex.status) && !ex.cancelRequested && (
            <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.cancel(ex.id); await qc.invalidateQueries({ queryKey: ["platform", "execution", ex.id] }); })}>Cancel run</Button>
          )}
          {ex.cancelRequested && LIVE.has(ex.status) && <span style={{ fontSize: 12.5, color: "#8F8A81" }}>Cancelling…</span>}
          {!LIVE.has(ex.status) && (
            <Button small disabled={act.busy} onClick={() => act.run(async () => { const r = await platformApi.rerun(ex.id); router.push(`/command/runs/${r.executionId}`); })}>Run again with the same input</Button>
          )}
          <InlineError error={act.error} />
        </div>
      )}
    </aside>
  );
}

export function RunLoader({ id }: { id: string }) {
  const q = useExecution(id);
  if (q.isLoading) return <Loading rows={4} height={60} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what="This run" />;
  return q.data ? <RunBody ex={q.data} /> : null;
}

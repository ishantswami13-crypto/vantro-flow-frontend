"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { IconCheck } from "@/components/v32/icons";
import { formatINR, formatDateTime, humanizeCode } from "./format";
import { formatCount } from "@/lib/format";
import { api, type IntelligenceAction, type ImpactComponent, type DemoExecutionResult } from "@/lib/api";

type ExecState = "PROPOSED" | "APPROVING" | "EXECUTED" | "FAILED";

const LABEL: React.CSSProperties = { fontSize: 12, color: "var(--ink-3)" };

function Fig({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dd className="num" style={{ margin: 0, fontSize: 16, lineHeight: 1.25, color: "var(--ink)" }}>{value}</dd>
      <dt style={{ ...LABEL, marginTop: 3 }}>{label}</dt>
    </div>
  );
}

// Before and after, side by side on one hairline strip: no boxes, no
// colour on the figures. The words carry the difference.
function Comparison({ component, topAction }: { component: ImpactComponent; topAction: IntelligenceAction }) {
  const top = topAction.reason_json.rankedOptions[0];
  const row = "grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-y-3";
  const head: React.CSSProperties = { fontSize: 13, color: "var(--ink-2)", paddingTop: 1 };
  const figs = "grid grid-cols-3 max-w-[480px]";
  return (
    <div>
      <div className={row} style={{ padding: "14px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div style={head}>Without action</div>
        <dl className={figs} style={{ gap: 16, margin: 0 }}>
          <Fig
            label="Stockout"
            value={component.stockout.sufficientData
              ? component.stockout.alreadyBelowSafetyStock ? "Now" : `${component.stockout.daysUntilStockout} days`
              : "Not known yet"}
          />
          <Fig label="Revenue exposed" value={formatINR(component.revenueExposure.totalRevenueExposure)} />
          <Fig label="Orders exposed" value={component.affectedDemand.affectedOrderCount} />
        </dl>
      </div>
      <div className={row} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
        <div style={head}>With the recommended action</div>
        <dl className={figs} style={{ gap: 16, margin: 0 }}>
          <Fig label="Revenue protected" value={formatINR(top.avoidedRevenueExposure)} />
          <Fig label="Estimated cost" value={formatINR(top.cost)} />
          <Fig label="Benefit to cost" value={`${top.benefitToCostRatio}×`} />
        </dl>
      </div>
    </div>
  );
}

const PRIORITY_TONE: Record<string, StatusTone> = { urgent: "critical", high: "attention" };

function ActionRow({ action, rank, dominant, onApprove, execState, execResult }: {
  action: IntelligenceAction;
  rank: number;
  dominant: boolean;
  onApprove: () => void;
  execState: ExecState;
  execResult: DemoExecutionResult | null;
}) {
  const top = action.reason_json.rankedOptions[0];
  const alreadyDone = action.status === "done" || execState === "EXECUTED";
  const product = action.parameters?.products?.[0];
  const orderLine = product
    ? `Order ${formatCount(product.quantity)} units of ${product.name} (${product.sku})`
    : null;
  const meta = [dominant ? "Recommended" : null, `${humanizeCode(action.risk_level)} risk`].filter(Boolean).join(" · ");

  return (
    <li className={`grid grid-cols-[24px_minmax(0,1fr)] ${dominant && !alreadyDone ? "wk-attn" : ""}`} style={{ gap: 8, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="num" style={{ fontSize: 12.5, lineHeight: "20px", color: "var(--ink-3)" }}>{rank}</span>
      <div className="min-w-0">
        <div className="flex items-start justify-between flex-wrap" style={{ gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", fontWeight: 500, color: "var(--ink)" }}>{action.title}</p>
          <StatusChip tone={PRIORITY_TONE[action.priority] || "neutral"}>{humanizeCode(action.priority)}</StatusChip>
        </div>
        {/* The backend description repeats the figures shown below, so show the
            order itself when the frozen parameters carry it. */}
        <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>{orderLine || action.description}</p>
        <p className="meta" style={{ margin: "2px 0 0" }}>{meta}</p>

        <dl className="grid grid-cols-3" style={{ gap: 16, margin: "14px 0 0", maxWidth: 480 }}>
          <Fig label="Revenue protected" value={formatINR(top.avoidedRevenueExposure)} />
          <Fig label="Estimated cost" value={formatINR(top.cost)} />
          <Fig label="Lead time" value={top.leadTimeDays != null ? `${top.leadTimeDays} days` : "Not known yet"} />
        </dl>

        {action.reason_json.rankedOptions.length > 1 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ fontSize: 12.5, color: "var(--ink-3)", cursor: "pointer" }}>
              {action.reason_json.rankedOptions.length - 1} other {action.reason_json.rankedOptions.length - 1 === 1 ? "option" : "options"} considered
            </summary>
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, maxWidth: 560 }}>
              {action.reason_json.rankedOptions.slice(1).map((opt, i) => (
                <li key={i} className="flex items-center justify-between" style={{ gap: 12, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-2)" }}>
                  <span>{opt.label}</span>
                  <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{opt.benefitToCostRatio}× · {formatINR(opt.cost)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div style={{ marginTop: 16 }}>
          {alreadyDone && execResult ? (
            <div style={{ maxWidth: 480 }}>
              <div className="flex items-center" style={{ gap: 6, marginBottom: 8, color: "var(--positive)", fontSize: 13 }}>
                <IconCheck size={14} /> Simulated run complete
              </div>
              <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)]" style={{ gap: "6px 16px", margin: 0, fontSize: 12.5 }}>
                <dt style={{ color: "var(--ink-3)" }}>Purchase order</dt><dd className="num" style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>#{execResult.purchaseOrder.id}</dd>
                <dt style={{ color: "var(--ink-3)" }}>Status</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>Draft, demo adapter</dd>
                <dt style={{ color: "var(--ink-3)" }}>Supplier</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{execResult.purchaseOrder.supplier_name}</dd>
                <dt style={{ color: "var(--ink-3)" }}>Related action</dt><dd className="truncate num" style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{execResult.purchaseOrder.related_ai_action_id.slice(0, 8)}</dd>
                <dt style={{ color: "var(--ink-3)" }}>Time</dt><dd className="num" style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{formatDateTime(execResult.purchaseOrder.created_at)}</dd>
              </dl>
              {execResult.note && <p className="meta" style={{ margin: "10px 0 0" }}>{execResult.note}</p>}
            </div>
          ) : alreadyDone ? (
            <StatusChip tone="positive">Already run</StatusChip>
          ) : (
            <div className="flex items-start flex-wrap" style={{ gap: 16 }}>
              <Button
                variant={dominant ? "primary" : "secondary"}
                size="sm"
                loading={execState === "APPROVING"}
                disabled={execState === "APPROVING"}
                onClick={onApprove}
              >
                Approve and run
              </Button>
              <p style={{ margin: 0, flex: "1 1 260px", fontSize: 12, lineHeight: 1.55, color: "var(--ink-3)", maxWidth: 440 }}>
                Creates a draft purchase order in Starlane&rsquo;s demo ERP adapter. Nothing is written to a live system.
              </p>
            </div>
          )}
          {execState === "FAILED" && <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>That didn&rsquo;t go through. Nothing was created; try again.</p>}
        </div>
      </div>
    </li>
  );
}

export function DecisionSection({ actions, component }: { actions: IntelligenceAction[]; component: ImpactComponent }) {
  const [states, setStates] = useState<Record<string, ExecState>>({});
  const [results, setResults] = useState<Record<string, DemoExecutionResult>>({});

  const mutation = useMutation({
    mutationFn: (actionId: string) => api.intelligence.approveAndExecute(actionId),
  });

  function approve(actionId: string) {
    if (states[actionId] === "APPROVING" || states[actionId] === "EXECUTED") return;
    setStates((s) => ({ ...s, [actionId]: "APPROVING" }));
    mutation.mutate(actionId, {
      onSuccess: (res) => {
        setStates((s) => ({ ...s, [actionId]: "EXECUTED" }));
        setResults((r) => ({ ...r, [actionId]: res.execution }));
      },
      onError: () => setStates((s) => ({ ...s, [actionId]: "FAILED" })),
    });
  }

  if (actions.length === 0) return null;
  const dominant = actions[0];

  return (
    <div>
      <Comparison component={component} topAction={dominant} />
      <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
        {actions.map((a, i) => (
          <ActionRow
            key={a.id}
            action={a}
            rank={i + 1}
            dominant={i === 0}
            onApprove={() => approve(a.id)}
            execState={states[a.id] || "PROPOSED"}
            execResult={results[a.id] || null}
          />
        ))}
      </ol>
    </div>
  );
}

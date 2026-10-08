"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { IconBox, IconCheck } from "@/components/v32/icons";
import { formatINR, formatDateTime, humanizeCode } from "./format";
import { api, type IntelligenceAction, type ImpactComponent, type DemoExecutionResult } from "@/lib/api";

type ExecState = "PROPOSED" | "APPROVING" | "EXECUTED" | "FAILED";

const BOX: React.CSSProperties = { padding: "16px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--line-card)" };
const LABEL: React.CSSProperties = { fontSize: 12, color: "var(--ink-3)" };
const VALUE: React.CSSProperties = { fontSize: 15, color: "var(--ink)", marginTop: 4, fontVariantNumeric: "tabular-nums" };

function Fig({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "critical" | "positive" }) {
  return (
    <div className="min-w-0">
      <dt style={LABEL}>{label}</dt>
      <dd style={{ ...VALUE, margin: "4px 0 0", color: tone ? `var(--${tone})` : "var(--ink)" }}>{value}</dd>
    </div>
  );
}

function ComparisonCard({ component, topAction }: { component: ImpactComponent; topAction: IntelligenceAction }) {
  const top = topAction.reason_json.rankedOptions[0];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 8 }}>
      <div style={BOX}>
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Without action</div>
        <dl className="grid grid-cols-3 sm:grid-cols-1" style={{ gap: 12, margin: "12px 0 0" }}>
          <Fig
            label="Stockout"
            value={component.stockout.sufficientData
              ? component.stockout.alreadyBelowSafetyStock ? "Below safety stock now" : `${component.stockout.daysUntilStockout} days`
              : "Not known yet"}
          />
          <Fig label="Revenue exposed" value={formatINR(component.revenueExposure.totalRevenueExposure)} tone="critical" />
          <Fig label="Orders exposed" value={component.affectedDemand.affectedOrderCount} />
        </dl>
      </div>
      <div style={BOX}>
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>With the recommended action</div>
        <dl className="grid grid-cols-3 sm:grid-cols-1" style={{ gap: 12, margin: "12px 0 0" }}>
          <Fig label="Revenue protected" value={formatINR(top.avoidedRevenueExposure)} tone="positive" />
          <Fig label="Estimated cost" value={formatINR(top.cost)} />
          <Fig label="Benefit to cost" value={`${top.benefitToCostRatio}×`} />
        </dl>
      </div>
    </div>
  );
}

const PRIORITY_TONE: Record<string, StatusTone> = { urgent: "critical", high: "attention" };
const RISK_TONE: Record<string, StatusTone> = { high: "critical", medium: "attention", low: "positive" };

function ActionCard({ action, rank, dominant, onApprove, execState, execResult }: {
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
    ? `Order ${product.quantity.toLocaleString("en-IN")} units of ${product.name} (${product.sku})`
    : null;

  return (
    <div style={{ ...BOX, padding: 20, borderColor: dominant ? "var(--line-emphasis)" : "var(--line-card)" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 8, marginBottom: 12 }}>
        <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
          <span className="tabular-nums inline-flex items-center justify-center" style={{ width: 22, height: 22, borderRadius: "50%", fontSize: 11, color: "var(--ink-2)", background: "var(--surface-2)", boxShadow: "inset 0 0 0 1px var(--line-card)" }}>
            {rank}
          </span>
          <StatusChip tone={PRIORITY_TONE[action.priority] || "neutral"}>{humanizeCode(action.priority)} priority</StatusChip>
          {dominant && <StatusChip tone="info">Recommended</StatusChip>}
        </div>
        <StatusChip tone={RISK_TONE[action.risk_level] || "neutral"}>{humanizeCode(action.risk_level)} risk</StatusChip>
      </div>

      <p style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>{action.title}</p>
      {/* The backend description repeats the figures shown below, so show the
          order itself when the frozen parameters carry it. */}
      <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)" }}>{orderLine || action.description}</p>

      <dl className="grid grid-cols-3" style={{ gap: 12, margin: "16px 0 0" }}>
        <Fig label="Revenue protected" value={formatINR(top.avoidedRevenueExposure)} tone="positive" />
        <Fig label="Estimated cost" value={formatINR(top.cost)} />
        <Fig label="Lead time" value={top.leadTimeDays != null ? `${top.leadTimeDays} days` : "Not known yet"} />
      </dl>

      {action.reason_json.rankedOptions.length > 1 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ fontSize: 12.5, color: "var(--ink-3)", cursor: "pointer" }}>
            {action.reason_json.rankedOptions.length - 1} other {action.reason_json.rankedOptions.length - 1 === 1 ? "option" : "options"} considered
          </summary>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
            {action.reason_json.rankedOptions.slice(1).map((opt, i) => (
              <li key={i} className="flex items-center justify-between" style={{ gap: 12, padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-2)" }}>
                <span>{opt.label}</span>
                <span className="tabular-nums" style={{ color: "var(--ink-3)" }}>{opt.benefitToCostRatio}× · {formatINR(opt.cost)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        {!alreadyDone && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-2)" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink)" }}>What will happen</p>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
              A draft purchase order is created: {action.title}. This is a simulated run in Starlane&rsquo;s demo ERP adapter; nothing is written to a live system.
            </p>
          </div>
        )}

        {alreadyDone && execResult ? (
          <div>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 10, color: "var(--positive)", fontSize: 13 }}>
              <IconCheck size={15} /> Simulated run complete
            </div>
            <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)]" style={{ gap: "6px 16px", margin: 0, fontSize: 12.5 }}>
              <dt style={{ color: "var(--ink-3)" }}>Purchase order</dt><dd className="tabular-nums" style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>#{execResult.purchaseOrder.id}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Status</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>Draft, demo adapter</dd>
              <dt style={{ color: "var(--ink-3)" }}>Supplier</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{execResult.purchaseOrder.supplier_name}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Related action</dt><dd className="truncate tabular-nums" style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{execResult.purchaseOrder.related_ai_action_id.slice(0, 8)}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Time</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--ink)" }}>{formatDateTime(execResult.purchaseOrder.created_at)}</dd>
            </dl>
            {execResult.note && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{execResult.note}</p>}
          </div>
        ) : alreadyDone ? (
          <StatusChip tone="positive">Already run</StatusChip>
        ) : (
          <Button
            variant={dominant ? "primary" : "secondary"}
            fullWidth
            loading={execState === "APPROVING"}
            disabled={execState === "APPROVING"}
            icon={<IconBox size={14} />}
            onClick={onApprove}
          >
            Approve and run
          </Button>
        )}
        {execState === "FAILED" && <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>That didn&rsquo;t go through. Nothing was created; try again.</p>}
      </div>
    </div>
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
      <ComparisonCard component={component} topAction={dominant} />
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a, i) => (
          <ActionCard
            key={a.id}
            action={a}
            rank={i + 1}
            dominant={i === 0}
            onApprove={() => approve(a.id)}
            execState={states[a.id] || "PROPOSED"}
            execResult={results[a.id] || null}
          />
        ))}
      </div>
    </div>
  );
}

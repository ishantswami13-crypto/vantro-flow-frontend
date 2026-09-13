"use client";

import React, { useState } from "react";
import { FiCheckCircle, FiClock, FiPackage } from "react-icons/fi";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatINR, formatDateTime } from "./format";
import { api, type IntelligenceAction, type ImpactComponent, type DemoExecutionResult } from "@/lib/api";

type ExecState = "PROPOSED" | "APPROVING" | "EXECUTED" | "FAILED";

function ComparisonCard({ component, topAction }: { component: ImpactComponent; topAction: IntelligenceAction }) {
  const top = topAction.reason_json.rankedOptions[0];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card-premium p-4 border-danger/25">
        <p className="section-label text-danger">Without action</p>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-2xs text-muted">Stockout</dt>
            <dd className="text-sm font-bold text-primary">
              {component.stockout.sufficientData
                ? component.stockout.alreadyBelowSafetyStock ? "Already below safety stock" : `${component.stockout.daysUntilStockout} days`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-2xs text-muted">Revenue exposed</dt>
            <dd className="text-sm font-bold text-danger">{formatINR(component.revenueExposure.totalRevenueExposure)}</dd>
          </div>
          <div>
            <dt className="text-2xs text-muted">Orders exposed</dt>
            <dd className="text-sm font-bold text-primary">{component.affectedDemand.affectedOrderCount}</dd>
          </div>
        </dl>
      </div>
      <div className="card-premium p-4 border-success/25">
        <p className="section-label text-success">With recommended action</p>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-2xs text-muted">Revenue protected</dt>
            <dd className="text-sm font-bold text-success">{formatINR(top.avoidedRevenueExposure)}</dd>
          </div>
          <div>
            <dt className="text-2xs text-muted">Estimated cost</dt>
            <dd className="text-sm font-bold text-primary">{formatINR(top.cost)}</dd>
          </div>
          <div>
            <dt className="text-2xs text-muted">Benefit-to-cost ratio</dt>
            <dd className="text-sm font-bold text-primary">{top.benefitToCostRatio}×</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

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

  return (
    <div className={["card-premium p-5", dominant ? "border-accent/40" : ""].join(" ")}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-2xs font-bold text-secondary shrink-0">
            {rank}
          </span>
          <Badge variant={action.priority === "urgent" ? "danger" : action.priority === "high" ? "warning" : "default"}>{action.priority}</Badge>
          {dominant && <Badge variant="accent">Recommended</Badge>}
        </div>
        <Badge variant={action.risk_level === "high" ? "danger" : action.risk_level === "medium" ? "warning" : "success"}>{action.risk_level} risk</Badge>
      </div>

      <p className="text-sm font-bold text-primary">{action.title}</p>
      <p className="text-2xs text-secondary mt-1 leading-relaxed">{action.description}</p>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-2xs text-muted">Revenue protected</p>
          <p className="text-sm font-bold text-success">{formatINR(top.avoidedRevenueExposure)}</p>
        </div>
        <div>
          <p className="text-2xs text-muted">Estimated cost</p>
          <p className="text-sm font-bold text-primary">{formatINR(top.cost)}</p>
        </div>
        <div>
          <p className="text-2xs text-muted">Lead time</p>
          <p className="text-sm font-bold text-primary">{top.leadTimeDays != null ? `${top.leadTimeDays}d` : "—"}</p>
        </div>
      </div>

      {action.reason_json.rankedOptions.length > 1 && (
        <details className="mt-3">
          <summary className="text-2xs text-muted cursor-pointer hover:text-secondary">
            {action.reason_json.rankedOptions.length - 1} other option(s) considered
          </summary>
          <ul className="mt-2 space-y-1.5">
            {action.reason_json.rankedOptions.slice(1).map((opt, i) => (
              <li key={i} className="text-2xs text-muted flex items-center justify-between border-t border-border pt-1.5">
                <span>{opt.label}</span>
                <span className="font-mono">{opt.benefitToCostRatio}× · {formatINR(opt.cost)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        {!alreadyDone && (
          <div className="card-premium p-3 mb-3 bg-surface-2">
            <p className="text-2xs font-semibold text-secondary">What will happen</p>
            <p className="text-2xs text-muted mt-0.5">Create a draft purchase order for {action.title.toLowerCase()}.</p>
            <p className="text-2xs text-muted mt-0.5">
              Execution mode: <span className="font-mono">Demo ERP Adapter</span> (Starlane connector layer — no live Odoo write occurs)
            </p>
          </div>
        )}

        {alreadyDone && execResult ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FiCheckCircle className="text-success" size={16} />
              <p className="text-xs font-bold text-success">Executed via Demo ERP Adapter</p>
            </div>
            <dl className="text-2xs text-secondary space-y-1">
              <div className="flex justify-between"><dt className="text-muted">Purchase order</dt><dd className="font-mono">#{execResult.purchaseOrder.id}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>Draft — Demo Adapter</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Supplier</dt><dd>{execResult.purchaseOrder.supplier_name}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Related action</dt><dd className="font-mono truncate ml-2">{execResult.purchaseOrder.related_ai_action_id.slice(0, 8)}…</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Timestamp</dt><dd>{formatDateTime(execResult.purchaseOrder.created_at)}</dd></div>
            </dl>
            <p className="text-2xs text-muted mt-2 italic">{execResult.note}</p>
          </div>
        ) : alreadyDone ? (
          <Badge variant="success">Already executed</Badge>
        ) : (
          <Button
            variant={dominant ? "primary" : "secondary"}
            size="md"
            fullWidth
            loading={execState === "APPROVING"}
            disabled={execState === "APPROVING"}
            icon={<FiPackage size={14} />}
            onClick={onApprove}
          >
            Approve &amp; execute
          </Button>
        )}
        {execState === "FAILED" && <p className="text-2xs text-danger mt-2">Execution failed — check the backend log and try again.</p>}
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
      <div className="flex items-center gap-2 mb-3">
        <FiClock className="text-muted" size={14} />
        <p className="section-label">Recommended interventions</p>
      </div>
      <ComparisonCard component={component} topAction={dominant} />
      <div className="mt-4 space-y-3">
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

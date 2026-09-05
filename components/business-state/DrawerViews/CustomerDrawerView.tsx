"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type CustomerIntelligenceResponse } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import { EntityRow } from "@/components/business-state/EntityRow";

interface CustomerDrawerViewProps {
  name: string;
  phone?: string;
  onOpenInvoice: (invoiceId: string, label: string) => void;
}

export function CustomerDrawerView({ name, phone, onOpenInvoice }: CustomerDrawerViewProps) {
  const { data, isLoading, isError, refetch } = useQuery<CustomerIntelligenceResponse>({
    queryKey: ["customer-intelligence", name, phone],
    queryFn: () => api.customers.intelligence(name, phone),
  });

  if (isLoading) return <LoadingState label="Loading customer" rows={2} />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load this customer" onRetry={() => refetch()} />;
  }

  const { score, summary, invoices, revenue } = data;

  const HEALTH_LABEL_TEXT: Record<string, string> = {
    DORMANT: "Dormant",
    AT_RISK: "At Risk",
    WATCH: "Watch",
    GROWING: "Growing",
    HEALTHY: "Healthy",
  };
  const HEALTH_LABEL_COLOR: Record<string, string> = {
    DORMANT: "#8B8FA3",
    AT_RISK: "#F5424D",
    WATCH: "#F5A524",
    GROWING: "#10D98A",
    HEALTHY: "#3B82F6",
  };

  return (
    <div className="space-y-4">
      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-primary">{data.name}</p>
          <div className="flex items-center gap-1.5">
            {revenue?.health && (
              <span
                className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                style={{
                  color: HEALTH_LABEL_COLOR[revenue.health.label],
                  background: `${HEALTH_LABEL_COLOR[revenue.health.label]}18`,
                  border: `1px solid ${HEALTH_LABEL_COLOR[revenue.health.label]}40`,
                }}
                title={revenue.health.evidence.join(" ")}
              >
                {HEALTH_LABEL_TEXT[revenue.health.label] || revenue.health.label}
              </span>
            )}
            <ScoreBadge score={score.credit_risk_score} />
          </div>
        </div>
        <p className="text-2xs text-muted mb-3">{score.credit_recommendation}</p>
        <dl className="grid grid-cols-2 gap-3 text-2xs">
          <div>
            <dt className="text-muted">Outstanding</dt>
            <dd className="text-primary font-semibold">₹{summary.total_outstanding.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-muted">Overdue invoices</dt>
            <dd className="text-primary font-semibold">{summary.overdue_count}</dd>
          </div>
          <div>
            <dt className="text-muted">Broken promises</dt>
            <dd className="text-primary font-semibold">{summary.broken_promises}</dd>
          </div>
          <div>
            <dt className="text-muted">Avg delay (days)</dt>
            <dd className="text-primary font-semibold">{score.average_delay_days}</dd>
          </div>
        </dl>
      </div>

      {revenue && (
        <div className="card-premium p-4">
          <h3 className="text-2xs font-bold text-secondary uppercase tracking-wide mb-3">Revenue &amp; Momentum</h3>
          <dl className="grid grid-cols-2 gap-3 text-2xs mb-3">
            <div>
              <dt className="text-muted">Revenue ({revenue.value.windowDays}d)</dt>
              <dd className="text-primary font-semibold">₹{revenue.value.revenue.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt className="text-muted">Orders ({revenue.value.windowDays}d)</dt>
              <dd className="text-primary font-semibold">{revenue.value.orderCount}</dd>
            </div>
            <div>
              <dt className="text-muted">Avg order value</dt>
              <dd className="text-primary font-semibold">₹{revenue.value.aov.toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt className="text-muted">Revenue share</dt>
              <dd className={`font-semibold ${revenue.concentration.isConcentrationRisk ? "text-danger" : "text-primary"}`}>
                {revenue.concentration.sharePct}%
              </dd>
            </div>
          </dl>
          <div className="space-y-1.5 text-2xs text-muted">
            <p>{revenue.value.evidence}</p>
            <p>{revenue.momentum.evidence}</p>
            <p>{revenue.concentration.evidence}</p>
            {revenue.dormancy.isDormant && <p className="text-danger">{revenue.dormancy.evidence}</p>}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-2xs font-bold text-secondary uppercase tracking-wide mb-2">Recent Invoices</h3>
        {invoices.length === 0 ? (
          <EmptyState title="No invoices for this customer" />
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => (
              <EntityRow
                key={inv.id}
                name={`Invoice ${inv.id.slice(0, 8)} — ₹${Number(inv.invoice_amount).toLocaleString("en-IN")}`}
                detail={`${inv.payment_status}${inv.days_overdue > 0 ? ` · ${inv.days_overdue}d overdue` : ""}`}
                onClick={() => onOpenInvoice(inv.id, `Invoice ${inv.id.slice(0, 8)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

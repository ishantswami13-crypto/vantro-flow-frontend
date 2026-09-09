import React from "react";
import { EntityRow } from "./EntityRow";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RankedAction } from "@/lib/api";

interface RiskSectionProps {
  receivablesRisk: RankedAction[];
  payablesRisk: RankedAction[];
  onSelectCustomer?: (customerId: string, name: string, phone?: string) => void;
  onSelectSupplier?: (action: RankedAction) => void;
}

const TOP_N = 5;

export function RiskSection({ receivablesRisk, payablesRisk, onSelectCustomer, onSelectSupplier }: RiskSectionProps) {
  // Distinct customers only (an action list can carry duplicates for the same customer).
  const receivableCustomers = new Map<string, RankedAction>();
  for (const a of receivablesRisk) {
    if (a.customer?.id && !receivableCustomers.has(a.customer.id)) receivableCustomers.set(a.customer.id, a);
  }
  const topReceivables = Array.from(receivableCustomers.values()).slice(0, TOP_N);
  const topPayables = payablesRisk.slice(0, TOP_N);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h2 className="text-sm font-bold text-primary mb-2">Customers who may pay late</h2>
        {topReceivables.length === 0 ? (
          <EmptyState title="No customers look risky right now" />
        ) : (
          <div className="space-y-2">
            {topReceivables.map(a => (
              <EntityRow
                key={a.customer!.id}
                name={a.customer!.name || "Unknown customer"}
                detail={a.customer!.score_reason || undefined}
                score={a.customer!.credit_risk_score}
                onClick={
                  onSelectCustomer
                    ? () => onSelectCustomer(a.customer!.id, a.customer!.name || "Unknown customer", a.customer!.phone)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-sm font-bold text-primary mb-2">Bills you need to pay soon</h2>
        <p className="text-2xs text-muted mb-2">Bills that are due soon or already late.</p>
        {topPayables.length === 0 ? (
          <EmptyState title="No bills due soon" />
        ) : (
          <div className="space-y-2">
            {topPayables.map(a => (
              <EntityRow
                key={a.id}
                name={a.title}
                detail={a.description}
                riskLabel={a.priority}
                onClick={onSelectSupplier ? () => onSelectSupplier(a) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getUser } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { findMatchingTransaction } from "@/components/business-state/DrawerViews/transactionMatch";

interface PurchaseDrawerViewProps {
  purchaseId: string;
  onOpenTransaction: (transactionId: string, label: string) => void;
}

// No GET /api/purchases/:id — GET /api/purchases is list-only. Client-side
// find by id, per §8.
export function PurchaseDrawerView({ purchaseId, onOpenTransaction }: PurchaseDrawerViewProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => api.purchases.list(),
  });

  const userId = getUser()?.id || "";
  const { data: txnData } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => api.transactions.list(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState label="Loading bill" rows={2} />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load purchases" onRetry={() => refetch()} />;
  }

  const purchase = (data.purchases || []).find((p: any) => String(p.id) === String(purchaseId));
  if (!purchase) {
    return <EmptyState title="Bill not found" message="It may have been removed." />;
  }

  const totalAmount = Number(purchase.total_amount ?? purchase.amount ?? 0);
  const match = txnData
    ? findMatchingTransaction(txnData.transactions, {
        reference: purchase.bill_number,
        partyName: purchase.supplier_name,
        amount: totalAmount,
        date: purchase.purchase_date,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-primary">{purchase.bill_number || `Bill ${purchaseId.slice(0, 8)}`}</p>
          <Badge variant={purchase.status === "paid" ? "success" : purchase.status === "partial" ? "warning" : "danger"}>
            {purchase.status}
          </Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-2xs">
          <div>
            <dt className="text-muted">Supplier</dt>
            <dd className="text-primary font-semibold">{purchase.supplier_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="text-primary font-semibold">₹{totalAmount.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-muted">Purchase date</dt>
            <dd className="text-primary font-semibold">{purchase.purchase_date || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Due date</dt>
            <dd className="text-primary font-semibold">{purchase.due_date || "—"}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-2xs font-bold text-secondary uppercase tracking-wide mb-2">Matched Transaction</h3>
        {match ? (
          <button
            type="button"
            onClick={() => onOpenTransaction(match.id, `Transaction ${match.id.slice(0, 8)}`)}
            className="w-full text-left card-metric p-4 hover:bg-surface-2 transition-colors focus-ring"
          >
            <p className="text-sm font-semibold text-primary">
              ₹{Number(match.amount).toLocaleString("en-IN")} · {match.type === "in" ? "Received" : "Paid"}
            </p>
            <p className="text-2xs text-muted">{match.transaction_date}</p>
          </button>
        ) : (
          <EmptyState
            title="No matching transaction found"
            message="This bill hasn't been matched to a bank transaction yet."
          />
        )}
      </div>
    </div>
  );
}

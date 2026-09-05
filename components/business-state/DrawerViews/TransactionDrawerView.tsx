"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getUser } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

interface TransactionDrawerViewProps {
  transactionId: string;
}

// There is no GET /api/transactions/:id — /api/transactions/:userId (server.js:8197)
// is list-only over bank_transactions. This view fetches the tenant's list
// (already tenant-scoped) and finds the row by id client-side, per §8's
// explicit "no new backend endpoint" decision.
export function TransactionDrawerView({ transactionId }: TransactionDrawerViewProps) {
  const userId = getUser()?.id || "";
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => api.transactions.list(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState label="Loading transaction" rows={1} />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load transactions" onRetry={() => refetch()} />;
  }

  const txn = data.transactions.find(t => String(t.id) === String(transactionId));
  if (!txn) {
    return <EmptyState title="Transaction not found" message="It may have been removed or reclassified." />;
  }

  return (
    <div className="card-premium p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-primary">₹{Number(txn.amount).toLocaleString("en-IN")}</p>
        <Badge variant={txn.type === "in" ? "success" : "danger"}>{txn.type === "in" ? "Received" : "Paid"}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-2xs">
        <div>
          <dt className="text-muted">Party</dt>
          <dd className="text-primary font-semibold">{txn.party_name || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Date</dt>
          <dd className="text-primary font-semibold">{txn.transaction_date}</dd>
        </div>
        <div>
          <dt className="text-muted">Category</dt>
          <dd className="text-primary font-semibold">{txn.category}</dd>
        </div>
        <div>
          <dt className="text-muted">Method</dt>
          <dd className="text-primary font-semibold">{txn.payment_method || "—"}</dd>
        </div>
        {txn.reference && (
          <div className="col-span-2">
            <dt className="text-muted">Reference</dt>
            <dd className="text-primary font-semibold">{txn.reference}</dd>
          </div>
        )}
        {txn.description && (
          <div className="col-span-2">
            <dt className="text-muted">Description</dt>
            <dd className="text-primary">{txn.description}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

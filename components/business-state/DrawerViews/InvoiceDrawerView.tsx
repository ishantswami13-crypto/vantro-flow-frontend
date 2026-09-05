"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getUser, type InvoiceDetail } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { findMatchingTransaction } from "@/components/business-state/DrawerViews/transactionMatch";

interface InvoiceDrawerViewProps {
  invoiceId: string;
  onOpenTransaction: (transactionId: string, label: string) => void;
}

export function InvoiceDrawerView({ invoiceId, onOpenTransaction }: InvoiceDrawerViewProps) {
  const { data, isLoading, isError, refetch } = useQuery<{ success: boolean; invoice: InvoiceDetail }>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => api.invoices.get(invoiceId),
  });

  const userId = getUser()?.id || "";
  const { data: txnData } = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => api.transactions.list(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState label="Loading invoice" rows={2} />;
  if (isError || !data?.invoice) {
    return <ErrorState title="Couldn't load this invoice" onRetry={() => refetch()} />;
  }

  const invoice = data.invoice;
  const match = txnData
    ? findMatchingTransaction(txnData.transactions, {
        reference: invoice.invoice_number,
        partyName: invoice.customer_name,
        amount: Number(invoice.invoice_amount),
        date: invoice.payment_date || invoice.invoice_date,
      })
    : null;

  return (
    <div className="space-y-4">
      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-primary">
            {invoice.invoice_number || `Invoice ${invoice.id.slice(0, 8)}`}
          </p>
          <Badge variant={invoice.payment_status === "Paid" ? "success" : "warning"}>{invoice.payment_status}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-2xs">
          <div>
            <dt className="text-muted">Customer</dt>
            <dd className="text-primary font-semibold">{invoice.customer_name}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="text-primary font-semibold">₹{Number(invoice.invoice_amount).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-muted">Invoice date</dt>
            <dd className="text-primary font-semibold">{invoice.invoice_date}</dd>
          </div>
          <div>
            <dt className="text-muted">Due date</dt>
            <dd className="text-primary font-semibold">{invoice.due_date || "—"}</dd>
          </div>
          {invoice.days_overdue > 0 && (
            <div>
              <dt className="text-muted">Overdue</dt>
              <dd className="text-danger font-semibold">{invoice.days_overdue} days</dd>
            </div>
          )}
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
            message="This invoice hasn't been matched to a bank transaction yet."
          />
        )}
      </div>
    </div>
  );
}

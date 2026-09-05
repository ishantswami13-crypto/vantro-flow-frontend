"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getUser } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityRow } from "@/components/business-state/EntityRow";

interface SupplierDrawerViewProps {
  supplierName: string;
  onOpenPurchase: (purchaseId: string, label: string) => void;
}

// No GET /api/suppliers/:id — only GET /api/suppliers/:userId (a list, already
// aggregating payable per supplier). Client-side find by name, per §8.
export function SupplierDrawerView({ supplierName, onOpenPurchase }: SupplierDrawerViewProps) {
  const userId = getUser()?.id || "";
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["suppliers", userId],
    queryFn: () => api.suppliers.list(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingState label="Loading supplier" rows={2} />;
  if (isError || !data) {
    return <ErrorState title="Couldn't load suppliers" onRetry={() => refetch()} />;
  }

  const supplier = (data.suppliers || []).find(
    (s: any) => String(s.name || "").toLowerCase() === supplierName.toLowerCase()
  );

  if (!supplier) {
    return <EmptyState title="Supplier not found" message={`No supplier record matching "${supplierName}".`} />;
  }

  const purchases: any[] = supplier.purchases || [];

  return (
    <div className="space-y-4">
      <div className="card-premium p-4">
        <p className="text-sm font-bold text-primary mb-2">{supplier.name}</p>
        <dl className="grid grid-cols-2 gap-3 text-2xs">
          <div>
            <dt className="text-muted">Total payable</dt>
            <dd className="text-primary font-semibold">
              ₹{Number(supplier.total_payable ?? 0).toLocaleString("en-IN")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Outstanding</dt>
            <dd className="text-primary font-semibold">
              ₹{Number(supplier.outstanding_amount ?? 0).toLocaleString("en-IN")}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-2xs font-bold text-secondary uppercase tracking-wide mb-2">Bills</h3>
        {purchases.length === 0 ? (
          <EmptyState title="No bills for this supplier" />
        ) : (
          <div className="space-y-2">
            {purchases.map((p: any) => (
              <EntityRow
                key={p.id}
                name={p.bill_number || `Bill ${String(p.id).slice(0, 8)}`}
                detail={`${p.status} · ₹${Number(p.total_amount ?? p.amount ?? 0).toLocaleString("en-IN")}`}
                riskLabel={p.status}
                onClick={() => onOpenPurchase(String(p.id), p.bill_number || `Bill ${String(p.id).slice(0, 8)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

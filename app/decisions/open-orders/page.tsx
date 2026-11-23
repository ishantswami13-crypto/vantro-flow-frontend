"use client";

// Open customer orders as the supplier-delay check sees them: every line
// still to deliver, and what each one is missing before it can be checked.
// Observed values only; nothing on this page is calculated or invented.

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import { C, Pill, SectionLabel, Skeleton, Stat } from "@/components/decisions/ui";
import { decisionsApi, shortDate, type OpenOrderLine } from "@/lib/decisions";

function amount(l: OpenOrderLine): string | null {
  if (l.unit_price == null) return null;
  const q = Number(l.outstanding_quantity ?? l.quantity);
  const v = q * Number(l.unit_price);
  if (!l.currency) return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  try { return v.toLocaleString("en-IN", { style: "currency", currency: l.currency, maximumFractionDigits: 0 }); } catch { return `${l.currency} ${v.toLocaleString("en-IN")}`; }
}

export default function OpenOrdersPage() {
  const q = useQuery({ queryKey: ["open-orders"], queryFn: decisionsApi.openOrders, staleTime: 10_000 });
  const lines = q.data?.lines || [];
  const incomplete = lines.filter((l) => l.missing.length > 0);

  return (
    <DashboardLayout pageTitle="Open customer orders">
      <div>
        <Link href="/decisions/shipments" className="inline-flex items-center gap-1.5 text-[13px] hover-dim mb-4" style={{ color: C.muted }}>
          <FiArrowLeft size={13} /> Inbound shipments
        </Link>
        <h1 className="hv-title mb-2" style={{ color: "#0F0E0D", fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>
          Open customer orders
        </h1>
        <p className="text-[14px] max-w-[700px] mb-4" style={{ color: C.muted }}>
          Every order line still to deliver. A line can be checked against a supplier delay only when it is linked to a product and has a promised date.
        </p>
        <Link href="/decisions/operations-import" className="text-[13px] hover-dim inline-flex items-center gap-1 mb-8" style={{ color: C.accent }}>
          Import open orders <FiArrowRight size={12} />
        </Link>

        {q.isLoading && <Skeleton rows={4} />}
        {q.isError && <ErrorState title="Couldn't load open orders" message={(q.error as Error).message} onRetry={() => q.refetch()} />}
        {q.data && lines.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>No open order lines</p>
            <p className="text-[13px] mt-1.5" style={{ color: C.faint }}>Import your open sales orders to check them against supplier delays.</p>
          </div>
        )}

        {lines.length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Stat label="Open lines" value={lines.length} />
              <Stat label="Can be checked" value={q.data!.checkable} sub="product and promised date known" />
              <Stat label="Missing something" value={incomplete.length} tone={incomplete.length ? "warn" : undefined} />
            </div>
            <SectionLabel>Order lines, earliest promise first</SectionLabel>
            <div className="rounded-[8px] overflow-x-auto" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
              <table className="w-full text-[13px] tabular-nums">
                <thead>
                  <tr style={{ background: C.wash, color: C.muted }}>
                    <th className="text-left font-normal px-3 py-2">Customer</th>
                    <th className="text-left font-normal px-3 py-2">Order</th>
                    <th className="text-left font-normal px-3 py-2">Product</th>
                    <th className="text-right font-normal px-3 py-2">To deliver</th>
                    <th className="text-left font-normal px-3 py-2">Promised</th>
                    <th className="text-right font-normal px-3 py-2">Value</th>
                    <th className="text-left font-normal px-3 py-2">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                      <td className="px-3 py-2" style={{ color: C.ink }}>{l.customer_name || "—"}</td>
                      <td className="px-3 py-2">{l.order_ref || "—"}{l.source_system ? <span className="block text-[11.5px]" style={{ color: C.faint }}>from {l.source_system}</span> : null}</td>
                      <td className="px-3 py-2">
                        {l.product_name || <span style={{ color: C.warn }}>{l.product_name_as_imported || l.sku_as_imported || "Not linked"}</span>}
                        {l.sku ? <span className="text-[11.5px] ml-1.5" style={{ color: C.faint }}>{l.sku}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {l.outstanding_quantity ?? <span title="The file had no outstanding quantity; the full ordered quantity is assumed">{l.quantity}<span style={{ color: C.faint }}>*</span></span>}
                        {l.outstanding_quantity != null && l.outstanding_quantity !== l.quantity ? <span className="block text-[11.5px]" style={{ color: C.faint }}>of {l.quantity}</span> : null}
                      </td>
                      <td className="px-3 py-2">{l.needed_by ? shortDate(l.needed_by.slice(0, 10)) : <span style={{ color: C.faint }}>—</span>}</td>
                      <td className="px-3 py-2 text-right">{amount(l) ?? <span style={{ color: C.faint }}>—</span>}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {l.missing.length === 0 ? <Pill tone="good">Complete</Pill> : l.missing.map((m) => (
                            <Pill key={m} tone={m.startsWith("outstanding") ? "neutral" : "warn"}>{m.startsWith("outstanding") ? "Assumed: full quantity" : `No ${m}`}</Pill>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] mt-2" style={{ color: C.faint }}>* Not in the file: the full ordered quantity is assumed to be still due. Value is quantity to deliver × unit price, shown for reading only.</p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

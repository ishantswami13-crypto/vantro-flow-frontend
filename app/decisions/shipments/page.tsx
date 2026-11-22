"use client";

// Inbound shipments: the purchase lines still on their way, and the one thing
// an owner needs to tell Starlane about them: "the supplier moved this date".
// Reporting a delay calls the existing POST /api/decisions/report-supplier-delay
// (tenant from the session, purchase line must belong to it), which re-runs
// the deterministic supplier-delay check and returns either the decision
// listing the customer orders the delay puts at risk, or the reason no
// promised order is affected. Nothing here sends anything to anyone.

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, Notice, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { decisionsApi, shortDate, type InboundShipment, type ReportDelayResponse } from "@/lib/decisions";

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const qty = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function InboundShipmentsPage() {
  const shipments = useQuery({ queryKey: ["inbound-shipments"], queryFn: decisionsApi.inboundShipments, staleTime: 10_000 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ReportDelayResponse>>({});
  const rows = shipments.data?.shipments || [];

  return (
    <DashboardLayout pageTitle="Inbound shipments">
      <div>
        <Link href="/decisions" className="inline-flex items-center gap-1.5 text-[13px] hover-dim mb-4" style={{ color: C.muted }}>
          <FiArrowLeft size={13} /> Decisions
        </Link>
        <h1 className="hv-title mb-2" style={{ color: "#0F0E0D", fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>
          Inbound shipments
        </h1>
        <p className="text-[14px] max-w-[700px] mb-8" style={{ color: C.muted }}>
          Goods you have ordered that have not arrived yet. When a supplier moves a date, report it here. Starlane checks your open customer orders against your stock and these shipments, and shows which orders the new date makes late. Nothing is sent to anyone.
        </p>

        {shipments.isLoading && <Skeleton rows={3} />}
        {shipments.isError && <ErrorState title="Couldn't load inbound shipments" message={(shipments.error as Error).message} onRetry={() => shipments.refetch()} />}
        {!shipments.isLoading && !shipments.isError && rows.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>No open shipments</p>
            <p className="text-[13px] mt-1.5 max-w-[480px] mx-auto" style={{ color: C.faint }}>
              Shipments appear here from purchase lines that have an expected date and have not been fully received.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <SectionLabel>On the way</SectionLabel>
            <ul className="space-y-3">
              {rows.map((s) => (
                <ShipmentRow
                  key={s.id}
                  s={s}
                  open={openId === s.id}
                  onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                  result={results[s.id]}
                  onResult={(r) => { setResults((prev) => ({ ...prev, [s.id]: r })); setOpenId(null); }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ShipmentRow({ s, open, onToggle, result, onResult }: {
  s: InboundShipment;
  open: boolean;
  onToggle: () => void;
  result?: ReportDelayResponse;
  onResult: (r: ReportDelayResponse) => void;
}) {
  const expected = day(s.expected_at);
  const original = day(s.original_expected_at);
  const delayed = !!original && !!expected && original !== expected;
  const outstanding = qty(s.quantity) - qty(s.received_quantity);

  return (
    <li className="rounded-[8px] px-5 py-4" style={{ background: "#FFFFFF", border: `1px solid ${C.line}` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[220px]">
          <p className="text-[14.5px]" style={{ color: C.ink, fontWeight: 500 }}>
            {outstanding.toLocaleString("en-IN")} × {s.product_name || "Unlinked item"}
            {s.sku ? <span className="text-[12.5px] ml-2" style={{ color: C.faint }}>{s.sku}</span> : null}
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: C.muted }}>
            {s.supplier_name || "Unknown supplier"}{s.bill_number ? ` · ${s.bill_number}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[13px]" style={{ color: C.body }}>
              Expected {expected ? shortDate(expected) : "—"}
            </p>
            {delayed && (
              <p className="text-[12px]" style={{ color: C.faint }}>
                Was {shortDate(original)}{s.delay_reason ? ` · ${s.delay_reason}` : ""}
              </p>
            )}
          </div>
          {delayed && <Pill tone="warn">Delayed</Pill>}
          <Button size="sm" variant={open ? "ghost" : "secondary"} onClick={onToggle} disabled={!expected || !s.product_id}>
            {open ? "Cancel" : "Report a delay"}
          </Button>
        </div>
      </div>
      {!s.product_id && (
        <p className="text-[12px] mt-2" style={{ color: C.faint }}>This line is not linked to a product, so Starlane cannot tell which orders depend on it.</p>
      )}
      {open && <DelayForm s={s} onResult={onResult} />}
      {result && <DelayResult r={result} />}
    </li>
  );
}

function DelayForm({ s, onResult }: { s: InboundShipment; onResult: (r: ReportDelayResponse) => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const current = day(s.expected_at);
  const report = useMutation({
    mutationFn: () => decisionsApi.reportSupplierDelay({ purchaseLineItemId: s.id, newExpectedAt: date, reason: reason.trim() || undefined }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["inbound-shipments"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["decisions-today"] });
      onResult(r);
    },
  });
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date !== current;

  return (
    <form
      className="mt-4 pt-4 flex flex-wrap items-end gap-3"
      style={{ borderTop: `1px solid ${C.line}` }}
      onSubmit={(e) => { e.preventDefault(); if (valid && !report.isPending) report.mutate(); }}
    >
      <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
        New expected date
        <input
          type="date"
          required
          min={todayLocal()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-[14px] rounded-md px-3 py-2"
          style={{ border: `1px solid ${C.line}`, color: C.ink, background: "#fff" }}
        />
      </label>
      <label className="flex flex-col gap-1 text-[12.5px] flex-1 min-w-[220px]" style={{ color: C.muted }}>
        Reason the supplier gave (optional)
        <input
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Factory power cuts"
          className="text-[14px] rounded-md px-3 py-2"
          style={{ border: `1px solid ${C.line}`, color: C.ink, background: "#fff" }}
        />
      </label>
      <Button size="sm" type="submit" loading={report.isPending} disabled={!valid}>Check affected orders</Button>
      {report.isError && (
        <div className="w-full">
          <Notice tone="bad" title="Couldn't record the delay">{(report.error as Error).message}</Notice>
        </div>
      )}
    </form>
  );
}

function DelayResult({ r }: { r: ReportDelayResponse }) {
  const degraded = r.discovery?.degraded || [];
  return (
    <div className="mt-4">
      {r.decision ? (
        <Notice tone="warn" title="Some customer orders are now at risk">
          Recorded the new date ({shortDate(day(r.shipment.expected_at))}).{" "}
          <Link href={`/decisions/${r.decision.id}`} className="inline-flex items-center gap-1 underline" style={{ color: C.accent }}>
            See which orders and what to do <FiArrowRight size={12} />
          </Link>
        </Notice>
      ) : r.finding ? (
        <Notice tone="good" title="No promised order is affected">
          Recorded the new date ({shortDate(day(r.shipment.expected_at))}). {r.finding.reason}
        </Notice>
      ) : (
        <Notice tone="neutral" title="Date recorded">
          Recorded the new date ({shortDate(day(r.shipment.expected_at))}), but Starlane could not check this shipment against your orders. Open orders need a product and a promised date to be checked.
        </Notice>
      )}
      {degraded.length > 0 && (
        <p className="text-[12px] mt-2" style={{ color: C.faint }}>
          Part of the analysis didn&apos;t run: {degraded.map((d) => `${d.detector}: ${d.error}`).join("; ")}.
        </p>
      )}
    </div>
  );
}

"use client";

// Inbound shipments: the purchase lines still on their way, and the one thing
// an owner needs to tell Starlane about them: "the supplier moved this date".
// Reporting a delay calls the existing POST /api/decisions/report-supplier-delay
// (tenant from the session, purchase line must belong to it), which re-runs
// the deterministic supplier-delay check and returns either the decision
// listing the customer orders the delay puts at risk, or the reason no
// promised order is affected.
//
// Recording goods received calls POST /api/decisions/purchase-lines/:id/receipts.
// Each receipt carries an idempotency key made when the form opens and reused
// on every retry, so a double click or a dropped connection never books the
// goods twice. Over-receipts are refused; a correction (with a reason) is the
// controlled way to fix a wrong receipt. After a receipt the backend re-runs
// the supplier-delay check. Nothing here sends anything to anyone.

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight, FiPackage } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, Notice, Pill, SectionLabel, Skeleton } from "@/components/decisions/ui";
import {
  decisionsApi, newReceiptKey, shortDate, DecisionApiError,
  type InboundShipment, type ReportDelayResponse, type RecordReceiptResponse, type GoodsReceipt,
} from "@/lib/decisions";

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
const qty = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function InboundShipmentsPage() {
  const shipments = useQuery({ queryKey: ["inbound-shipments"], queryFn: decisionsApi.inboundShipments, staleTime: 10_000 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"delay" | "receipt" | "history">("delay");
  const [results, setResults] = useState<Record<string, ReportDelayResponse>>({});
  const [lastReceipt, setLastReceipt] = useState<{ label: string; r: RecordReceiptResponse } | null>(null);
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
          Goods you have ordered that have not arrived yet. When a supplier moves a date, report it here. When goods arrive, record what came in. Starlane checks your open customer orders against your stock and these shipments after every change, and shows which orders are late. Nothing is sent to anyone.
        </p>
        <div className="flex flex-wrap gap-4 mb-8 -mt-4">
          <Link href="/decisions/operations-import" className="text-[13px] hover-dim inline-flex items-center gap-1" style={{ color: C.accent }}>Import open purchase orders <FiArrowRight size={12} /></Link>
          <Link href="/decisions/open-orders" className="text-[13px] hover-dim inline-flex items-center gap-1" style={{ color: C.muted }}>Open customer orders <FiArrowRight size={12} /></Link>
        </div>

        {lastReceipt && <div className="mb-6"><ReceiptResult label={lastReceipt.label} r={lastReceipt.r} /></div>}

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
                  open={openId === s.id ? panel : null}
                  onOpen={(p) => { if (openId === s.id && panel === p) setOpenId(null); else { setOpenId(s.id); setPanel(p); } }}
                  result={results[s.id]}
                  onResult={(r) => { setResults((prev) => ({ ...prev, [s.id]: r })); setOpenId(null); }}
                  onReceipt={(r) => { setLastReceipt({ label: `${s.product_name || s.product_name_as_imported || "Unlinked item"}${s.bill_number ? ` · ${s.bill_number}` : ""}`, r }); if (Number(r.line.outstandingQuantity) <= 0) setOpenId(null); }}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ShipmentRow({ s, open, onOpen, result, onResult, onReceipt }: {
  s: InboundShipment;
  open: "delay" | "receipt" | "history" | null;
  onOpen: (p: "delay" | "receipt" | "history") => void;
  result?: ReportDelayResponse;
  onResult: (r: ReportDelayResponse) => void;
  onReceipt: (r: RecordReceiptResponse) => void;
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
            {outstanding.toLocaleString("en-IN")} × {s.product_name || s.product_name_as_imported || "Unlinked item"}
            {(s.sku || s.sku_as_imported) ? <span className="text-[12.5px] ml-2" style={{ color: C.faint }}>{s.sku || s.sku_as_imported}</span> : null}
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: C.muted }}>
            {s.supplier_name || "Unknown supplier"}{s.bill_number ? ` · ${s.bill_number}` : ""}
          </p>
          <p className="text-[12px] mt-1" style={{ color: C.faint }}>
            {qty(s.received_quantity) > 0 ? `${qty(s.received_quantity).toLocaleString("en-IN")} of ${qty(s.quantity).toLocaleString("en-IN")} received` : `${qty(s.quantity).toLocaleString("en-IN")} ordered, none received`}
            {s.source_system ? ` · from ${s.source_system}` : ""}
            {s.stock_follows === "EXTERNAL" ? " · stock booked by your accounting system" : ""}
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
          {!expected && <Pill tone="neutral" title="The file had no expected date for this line">No expected date</Pill>}
          <Button size="sm" variant={open === "delay" ? "ghost" : "secondary"} onClick={() => onOpen("delay")} disabled={!expected || !s.product_id}>
            {open === "delay" ? "Cancel" : "Report a delay"}
          </Button>
          <Button size="sm" variant={open === "receipt" ? "ghost" : "secondary"} onClick={() => onOpen("receipt")} icon={open === "receipt" ? undefined : <FiPackage size={12} />}>
            {open === "receipt" ? "Cancel" : "Record receipt"}
          </Button>
        </div>
      </div>
      {(s.receipt_count || 0) > 0 && (
        <button type="button" className="text-[12px] mt-2 underline-offset-2 hover:underline" style={{ color: C.muted }} onClick={() => onOpen("history")}>
          {open === "history" ? "Hide receipt history" : `Receipt history (${s.receipt_count})`}
        </button>
      )}
      {!s.product_id && (
        <p className="text-[12px] mt-2" style={{ color: C.faint }}>This line is not linked to a product, so Starlane cannot tell which orders depend on it.</p>
      )}
      {open === "delay" && <DelayForm s={s} onResult={onResult} />}
      {open === "receipt" && <ReceiptForm s={s} onRecorded={onReceipt} />}
      {(open === "receipt" || open === "history") && (s.receipt_count || 0) > 0 && <ReceiptHistoryList lineId={s.id} />}
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

// ── Goods receipts ─────────────────────────────────────────────────────────

const inputStyle = { border: `1px solid ${C.line}`, color: C.ink, background: "#fff" } as const;
const isQty = (v: string) => /^\d+(\.\d{1,6})?$/.test(v.trim()) && Number(v) > 0;

function ReceiptForm({ s, onRecorded }: { s: InboundShipment; onRecorded: (r: RecordReceiptResponse) => void }) {
  const qc = useQueryClient();
  const outstanding = qty(s.quantity) - qty(s.received_quantity);
  const [mode, setMode] = useState<"RECEIPT" | "CORRECTION">("RECEIPT");
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  // One key per receipt the owner means to record. It survives retries and
  // is replaced only after the receipt is saved or the owner says it is new.
  const [key, setKey] = useState(newReceiptKey);
  const [keyClash, setKeyClash] = useState(false);

  const record = useMutation({
    mutationFn: () => decisionsApi.recordReceipt(s.id, {
      kind: mode,
      quantity: mode === "CORRECTION" && direction === "remove" ? `-${amount.trim()}` : amount.trim(),
      receivedOn: date,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
      idempotencyKey: key,
    }),
    onSuccess: (r) => {
      setKey(newReceiptKey());
      setAmount(""); setReference(""); setNotes(""); setKeyClash(false);
      qc.invalidateQueries({ queryKey: ["inbound-shipments"] });
      qc.invalidateQueries({ queryKey: ["receipts", s.id] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["decisions-today"] });
      onRecorded(r);
    },
    onError: (err) => {
      if (err instanceof DecisionApiError && err.status === 409 && /idempotency key/i.test(err.message)) {
        setKeyClash(true);
        qc.invalidateQueries({ queryKey: ["receipts", s.id] });
        qc.invalidateQueries({ queryKey: ["inbound-shipments"] });
      }
    },
  });

  const n = Number(amount);
  const over = mode === "RECEIPT" && isQty(amount) && n > outstanding;
  const valid = isQty(amount) && /^\d{4}-\d{2}-\d{2}$/.test(date) && !over && (mode === "RECEIPT" || notes.trim().length >= 3);
  const remaining = mode === "RECEIPT" && isQty(amount) && !over ? outstanding - n : null;

  return (
    <form
      className="mt-4 pt-4"
      style={{ borderTop: `1px solid ${C.line}` }}
      onSubmit={(e) => { e.preventDefault(); if (valid && !record.isPending) record.mutate(); }}
      aria-label="Record goods received"
    >
      <div className="flex gap-1 mb-3" role="radiogroup" aria-label="Receipt or correction">
        {(["RECEIPT", "CORRECTION"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className="text-[12.5px] px-3 py-1.5 rounded-md"
            style={{ background: mode === m ? C.wash : "transparent", color: mode === m ? C.ink : C.muted, border: `1px solid ${mode === m ? C.line : "transparent"}` }}
          >
            {m === "RECEIPT" ? "Goods received" : "Correct an earlier receipt"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {mode === "CORRECTION" && (
          <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
            Correction
            <select value={direction} onChange={(e) => setDirection(e.target.value as "remove" | "add")} className="text-[14px] rounded-md px-3 py-2" style={inputStyle}>
              <option value="remove">Fewer arrived than recorded</option>
              <option value="add">More arrived than recorded</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
          {mode === "RECEIPT" ? "Quantity received" : "By how many"}
          <input
            inputMode="decimal"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === "RECEIPT" ? `up to ${outstanding.toLocaleString("en-IN")}` : "e.g. 2"}
            className="text-[14px] rounded-md px-3 py-2 w-[150px] tabular-nums"
            style={inputStyle}
            aria-invalid={over || (amount !== "" && !isQty(amount))}
          />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
          {mode === "RECEIPT" ? "Received on" : "Date of the correction"}
          <input type="date" required max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] min-w-[160px]" style={{ color: C.muted }}>
          GRN / challan no. (optional)
          <input value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} placeholder="e.g. GRN-2231" className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] flex-1 min-w-[220px]" style={{ color: C.muted }}>
          {mode === "RECEIPT" ? "Notes (optional)" : "Why it is being corrected (required)"}
          <input value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "RECEIPT" ? "e.g. 2 cartons damaged, kept" : "e.g. Counted again: 18 not 20"} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
        </label>
        <Button size="sm" type="submit" loading={record.isPending} disabled={!valid}>
          {mode === "RECEIPT" ? "Record receipt" : "Record correction"}
        </Button>
      </div>

      <p className="text-[12px] mt-2 tabular-nums" style={{ color: over ? C.bad : C.faint }}>
        {over
          ? `Only ${outstanding.toLocaleString("en-IN")} are still due on this line. If more arrived, record ${outstanding.toLocaleString("en-IN")} and then a correction explaining the extra.`
          : remaining != null
            ? remaining === 0 ? "This receives the line in full; it will leave this list." : `${remaining.toLocaleString("en-IN")} will still be due after this.`
            : `${outstanding.toLocaleString("en-IN")} still due on this line.`}
        {" "}
        {!s.product_id
          ? "Not linked to a product, so stock will not change."
          : s.stock_follows === "EXTERNAL"
            ? "Stock for this line is booked by your accounting system, so Starlane will not change stock."
            : "Stock goes up by the quantity received."}
      </p>

      {keyClash && (
        <div className="mt-3">
          <Notice tone="warn" title="An earlier attempt may already be saved">
            The first try of this receipt reached Starlane with different details. Check the receipt history below before recording again.{" "}
            <button type="button" className="underline" style={{ color: C.accent }} onClick={() => { setKey(newReceiptKey()); setKeyClash(false); record.reset(); }}>
              This is a different receipt
            </button>
          </Notice>
        </div>
      )}
      {record.isError && !keyClash && (
        <div className="mt-3">
          <Notice tone="bad" title="The receipt was not recorded">
            {record.error instanceof DecisionApiError ? record.error.message : "Starlane could not be reached, so it is not known whether the receipt was saved."}
            {!(record.error instanceof DecisionApiError) || record.error.status === 0 || record.error.status >= 500 ? " Pressing the button again is safe: Starlane will not record it twice." : ""}
          </Notice>
        </div>
      )}
    </form>
  );
}

function ReceiptHistoryList({ lineId }: { lineId: string }) {
  const h = useQuery({ queryKey: ["receipts", lineId], queryFn: () => decisionsApi.receipts(lineId), staleTime: 5_000 });
  if (h.isLoading) return <div className="mt-4"><Skeleton rows={2} /></div>;
  if (h.isError) return <p className="text-[12.5px] mt-3" style={{ color: C.bad }}>Couldn&apos;t load the receipt history: {(h.error as Error).message}</p>;
  const d = h.data!;
  return (
    <div className="mt-4">
      <SectionLabel>Receipt history</SectionLabel>
      {Number(d.line.receivedBeforeTracking) > 0 && (
        <p className="text-[12.5px] mb-2" style={{ color: C.muted }}>
          {Number(d.line.receivedBeforeTracking).toLocaleString("en-IN")} were already received in your own system before Starlane tracked this line. They are not added to stock again.
        </p>
      )}
      <ul className="divide-y" style={{ borderColor: C.line }}>
        {d.receipts.map((r) => <ReceiptItem key={r.id} r={r} />)}
      </ul>
      <p className="text-[12px] mt-2 tabular-nums" style={{ color: C.faint }}>
        {d.line.receivedQuantity} of {d.line.orderedQuantity} received · {d.line.outstandingQuantity} still due
        {d.line.overReceived ? ` · ${d.line.overReceived} more than ordered` : ""}
      </p>
    </div>
  );
}

function ReceiptItem({ r }: { r: GoodsReceipt }) {
  const neg = r.quantity.startsWith("-");
  return (
    <li className="py-2 flex flex-wrap items-baseline justify-between gap-2 text-[13px]" style={{ borderColor: C.line }}>
      <span style={{ color: C.ink }}>
        <span className="tabular-nums" style={{ fontWeight: 500 }}>{neg ? r.quantity : `+${r.quantity}`}</span>
        <span style={{ color: C.muted }}> on {shortDate(r.receivedOn)}</span>
        {r.reference ? <span style={{ color: C.muted }}> · {r.reference}</span> : null}
        {r.notes ? <span style={{ color: C.faint }}> · {r.notes}</span> : null}
      </span>
      <span className="flex items-center gap-2">
        {r.kind === "CORRECTION" && <Pill tone="warn">Correction</Pill>}
        <Pill tone={r.stockPosted ? "good" : "neutral"} title={r.stockPosted ? "Starlane changed stock by this quantity" : "Stock was not changed by Starlane"}>
          {r.stockPosted ? "Stock updated" : "Stock not changed"}
        </Pill>
        <span className="text-[12px] tabular-nums" style={{ color: C.faint }}>{r.receivedBefore} → {r.receivedAfter}</span>
      </span>
    </li>
  );
}

function ReceiptResult({ label, r }: { label: string; r: RecordReceiptResponse }) {
  const full = Number(r.line.outstandingQuantity) <= 0;
  const q = r.receipt.quantity;
  const title = r.duplicate
    ? "Already recorded"
    : r.receipt.kind === "CORRECTION"
      ? `Correction of ${q} recorded`
      : full ? `Received in full: ${label}` : `Received ${q}: ${label}`;
  const decisions = r.supplierDelayDecisions || [];
  return (
    <Notice tone={r.discoveryError ? "warn" : "good"} title={title}>
      <span className="tabular-nums">{r.line.receivedQuantity} of {r.line.orderedQuantity} received{full ? "" : `, ${r.line.outstandingQuantity} still due`}.</span>{" "}
      {r.duplicate ? "This receipt was saved earlier; nothing was recorded twice. " : ""}
      {r.stock.posted ? "Stock updated. " : r.stock.reason ? `${r.stock.reason} ` : ""}
      {r.discoveryError
        ? r.discoveryError
        : r.discovery
          ? `Customer orders were checked again${r.discovery.resolved ? `; ${r.discovery.resolved} decision${r.discovery.resolved === 1 ? "" : "s"} no longer needed` : ""}${r.discovery.revised ? `; ${r.discovery.revised} updated` : ""}.`
          : ""}
      {decisions.length > 0 && (
        <span className="block mt-1.5">
          {decisions.slice(0, 3).map((d) => (
            <Link key={d.id} href={`/decisions/${d.id}`} className="inline-flex items-center gap-1 underline mr-3" style={{ color: C.accent }}>
              {d.title} <FiArrowRight size={12} />
            </Link>
          ))}
        </span>
      )}
      {!r.duplicate && decisions.length === 0 && r.discovery && <span className="block mt-1.5">No supplier delay is putting a customer order at risk now.</span>}
    </Notice>
  );
}

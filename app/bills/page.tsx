"use client";

// Invoices (GST bills): what you've billed, what's still unpaid, and a form
// to raise a new GST invoice. Totals and tax are computed the same way as
// before; the server stores the bill.

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { inr, inrWhole, formatDate, formatDue, formatCount } from "@/lib/format";
import { PageHeader, Subnav, SearchField, SkeletonRows } from "@/components/v32/ui";
import { IconInvoice, IconPlus, IconX } from "@/components/v32/icons";
import { StatusChip } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { MorePage, FigureRow, GridTable, RowMenu, Field, OFFLINE_TEXT, moreStyles as s, type Column } from "@/components/more/ui";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["piece","kg","gram","litre","metre","bag","box","ton","truck","set","pair","dozen"];

interface Item { description: string; hsn: string; quantity: number; unit: string; rate: number; gst_rate: number; amount: number; }
interface Bill { id: string; bill_number: string; customer_name: string; customer_phone?: string; customer_gstin?: string; customer_address?: string; items: Item[]; subtotal: number; cgst: number; sgst: number; igst: number; total: number; gst_rate: number; bill_date: string; due_date?: string; status: string; is_interstate: boolean; notes?: string; }

const emptyItem = (): Item => ({ description: "", hsn: "", quantity: 1, unit: "piece", rate: 0, gst_rate: 18, amount: 0 });
const emptyForm = () => ({ customer_name: "", customer_phone: "", customer_gstin: "", customer_address: "", gst_rate: 18, is_interstate: false, due_date: "", notes: "" });

type Tab = "all" | "unpaid" | "paid";

export default function BillsPage() {
  const notify = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [open, setOpen] = useState<Bill | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // userFeatures is still requested with the list, as before.
      const [b] = await Promise.all([api.bills.list(), api.userFeatures()]);
      setBills(b.bills || []);
    } catch {
      setError(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const calcItem = (item: Item): Item => ({
    ...item,
    amount: Math.round(parseFloat(String(item.quantity || 0)) * parseFloat(String(item.rate || 0)) * 100) / 100,
  });

  const updateItem = (i: number, field: keyof Item, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = calcItem({ ...next[i], [field]: value });
      return next;
    });
  };

  const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  const gstAmt = (subtotal * form.gst_rate) / 100;
  const cgst = form.is_interstate ? 0 : gstAmt / 2;
  const sgst = form.is_interstate ? 0 : gstAmt / 2;
  const igst = form.is_interstate ? gstAmt : 0;
  const total = subtotal + gstAmt;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.customer_name.trim()) { setFormError("Enter the customer's name."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const data = await api.bills.create({ ...form, items: items.filter(i => i.description && i.rate > 0) });
      if (data.success) {
        notify(`Invoice for ${form.customer_name} created`, "positive");
        setShowForm(false);
        setItems([emptyItem()]);
        setForm(emptyForm());
        load();
      } else {
        setFormError("The invoice couldn't be saved. Check the items and try again.");
      }
    } catch {
      setFormError(OFFLINE_TEXT);
    } finally { setSubmitting(false); }
  };

  const markPaid = async (b: Bill) => {
    try {
      await api.bills.update(b.id, { status: "paid" });
      setBills(list => list.map(x => x.id === b.id ? { ...x, status: "paid" } : x));
      setOpen(o => o && o.id === b.id ? { ...o, status: "paid" } : o);
      notify(`${b.customer_name} paid ${inrWhole(Number(b.total))}. Marked as received.`, "positive");
    } catch {
      notify("Couldn't mark this invoice as paid. Try again.", "critical");
    }
  };

  const deleteBill = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.bills.delete(confirmDelete.id);
      setBills(list => list.filter(x => x.id !== confirmDelete.id));
      if (open?.id === confirmDelete.id) setOpen(null);
      notify("Invoice deleted");
      setConfirmDelete(null);
    } catch {
      notify("Couldn't delete the invoice. Try again.", "critical");
    } finally { setDeleting(false); }
  };

  const shareURL = (id: string) => `${window.location.origin}/invoice/${id}`;
  const copyLink = (b: Bill) => navigator.clipboard.writeText(shareURL(b.id)).then(() => notify("Invoice link copied"));
  const printBill = (b: Bill) => { const win = window.open(`/invoice/${b.id}`, "_blank"); win?.addEventListener("load", () => win.print()); };
  const waLink = (b: Bill) => `https://wa.me/91${(b.customer_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`${b.customer_name} ji, aapka invoice ${b.bill_number} (${inrWhole(Number(b.total))}) ready hai. View karein: ${shareURL(b.id)}`)}`;

  const unpaid = bills.filter(b => b.status === "unpaid");
  const paid = bills.filter(b => b.status === "paid");
  const totalUnpaid = unpaid.reduce((sum, b) => sum + Number(b.total), 0);
  const totalPaid = paid.reduce((sum, b) => sum + Number(b.total), 0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills
      .filter(b => tab === "all" || (tab === "paid" ? b.status === "paid" : b.status !== "paid"))
      .filter(b => !q || b.customer_name.toLowerCase().includes(q) || (b.bill_number || "").toLowerCase().includes(q));
  }, [bills, tab, search]);

  const menuFor = (b: Bill) => [
    { label: "Open details", onSelect: () => setOpen(b) },
    { label: "View invoice", href: `/invoice/${b.id}`, external: true },
    { label: "Copy link", onSelect: () => copyLink(b) },
    { label: "Print", onSelect: () => printBill(b) },
    ...(b.customer_phone ? [{ label: "Share on WhatsApp", href: waLink(b), external: true }] : []),
    ...(b.status !== "paid" ? [{ label: "Mark as paid", onSelect: () => markPaid(b), separatorBefore: true }] : []),
    { label: "Delete invoice", onSelect: () => setConfirmDelete(b), tone: "critical" as const, separatorBefore: b.status === "paid" },
  ];

  const columns: Column<Bill>[] = [
    {
      key: "customer", header: "Customer", width: "minmax(0, 1.5fr)",
      render: b => (
        <div className="min-w-0">
          <button type="button" className={`${s.name} ${s.nameBtn}`} onClick={() => setOpen(b)} title={b.customer_name}>{b.customer_name}</button>
          <div className={s.sub}><span>{b.bill_number}</span><span className={s.smOnly}>· {formatDate(b.bill_date)}</span>{b.status === "paid" && <span className={s.smOnly}><StatusChip tone="positive">Paid</StatusChip></span>}</div>
        </div>
      ),
    },
    { key: "date", header: "Date", width: "96px", hide: "sm", render: b => <span>{formatDate(b.bill_date)}</span> },
    {
      key: "due", header: "Due", width: "140px", hide: "md",
      render: b => b.status === "paid" ? <span className={s.muted}>—</span>
        : b.due_date ? <span style={{ color: formatDue(b.due_date).includes("overdue") ? "var(--critical)" : "var(--body)" }}>{formatDue(b.due_date).replace(/^./, c => c.toUpperCase())}</span>
        : <span className={s.muted}>No due date</span>,
    },
    { key: "amount", header: "Amount", width: "130px", widthSm: "auto", align: "right", render: b => <span className={s.amount}>{inrWhole(Number(b.total))}</span> },
    { key: "status", header: "Status", width: "84px", hide: "sm", render: b => <StatusChip tone={b.status === "paid" ? "positive" : "attention"}>{b.status === "paid" ? "Paid" : "Unpaid"}</StatusChip> },
    { key: "actions", header: <span className="sr-only">Actions</span>, width: "40px", align: "right", render: b => <RowMenu label={`Actions for ${b.bill_number}`} items={menuFor(b)} /> },
  ];

  const gstr1 = () => window.open(`${API}/api/bills/gstr1?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, "_blank");

  return (
    <DashboardLayout pageTitle="Invoices">
      <MorePage>
        <PageHeader
          title="Invoices"
          subtitle="GST invoices you've raised, and which are still unpaid."
          right={
            <>
              <Button variant="ghost" onClick={gstr1} title="This month's GSTR-1 data">GSTR-1 data</Button>
              <Button variant="primary" icon={<IconPlus size={14} />} onClick={() => setShowForm(true)}>New invoice</Button>
            </>
          }
        />

        {loading && bills.length === 0 && <div className={s.panel}><SkeletonRows rows={5} height={50} /></div>}

        {!loading && error && (
          <div className={s.panel}><ErrorState title="Couldn't load your invoices" message={OFFLINE_TEXT} onRetry={load} /></div>
        )}

        {!loading && !error && bills.length === 0 && (
          <div className={s.panel}>
            <EmptyState
              icon={<IconInvoice size={17} />}
              title="No invoices yet"
              message="Raise a GST invoice with items, HSN codes and tax worked out for you. You can share it on WhatsApp or print it."
              action={<Button variant="primary" icon={<IconPlus size={14} />} onClick={() => setShowForm(true)}>Create your first invoice</Button>}
            />
          </div>
        )}

        {bills.length > 0 && !error && (
          <>
            <FigureRow items={[
              { label: "Unpaid", value: inrWhole(totalUnpaid), note: `${formatCount(unpaid.length)} invoice${unpaid.length === 1 ? "" : "s"}` },
              { label: "Collected", value: inrWhole(totalPaid), note: `${formatCount(paid.length)} paid` },
              { label: "Invoices raised", value: formatCount(bills.length), note: "All time" },
            ]} />

            <div className={s.stack}>
              <Subnav label="Invoice status" active={tab} onChange={k => setTab(k as Tab)} items={[
                { key: "all", label: "All", count: bills.length },
                { key: "unpaid", label: "Unpaid", count: unpaid.length },
                { key: "paid", label: "Paid", count: paid.length },
              ]} />
              <div className={s.toolbar} style={{ marginTop: 8 }}>
                <SearchField id="bill-search" value={search} onChange={setSearch} placeholder="Search customer or invoice number" />
              </div>
            </div>

            <div className={s.panel}>
              {rows.length > 0 ? (
                <GridTable label="Invoices" columns={columns} rows={rows} rowKey={b => b.id} onRowClick={setOpen} />
              ) : (
                <EmptyState title="No invoices here" message={search ? `Nothing matches “${search}”.` : tab === "unpaid" ? "Every invoice has been paid." : "No paid invoices yet."}
                  action={(search || tab !== "all") ? <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setTab("all"); }}>Show all invoices</Button> : undefined} />
              )}
            </div>
          </>
        )}
      </MorePage>

      {/* Invoice details */}
      {open && (
        <Drawer
          titleId="bill-drawer-title"
          title={open.customer_name}
          eyebrow="Invoice"
          subtitle={`${open.bill_number} · ${formatDate(open.bill_date, { year: "always" })}`}
          onClose={() => setOpen(null)}
          actions={<>
            {open.status !== "paid" && <Button variant="primary" size="sm" onClick={() => markPaid(open)}>Mark as paid</Button>}
            <a className="ui-btn ui-btn-secondary ui-btn-sm" href={`/invoice/${open.id}`} target="_blank" rel="noopener noreferrer">View invoice</a>
            <Button variant="secondary" size="sm" onClick={() => copyLink(open)}>Copy link</Button>
            <Button variant="secondary" size="sm" onClick={() => printBill(open)}>Print</Button>
            {open.customer_phone && <a className="ui-btn ui-btn-secondary ui-btn-sm" href={waLink(open)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </>}
        >
          <div className="flex flex-col" style={{ gap: 22 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <StatusChip tone={open.status === "paid" ? "positive" : "attention"}>{open.status === "paid" ? "Paid" : "Unpaid"}</StatusChip>
              {open.status !== "paid" && open.due_date && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{formatDue(open.due_date).replace(/^./, c => c.toUpperCase())} · {formatDate(open.due_date)}</span>}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>Items</div>
              <div className="flex flex-col">
                {(open.items || []).map((it, i) => (
                  <div key={i} className="flex items-start justify-between" style={{ gap: 16, padding: "10px 0", borderTop: i ? "1px solid var(--line-row)" : "none" }}>
                    <div className="min-w-0">
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{it.description}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }} className="tabular">
                        {formatCount(Number(it.quantity))} {it.unit} × {inr(Number(it.rate))}{it.hsn ? ` · HSN ${it.hsn}` : ""}
                      </div>
                    </div>
                    <div className={s.amount}>{inr(Number(it.amount))}</div>
                  </div>
                ))}
              </div>
            </div>
            <dl className={s.kv} style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <dt>Subtotal</dt><dd>{inr(Number(open.subtotal))}</dd>
              {Number(open.cgst) > 0 && <><dt>CGST ({open.gst_rate / 2}%)</dt><dd>{inr(Number(open.cgst))}</dd></>}
              {Number(open.sgst) > 0 && <><dt>SGST ({open.gst_rate / 2}%)</dt><dd>{inr(Number(open.sgst))}</dd></>}
              {Number(open.igst) > 0 && <><dt>IGST ({open.gst_rate}%)</dt><dd>{inr(Number(open.igst))}</dd></>}
              <dt style={{ color: "var(--ink)", fontWeight: 500 }}>Total</dt><dd style={{ fontWeight: 500 }}>{inr(Number(open.total))}</dd>
            </dl>
            {(open.customer_gstin || open.customer_phone || open.notes) && (
              <dl className={s.kv}>
                {open.customer_gstin && <><dt>Customer GSTIN</dt><dd>{open.customer_gstin}</dd></>}
                {open.customer_phone && <><dt>Phone</dt><dd>{open.customer_phone}</dd></>}
                {open.notes && <><dt>Notes</dt><dd style={{ whiteSpace: "normal" }}>{open.notes}</dd></>}
              </dl>
            )}
            <div>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(open)}>Delete invoice</Button>
            </div>
          </div>
        </Drawer>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Delete this invoice?"
        description={confirmDelete ? `${confirmDelete.bill_number} for ${confirmDelete.customer_name}, ${inrWhole(Number(confirmDelete.total))}. This can't be undone.` : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={deleteBill}>Delete invoice</Button>
        </>}
      />

      {/* New invoice */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New GST invoice"
        description="Tax is worked out from the rate below. Rows without a description or rate are left out."
        width={720}
        footer={<>
          <span className="tabular" style={{ marginRight: "auto", fontSize: 13, color: "var(--ink-2)" }}>Total <span style={{ color: "var(--ink)", fontWeight: 500 }}>{inr(total)}</span></span>
          <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={() => submit()}>Create invoice</Button>
        </>}
      >
        <form onSubmit={submit} className={`${s.form} ${s.scrollBody}`}>
          <div className={s.formGrid}>
            <Field label="Customer name" htmlFor="bill-name" required>
              <input id="bill-name" required data-autofocus className="ui-input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Ramesh Traders" />
            </Field>
            <Field label="Phone" htmlFor="bill-phone">
              <input id="bill-phone" className="ui-input" type="tel" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="9876543210" />
            </Field>
            <Field label="Customer GSTIN" htmlFor="bill-gstin">
              <input id="bill-gstin" className="ui-input" value={form.customer_gstin} onChange={e => setForm(f => ({ ...f, customer_gstin: e.target.value.toUpperCase() }))} placeholder="07AAACR5055K1Z5" maxLength={15} />
            </Field>
            <Field label="Due date" htmlFor="bill-due">
              <input id="bill-due" className="ui-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
          </div>
          <Field label="Customer address" htmlFor="bill-address">
            <input id="bill-address" className="ui-input" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} placeholder="Shop no., area, city, state" />
          </Field>
          <div className="flex items-end flex-wrap" style={{ gap: 16 }}>
            <Field label="GST rate" htmlFor="bill-gst">
              <select id="bill-gst" className="ui-input" style={{ width: 110 }} value={form.gst_rate} onChange={e => setForm(f => ({ ...f, gst_rate: Number(e.target.value) }))}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <label className="flex items-center" style={{ gap: 8, fontSize: 13, color: "var(--body)", height: 34, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_interstate} onChange={e => setForm(f => ({ ...f, is_interstate: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
              Interstate supply (IGST)
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span className={s.fieldLabel}>Items</span>
              <Button variant="ghost" size="sm" icon={<IconPlus size={13} />} onClick={() => setItems(i => [...i, emptyItem()])}>Add row</Button>
            </div>
            <div className="hidden sm:grid" style={{ gridTemplateColumns: "minmax(0,3fr) minmax(0,1.2fr) 70px 100px 100px 96px 28px", gap: 6, fontSize: 12, color: "var(--ink-3)", padding: "0 2px 6px" }}>
              <span>Description</span><span>HSN</span><span>Qty</span><span>Unit</span><span>Rate (₹)</span><span style={{ textAlign: "right" }}>Amount</span><span />
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,1.2fr)_70px_100px_100px_96px_28px] items-center" style={{ gap: 6 }}>
                  <input aria-label={`Item ${i + 1} description`} className="ui-input col-span-2 sm:col-span-1" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Item name" />
                  <input aria-label={`Item ${i + 1} HSN`} className="ui-input" value={item.hsn} onChange={e => updateItem(i, "hsn", e.target.value)} placeholder="HSN" />
                  <input aria-label={`Item ${i + 1} quantity`} className="ui-input tabular" type="number" min="0" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
                  <select aria-label={`Item ${i + 1} unit`} className="ui-input" value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input aria-label={`Item ${i + 1} rate`} className="ui-input tabular" type="number" min="0" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} placeholder="Rate" />
                  <span className="tabular" style={{ fontSize: 13, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" }}>{inr(item.amount)}</span>
                  {items.length > 1
                    ? <button type="button" className="icon-btn" aria-label={`Remove item ${i + 1}`} onClick={() => setItems(it => it.filter((_, j) => j !== i))}><IconX size={13} /></button>
                    : <span />}
                </div>
              ))}
            </div>
          </div>

          <dl className={s.kv} style={{ padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--radius-md)" }}>
            <dt>Subtotal</dt><dd>{inr(subtotal)}</dd>
            {cgst > 0 && <><dt>CGST ({form.gst_rate / 2}%)</dt><dd>{inr(cgst)}</dd></>}
            {sgst > 0 && <><dt>SGST ({form.gst_rate / 2}%)</dt><dd>{inr(sgst)}</dd></>}
            {igst > 0 && <><dt>IGST ({form.gst_rate}%)</dt><dd>{inr(igst)}</dd></>}
            <dt style={{ color: "var(--ink)", fontWeight: 500 }}>Total</dt><dd style={{ fontWeight: 500 }}>{inr(total)}</dd>
          </dl>

          <Field label="Notes" htmlFor="bill-notes">
            <input id="bill-notes" className="ui-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, bank details" />
          </Field>
          {formError && <p className={s.formError} role="alert">{formError}</p>}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}

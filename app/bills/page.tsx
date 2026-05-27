"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiPlus, FiTrash2, FiRefreshCw, FiPrinter, FiShare2,
  FiCheck, FiX, FiFileText, FiDownload, FiEye, FiChevronDown, FiChevronUp } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["piece","kg","gram","litre","metre","bag","box","ton","truck","set","pair","dozen"];
const fmtINR = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const token = () => typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

interface Item { description: string; hsn: string; quantity: number; unit: string; rate: number; gst_rate: number; amount: number; }
interface Bill { id: string; bill_number: string; customer_name: string; customer_phone?: string; customer_gstin?: string; customer_address?: string; items: Item[]; subtotal: number; cgst: number; sgst: number; igst: number; total: number; gst_rate: number; bill_date: string; due_date?: string; status: string; is_interstate: boolean; notes?: string; }

const emptyItem = (): Item => ({ description: "", hsn: "", quantity: 1, unit: "piece", rate: 0, gst_rate: 18, amount: 0 });

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>({});

  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_gstin: "", customer_address: "",
    gst_rate: 18, is_interstate: false, due_date: "", notes: "",
  });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, pRes] = await Promise.all([
        fetch(`${API}/api/bills`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/user/features`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [b, p] = await Promise.all([bRes.json(), pRes.json()]);
      setBills(b.bills || []);
      setProfile(p);
    } catch {
      setError("Could not load invoices. Check your connection and try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const calcItem = (item: Item): Item => ({
    ...item,
    amount: Math.round(parseFloat(String(item.quantity || 0)) * parseFloat(String(item.rate || 0)) * 100) / 100,
  });

  const updateItem = (i: number, field: keyof Item, value: any) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = calcItem({ ...next[i], [field]: value });
      return next;
    });
  };

  const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const gstAmt = (subtotal * form.gst_rate) / 100;
  const cgst = form.is_interstate ? 0 : gstAmt / 2;
  const sgst = form.is_interstate ? 0 : gstAmt / 2;
  const igst = form.is_interstate ? gstAmt : 0;
  const total = subtotal + gstAmt;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, items: items.filter(i => i.description && i.rate > 0) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setItems([emptyItem()]);
        setForm({ customer_name: "", customer_phone: "", customer_gstin: "", customer_address: "", gst_rate: 18, is_interstate: false, due_date: "", notes: "" });
        load();
      }
    } finally { setSubmitting(false); }
  };

  const markPaid = async (id: string) => {
    await fetch(`${API}/api/bills/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify({ status: "paid" }) });
    setBills(b => b.map(x => x.id === id ? { ...x, status: "paid" } : x));
  };

  const deleteBill = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`${API}/api/bills/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setBills(b => b.filter(x => x.id !== id));
  };

  const shareURL = (id: string) => `${window.location.origin}/invoice/${id}`;

  const totalUnpaid = bills.filter(b => b.status === "unpaid").reduce((s, b) => s + Number(b.total), 0);
  const totalPaid = bills.filter(b => b.status === "paid").reduce((s, b) => s + Number(b.total), 0);

  return (
    <DashboardLayout pageTitle="GST Bills / Invoices">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card-base p-4 text-center">
          <p className="text-2xl font-bold text-warning">{fmtINR(totalUnpaid)}</p>
          <p className="text-2xs text-muted mt-0.5">Unpaid</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="text-2xl font-bold text-success">{fmtINR(totalPaid)}</p>
          <p className="text-2xs text-muted mt-0.5">Collected</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="text-2xl font-bold text-primary">{bills.length}</p>
          <p className="text-2xs text-muted mt-0.5">Total Bills</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
          <FiPlus size={14} /> New Invoice
        </button>
        <button onClick={() => window.open(`${API}/api/bills/gstr1?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}`, '_blank')}
          className="text-sm px-3 py-2 border border-border rounded-xl text-muted hover:text-primary flex items-center gap-1.5">
          <FiDownload size={13} /> GSTR-1 Data
        </button>
      </div>

      {/* Bills list */}
      {error && (
        <div className="card-base p-6 text-center mb-4">
          <p className="text-danger text-sm font-semibold mb-2">⚠ {error}</p>
          <button onClick={load} className="text-xs text-muted border border-border rounded-lg px-3 py-1.5 hover:text-primary transition-colors">Retry</button>
        </div>
      )}
      {loading ? <div className="text-center text-muted py-10"><FiRefreshCw className="animate-spin inline mr-2" />Loading…</div> : (
        <div className="space-y-2">
          {bills.length === 0 && !showForm && !error && (
            <div className="card-base p-10 text-center">
              <FiFileText size={40} className="text-muted mx-auto mb-3" />
              <p className="font-semibold text-primary mb-1">Koi invoice nahi abhi</p>
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2 mt-2 mx-auto flex items-center gap-1.5">
                <FiPlus size={13} /> Create First Invoice
              </button>
            </div>
          )}
          {bills.map(b => (
            <div key={b.id} className="card-base overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-primary">{b.customer_name}</p>
                      <p className="text-2xs text-muted">{b.bill_number} · {b.bill_date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{fmtINR(Number(b.total))}</p>
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${b.status === "paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {b.status === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.status !== "paid" && (
                      <button onClick={() => markPaid(b.id)} className="text-xs bg-success/10 text-success border border-success/20 px-2 py-1 rounded-lg flex items-center gap-1">
                        <FiCheck size={11} /> Mark Paid
                      </button>
                    )}
                    <button onClick={() => window.open(`/invoice/${b.id}`, '_blank')} className="text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-1 rounded-lg flex items-center gap-1">
                      <FiEye size={11} /> View
                    </button>
                    <button onClick={() => {
                      const url = `${window.location.origin}/invoice/${b.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        const btn = document.getElementById(`copy-${b.id}`);
                        if (btn) { btn.textContent = "✓ Copied!"; setTimeout(() => { if (btn) btn.textContent = "Copy Link"; }, 2000); }
                      });
                    }} id={`copy-${b.id}`}
                      className="text-xs bg-surface-2 text-secondary border border-border px-2 py-1 rounded-lg flex items-center gap-1 hover:text-primary transition-colors">
                      <FiShare2 size={11} /> Copy Link
                    </button>
                    <button onClick={() => { const win = window.open(`/invoice/${b.id}`, '_blank'); win?.addEventListener('load', () => win.print()); }}
                      className="text-xs bg-surface-2 text-secondary border border-border px-2 py-1 rounded-lg flex items-center gap-1 hover:text-primary transition-colors">
                      <FiPrinter size={11} /> Print
                    </button>
                    {b.customer_phone && (
                      <a href={`https://wa.me/91${b.customer_phone.replace(/\D/g,"")}?text=${encodeURIComponent(`${b.customer_name} ji, aapka invoice ${b.bill_number} (₹${Number(b.total).toLocaleString("en-IN")}) ready hai. View karein: ${shareURL(b.id)}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-success/10 text-success border border-success/20 px-2 py-1 rounded-lg flex items-center gap-1">
                        <FiShare2 size={11} /> WhatsApp
                      </a>
                    )}
                    <button onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="text-xs text-muted flex items-center gap-1 ml-auto">
                      {expanded === b.id ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                    </button>
                  </div>
                </div>
              </div>
              {expanded === b.id && (
                <div className="border-t border-border px-4 py-3 bg-surface/40 text-xs space-y-2">
                  <div className="space-y-1">
                    {b.items?.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-secondary">{it.description} {it.hsn ? `(HSN: ${it.hsn})` : ""} × {it.quantity} {it.unit}</span>
                        <span className="text-primary font-medium">{fmtINR(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/50 pt-1 space-y-0.5">
                    <div className="flex justify-between text-muted"><span>Subtotal</span><span>{fmtINR(Number(b.subtotal))}</span></div>
                    {Number(b.cgst) > 0 && <div className="flex justify-between text-muted"><span>CGST ({b.gst_rate/2}%)</span><span>{fmtINR(Number(b.cgst))}</span></div>}
                    {Number(b.sgst) > 0 && <div className="flex justify-between text-muted"><span>SGST ({b.gst_rate/2}%)</span><span>{fmtINR(Number(b.sgst))}</span></div>}
                    {Number(b.igst) > 0 && <div className="flex justify-between text-muted"><span>IGST ({b.gst_rate}%)</span><span>{fmtINR(Number(b.igst))}</span></div>}
                    <div className="flex justify-between font-bold text-primary border-t border-border/50 pt-1"><span>Total</span><span>{fmtINR(Number(b.total))}</span></div>
                  </div>
                  {b.customer_gstin && <p className="text-muted">Customer GSTIN: {b.customer_gstin}</p>}
                  {b.notes && <p className="text-muted">Notes: {b.notes}</p>}
                  <button onClick={() => deleteBill(b.id)} className="text-danger text-xs flex items-center gap-1 hover:underline pt-1">
                    <FiTrash2 size={11} /> Delete invoice
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl card-base p-5 my-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-primary text-lg">New GST Invoice</h2>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-primary"><FiX size={18} /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-2xs text-muted mb-1 block">Customer Name *</label>
                  <input required value={form.customer_name} onChange={e => setForm(f=>({...f,customer_name:e.target.value}))} className="input-base text-sm w-full" placeholder="Ramesh Traders" />
                </div>
                <div>
                  <label className="text-2xs text-muted mb-1 block">Phone</label>
                  <input value={form.customer_phone} onChange={e => setForm(f=>({...f,customer_phone:e.target.value}))} className="input-base text-sm w-full" placeholder="9876543210" type="tel" />
                </div>
                <div>
                  <label className="text-2xs text-muted mb-1 block">Customer GSTIN</label>
                  <input value={form.customer_gstin} onChange={e => setForm(f=>({...f,customer_gstin:e.target.value.toUpperCase()}))} className="input-base text-sm w-full" placeholder="07AAACR5055K1Z5" maxLength={15} />
                </div>
                <div>
                  <label className="text-2xs text-muted mb-1 block">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} className="input-base text-sm w-full" />
                </div>
                <div className="col-span-2">
                  <label className="text-2xs text-muted mb-1 block">Customer Address</label>
                  <input value={form.customer_address} onChange={e => setForm(f=>({...f,customer_address:e.target.value}))} className="input-base text-sm w-full" placeholder="Shop no., Area, City, State" />
                </div>
              </div>

              {/* GST settings */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-2xs text-muted mb-1 block">GST Rate</label>
                  <select value={form.gst_rate} onChange={e => setForm(f=>({...f,gst_rate:Number(e.target.value)}))} className="input-base text-sm">
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer mt-4">
                  <input type="checkbox" checked={form.is_interstate} onChange={e => setForm(f=>({...f,is_interstate:e.target.checked}))} className="w-4 h-4 accent-brand-primary" />
                  Interstate (IGST)
                </label>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-primary">Items</label>
                  <button type="button" onClick={() => setItems(i => [...i, emptyItem()])} className="text-xs text-brand-primary flex items-center gap-1"><FiPlus size={12} /> Add Row</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-1 text-2xs text-muted px-1">
                    <span className="col-span-4">Description</span><span className="col-span-2">HSN</span>
                    <span className="col-span-1">Qty</span><span className="col-span-2">Unit</span>
                    <span className="col-span-2">Rate (₹)</span><span className="col-span-1">Amt</span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <input value={item.description} onChange={e => updateItem(i,"description",e.target.value)} placeholder="Item name" className="input-base text-xs col-span-4 py-1.5" />
                      <input value={item.hsn} onChange={e => updateItem(i,"hsn",e.target.value)} placeholder="HSN" className="input-base text-xs col-span-2 py-1.5" />
                      <input type="number" value={item.quantity} onChange={e => updateItem(i,"quantity",e.target.value)} min="0" className="input-base text-xs col-span-1 py-1.5" />
                      <select value={item.unit} onChange={e => updateItem(i,"unit",e.target.value)} className="input-base text-xs col-span-2 py-1.5">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" value={item.rate} onChange={e => updateItem(i,"rate",e.target.value)} min="0" placeholder="Rate" className="input-base text-xs col-span-2 py-1.5" />
                      <div className="col-span-1 flex items-center justify-between">
                        <span className="text-2xs text-muted">{fmtINR(item.amount).replace("₹","")}</span>
                        {items.length > 1 && <button type="button" onClick={() => setItems(it => it.filter((_,j)=>j!==i))} className="text-danger/60 hover:text-danger"><FiX size={12} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-surface rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted"><span>Subtotal</span><span>{fmtINR(subtotal)}</span></div>
                {cgst > 0 && <div className="flex justify-between text-muted"><span>CGST ({form.gst_rate/2}%)</span><span>{fmtINR(cgst)}</span></div>}
                {sgst > 0 && <div className="flex justify-between text-muted"><span>SGST ({form.gst_rate/2}%)</span><span>{fmtINR(sgst)}</span></div>}
                {igst > 0 && <div className="flex justify-between text-muted"><span>IGST ({form.gst_rate}%)</span><span>{fmtINR(igst)}</span></div>}
                <div className="flex justify-between font-bold text-primary text-lg border-t border-border pt-1"><span>Total</span><span>{fmtINR(total)}</span></div>
              </div>

              <div>
                <label className="text-2xs text-muted mb-1 block">Notes</label>
                <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="input-base text-sm w-full" placeholder="Payment terms, bank details…" />
              </div>

              <button type="submit" disabled={submitting || !form.customer_name} className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2">
                {submitting ? <FiRefreshCw className="animate-spin" size={14} /> : <FiFileText size={14} />}
                Generate Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

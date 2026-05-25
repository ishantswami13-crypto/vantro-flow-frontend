"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiArrowLeft, FiCheck,
  FiUser, FiPhone, FiMail, FiCalendar,
  FiFileText, FiMessageSquare, FiZap, FiPackage,
} from "react-icons/fi";
import { api, getUser } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface LineItem {
  id: string;
  name: string;
  qty: string;
  unit: string;
  rate: string;
}

const UNITS = ["unit", "kg", "litre", "metre", "box", "bag", "piece", "set", "dozen", "tonne"];

function uid() { return Math.random().toString(36).slice(2, 8); }

function calcItemAmount(item: LineItem): number {
  const q = parseFloat(item.qty) || 0;
  const r = parseFloat(item.rate) || 0;
  return Math.round(q * r * 100) / 100;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const user = getUser();

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Invoice meta
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), name: "", qty: "1", unit: "unit", rate: "" },
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ invoice_number: string; wa_sent?: boolean } | null>(null);
  const [error, setError] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(false);

  // Fetch automation status
  useEffect(() => {
    api.settings.get().then(d => setAutoEnabled(!!d.settings.automation_enabled)).catch(() => {});
  }, []);

  // Default due date = 30 days from invoice date
  useEffect(() => {
    if (invoiceDate && !dueDate) {
      const d = new Date(invoiceDate);
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [invoiceDate]);

  const total = items.reduce((s, it) => s + calcItemAmount(it), 0);
  const hasValidItems = items.some(it => it.name && parseFloat(it.rate) > 0);

  const addItem = () => setItems(prev => [...prev, { id: uid(), name: "", qty: "1", unit: "unit", rate: "" }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customerName.trim()) return setError("Customer name is required");
    if (!hasValidItems) return setError("Add at least one item with name and rate");

    setLoading(true);
    try {
      const token = localStorage.getItem("vantro_token");
      const validItems = items
        .filter(it => it.name && parseFloat(it.rate) > 0)
        .map(it => ({ name: it.name, qty: parseFloat(it.qty) || 1, unit: it.unit, rate: parseFloat(it.rate) }));

      const res = await fetch(`${BASE}/api/invoices/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name:  customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          customer_email: customerEmail.trim() || undefined,
          invoice_date:   invoiceDate,
          due_date:       dueDate || undefined,
          items:          validItems,
          notes:          notes.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Failed to create invoice");
      setSuccess({ invoice_number: d.invoice_number });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [customerName, customerPhone, customerEmail, invoiceDate, dueDate, items, notes, hasValidItems]);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center mx-auto mb-5">
              <FiCheck size={28} className="text-success" />
            </div>
            <h1 className="text-2xl font-black text-primary mb-2">Invoice Created!</h1>
            <p className="text-secondary text-sm mb-1">
              <span className="font-mono font-bold text-accent">{success.invoice_number}</span>
            </p>
            <p className="text-muted text-xs mb-8">
              {autoEnabled && customerPhone
                ? "WhatsApp with payment link sent to customer automatically."
                : "Invoice saved. Go to Collections to send a reminder manually."}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setSuccess(null); setCustomerName(""); setCustomerPhone(""); setCustomerEmail(""); setNotes(""); setItems([{ id: uid(), name: "", qty: "1", unit: "unit", rate: "" }]); }}
                className="w-full py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 transition-all">
                Create Another Invoice
              </button>
              <button
                onClick={() => router.push("/collections")}
                className="w-full py-3 rounded-xl bg-surface-2 border border-border text-secondary font-semibold text-sm hover:text-primary transition-all">
                Go to Collections
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-primary transition-colors">
            <FiArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-lg font-black text-primary leading-none">New Invoice</h1>
            <p className="text-xs text-muted mt-0.5">
              {autoEnabled ? "WhatsApp will auto-send to customer on save" : "Enable automation in Settings to auto-send WhatsApp"}
            </p>
          </div>
          {autoEnabled && (
            <span className="ml-auto flex items-center gap-1.5 text-2xs font-bold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
              <FiZap size={10} /> Auto WA On
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Customer info */}
          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <FiUser size={12} /> Customer
            </p>
            <div>
              <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Customer Name *</label>
              <input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Traders"
                required
                className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">
                  <FiPhone size={10} className="inline mr-1" />Phone
                </label>
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">
                  <FiMail size={10} className="inline mr-1" />Email
                </label>
                <input
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  type="email"
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="card p-5">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <FiCalendar size={12} /> Dates
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  required
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="card p-5">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <FiPackage size={12} /> Items
            </p>

            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid gap-2 text-2xs font-bold text-muted uppercase tracking-wider" style={{ gridTemplateColumns: "1fr 60px 80px 80px 32px" }}>
                <span>Item / Service</span>
                <span>Qty</span>
                <span>Unit</span>
                <span className="text-right">Rate (₹)</span>
                <span />
              </div>

              {items.map((item, idx) => (
                <div key={item.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 60px 80px 80px 32px" }}>
                  <input
                    value={item.name}
                    onChange={e => updateItem(item.id, "name", e.target.value)}
                    placeholder={`Item ${idx + 1}`}
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary placeholder-muted px-2.5 py-2 focus:outline-none focus:border-accent transition-colors"
                  />
                  <input
                    value={item.qty}
                    onChange={e => updateItem(item.id, "qty", e.target.value)}
                    inputMode="decimal"
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary px-2.5 py-2 focus:outline-none focus:border-accent transition-colors text-center"
                  />
                  <select
                    value={item.unit}
                    onChange={e => updateItem(item.id, "unit", e.target.value)}
                    className="bg-surface-2 border border-border rounded-lg text-sm text-secondary px-1.5 py-2 focus:outline-none focus:border-accent transition-colors">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    value={item.rate}
                    onChange={e => updateItem(item.id, "rate", e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary placeholder-muted px-2.5 py-2 focus:outline-none focus:border-accent transition-colors text-right"
                  />
                  <button
                    type="button"
                    onClick={() => items.length > 1 ? removeItem(item.id) : null}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-30"
                    disabled={items.length === 1}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add item + total */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors">
                <FiPlus size={13} /> Add Item
              </button>
              <div className="text-right">
                <p className="text-2xs text-muted">Total</p>
                <p className="text-xl font-black text-primary">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <FiFileText size={12} /> Notes / Terms (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment terms, bank details, thank you note..."
              className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          {/* Automation note */}
          {autoEnabled && customerPhone && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-success/8 border border-success/20 rounded-xl">
              <FiMessageSquare size={14} className="text-success shrink-0 mt-0.5" />
              <p className="text-xs text-success/90 leading-relaxed">
                WhatsApp will be sent to <span className="font-bold">{customerPhone}</span> automatically with a payment link when you save.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !customerName.trim() || !hasValidItems}
            className="w-full py-4 rounded-xl bg-accent text-white font-black text-base hover:bg-accent/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-button-accent">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Invoice...</>
            ) : (
              <><FiCheck size={17} /> Create Invoice — ₹{total.toLocaleString("en-IN")}</>
            )}
          </button>

          <p className="text-center text-2xs text-muted pb-2">
            Invoice number is auto-generated · Changes can be made from Collections
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}

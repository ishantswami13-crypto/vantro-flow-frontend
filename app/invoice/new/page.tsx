"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiArrowLeft, FiArrowRight, FiCheck,
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

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Step progress bar ──────────────────────────────────────────────────────
const STEPS = [
  { n: 1, label: "Customer" },
  { n: 2, label: "Items"    },
  { n: 3, label: "Review"   },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((s, i) => {
        const done    = current > s.n;
        const active  = current === s.n;
        return (
          <div key={s.n} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{
                  background: done   ? "#10D98A"
                            : active ? "#4F6EF7"
                            : "rgba(255,255,255,0.06)",
                  border: done || active ? "none" : "1px solid rgba(255,255,255,0.12)",
                  color: done || active ? "#fff" : "#556070",
                  boxShadow: active ? "0 0 16px rgba(79,110,247,0.45)" : "none",
                }}
              >
                {done ? <FiCheck size={13} strokeWidth={3} /> : s.n}
              </div>
              <span
                className="text-[9px] font-bold mt-1 tracking-wide uppercase"
                style={{ color: done ? "#10D98A" : active ? "#4F6EF7" : "#556070" }}
              >
                {s.label}
              </span>
            </div>
            {/* Connector — skip after last */}
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-1 transition-all"
                style={{ background: done ? "#10D98A" : "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewInvoicePage() {
  const router = useRouter();
  const user = getUser();

  // ── Form state ────────────────────────────────────────────────────────────
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate,     setDueDate]     = useState("");
  const [notes,       setNotes]       = useState("");

  const [items, setItems] = useState<LineItem[]>([
    { id: uid(), name: "", qty: "1", unit: "unit", rate: "" },
  ]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [step,        setStep]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState<{ invoice_number: string; invoice_id?: string } | null>(null);
  const [error,       setError]       = useState("");
  const [autoEnabled, setAutoEnabled] = useState(false);

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

  const total        = items.reduce((s, it) => s + calcItemAmount(it), 0);
  const hasValidItems = items.some(it => it.name && parseFloat(it.rate) > 0);
  const validItems   = items.filter(it => it.name && parseFloat(it.rate) > 0);

  const addItem    = () => setItems(prev => [...prev, { id: uid(), name: "", qty: "1", unit: "unit", rate: "" }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));

  // ── Step 1 → 2 ──────────────────────────────────────────────────────────
  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customerName.trim()) { setError("Customer name is required"); return; }
    setStep(2);
  };

  // ── Step 2 → 3 ──────────────────────────────────────────────────────────
  const goStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!hasValidItems) { setError("Add at least one item with name and rate"); return; }
    setStep(3);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("vantro_token");
      const res = await fetch(`${BASE}/api/invoices/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name:  customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          customer_email: customerEmail.trim() || undefined,
          invoice_date:   invoiceDate,
          due_date:       dueDate || undefined,
          items:          validItems.map(it => ({
            name: it.name, qty: parseFloat(it.qty) || 1,
            unit: it.unit, rate: parseFloat(it.rate),
          })),
          notes: notes.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Failed to create invoice");
      setSuccess({ invoice_number: d.invoice_number, invoice_id: d.invoice?.id });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [customerName, customerPhone, customerEmail, invoiceDate, dueDate, validItems, notes]);

  // ── Success screen ────────────────────────────────────────────────────────
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
                ? "WhatsApp with payment link sent automatically."
                : "Invoice saved. Go to Collections to send a reminder."}
            </p>
            <div className="flex flex-col gap-3">
              {success.invoice_id && (
                <button
                  onClick={() => router.push(`/invoice/${success.invoice_id}`)}
                  className="w-full py-3 rounded-xl bg-surface-2 border border-accent/30 text-accent font-bold text-sm hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-2">
                  👁 View &amp; Print Invoice
                </button>
              )}
              <button
                onClick={() => {
                  setSuccess(null); setStep(1);
                  setCustomerName(""); setCustomerPhone(""); setCustomerEmail("");
                  setNotes(""); setItems([{ id: uid(), name: "", qty: "1", unit: "unit", rate: "" }]);
                }}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-sm">
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

  // ── Shared header ─────────────────────────────────────────────────────────
  const Header = ({ onBack }: { onBack: () => void }) => (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-primary transition-colors">
        <FiArrowLeft size={15} />
      </button>
      <div>
        <h1 className="text-lg font-black text-primary leading-none">New Invoice</h1>
        <p className="text-xs text-muted mt-0.5">
          {autoEnabled ? "WhatsApp auto-sends to customer on save" : "Enable automation in Settings to auto-send"}
        </p>
      </div>
      {autoEnabled && (
        <span className="ml-auto flex items-center gap-1.5 text-2xs font-bold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full shrink-0">
          <FiZap size={10} /> Auto WA On
        </span>
      )}
    </div>
  );

  // ── STEP 1 — Customer ─────────────────────────────────────────────────────
  if (step === 1) return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <Header onBack={() => router.back()} />
        <StepBar current={1} />

        <form onSubmit={goStep2} className="space-y-4">
          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <FiUser size={12} /> Who are you billing?
            </p>
            <div>
              <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Customer / Business Name *</label>
              <input
                autoFocus
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); setError(""); }}
                placeholder="e.g. Ramesh Traders, Gupta Industries"
                required
                className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">
                  <FiPhone size={10} className="inline mr-1" />WhatsApp / Phone
                </label>
                <input
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-3 focus:outline-none focus:border-accent transition-colors"
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
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Dates in step 1 for simplicity */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <FiCalendar size={12} /> Invoice Dates
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    required
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3.5 py-3 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="text-2xs font-medium text-muted uppercase tracking-wider block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3.5 py-3 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">{error}</div>
          )}

          {autoEnabled && customerPhone && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-success/8 border border-success/20 rounded-xl">
              <FiMessageSquare size={14} className="text-success shrink-0 mt-0.5" />
              <p className="text-xs text-success/90 leading-relaxed">
                WhatsApp will be sent to <span className="font-bold">{customerPhone}</span> automatically on save.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={!customerName.trim()}
            className="w-full py-4 rounded-xl bg-white text-black font-black text-base hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm">
            Next — Add Items <FiArrowRight size={16} />
          </button>
        </form>
      </div>
    </DashboardLayout>
  );

  // ── STEP 2 — Items ────────────────────────────────────────────────────────
  if (step === 2) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Header onBack={() => setStep(1)} />
        <StepBar current={2} />

        <form onSubmit={goStep3} className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <FiPackage size={12} /> Line Items
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
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary placeholder-muted px-2.5 py-2.5 focus:outline-none focus:border-accent transition-colors"
                  />
                  <input
                    value={item.qty}
                    onChange={e => updateItem(item.id, "qty", e.target.value)}
                    inputMode="decimal"
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary px-2.5 py-2.5 focus:outline-none focus:border-accent transition-colors text-center"
                  />
                  <select
                    value={item.unit}
                    onChange={e => updateItem(item.id, "unit", e.target.value)}
                    className="bg-surface-2 border border-border rounded-lg text-sm text-secondary px-1.5 py-2.5 focus:outline-none focus:border-accent transition-colors">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input
                    value={item.rate}
                    onChange={e => updateItem(item.id, "rate", e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="bg-surface-2 border border-border rounded-lg text-sm text-primary placeholder-muted px-2.5 py-2.5 focus:outline-none focus:border-accent transition-colors text-right"
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

            {/* Row amounts preview */}
            {validItems.length > 0 && (
              <div className="mt-3 space-y-1 pt-3 border-t border-border/60">
                {validItems.map(it => (
                  <div key={it.id} className="flex items-center justify-between text-xs text-muted">
                    <span className="truncate max-w-[60%]">{it.name}</span>
                    <span className="font-semibold text-secondary">{fmtINR(calcItemAmount(it))}</span>
                  </div>
                ))}
              </div>
            )}

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
                <p className="text-2xl font-black text-primary">{fmtINR(total)}</p>
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

          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">{error}</div>
          )}

          <button
            type="submit"
            disabled={!hasValidItems}
            className="w-full py-4 rounded-xl bg-white text-black font-black text-base hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm">
            Review Invoice <FiArrowRight size={16} />
          </button>
        </form>
      </div>
    </DashboardLayout>
  );

  // ── STEP 3 — Review + Submit ──────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <Header onBack={() => setStep(2)} />
        <StepBar current={3} />

        <div className="space-y-4">
          {/* Summary card */}
          <div className="card-premium p-5 space-y-4">
            {/* Invoice header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xs text-muted uppercase tracking-wider mb-0.5">Billing To</p>
                <p className="text-base font-black text-primary">{customerName}</p>
                {customerPhone && <p className="text-xs text-secondary mt-0.5">{customerPhone}</p>}
                {customerEmail && <p className="text-xs text-muted">{customerEmail}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xs text-muted uppercase tracking-wider mb-0.5">Invoice Date</p>
                <p className="text-sm font-bold text-primary">{invoiceDate}</p>
                {dueDate && (
                  <>
                    <p className="text-2xs text-muted uppercase tracking-wider mt-1.5 mb-0.5">Due</p>
                    <p className="text-sm font-bold text-warning">{dueDate}</p>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-2xs font-bold text-muted uppercase tracking-wider">Items</p>
              {validItems.map(it => (
                <div key={it.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary font-medium">{it.name}</p>
                    <p className="text-2xs text-muted">{it.qty} {it.unit} × {fmtINR(parseFloat(it.rate))}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{fmtINR(calcItemAmount(it))}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <p className="text-sm font-bold text-secondary">Total Amount</p>
              <p className="text-3xl font-black text-primary">{fmtINR(total)}</p>
            </div>

            {notes && (
              <div className="pt-3 border-t border-border">
                <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-1">Notes</p>
                <p className="text-xs text-secondary leading-relaxed">{notes}</p>
              </div>
            )}
          </div>

          {/* WhatsApp auto-send info */}
          {autoEnabled && customerPhone ? (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-success/8 border border-success/20 rounded-xl">
              <FiMessageSquare size={14} className="text-success shrink-0 mt-0.5" />
              <p className="text-xs text-success/90 leading-relaxed">
                WhatsApp will be sent to <span className="font-bold">{customerPhone}</span> with a payment link automatically.
              </p>
            </div>
          ) : !customerPhone ? (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-surface-3 border border-border rounded-xl">
              <FiPhone size={14} className="text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                No phone number added — WhatsApp reminder can be sent manually from Collections.
              </p>
            </div>
          ) : null}

          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-sm text-danger">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-white text-black font-black text-base hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating Invoice…</>
            ) : (
              <><FiCheck size={17} /> Confirm &amp; Create — {fmtINR(total)}</>
            )}
          </button>

          <p className="text-center text-2xs text-muted pb-2">
            Invoice number is auto-generated · Editable from Collections
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

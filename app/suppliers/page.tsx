"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getToken, getUser } from "@/lib/api";
import { FiSearch, FiTruck, FiPhone, FiCalendar, FiAlertTriangle, FiX, FiFileText, FiChevronRight } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Supplier = {
  id: string | number;
  name: string;
  phone?: string | null;
  gstin?: string | null;
  payment_terms?: number | null;
  total_payable?: number;
  outstanding_amount?: number;
  purchase_count?: number;
  last_purchase_date?: string | null;
  inferred_from_purchases?: boolean;
  purchases?: SupplierPurchase[];
};

type SupplierPurchaseItem = {
  description?: string;
  name?: string;
  hsn_sac?: string | null;
  hsn?: string | null;
  qty?: number;
  quantity?: number;
  unit?: string | null;
  price?: number;
  rate?: number;
  amount?: number;
};

type SupplierPurchase = {
  id: string | number;
  bill_number?: string | null;
  purchase_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  total_amount?: number;
  amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  subtotal?: number;
  gst_type?: string | null;
  gst_rate?: number | null;
  gst_amount?: number | null;
  cgst_amount?: number | null;
  sgst_amount?: number | null;
  igst_amount?: number | null;
  notes?: string | null;
  items?: SupplierPurchaseItem[];
};

const fmtINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtDate = (d?: string | null) => {
  if (!d) return "No purchases";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const loadSuppliers = async () => {
    const user = getUser();
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/suppliers/${user.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setSuppliers(data.suppliers || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.phone, supplier.gstin].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [suppliers, search]);

  const totalPayable = suppliers.reduce((sum, supplier) => sum + Number(supplier.outstanding_amount || 0), 0);
  const activeSuppliers = suppliers.filter((supplier) => Number(supplier.outstanding_amount || 0) > 0).length;

  return (
    <DashboardLayout pageTitle="Suppliers">
      <div className="space-y-5 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Suppliers</h2>
            <p className="text-sm text-secondary mt-0.5">Payables generated from your purchase bills</p>
          </div>
          <button onClick={loadSuppliers} className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-metric p-5">
            <p className="section-label mb-3">Total Suppliers</p>
            <p className="metric-lg text-primary">{suppliers.length}</p>
            <p className="text-2xs text-muted mt-1">{activeSuppliers} with dues</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">We Need To Pay</p>
            <p className="metric-lg text-yellow-400">{fmtINR(totalPayable)}</p>
            <p className="text-2xs text-muted mt-1">from purchases</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">Purchase Bills</p>
            <p className="metric-lg text-accent">{suppliers.reduce((s, x) => s + Number(x.purchase_count || 0), 0)}</p>
            <p className="text-2xs text-muted mt-1">linked automatically</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">Auto Added</p>
            <p className="metric-lg text-success">{suppliers.filter((s) => s.inferred_from_purchases).length}</p>
            <p className="text-2xs text-muted mt-1">from old purchases</p>
          </div>
        </div>

        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, phone, GSTIN..."
            className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-3 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>

        {loading ? (
          <div className="card-premium p-10 text-center text-sm text-muted">Loading suppliers...</div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <FiTruck size={34} className="mx-auto mb-3 text-muted opacity-40" />
            <p className="text-sm font-bold text-primary">No suppliers yet</p>
            <p className="text-xs text-muted mt-1">Add or scan a purchase bill and the supplier will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((supplier) => {
              const outstanding = Number(supplier.outstanding_amount || 0);
              return (
                <button
                  key={String(supplier.id)}
                  type="button"
                  onClick={() => setSelectedSupplier(supplier)}
                  className="card-premium p-5 text-left hover:border-yellow-400/35 transition-all focus:outline-none focus:border-yellow-400/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-yellow-400/12 border border-yellow-400/25 text-yellow-400 flex items-center justify-center">
                          <FiTruck size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-primary truncate">{supplier.name}</p>
                          <p className="text-2xs text-muted">{supplier.gstin || "GSTIN not saved"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={outstanding > 0 ? "metric-value text-yellow-400" : "metric-value text-success"}>
                        {fmtINR(outstanding)}
                      </p>
                      <p className="text-2xs text-muted">{outstanding > 0 ? "dena hai" : "clear"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Total</p>
                      <p className="text-sm font-bold text-primary">{fmtINR(Number(supplier.total_payable || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Bills</p>
                      <p className="text-sm font-bold text-primary">{supplier.purchase_count || 0}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Terms</p>
                      <p className="text-sm font-bold text-primary">{supplier.payment_terms || 30}d</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 text-xs text-secondary">
                    {supplier.phone && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2">
                        <FiPhone size={12} /> {supplier.phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2">
                      <FiCalendar size={12} /> {fmtDate(supplier.last_purchase_date)}
                    </span>
                    {supplier.inferred_from_purchases && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400">
                        <FiAlertTriangle size={12} /> inferred
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 text-primary">
                      View details <FiChevronRight size={12} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedSupplier && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl bg-surface border border-white/10 shadow-2xl">
              <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border">
                <div className="min-w-0">
                  <p className="text-lg font-black text-primary truncate">{selectedSupplier.name}</p>
                  <p className="text-xs text-muted mt-1">
                    {selectedSupplier.gstin || "GSTIN not saved"}{selectedSupplier.phone ? ` · ${selectedSupplier.phone}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="w-9 h-9 rounded-xl bg-surface-2 border border-border text-primary flex items-center justify-center hover:bg-white hover:text-black transition-all"
                  aria-label="Close supplier details"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[calc(88vh-73px)] space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-surface-2/70 p-4">
                    <p className="section-label mb-2">Total Bills</p>
                    <p className="text-xl font-black text-primary">{selectedSupplier.purchase_count || selectedSupplier.purchases?.length || 0}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/70 p-4">
                    <p className="section-label mb-2">Total Purchase</p>
                    <p className="text-xl font-black text-primary">{fmtINR(Number(selectedSupplier.total_payable || 0))}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/70 p-4">
                    <p className="section-label mb-2">Pending</p>
                    <p className="text-xl font-black text-yellow-400">{fmtINR(Number(selectedSupplier.outstanding_amount || 0))}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/70 p-4">
                    <p className="section-label mb-2">Last Bill</p>
                    <p className="text-sm font-bold text-primary">{fmtDate(selectedSupplier.last_purchase_date)}</p>
                  </div>
                </div>

                {(selectedSupplier.purchases || []).length === 0 ? (
                  <div className="rounded-xl border border-border bg-surface-2/50 p-8 text-center">
                    <FiFileText size={28} className="mx-auto text-muted opacity-50 mb-3" />
                    <p className="text-sm font-bold text-primary">No bill rows saved yet</p>
                    <p className="text-xs text-muted mt-1">Future scanned/manual purchases will show item, quantity, rate, GST and pending amount here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(selectedSupplier.purchases || []).map((purchase) => {
                      const items = purchase.items || [];
                      const total = Number(purchase.total_amount ?? purchase.amount ?? 0);
                      const paid = Number(purchase.paid_amount || 0);
                      const pending = Number(purchase.outstanding_amount ?? Math.max(total - paid, 0));
                      return (
                        <div key={String(purchase.id)} className="rounded-xl border border-border bg-surface-2/45 overflow-hidden">
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 border-b border-border">
                            <div>
                              <p className="text-2xs text-muted">Bill No.</p>
                              <p className="text-sm font-bold text-primary">{purchase.bill_number || `#${purchase.id}`}</p>
                            </div>
                            <div>
                              <p className="text-2xs text-muted">Date</p>
                              <p className="text-sm font-bold text-primary">{fmtDate(purchase.purchase_date)}</p>
                            </div>
                            <div>
                              <p className="text-2xs text-muted">Total</p>
                              <p className="text-sm font-bold text-primary">{fmtINR(total)}</p>
                            </div>
                            <div>
                              <p className="text-2xs text-muted">Paid</p>
                              <p className="text-sm font-bold text-success">{fmtINR(paid)}</p>
                            </div>
                            <div>
                              <p className="text-2xs text-muted">Pending</p>
                              <p className="text-sm font-bold text-yellow-400">{fmtINR(pending)}</p>
                            </div>
                          </div>

                          {items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-black/20 text-muted">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-semibold">Item</th>
                                    <th className="text-left px-4 py-2 font-semibold">HSN</th>
                                    <th className="text-right px-4 py-2 font-semibold">Qty</th>
                                    <th className="text-right px-4 py-2 font-semibold">Rate</th>
                                    <th className="text-right px-4 py-2 font-semibold">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, idx) => {
                                    const qty = Number(item.qty ?? item.quantity ?? 0);
                                    const rate = Number(item.rate ?? item.price ?? 0);
                                    const amount = Number(item.amount || qty * rate || 0);
                                    return (
                                      <tr key={`${purchase.id}-${idx}`} className="border-t border-border/60">
                                        <td className="px-4 py-2 text-primary font-medium">{item.description || item.name || "Item"}</td>
                                        <td className="px-4 py-2 text-muted">{item.hsn_sac || item.hsn || "—"}</td>
                                        <td className="px-4 py-2 text-right text-secondary">{qty} {item.unit || ""}</td>
                                        <td className="px-4 py-2 text-right text-secondary">{fmtINR(rate)}</td>
                                        <td className="px-4 py-2 text-right text-primary font-bold">{fmtINR(amount)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-4 py-4 text-xs text-muted">No item rows saved for this bill.</div>
                          )}

                          <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-border text-2xs text-secondary">
                            {purchase.gst_amount ? <span>GST: {fmtINR(Number(purchase.gst_amount))}</span> : null}
                            {purchase.cgst_amount ? <span>CGST: {fmtINR(Number(purchase.cgst_amount))}</span> : null}
                            {purchase.sgst_amount ? <span>SGST: {fmtINR(Number(purchase.sgst_amount))}</span> : null}
                            {purchase.igst_amount ? <span>IGST: {fmtINR(Number(purchase.igst_amount))}</span> : null}
                            {purchase.status ? <span>Status: {purchase.status}</span> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

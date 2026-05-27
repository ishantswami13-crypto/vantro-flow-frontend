"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { FiPackage, FiAlertTriangle, FiTrendingUp, FiPlus, FiSearch, FiTruck, FiBox, FiX } from "react-icons/fi";
import { api, getUser, getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Product = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  current_stock: number;
  low_stock_alert: number;
  unit_price: number;
  unit: string;
};

type Movement = {
  id: string;
  product_name?: string;
  movement_type?: string;
  type?: string;
  quantity?: number;
  qty?: number;
  reference?: string;
  ref?: string;
  moved_at?: string;
  created_at?: string;
};

type Summary = {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
};

const emptyForm = {
  name: "", sku: "", category: "", unit: "pcs",
  unit_price: "", current_stock: "", low_stock_alert: "10",
};

function getStatus(p: Product): "ok" | "low" | "critical" {
  if (p.current_stock === 0) return "critical";
  if (p.current_stock <= p.low_stock_alert) return "low";
  return "ok";
}

const STATUS_BADGE: Record<string, "success" | "warning" | "danger"> = {
  ok: "success", low: "warning", critical: "danger",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return `Today ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function InventoryPage() {
  const [tab, setTab]         = useState<"products" | "movements" | "suppliers">("products");
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts]   = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary]     = useState<Summary>({ total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 });

  // Add product modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState("");

  const load = () => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    api.inventory(user.id)
      .then(d => {
        setProducts(d.products || []);
        setMovements(d.movements || []);
        setSummary(d.summary || { total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveProduct = async () => {
    if (!form.name.trim()) { setFormError("Product name is required"); return; }
    const user = getUser();
    if (!user?.id) return;
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:         user.id,
          name:            form.name.trim(),
          sku:             form.sku.trim() || null,
          category:        form.category.trim() || null,
          unit:            form.unit || "pcs",
          unit_price:      parseFloat(form.unit_price) || 0,
          current_stock:   parseInt(form.current_stock) || 0,
          low_stock_alert: parseInt(form.low_stock_alert) || 10,
        }),
      });
      if (!r.ok) { setFormError("Failed to save. Try again."); return; }
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch {
      setFormError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const fmtVal = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}k`;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pb-24">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Inventory</h1>
            <p className="text-sm text-muted mt-0.5">Products, stock levels &amp; movements</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setForm(emptyForm); setFormError(""); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: "#fff", color: "#000" }}
          >
            <FiPlus size={13} /> Add Product
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            [0,1,2,3].map(i => (
              <div key={i} className="card-metric p-5 animate-pulse">
                <div className="h-3 w-20 bg-surface-3 rounded mb-4" />
                <div className="h-7 w-12 bg-surface-3 rounded" />
              </div>
            ))
          ) : [
            { label: "Total Products",   value: summary.total_products.toString(),    icon: <FiPackage size={15}/>,      color: "#0066FF" },
            { label: "Stock Value",      value: fmtVal(summary.total_value),          icon: <FiTrendingUp size={15}/>,   color: "#10D98A" },
            { label: "Low Stock",        value: summary.low_stock_count.toString(),   icon: <FiAlertTriangle size={15}/>,color: "#F5A524" },
            { label: "Out of Stock",     value: summary.out_of_stock_count.toString(),icon: <FiBox size={15}/>,          color: "#F5424D" },
          ].map(k => (
            <div key={k.label} className="card-metric p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">{k.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
              </div>
              <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
          {(["products", "movements", "suppliers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={["px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                tab === t ? "bg-white text-black" : "text-muted hover:text-primary",
              ].join(" ")}>{t}</button>
          ))}
        </div>

        {/* Products Tab */}
        {tab === "products" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-xs">
                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-surface-2 rounded-xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <FiPackage size={22} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
                <p className="text-sm font-semibold text-primary mb-1">No products yet</p>
                <p className="text-xs text-muted mb-4">Add your first product to start tracking stock</p>
                <button onClick={() => { setShowAdd(true); setForm(emptyForm); setFormError(""); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "#fff", color: "#000" }}>
                  <FiPlus size={12} /> Add Product
                </button>
              </div>
            ) : (
              <table className="w-full table-premium">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-3 section-label">Product</th>
                    <th className="px-4 py-3 section-label hidden md:table-cell">SKU</th>
                    <th className="px-4 py-3 section-label hidden md:table-cell">Category</th>
                    <th className="px-4 py-3 section-label text-right">Stock</th>
                    <th className="px-4 py-3 section-label text-right hidden sm:table-cell">Value</th>
                    <th className="px-4 py-3 section-label">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map(p => {
                    const status = getStatus(p);
                    return (
                      <tr key={p.id} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-primary">{p.name}</td>
                        <td className="px-4 py-3 text-xs font-mono text-muted hidden md:table-cell">{p.sku || "—"}</td>
                        <td className="px-4 py-3 text-xs text-secondary hidden md:table-cell">{p.category || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={["text-sm font-bold",
                            status === "critical" ? "text-danger" : status === "low" ? "text-warning" : "text-primary",
                          ].join(" ")}>{p.current_stock}</span>
                          <span className="text-2xs text-muted ml-1">{p.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-primary text-right font-mono hidden sm:table-cell">
                          {fmtVal(p.current_stock * p.unit_price)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_BADGE[status]}>
                            {status === "critical" ? "Critical" : status === "low" ? "Low Stock" : "In Stock"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Movements Tab */}
        {tab === "movements" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-primary">Recent Stock Movements</p>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-surface-2 rounded-xl animate-pulse" />)}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <FiTrendingUp size={22} style={{ color: "rgba(255,255,255,0.2)" }} />
                </div>
                <p className="text-sm font-semibold text-primary mb-1">No movements yet</p>
                <p className="text-xs text-muted">Stock movements will appear here as you record purchases and sales</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {movements.map((m, i) => {
                  const isIn = (m.movement_type || m.type || "").toLowerCase() === "in";
                  return (
                    <div key={m.id || i} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/50 transition-colors">
                      <div className={["w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                        isIn ? "bg-success-dim text-success" : "bg-danger-dim text-danger",
                      ].join(" ")}>{isIn ? "IN" : "OUT"}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">{m.product_name || "—"}</p>
                        <p className="text-2xs text-muted">{m.reference || m.ref || "—"} · {fmtDate(m.moved_at || m.created_at)}</p>
                      </div>
                      <span className={["text-sm font-bold font-mono",
                        isIn ? "text-success" : "text-danger",
                      ].join(" ")}>{isIn ? "+" : "-"}{m.quantity || m.qty || 0} units</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Suppliers Tab */}
        {tab === "suppliers" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">Suppliers</p>
            </div>
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <FiTruck size={22} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
              <p className="text-sm font-semibold text-primary mb-1">No suppliers yet</p>
              <p className="text-xs text-muted">Add your suppliers to track payment terms and contacts</p>
            </div>
          </div>
        )}

      </div>

      {/* ── Add Product Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="font-bold text-primary text-base">Add Product</p>
              <button onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-lg"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                <FiX size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Product Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cotton Fabric 40s"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">SKU / Code</label>
                  <input
                    value={form.sku}
                    onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="e.g. CF-001"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Category</label>
                  <input
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Fabric"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Unit Price (₹)</label>
                  <input
                    type="number"
                    value={form.unit_price}
                    onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  >
                    <option value="pcs">Piece (pcs)</option>
                    <option value="set">Set</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gm">Gram (gm)</option>
                    <option value="mtr">Metre (mtr)</option>
                    <option value="litre">Litre</option>
                    <option value="ml">Millilitre (ml)</option>
                    <option value="box">Box</option>
                    <option value="bag">Bag</option>
                    <option value="bundle">Bundle</option>
                    <option value="dozen">Dozen</option>
                    <option value="roll">Roll</option>
                    <option value="pair">Pair</option>
                    <option value="sqft">Sq. Ft</option>
                    <option value="sqmtr">Sq. Metre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={form.current_stock}
                    onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    value={form.low_stock_alert}
                    onChange={e => setForm(f => ({ ...f, low_stock_alert: e.target.value }))}
                    placeholder="10"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-danger">{formError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={saveProduct} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: saving ? "rgba(255,255,255,0.3)" : "#fff", color: "#000" }}>
                {saving ? "Saving…" : "Add Product"}
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

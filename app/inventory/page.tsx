"use client";

import { useMemo, useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { FiPackage, FiAlertTriangle, FiTrendingUp, FiPlus, FiSearch, FiTruck, FiBox, FiX } from "react-icons/fi";
import { api, getUser, getToken } from "@/lib/api";
import {
  buildProductLedgerRows,
  formatQuantity,
  matchProductQuery,
  normalizeProductName,
  type ProductLedgerRow,
  sortByDateDesc,
} from "@/lib/productLedger";

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

type ItemLine = {
  description?: string;
  name?: string;
  product_name?: string;
  item_name?: string;
  qty?: number | string;
  quantity?: number | string;
  unit?: string;
  price?: number | string;
  rate?: number | string;
  unit_price?: number | string;
  amount?: number | string;
  total?: number | string;
  total_amount?: number | string;
};

type InventorySale = {
  id: number;
  customer_name: string;
  invoice_number?: string;
  sale_date?: string;
  notes?: string;
  items?: ItemLine[] | null;
};

type InventoryPurchase = {
  id: number;
  supplier_name: string;
  bill_number?: string;
  purchase_date?: string;
  notes?: string;
  items?: ItemLine[] | null;
};

type Summary = {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  fast_moving_items?: { product_id: string; name: string; sku?: string; unit: string; quantity_sold_30d: number; value_sold_30d: number }[];
  dead_stock_items?: { id: string; name: string; sku?: string; current_stock: number; unit: string }[];
  reorder_suggestions?: { product_id: string; name: string; sku?: string; current_stock: number; low_stock_alert: number; unit: string; recommended_reorder_qty: number; estimated_cost: number }[];
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
  const [tab, setTab]         = useState<"products" | "intelligence" | "movements" | "suppliers">("products");
  const [search, setSearch]   = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts]   = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productRows, setProductRows] = useState<ProductLedgerRow[]>([]);
  const [summary, setSummary]     = useState<Summary>({ total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 });

  // Add product modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    try {
      const [inventoryData, salesData, purchasesData] = await Promise.all([
        api.inventory(user.id).catch(() => ({ products: [], movements: [], summary: { total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 } })),
        api.sales.list().catch(() => ({ sales: [] })),
        api.purchases.list().catch(() => ({ purchases: [] })),
      ]);

      setProducts(inventoryData.products || []);
      setMovements(inventoryData.movements || []);
      setSummary(inventoryData.summary || { total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 });

      const sales = (salesData.sales || []) as InventorySale[];
      const purchases = (purchasesData.purchases || []) as InventoryPurchase[];
      const saleRows = buildProductLedgerRows(sales, {
        source: "sale",
        date: (sale) => sale.sale_date,
        partyName: (sale) => sale.customer_name,
        documentNo: (sale) => sale.invoice_number,
        recordId: (sale) => sale.id,
        items: (sale) => sale.items,
        notes: (sale) => sale.notes,
      });
      const purchaseRows = buildProductLedgerRows(purchases, {
        source: "purchase",
        date: (purchase) => purchase.purchase_date,
        partyName: (purchase) => purchase.supplier_name,
        documentNo: (purchase) => purchase.bill_number,
        recordId: (purchase) => purchase.id,
        items: (purchase) => purchase.items,
        notes: (purchase) => purchase.notes,
      });
      setProductRows([...purchaseRows, ...saleRows]);
    } finally {
      setLoading(false);
    }
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

  const productInsights = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      unit?: string;
      boughtQty: number;
      soldQty: number;
      boughtAmount: number;
      soldAmount: number;
      lastBought?: string;
      lastSold?: string;
      currentStock?: number;
      reorderLevel?: number;
    }>();

    productRows.forEach((row) => {
      const current = map.get(row.productKey) || {
        productName: row.productName,
        unit: row.unit,
        boughtQty: 0,
        soldQty: 0,
        boughtAmount: 0,
        soldAmount: 0,
      };
      if (row.source === "purchase") {
        current.boughtQty += row.quantity;
        current.boughtAmount += row.amount || 0;
        if (row.date && (!current.lastBought || Date.parse(row.date) > Date.parse(current.lastBought))) current.lastBought = row.date;
      } else {
        current.soldQty += row.quantity;
        current.soldAmount += row.amount || 0;
        if (row.date && (!current.lastSold || Date.parse(row.date) > Date.parse(current.lastSold))) current.lastSold = row.date;
      }
      map.set(row.productKey, current);
    });

    products.forEach((product) => {
      const key = normalizeProductName(product.name);
      const current = map.get(key) || {
        productName: product.name,
        unit: product.unit,
        boughtQty: 0,
        soldQty: 0,
        boughtAmount: 0,
        soldAmount: 0,
      };
      current.unit = current.unit || product.unit;
      current.currentStock = product.current_stock;
      current.reorderLevel = product.low_stock_alert;
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) =>
      (b.boughtQty + b.soldQty + (b.currentStock || 0)) - (a.boughtQty + a.soldQty + (a.currentStock || 0))
    );
  }, [productRows, products]);

  const intelligenceRows = useMemo(() => {
    const q = inventoryQuery.trim();
    if (!q) return productInsights;
    const normalized = normalizeProductName(q);
    return productInsights.filter(row => normalizeProductName(row.productName).includes(normalized));
  }, [productInsights, inventoryQuery]);

  const ledgerAllMatches = useMemo(() =>
    sortByDateDesc(productRows.filter(row => matchProductQuery(row, inventoryQuery))),
    [productRows, inventoryQuery]
  );
  const ledgerMatches = ledgerAllMatches.slice(0, 10);

  const queryBought = ledgerAllMatches.filter(row => row.source === "purchase").reduce((sum, row) => sum + row.quantity, 0);
  const querySold = ledgerAllMatches.filter(row => row.source === "sale").reduce((sum, row) => sum + row.quantity, 0);
  const queryUnit = ledgerAllMatches.find(row => row.unit)?.unit;

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
          {(["products", "intelligence", "movements", "suppliers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={["px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                tab === t ? "bg-white text-black" : "text-muted hover:text-primary",
              ].join(" ")}>{t}</button>
          ))}
        </div>

        {/* Intelligence Tab */}
        {tab === "intelligence" && (
          <div className="space-y-4">
            {/* Advanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reorder suggestions card */}
              <div className="card-premium p-4">
                <p className="text-xs font-bold text-warning uppercase tracking-wider mb-2">🛒 Reorder Suggestions</p>
                {summary.reorder_suggestions && summary.reorder_suggestions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border/30">
                    {summary.reorder_suggestions.map(item => (
                      <div key={item.product_id} className="flex justify-between items-center text-xs py-1.5 first:pt-0">
                        <div>
                          <p className="font-semibold text-primary">{item.name}</p>
                          <p className="text-2xs text-muted">Stock: {item.current_stock} {item.unit} (Alert: {item.low_stock_alert})</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="warning">Order +{item.recommended_reorder_qty}</Badge>
                          <p className="text-2xs text-muted mt-0.5">Est: ₹{item.estimated_cost.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">No low stock items. All healthy! ✓</p>
                )}
              </div>

              {/* Fast moving items card */}
              <div className="card-premium p-4">
                <p className="text-xs font-bold text-success uppercase tracking-wider mb-2">🔥 Fast Moving (30d)</p>
                {summary.fast_moving_items && summary.fast_moving_items.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border/30">
                    {summary.fast_moving_items.map(item => (
                      <div key={item.product_id} className="flex justify-between items-center text-xs py-1.5 first:pt-0">
                        <div>
                          <p className="font-semibold text-primary">{item.name}</p>
                          <p className="text-2xs text-muted">{item.quantity_sold_30d} {item.unit} sold</p>
                        </div>
                        <span className="font-bold text-success">₹{(item.value_sold_30d / 1000).toFixed(0)}K</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">No sales movements registered in last 30 days.</p>
                )}
              </div>

              {/* Dead stock items card */}
              <div className="card-premium p-4">
                <p className="text-xs font-bold text-danger uppercase tracking-wider mb-2">💀 Dead Stock (&gt;60d)</p>
                {summary.dead_stock_items && summary.dead_stock_items.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-border/30">
                    {summary.dead_stock_items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs py-1.5 first:pt-0">
                        <div>
                          <p className="font-semibold text-primary">{item.name}</p>
                          <p className="text-2xs text-muted">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <span className="font-bold text-danger">{item.current_stock} {item.unit} idle</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted py-4 text-center">All stock has active movements! ✓</p>
                )}
              </div>
            </div>

            <div className="card-premium p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-primary">Product Buy/Sell Finder</p>
                  <p className="text-xs text-muted mt-0.5">Search any product to see bought qty, sold qty, dates and parties.</p>
                </div>
                <div className="relative w-full lg:w-80">
                  <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={inventoryQuery}
                    onChange={e => setInventoryQuery(e.target.value)}
                    placeholder="Search A2C machine..."
                    className="w-full pl-8 pr-3 py-2.5 bg-surface-2 border border-border rounded-xl text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <p className="text-2xs text-muted">Bought</p>
                  <p className="text-sm font-bold text-success">{formatQuantity(queryBought, queryUnit)}</p>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <p className="text-2xs text-muted">Sold</p>
                  <p className="text-sm font-bold text-danger">{formatQuantity(querySold, queryUnit)}</p>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <p className="text-2xs text-muted">Ledger Balance</p>
                  <p className="text-sm font-bold text-accent">{formatQuantity(queryBought - querySold, queryUnit)}</p>
                </div>
              </div>

              {ledgerMatches.length > 0 ? (
                <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                  {ledgerMatches.map((row, index) => (
                    <div key={`${row.source}-${row.recordId}-${row.productName}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary truncate">{row.productName}</p>
                        <p className="text-2xs text-muted truncate">{row.partyName || "Party"} · {row.documentNo || "No doc"} · {fmtDate(row.date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${row.source === "purchase" ? "text-success" : "text-danger"}`}>
                          {row.source === "purchase" ? "+" : "-"}{formatQuantity(row.quantity, row.unit)}
                        </p>
                        <p className="text-2xs text-muted capitalize">{row.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <FiPackage size={24} className="mx-auto mb-2 text-muted opacity-40" />
                  <p className="text-sm font-semibold text-primary">No item history yet</p>
                  <p className="text-xs text-muted mt-1">Scan purchase bills and sales invoices with item rows to build history.</p>
                </div>
              )}
            </div>

            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-semibold text-primary">Advanced Inventory Intelligence</p>
                <p className="text-xs text-muted mt-0.5">Bought minus sold, linked with manual stock where available.</p>
              </div>
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-surface-2 rounded-xl animate-pulse" />)}
                </div>
              ) : intelligenceRows.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <p className="text-sm font-semibold text-primary">No product intelligence yet</p>
                  <p className="text-xs text-muted mt-1">Add products or scan bills/invoices to populate this.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {intelligenceRows.slice(0, 20).map(row => {
                    const ledgerStock = row.boughtQty - row.soldQty;
                    const displayStock = row.currentStock ?? ledgerStock;
                    const lowStock = row.currentStock !== undefined
                      ? displayStock <= (row.reorderLevel || 0)
                      : displayStock <= 0;
                    return (
                      <div key={row.productName} className="px-4 py-3 hover:bg-surface-2/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-primary truncate">{row.productName}</p>
                            <p className="text-2xs text-muted mt-0.5">
                              Last buy: {fmtDate(row.lastBought)} · Last sale: {fmtDate(row.lastSold)}
                            </p>
                          </div>
                          <Badge variant={lowStock ? "warning" : "success"}>
                            {lowStock ? "Reorder Check" : "Healthy"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-lg bg-surface-2/70 p-2">
                            <p className="text-2xs text-muted">Bought</p>
                            <p className="text-xs font-bold text-success">{formatQuantity(row.boughtQty, row.unit)}</p>
                          </div>
                          <div className="rounded-lg bg-surface-2/70 p-2">
                            <p className="text-2xs text-muted">Sold</p>
                            <p className="text-xs font-bold text-danger">{formatQuantity(row.soldQty, row.unit)}</p>
                          </div>
                          <div className="rounded-lg bg-surface-2/70 p-2">
                            <p className="text-2xs text-muted">{row.currentStock !== undefined ? "Current Stock" : "Est. Stock"}</p>
                            <p className="text-xs font-bold text-accent">{formatQuantity(displayStock, row.unit)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

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

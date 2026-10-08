"use client";

// Inventory: stock on hand (GET /api/inventory), what needs reordering,
// what's moving, and a buy/sell history built from scanned sales and
// purchase bills (lib/productLedger).

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, authHeaders } from "@/lib/api";
import {
  buildProductLedgerRows,
  formatQuantity,
  matchProductQuery,
  normalizeProductName,
  type ProductLedgerRow,
  sortByDateDesc,
} from "@/lib/productLedger";
import { inrWhole, inrShort, formatDate, formatRelative, formatCount } from "@/lib/format";
import { PageHeader, Subnav, SearchField, SkeletonRows } from "@/components/v32/ui";
import { IconBox, IconPlus } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { MorePage, FigureRow, GridTable, Panel, Field, OFFLINE_TEXT, moreStyles as s, type Column } from "@/components/more/ui";

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
  description?: string; name?: string; product_name?: string; item_name?: string;
  qty?: number | string; quantity?: number | string; unit?: string;
  price?: number | string; rate?: number | string; unit_price?: number | string;
  amount?: number | string; total?: number | string; total_amount?: number | string;
};

type InventorySale = { id: number; customer_name: string; invoice_number?: string; sale_date?: string; notes?: string; items?: ItemLine[] | null };
type InventoryPurchase = { id: number; supplier_name: string; bill_number?: string; purchase_date?: string; notes?: string; items?: ItemLine[] | null };

type Summary = {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  fast_moving_items?: { product_id: string; name: string; sku?: string; unit: string; quantity_sold_30d: number; value_sold_30d: number }[];
  dead_stock_items?: { id: string; name: string; sku?: string; current_stock: number; unit: string }[];
  reorder_suggestions?: { product_id: string; name: string; sku?: string; current_stock: number; low_stock_alert: number; unit: string; recommended_reorder_qty: number; estimated_cost: number }[];
};

type Insight = {
  productName: string; unit?: string; boughtQty: number; soldQty: number; boughtAmount: number; soldAmount: number;
  lastBought?: string; lastSold?: string; currentStock?: number; reorderLevel?: number;
};

const emptyForm = { name: "", sku: "", category: "", unit: "pcs", unit_price: "", current_stock: "", low_stock_alert: "10" };
const EMPTY_SUMMARY: Summary = { total_products: 0, total_value: 0, low_stock_count: 0, out_of_stock_count: 0 };

function stockStatus(p: Product): { label: string; tone: StatusTone } {
  if (p.current_stock === 0) return { label: "Out of stock", tone: "critical" };
  if (p.current_stock <= p.low_stock_alert) return { label: "Low", tone: "attention" };
  return { label: "In stock", tone: "neutral" };
}

type Tab = "products" | "details" | "movements" | "suppliers";

export default function InventoryPage() {
  const notify = useToast();
  const [tab, setTab]         = useState<Tab>("products");
  const [search, setSearch]   = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [products, setProducts]   = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productRows, setProductRows] = useState<ProductLedgerRow[]>([]);
  const [summary, setSummary]     = useState<Summary>(EMPTY_SUMMARY);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    setError(false);
    try {
      const [inventoryData, salesData, purchasesData] = await Promise.all([
        api.inventory(user.id).catch(() => null),
        api.sales.list().catch(() => ({ sales: [] })),
        api.purchases.list().catch(() => ({ purchases: [] })),
      ]);
      if (!inventoryData) { setError(true); return; }

      setProducts((inventoryData.products || []) as Product[]);
      setMovements((inventoryData.movements || []) as Movement[]);
      setSummary((inventoryData.summary || EMPTY_SUMMARY) as Summary);

      const sales = (salesData.sales || []) as InventorySale[];
      const purchases = (purchasesData.purchases || []) as InventoryPurchase[];
      const saleRows = buildProductLedgerRows(sales, {
        source: "sale",
        date: sale => sale.sale_date,
        partyName: sale => sale.customer_name,
        documentNo: sale => sale.invoice_number,
        recordId: sale => sale.id,
        items: sale => sale.items,
        notes: sale => sale.notes,
      });
      const purchaseRows = buildProductLedgerRows(purchases, {
        source: "purchase",
        date: purchase => purchase.purchase_date,
        partyName: purchase => purchase.supplier_name,
        documentNo: purchase => purchase.bill_number,
        recordId: purchase => purchase.id,
        items: purchase => purchase.items,
        notes: purchase => purchase.notes,
      });
      setProductRows([...purchaseRows, ...saleRows]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setShowAdd(true); setForm(emptyForm); setFormError(""); };

  const saveProduct = async () => {
    if (!form.name.trim()) { setFormError("Enter a product name."); return; }
    const user = getUser();
    if (!user?.id) return;
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch(`${API}/api/products`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
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
      if (!r.ok) { setFormError("The product couldn't be saved. Try again."); return; }
      notify(`${form.name.trim()} added`, "positive");
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch {
      setFormError(OFFLINE_TEXT);
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const productInsights = useMemo(() => {
    const map = new Map<string, Insight>();
    productRows.forEach(row => {
      const current = map.get(row.productKey) || { productName: row.productName, unit: row.unit, boughtQty: 0, soldQty: 0, boughtAmount: 0, soldAmount: 0 };
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
    products.forEach(product => {
      const key = normalizeProductName(product.name);
      const current = map.get(key) || { productName: product.name, unit: product.unit, boughtQty: 0, soldQty: 0, boughtAmount: 0, soldAmount: 0 };
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

  // Where the stock value sits: the real value of each product on hand.
  const valueChart = useMemo(() => products
    .map(p => ({ name: p.name, value: Math.round(p.current_stock * p.unit_price) }))
    .filter(p => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6), [products]);

  const productCols: Column<Product>[] = [
    {
      key: "name", header: "Product", width: "minmax(0, 1.6fr)",
      render: p => (
        <div className="min-w-0">
          <div className={s.name} title={p.name}>{p.name}</div>
          <div className={s.sub}><span>{[p.sku, p.category].filter(Boolean).join(" · ") || "No SKU"}</span>{p.current_stock <= p.low_stock_alert && <span className={s.smOnly}><StatusChip tone={stockStatus(p).tone}>{stockStatus(p).label}</StatusChip></span>}</div>
        </div>
      ),
    },
    { key: "stock", header: "In stock", width: "120px", widthSm: "auto", align: "right", render: p => <span className={s.amount}>{formatCount(p.current_stock)} <span className={s.muted} style={{ fontFamily: "var(--font-sans)", fontSize: 12 }}>{p.unit}</span></span> },
    { key: "reorder", header: "Reorder at", width: "100px", align: "right", hide: "md", render: p => <span>{formatCount(p.low_stock_alert)}</span> },
    { key: "price", header: "Unit price", width: "110px", align: "right", hide: "md", render: p => <span>{inrWhole(p.unit_price)}</span> },
    { key: "value", header: "Value", width: "120px", align: "right", hide: "sm", render: p => <span className={s.amount}>{inrWhole(p.current_stock * p.unit_price)}</span> },
    { key: "status", header: "Status", width: "104px", hide: "sm", render: p => { const st = stockStatus(p); return <StatusChip tone={st.tone} className="chip-quiet">{st.label}</StatusChip>; } },
  ];

  const insightCols: Column<Insight>[] = [
    {
      key: "name", header: "Product", width: "minmax(0, 1.6fr)",
      render: r => (
        <div className="min-w-0">
          <div className={s.name} title={r.productName}>{r.productName}</div>
          <div className={s.sub}><span>Bought {r.lastBought ? formatDate(r.lastBought) : "never"} · Sold {r.lastSold ? formatDate(r.lastSold) : "never"}</span></div>
        </div>
      ),
    },
    { key: "bought", header: "Bought", width: "110px", align: "right", hide: "md", render: r => <span>{formatQuantity(r.boughtQty, r.unit)}</span> },
    { key: "sold", header: "Sold", width: "110px", align: "right", hide: "md", render: r => <span>{formatQuantity(r.soldQty, r.unit)}</span> },
    {
      key: "stock", header: "Stock", width: "120px", widthSm: "auto", align: "right",
      render: r => <span className={s.amount} title={r.currentStock !== undefined ? "Recorded stock" : "Estimated from bought minus sold"}>{formatQuantity(r.currentStock ?? (r.boughtQty - r.soldQty), r.unit)}{r.currentStock === undefined && <span className={s.muted}> est.</span>}</span>,
    },
    {
      key: "status", header: "Status", width: "112px", hide: "sm",
      render: r => {
        const stock = r.currentStock ?? (r.boughtQty - r.soldQty);
        const low = r.currentStock !== undefined ? stock <= (r.reorderLevel || 0) : stock <= 0;
        return <StatusChip tone={low ? "attention" : "positive"}>{low ? "Check reorder" : "Healthy"}</StatusChip>;
      },
    },
  ];

  const movementCols: Column<Movement>[] = [
    {
      key: "product", header: "Product", width: "minmax(0, 1.6fr)",
      render: m => (
        <div className="min-w-0">
          <div className={s.name}>{m.product_name || "Unnamed product"}</div>
          <div className={s.sub}><span>{m.reference || m.ref || "No reference"}</span></div>
        </div>
      ),
    },
    { key: "dir", header: "Direction", width: "100px", hide: "sm", render: m => { const isIn = (m.movement_type || m.type || "").toLowerCase() === "in"; return <StatusChip tone={isIn ? "positive" : "neutral"} className="chip-quiet">{isIn ? "Stock in" : "Stock out"}</StatusChip>; } },
    { key: "when", header: "When", width: "110px", hide: "md", render: m => <span>{formatRelative(m.moved_at || m.created_at) || "—"}</span> },
    {
      key: "qty", header: "Quantity", width: "110px", widthSm: "auto", align: "right",
      render: m => { const isIn = (m.movement_type || m.type || "").toLowerCase() === "in"; return <span className={s.amount}>{isIn ? "+" : "−"}{formatCount(m.quantity || m.qty || 0)}</span>; },
    },
  ];

  const listRow = (key: string, left: React.ReactNode, sub: React.ReactNode, right: React.ReactNode, rightSub?: React.ReactNode) => (
    <div key={key} className="flex items-center justify-between" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
      <div className="min-w-0">
        <div className={s.name}>{left}</div>
        <div className={s.sub}><span>{sub}</span></div>
      </div>
      <div className="text-right shrink-0">
        <div className={s.amount}>{right}</div>
        {rightSub && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{rightSub}</div>}
      </div>
    </div>
  );

  return (
    <DashboardLayout pageTitle="Inventory">
      <MorePage>
        <PageHeader
          title="Inventory"
          subtitle="Stock on hand, what's running low and what moved."
          right={<Button variant="primary" icon={<IconPlus size={14} />} onClick={openAdd}>Add product</Button>}
        >
          <div style={{ marginTop: 18 }}>
            <Subnav label="Inventory sections" active={tab} onChange={k => setTab(k as Tab)} items={[
              { key: "products", label: "Products", count: loading || error ? null : products.length },
              { key: "details", label: "Stock details" },
              { key: "movements", label: "Movements", count: loading || error ? null : movements.length },
              { key: "suppliers", label: "Suppliers" },
            ]} />
          </div>
        </PageHeader>

        {loading && <div className={s.panel}><SkeletonRows rows={6} height={50} /></div>}

        {!loading && error && (
          <div className={s.panel}><ErrorState title="Couldn't load your inventory" message={OFFLINE_TEXT} onRetry={load} /></div>
        )}

        {!loading && !error && (
          <>
            {(tab === "products" || tab === "details") && products.length > 0 && (
              <FigureRow lead={1} items={[
                { label: "Products", value: formatCount(summary.total_products), note: "Tracked items" },
                { label: "Stock value", value: inrWhole(summary.total_value), note: "At unit price" },
                { label: "Running low", value: formatCount(summary.low_stock_count), note: "At or below reorder level" },
                { label: "Out of stock", value: formatCount(summary.out_of_stock_count), note: summary.out_of_stock_count ? "Can't be sold today" : "None", tone: summary.out_of_stock_count > 0 ? "var(--critical)" : undefined },
              ]} />
            )}

            {tab === "products" && (
              products.length === 0 ? (
                <div className={s.panel}>
                  <EmptyState icon={<IconBox size={17} />} title="No products yet" message="Add your first product to track stock, or scan purchase bills and they'll build your stock history."
                    action={<Button variant="primary" icon={<IconPlus size={14} />} onClick={openAdd}>Add product</Button>} />
                </div>
              ) : (
                <>
                  <div className={s.toolbar}>
                    <SearchField id="product-search" value={search} onChange={setSearch} placeholder="Search name or SKU" />
                  </div>
                  <div className={s.panel}>
                    {filtered.length > 0
                      ? <GridTable label="Products" columns={productCols} rows={filtered} rowKey={p => p.id} />
                      : <EmptyState title="No products match" message={`Nothing matches “${search}”.`} action={<Button variant="secondary" size="sm" onClick={() => setSearch("")}>Clear search</Button>} />}
                  </div>
                </>
              )
            )}

            {tab === "details" && (
              <>
                <div className={s.split}>
                  <Panel title="Reorder soon" sub="Below the alert level you set">
                    {summary.reorder_suggestions?.length
                      ? summary.reorder_suggestions.map(it => listRow(it.product_id, it.name, `${formatCount(it.current_stock)} ${it.unit} left · alert at ${formatCount(it.low_stock_alert)}`, `+${formatCount(it.recommended_reorder_qty)}`, `about ${inrWhole(it.estimated_cost)}`))
                      : <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)" }}>Nothing is below its reorder level.</p>}
                  </Panel>
                  <Panel title="Selling fast" sub="Most sold in the last 30 days">
                    {summary.fast_moving_items?.length
                      ? summary.fast_moving_items.map(it => listRow(it.product_id, it.name, `${formatCount(it.quantity_sold_30d)} ${it.unit} sold`, inrWhole(it.value_sold_30d)))
                      : <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)" }}>No sales recorded in the last 30 days.</p>}
                  </Panel>
                  <Panel title="Not moving" sub="No movement in over 60 days">
                    {summary.dead_stock_items?.length
                      ? summary.dead_stock_items.map(it => listRow(it.id, it.name, it.sku || "No SKU", `${formatCount(it.current_stock)} ${it.unit}`, "idle"))
                      : <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)" }}>Everything has moved in the last 60 days.</p>}
                  </Panel>
                </div>

                {valueChart.length > 1 && (
                  <Panel title="Where your stock value sits" sub="Value on hand by product, at unit price" flush>
                    <div className={s.chartWrap}>
                      <ResponsiveContainer width="100%" height={Math.max(160, valueChart.length * 40)}>
                        <BarChart data={valueChart} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }} barCategoryGap={10}>
                          <CartesianGrid stroke="var(--line)" horizontal={false} />
                          <XAxis type="number" tickFormatter={inrShort} tick={{ fill: "var(--ink-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={150} tick={{ fill: "var(--ink-2)", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: "var(--hover)" }} content={({ active, payload }) => active && payload?.length ? (
                            <div className={s.tooltip}><div style={{ color: "var(--ink)" }}>{payload[0].payload.name}</div><div className={s.tooltipRow}><span>Value</span><b>{inrWhole(Number(payload[0].value))}</b></div></div>
                          ) : null} />
                          <Bar dataKey="value" fill="var(--ink-2)" fillOpacity={0.55} radius={[0, 4, 4, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                )}

                <Panel title="Product buy and sell history" sub="Search a product to see what you bought, what you sold, and from whom."
                  right={<div style={{ width: "min(320px, 100%)" }}><SearchField id="ledger-search" value={inventoryQuery} onChange={setInventoryQuery} placeholder="Search a product" /></div>}>
                  <dl className={s.kv} style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginBottom: 8 }}>
                    {[
                      { label: "Bought", value: formatQuantity(queryBought, queryUnit) },
                      { label: "Sold", value: formatQuantity(querySold, queryUnit) },
                      { label: "Balance", value: formatQuantity(queryBought - querySold, queryUnit) },
                    ].map(k => (
                      <div key={k.label}><dt style={{ fontSize: 12, color: "var(--ink-3)" }}>{k.label}</dt><dd className="num" style={{ textAlign: "left", fontSize: 15, marginTop: 2 }}>{k.value}</dd></div>
                    ))}
                  </dl>
                  {ledgerMatches.length > 0
                    ? ledgerMatches.map((row, i) => listRow(
                        `${row.source}-${row.recordId}-${row.productName}-${i}`,
                        row.productName,
                        `${row.partyName || "Unknown party"} · ${row.documentNo || "No document"} · ${row.date ? formatDate(row.date) : "No date"}`,
                        `${row.source === "purchase" ? "+" : "−"}${formatQuantity(row.quantity, row.unit)}`,
                        row.source === "purchase" ? "Bought" : "Sold",
                      ))
                    : <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)" }}>No item history yet. Scan purchase bills and sales invoices with item rows to build it.</p>}
                </Panel>

                <div className={s.panel}>
                  {intelligenceRows.length > 0
                    ? <GridTable label="Stock details" columns={insightCols} rows={intelligenceRows.slice(0, 20)} rowKey={r => r.productName} />
                    : <EmptyState title="No stock details yet" message="Add products or scan bills and invoices to fill this in." />}
                </div>
              </>
            )}

            {tab === "movements" && (
              <div className={s.panel}>
                {movements.length > 0
                  ? <GridTable label="Stock movements" columns={movementCols} rows={movements} rowKey={(m, i) => m.id || `m-${i}`} />
                  : <EmptyState icon={<IconBox size={17} />} title="No movements yet" message="Stock in and out shows up here as you record purchases and sales." />}
              </div>
            )}

            {tab === "suppliers" && (
              <div className={s.panel}>
                <EmptyState title="Suppliers have their own page" message="Contacts, payment terms and what you owe each supplier live under Suppliers."
                  action={<Link href="/suppliers" className="ui-btn ui-btn-secondary">Open suppliers</Link>} />
              </div>
            )}
          </>
        )}
      </MorePage>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add product"
        description="Stock you track. The alert level decides when it shows as running low."
        width={480}
        footer={<>
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={saveProduct}>Add product</Button>
        </>}
      >
        <div className={s.form}>
          <Field label="Product name" htmlFor="p-name" required>
            <input id="p-name" data-autofocus className="ui-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cotton fabric 40s" />
          </Field>
          <div className={s.formGrid}>
            <Field label="SKU or code" htmlFor="p-sku">
              <input id="p-sku" className="ui-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="CF-001" />
            </Field>
            <Field label="Category" htmlFor="p-cat">
              <input id="p-cat" className="ui-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Fabric" />
            </Field>
            <Field label="Unit price (₹)" htmlFor="p-price">
              <input id="p-price" className="ui-input tabular" type="number" inputMode="decimal" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Unit" htmlFor="p-unit">
              <select id="p-unit" className="ui-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
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
                <option value="sqft">Sq. ft</option>
                <option value="sqmtr">Sq. metre</option>
              </select>
            </Field>
            <Field label="Current stock" htmlFor="p-stock">
              <input id="p-stock" className="ui-input tabular" type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Low stock alert at" htmlFor="p-alert">
              <input id="p-alert" className="ui-input tabular" type="number" value={form.low_stock_alert} onChange={e => setForm(f => ({ ...f, low_stock_alert: e.target.value }))} placeholder="10" />
            </Field>
          </div>
          {formError && <p className={s.formError} role="alert">{formError}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}

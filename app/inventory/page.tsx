"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiPackage, FiAlertTriangle, FiTrendingUp, FiPlus, FiSearch, FiTruck } from "react-icons/fi";

const products = [
  { id: 1, name: "Cotton Fabric Roll",    sku: "CFR-001", category: "Fabric",    stock: 45,  alert: 20, price: 850,   unit: "roll",  status: "ok" },
  { id: 2, name: "Polyester Thread",      sku: "PT-102",  category: "Thread",    stock: 8,   alert: 15, price: 120,   unit: "spool", status: "low" },
  { id: 3, name: "Steel Pipe 2\"",        sku: "SP-201",  category: "Steel",     stock: 120, alert: 50, price: 2400,  unit: "piece", status: "ok" },
  { id: 4, name: "Cement Bag 50kg",       sku: "CB-301",  category: "Building",  stock: 3,   alert: 25, price: 380,   unit: "bag",   status: "critical" },
  { id: 5, name: "Industrial Lubricant",  sku: "IL-401",  category: "Chemical",  stock: 32,  alert: 10, price: 650,   unit: "litre", status: "ok" },
  { id: 6, name: "Wiring Harness 10m",    sku: "WH-501",  category: "Electrical",stock: 18,  alert: 10, price: 1200,  unit: "piece", status: "ok" },
];

const movements = [
  { date: "Today 2:30 PM",   product: "Cotton Fabric Roll",   type: "in",    qty: 20, ref: "PO-2024-112" },
  { date: "Today 11:00 AM",  product: "Cement Bag 50kg",      type: "out",   qty: 15, ref: "SO-2024-089" },
  { date: "Yesterday",       product: "Polyester Thread",     type: "out",   qty: 12, ref: "SO-2024-088" },
  { date: "Yesterday",       product: "Steel Pipe 2\"",       type: "in",    qty: 50, ref: "PO-2024-110" },
  { date: "14 May",          product: "Industrial Lubricant", type: "in",    qty: 10, ref: "PO-2024-108" },
];

const suppliers = [
  { name: "Ramesh Textile Suppliers",  phone: "9876543201", terms: "Net 30", category: "Fabric" },
  { name: "Agarwal Steel Depot",       phone: "9765432108", terms: "Net 15", category: "Steel" },
  { name: "Mumbai Building Supplies",  phone: "9654321097", terms: "Advance", category: "Building" },
  { name: "Chem Solutions Pvt Ltd",    phone: "9543210986", terms: "Net 45", category: "Chemical" },
];

const STATUS_BADGE: Record<string, "success" | "warning" | "danger"> = {
  ok: "success", low: "warning", critical: "danger",
};

export default function InventoryPage() {
  const [tab, setTab] = useState<"products" | "movements" | "suppliers">("products");
  const [search, setSearch] = useState("");

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowCount   = products.filter(p => p.status !== "ok").length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Inventory</h1>
            <p className="text-sm text-muted mt-0.5">Products, stock levels & supplier management</p>
          </div>
          <Button icon={<FiPlus size={14} />} size="sm">Add Product</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Products",   value: products.length.toString(), icon: <FiPackage size={16}/>,      color: "#0066FF" },
            { label: "Total Stock Value",value: `₹${(totalValue/100000).toFixed(1)}L`,icon: <FiTrendingUp size={16}/>, color: "#10D98A" },
            { label: "Low Stock Alerts", value: lowCount.toString(),         icon: <FiAlertTriangle size={16}/>,color: "#F5A524" },
            { label: "Suppliers",        value: suppliers.length.toString(), icon: <FiTruck size={16}/>,        color: "#9B6DFF" },
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
                tab === t ? "bg-accent text-white" : "text-muted hover:text-primary",
              ].join(" ")}>{t}</button>
          ))}
        </div>

        {/* Products Tab */}
        {tab === "products" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <table className="w-full table-premium">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 section-label">Product</th>
                  <th className="px-4 py-3 section-label">SKU</th>
                  <th className="px-4 py-3 section-label">Category</th>
                  <th className="px-4 py-3 section-label text-right">Stock</th>
                  <th className="px-4 py-3 section-label text-right">Value</th>
                  <th className="px-4 py-3 section-label">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-primary">{p.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted">{p.sku}</td>
                    <td className="px-4 py-3 text-xs text-secondary">{p.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={["text-sm font-bold",
                        p.status === "critical" ? "text-danger" : p.status === "low" ? "text-warning" : "text-primary",
                      ].join(" ")}>{p.stock}</span>
                      <span className="text-2xs text-muted ml-1">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-primary text-right font-mono">
                      ₹{(p.stock * p.price / 1000).toFixed(0)}k
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[p.status]}>
                        {p.status === "critical" ? "Critical" : p.status === "low" ? "Low Stock" : "In Stock"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Movements Tab */}
        {tab === "movements" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-primary">Recent Stock Movements</p>
            </div>
            <div className="divide-y divide-border/50">
              {movements.map((m, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/50 transition-colors">
                  <div className={["w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                    m.type === "in" ? "bg-success-dim text-success" : "bg-danger-dim text-danger",
                  ].join(" ")}>{m.type === "in" ? "IN" : "OUT"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{m.product}</p>
                    <p className="text-2xs text-muted">{m.ref} · {m.date}</p>
                  </div>
                  <span className={["text-sm font-bold font-mono",
                    m.type === "in" ? "text-success" : "text-danger",
                  ].join(" ")}>{m.type === "in" ? "+" : "-"}{m.qty} units</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {tab === "suppliers" && (
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">Suppliers</p>
              <Button variant="secondary" size="sm" icon={<FiPlus size={12}/>}>Add Supplier</Button>
            </div>
            <div className="divide-y divide-border/50">
              {suppliers.map((s, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                    {s.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{s.name}</p>
                    <p className="text-xs text-muted">{s.phone} · {s.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="default">{s.terms}</Badge>
                  </div>
                  <Button variant="whatsapp" size="xs"
                    onClick={() => window.open(`https://wa.me/91${s.phone}`)}>
                    WhatsApp
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiPhone, FiMapPin, FiClock, FiPackage,
  FiChevronDown, FiChevronUp, FiTrash2, FiMic,
  FiCheckCircle, FiTruck, FiAlertCircle, FiRefreshCw,
  FiUser, FiEdit2, FiXCircle,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; icon: any }> = {
  new:        { label: "New",        color: "text-brand-primary bg-brand-primary/10 border-brand-primary/20",  next: "confirmed",  icon: FiAlertCircle },
  confirmed:  { label: "Confirmed",  color: "text-warning bg-warning/10 border-warning/20",                    next: "dispatched", icon: FiCheckCircle },
  dispatched: { label: "Dispatched", color: "text-info bg-info/10 border-info/20",                             next: "delivered",  icon: FiTruck },
  delivered:  { label: "Delivered",  color: "text-success bg-success/10 border-success/20",                    next: "",           icon: FiCheckCircle },
  cancelled:  { label: "Cancelled",  color: "text-danger bg-danger/10 border-danger/20",                       next: "",           icon: FiXCircle },
};

const ROLES = ["delivery", "sales", "driver", "manager", "helper"];

interface OrderItem { name: string; local_name?: string; quantity: number; unit: string; }
interface Order {
  id: string; customer_name: string; customer_phone?: string;
  delivery_address?: string; items: OrderItem[];
  total_amount?: number; status: string; source: string;
  delivery_time?: string; special_instructions?: string;
  call_transcript?: string; created_at: string;
  workers?: { name: string; phone: string } | null;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtINR(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);

  // Add order form state
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", delivery_address: "",
    delivery_time: "", special_instructions: "", worker_id: "",
    rawItems: "1 bag cement, 2 CFT bajri",
  });

  const token = () => typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

  const load = async (d = date) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/orders?date=${d}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } finally { setLoading(false); }
  };

  const loadWorkers = async () => {
    const res = await fetch(`${API}/api/workers`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await res.json();
    setWorkers(d.workers || []);
  };

  useEffect(() => { load(); loadWorkers(); }, []);

  const changeStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status }),
    });
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x));
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await fetch(`${API}/api/orders/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setOrders(o => o.filter(x => x.id !== id));
  };

  const parseRawItems = (raw: string): OrderItem[] => {
    return raw.split(",").map(part => {
      const m = part.trim().match(/^([\d.]+)?\s*([a-zA-Z]+)?\s*(.+)?$/);
      return {
        quantity: parseFloat(m?.[1] || "1") || 1,
        unit: m?.[2] || "piece",
        name: (m?.[3] || part.trim()),
        local_name: part.trim(),
      };
    }).filter(i => i.name);
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseRawItems(form.rawItems);
    await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...form, items }),
    });
    setShowAdd(false);
    setForm({ customer_name: "", customer_phone: "", delivery_address: "", delivery_time: "", special_instructions: "", worker_id: "", rawItems: "" });
    load();
  };

  // Stats
  const total = orders.length;
  const delivered = orders.filter(o => o.status === "delivered").length;
  const pending = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const aiCalls = orders.filter(o => o.source === "ai_call").length;
  const totalValue = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  return (
    <DashboardLayout pageTitle="Today's Orders">
      {/* Date header + stats */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="date" value={date}
            onChange={e => { setDate(e.target.value); load(e.target.value); }}
            className="input-base text-sm px-3 py-1.5"
          />
          <button onClick={() => load(date)} className="p-2 rounded-xl hover:bg-surface-2 text-muted hover:text-primary transition-colors">
            <FiRefreshCw size={15} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="ml-auto btn-primary flex items-center gap-2 text-sm px-4 py-2">
            <FiPlus size={15} /> Add Order
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: total, sub: `${aiCalls} via AI call`, color: "text-brand-primary" },
            { label: "Pending",      value: pending, sub: "need action",          color: "text-warning" },
            { label: "Delivered",    value: delivered, sub: "completed today",    color: "text-success" },
            { label: "Order Value",  value: totalValue ? fmtINR(totalValue) : "—", sub: "today's total", color: "text-accent" },
          ].map(s => (
            <div key={s.label} className="card-base p-4">
              <p className="text-2xs text-muted mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-2xs text-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted">
          <FiRefreshCw className="animate-spin mr-2" size={18} /> Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="card-base p-10 text-center">
          <FiPackage size={40} className="text-muted mx-auto mb-3" />
          <p className="text-lg font-semibold text-primary mb-1">Koi order nahi aaj ke liye</p>
          <p className="text-sm text-muted mb-4">Orders aayenge calls se ya manually add karo</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-2 mx-auto">
            <FiPlus size={14} /> Add First Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.new;
            const isOpen = expanded === order.id;
            const StatusIcon = cfg.icon;
            const nextStatus = cfg.next;

            return (
              <div key={order.id} className="card-base overflow-hidden">
                {/* Order row */}
                <div className="p-4 flex items-start gap-3">
                  {/* Source dot */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${order.source === "ai_call" ? "bg-brand-primary/15" : "bg-surface-2"}`}>
                    {order.source === "ai_call" ? <FiMic size={14} className="text-brand-primary" /> : <FiEdit2 size={14} className="text-muted" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary">{order.customer_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {order.customer_phone && (
                            <a href={`tel:${order.customer_phone}`} className="text-xs text-muted flex items-center gap-1 hover:text-brand-primary">
                              <FiPhone size={11} /> {order.customer_phone}
                            </a>
                          )}
                          {order.delivery_time && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <FiClock size={11} /> {order.delivery_time}
                            </span>
                          )}
                          <span className="text-2xs text-muted">{fmtTime(order.created_at)}</span>
                        </div>
                      </div>
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${cfg.color} flex items-center gap-1`}>
                        <StatusIcon size={10} /> {cfg.label}
                      </span>
                    </div>

                    {/* Items preview */}
                    <p className="text-xs text-muted mt-1.5 truncate">
                      {(order.items || []).slice(0, 3).map(i => `${i.quantity} ${i.unit} ${i.local_name || i.name}`).join(" · ")}
                      {(order.items || []).length > 3 && ` +${order.items.length - 3} more`}
                    </p>

                    {order.delivery_address && (
                      <p className="text-xs text-muted mt-0.5 flex items-start gap-1">
                        <FiMapPin size={11} className="shrink-0 mt-0.5" /> {order.delivery_address}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {nextStatus && (
                        <button
                          onClick={() => changeStatus(order.id, nextStatus)}
                          className="text-xs bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-3 py-1 rounded-lg font-medium hover:bg-brand-primary/20 transition-colors">
                          → Mark {STATUS_CONFIG[nextStatus]?.label}
                        </button>
                      )}
                      {!["delivered", "cancelled"].includes(order.status) && (
                        <button
                          onClick={() => changeStatus(order.id, "cancelled")}
                          className="text-xs bg-danger/10 text-danger border border-danger/20 px-3 py-1 rounded-lg font-medium hover:bg-danger/20 transition-colors">
                          Cancel
                        </button>
                      )}
                      {order.customer_phone && (
                        <a href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Aapka order confirm ho gaya hai. ${order.items?.map(i => `${i.quantity} ${i.unit} ${i.local_name || i.name}`).join(", ")} — delivery ${order.delivery_time || "jaldi"}. Dhanyavaad!`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs bg-success/10 text-success border border-success/20 px-3 py-1 rounded-lg font-medium hover:bg-success/20 transition-colors">
                          WA Confirm
                        </a>
                      )}
                      <button onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="text-xs text-muted hover:text-primary ml-auto flex items-center gap-1">
                        {isOpen ? <><FiChevronUp size={12} /> Less</> : <><FiChevronDown size={12} /> More</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 bg-surface/40 space-y-3">
                    {/* Items table */}
                    {order.items?.length > 0 && (
                      <div>
                        <p className="text-2xs text-muted font-semibold uppercase mb-1.5">Order Items</p>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-primary font-medium">{item.name}</span>
                              <span className="text-muted">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source badge */}
                    {order.source === "ai_call" && (
                      <div>
                        <p className="text-2xs text-muted font-semibold uppercase mb-1">Call Transcript</p>
                        <p className="text-xs text-secondary bg-surface-2 rounded-lg p-2 italic">
                          "{order.call_transcript?.slice(0, 300)}{(order.call_transcript?.length || 0) > 300 ? "…" : ""}"
                        </p>
                      </div>
                    )}

                    {order.workers && (
                      <p className="text-xs text-muted">
                        <FiUser size={11} className="inline mr-1" />
                        Assigned to: <span className="text-primary font-medium">{order.workers.name}</span>
                        {order.workers.phone && ` · ${order.workers.phone}`}
                      </p>
                    )}

                    {order.special_instructions && (
                      <p className="text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg p-2">
                        📝 {order.special_instructions}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <button onClick={() => deleteOrder(order.id)}
                        className="text-xs text-danger flex items-center gap-1 hover:underline">
                        <FiTrash2 size={11} /> Delete order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Order Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md card-base p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary">Add Order Manually</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-primary">✕</button>
            </div>
            <form onSubmit={submitOrder} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Customer Name *</label>
                  <input required value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    className="input-base text-sm w-full" placeholder="Ramesh ji" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Phone</label>
                  <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                    className="input-base text-sm w-full" placeholder="9876543210" type="tel" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Items (comma separated)</label>
                <input value={form.rawItems} onChange={e => setForm(f => ({ ...f, rawItems: e.target.value }))}
                  className="input-base text-sm w-full" placeholder="2 bag cement, 5 CFT bajri, 10 sariya" />
                <p className="text-2xs text-muted mt-0.5">Format: quantity unit item, quantity unit item…</p>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Delivery Address</label>
                <input value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}
                  className="input-base text-sm w-full" placeholder="Village, sector, landmark…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Delivery Time</label>
                  <input value={form.delivery_time} onChange={e => setForm(f => ({ ...f, delivery_time: e.target.value }))}
                    className="input-base text-sm w-full" placeholder="Kal subah, aaj 4 baje…" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Assign Worker</label>
                  <select value={form.worker_id} onChange={e => setForm(f => ({ ...f, worker_id: e.target.value }))}
                    className="input-base text-sm w-full">
                    <option value="">Auto-assign</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted mb-1 block">Special Instructions</label>
                <input value={form.special_instructions} onChange={e => setForm(f => ({ ...f, special_instructions: e.target.value }))}
                  className="input-base text-sm w-full" placeholder="Handle with care, call before delivery…" />
              </div>

              <button type="submit" className="btn-primary w-full text-sm py-2.5">Save Order</button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

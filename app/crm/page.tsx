"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FiUsers, FiPlus, FiSearch, FiPhone, FiMessageSquare,
  FiEdit2, FiX, FiCheck, FiLoader, FiAlertTriangle,
} from "react-icons/fi";
import { api, getUser } from "@/lib/api";

type Status = "lead" | "contacted" | "trial" | "customer" | "lost";

const STATUS_CONFIG: Record<Status, { label: string; variant: "success"|"warning"|"accent"|"muted"|"danger" }> = {
  lead:      { label: "Lead",      variant: "muted"   },
  contacted: { label: "Contacted", variant: "warning" },
  trial:     { label: "On Trial",  variant: "accent"  },
  customer:  { label: "Customer",  variant: "success" },
  lost:      { label: "Lost",      variant: "danger"  },
};

const ALL_STATUS: (Status | "all")[] = ["all", "lead", "contacted", "trial", "customer", "lost"];

interface Prospect {
  id: string;
  name: string;
  phone?: string;
  business_type?: string;
  status: Status;
  amount_stuck?: number;
  location?: string;
  notes?: string;
}

const EMPTY_FORM = { name: "", phone: "", business_type: "", location: "", amount_stuck: "", status: "lead" as Status, notes: "" };

export default function CRMPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState<Status | "all">("all");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    const user = getUser();
    if (!user?.id) return;
    setLoading(true);
    try {
      const d = await api.prospects.list(user.id);
      setProspects((d.prospects || []) as Prospect[]);
    } catch { setError("Could not load prospects"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Prospect) => {
    setEditId(p.id);
    setForm({
      name:         p.name || "",
      phone:        p.phone || "",
      business_type:p.business_type || "",
      location:     p.location || "",
      amount_stuck: p.amount_stuck != null ? String(p.amount_stuck) : "",
      status:       p.status || "lead",
      notes:        (p as any).notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    const user = getUser();
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount_stuck: form.amount_stuck ? parseFloat(form.amount_stuck) : undefined,
        user_id: user.id,
      };
      if (editId) {
        await api.prospects.update(editId, payload);
      } else {
        await api.prospects.create(payload);
      }
      setShowModal(false);
      await load();
    } catch { setError("Failed to save. Try again."); }
    setSaving(false);
  };

  const updateStatus = async (p: Prospect, newStatus: Status) => {
    try {
      await api.prospects.update(p.id, { status: newStatus });
      setProspects(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x));
    } catch {}
  };

  const filtered = prospects.filter(p => {
    if (filter !== "all" && p.status !== filter) return false;
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.business_type?.toLowerCase().includes(q);
  });

  const counts = {
    total:    prospects.length,
    trial:    prospects.filter(p => p.status === "trial").length,
    customer: prospects.filter(p => p.status === "customer").length,
    pipeline: prospects.filter(p => ["lead","contacted","trial"].includes(p.status))
                       .reduce((s, p) => s + (p.amount_stuck || 0), 0),
  };

  return (
    <DashboardLayout pageTitle="CRM Prospects">
      <div className="space-y-6 page-enter">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">CRM — Prospects</h2>
            <p className="text-sm text-secondary mt-0.5">Track leads, trials, and customer conversions</p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-accent-hover transition-all shadow-button-accent self-start sm:self-auto">
            <FiPlus size={14} /> Add Prospect
          </button>
        </div>

        {/* KPIs */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {[
              { label: "Total Prospects", value: counts.total.toString(),  color: "#0066FF" },
              { label: "On Trial",        value: counts.trial.toString(),   color: "#F5A524" },
              { label: "Customers",       value: counts.customer.toString(),color: "#10D98A" },
              { label: "Pipeline Value",  value: counts.pipeline > 0 ? (counts.pipeline >= 100000 ? `₹${(counts.pipeline/100000).toFixed(1)}L` : `₹${counts.pipeline.toLocaleString("en-IN")}`) : "—", color: "#9B6DFF" },
            ].map(k => (
              <div key={k.label} className="card-metric p-5">
                <p className="section-label mb-3">{k.label}</p>
                <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border flex-wrap">
            {ALL_STATUS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={["px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                  filter === s ? "bg-white text-black" : "text-muted hover:text-primary",
                ].join(" ")}>{s}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or business..."
              className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-primary placeholder-muted focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="card-premium p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-surface-3 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-3.5 w-32 bg-surface-3 rounded mb-2" />
                    <div className="h-2.5 w-24 bg-surface-3 rounded" />
                  </div>
                </div>
                <div className="h-8 bg-surface-3 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Prospect Cards */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((p, i) => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.lead;
              return (
                <div key={p.id} className="card-premium p-4 hover:border-border-2 transition-all animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-success/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                        {p.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{p.name}</p>
                        <p className="text-xs text-muted">
                          {[p.business_type, p.location].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-2 transition-all">
                        <FiEdit2 size={12} />
                      </button>
                    </div>
                  </div>

                  {p.amount_stuck != null && (
                    <div className="mb-3">
                      <p className="section-label mb-0.5">Pipeline Value</p>
                      <p className="text-sm font-bold text-warning">
                        {p.amount_stuck >= 100000 ? `₹${(p.amount_stuck/100000).toFixed(1)}L` : `₹${p.amount_stuck.toLocaleString("en-IN")}`}
                      </p>
                    </div>
                  )}

                  {(p as any).notes && (
                    <p className="text-xs text-muted bg-surface-2 rounded-lg px-3 py-2 mb-3">{(p as any).notes}</p>
                  )}

                  {/* Quick status updater */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(["lead","contacted","trial","customer","lost"] as Status[]).map(s => (
                      <button key={s} onClick={() => updateStatus(p, s)}
                        className={["px-2 py-1 rounded-lg text-2xs font-semibold capitalize transition-all border",
                          p.status === s
                            ? "bg-white text-black border-accent"
                            : "text-muted border-border hover:text-primary hover:border-border-2",
                        ].join(" ")}>
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {p.phone && (
                      <button onClick={() => window.open(`https://wa.me/91${p.phone}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-success-dim text-success border border-success/20 hover:bg-success hover:text-white transition-all">
                        <FiMessageSquare size={11} /> WhatsApp
                      </button>
                    )}
                    {p.phone && (
                      <a href={`tel:${p.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
                        <FiPhone size={11} /> Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card-premium p-12 flex flex-col items-center text-center">
            <FiUsers size={32} className="text-muted mb-3" />
            <p className="text-sm font-semibold text-primary">
              {prospects.length === 0 ? "No prospects yet" : "No prospects match this filter"}
            </p>
            <p className="text-xs text-muted mt-1 mb-4">
              {prospects.length === 0 ? "Add your first prospect to start tracking your sales pipeline" : "Try a different filter or search term"}
            </p>
            {prospects.length === 0 && (
              <button onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-accent-hover transition-all">
                <FiPlus size={13} /> Add First Prospect
              </button>
            )}
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-md card-premium p-6 shadow-card-hover z-10">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-bold text-primary">{editId ? "Edit Prospect" : "Add New Prospect"}</p>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-primary transition-colors">
                  <FiX size={18} />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger-dim border border-danger/20 text-danger text-xs mb-4">
                  <FiAlertTriangle size={13} /> {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="section-label block mb-1.5">Name *</label>
                    <input type="text" required placeholder="Contact name"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Phone</label>
                    <input type="tel" placeholder="9876543210"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent">
                      {(["lead","contacted","trial","customer","lost"] as Status[]).map(s => (
                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Business Type</label>
                    <input type="text" placeholder="e.g. Textiles, Pharma"
                      value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Location</label>
                    <input type="text" placeholder="City"
                      value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2">
                    <label className="section-label block mb-1.5">Pipeline Value (₹)</label>
                    <input type="number" min="0" step="1000" placeholder="e.g. 50000"
                      value={form.amount_stuck} onChange={e => setForm(f => ({ ...f, amount_stuck: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div className="col-span-2">
                    <label className="section-label block mb-1.5">Notes</label>
                    <input type="text" placeholder="Any notes..."
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted bg-surface-2 border border-border hover:text-primary transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-accent-hover disabled:opacity-60 transition-all shadow-button-accent flex items-center justify-center gap-2">
                    {saving ? <><FiLoader size={13} className="animate-spin" /> Saving…</> : <><FiCheck size={13} /> {editId ? "Update" : "Add Prospect"}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

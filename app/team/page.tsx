"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUser, FiPlus, FiTrash2, FiPhone, FiRefreshCw,
  FiToggleLeft, FiToggleRight, FiEdit2, FiCheck, FiX,
  FiDollarSign, FiMic,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const ROLES = ["delivery", "sales", "driver", "manager", "helper", "accountant", "supervisor", "loader"];

interface Worker {
  id: string; name: string; phone?: string; role: string;
  is_active: boolean; monthly_salary?: number; advance_balance?: number;
}

export default function TeamPage() {
  const [workers, setWorkers]     = useState<Worker[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editData, setEditData]   = useState<Partial<Worker>>({});
  const [wForm, setWForm]         = useState({ name: "", phone: "", role: "delivery", monthly_salary: "" });
  const [addingWorker, setAdding] = useState(false);
  const [showAdd, setShowAdd]     = useState(false);

  const tok = () => typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";
  const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tok()}` });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/workers`, { headers: hdr() });
      const d = await r.json();
      setWorkers(d.workers || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/workers`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ ...wForm, monthly_salary: parseFloat(wForm.monthly_salary) || 0 }),
      });
      const d = await r.json();
      if (d.worker) { setWorkers(w => [...w, d.worker]); setWForm({ name: "", phone: "", role: "delivery", monthly_salary: "" }); setShowAdd(false); }
    } finally { setAdding(false); }
  };

  const toggleWorker = async (id: string, is_active: boolean) => {
    await fetch(`${API}/api/workers/${id}`, { method: "PATCH", headers: hdr(), body: JSON.stringify({ is_active }) });
    setWorkers(w => w.map(x => x.id === id ? { ...x, is_active } : x));
  };

  const deleteWorker = async (id: string) => {
    if (!confirm("Delete this worker?")) return;
    await fetch(`${API}/api/workers/${id}`, { method: "DELETE", headers: hdr() });
    setWorkers(w => w.filter(x => x.id !== id));
  };

  const saveEdit = async (id: string) => {
    await fetch(`${API}/api/workers/${id}`, { method: "PATCH", headers: hdr(), body: JSON.stringify(editData) });
    setWorkers(w => w.map(x => x.id === id ? { ...x, ...editData } : x));
    setEditId(null);
  };

  const active   = workers.filter(w => w.is_active);
  const inactive = workers.filter(w => !w.is_active);

  return (
    <DashboardLayout pageTitle="Team">
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Team</h2>
            <p className="text-sm text-muted">{active.length} active · {workers.length} total</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-button-accent hover:bg-accent/90 transition-colors">
            <FiPlus size={15} /> Add Worker
          </button>
        </div>

        {/* Tip */}
        <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl flex items-start gap-2.5">
          <FiMic size={14} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-secondary">
            Jab customer call karta hai aur order deta hai, AI automatically first active worker ko call karega with full order details.
            <span className="text-accent font-semibold"> AI vocabulary training ke liye jaao: AI Training page.</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><FiRefreshCw className="animate-spin text-muted" size={20} /></div>
        ) : workers.length === 0 ? (
          <div className="card p-10 text-center">
            <FiUser size={40} className="mx-auto mb-3 text-muted opacity-30" />
            <p className="font-semibold text-primary mb-1">Koi worker nahi abhi tak</p>
            <p className="text-sm text-muted mb-4">Delivery boy, driver, helper — sab add karo</p>
            <button onClick={() => setShowAdd(true)} className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold">
              <FiPlus size={14} className="inline mr-1.5" /> Add First Worker
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active */}
            {active.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Active ({active.length})</p>
                <div className="space-y-2">
                  {active.map(w => (
                    <WorkerCard key={w.id} w={w} editId={editId} editData={editData}
                      setEditId={setEditId} setEditData={setEditData}
                      onToggle={toggleWorker} onDelete={deleteWorker} onSave={saveEdit} />
                  ))}
                </div>
              </div>
            )}
            {/* Inactive */}
            {inactive.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Inactive ({inactive.length})</p>
                <div className="space-y-2 opacity-60">
                  {inactive.map(w => (
                    <WorkerCard key={w.id} w={w} editId={editId} editData={editData}
                      setEditId={setEditId} setEditData={setEditData}
                      onToggle={toggleWorker} onDelete={deleteWorker} onSave={saveEdit} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-primary">Add Worker</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <form onSubmit={addWorker} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Name *</label>
                <input required value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ramu, Shyam..." autoFocus
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Phone</label>
                  <input value={wForm.phone} onChange={e => setWForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="9876543210" type="tel"
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Role</label>
                  <select value={wForm.role} onChange={e => setWForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Monthly Salary (₹)</label>
                <input value={wForm.monthly_salary} onChange={e => setWForm(f => ({ ...f, monthly_salary: e.target.value }))}
                  placeholder="15000" type="number"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={addingWorker}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">
                  {addingWorker ? "Adding..." : "Add Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function WorkerCard({ w, editId, editData, setEditId, setEditData, onToggle, onDelete, onSave }: any) {
  const isEditing = editId === w.id;
  return (
    <div className="card p-4">
      {isEditing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={editData.name ?? w.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))}
              className="bg-surface-2 border border-accent/40 rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none" />
            <input value={editData.phone ?? w.phone ?? ""} onChange={e => setEditData((d: any) => ({ ...d, phone: e.target.value }))}
              placeholder="Phone" className="bg-surface-2 border border-white/8 rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={editData.role ?? w.role} onChange={e => setEditData((d: any) => ({ ...d, role: e.target.value }))}
              className="bg-surface-2 border border-white/8 rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none">
              {["delivery","sales","driver","manager","helper","accountant","supervisor","loader"].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
            <input type="number" value={editData.monthly_salary ?? w.monthly_salary ?? ""} onChange={e => setEditData((d: any) => ({ ...d, monthly_salary: parseFloat(e.target.value) || 0 }))}
              placeholder="Monthly ₹" className="bg-surface-2 border border-white/8 rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSave(w.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-success/20 text-success text-xs font-bold hover:bg-success/30 transition-colors">
              <FiCheck size={12} /> Save
            </button>
            <button onClick={() => { setEditId(null); setEditData({}); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-2 text-muted text-xs hover:text-primary transition-colors">
              <FiX size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center text-sm font-bold text-white shrink-0">
            {w.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary text-sm">{w.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-2xs bg-surface-2 text-muted px-2 py-0.5 rounded-full capitalize">{w.role}</span>
              {w.phone && <span className="text-2xs text-muted flex items-center gap-0.5"><FiPhone size={9} /> {w.phone}</span>}
              {w.monthly_salary > 0 && <span className="text-2xs text-success flex items-center gap-0.5"><FiDollarSign size={9} /> ₹{Number(w.monthly_salary).toLocaleString("en-IN")}/mo</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onToggle(w.id, !w.is_active)} title={w.is_active ? "Deactivate" : "Activate"}
              className={`text-xl transition-colors ${w.is_active ? "text-success" : "text-muted"}`}>
              {w.is_active ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
            </button>
            {w.phone && (
              <a href={`https://wa.me/91${w.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                className="text-2xs bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded-lg font-semibold hover:bg-[#25D366]/20">
                WA
              </a>
            )}
            <button onClick={() => { setEditId(w.id); setEditData({}); }} className="p-1.5 text-muted hover:text-primary transition-colors">
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => onDelete(w.id)} className="p-1.5 text-muted hover:text-danger transition-colors">
              <FiTrash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

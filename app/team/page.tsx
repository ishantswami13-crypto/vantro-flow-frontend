"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUser, FiPlus, FiTrash2, FiPhone, FiRefreshCw,
  FiToggleLeft, FiToggleRight, FiEdit2, FiCheck, FiX,
  FiDollarSign, FiSettings, FiEye, FiEyeOff, FiZap,
  FiCopy, FiCheckCircle, FiAlertCircle,
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

  // Twilio setup state
  const [showSetup, setShowSetup]     = useState(false);
  const [sid, setSid]                 = useState("");
  const [token, setToken]             = useState("");
  const [phone, setPhone]             = useState("");
  const [showToken, setShowToken]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle"|"saved"|"error">("idle");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [copied, setCopied]           = useState(false);
  const [twilioActive, setTwilioActive] = useState(false);

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

  const loadTwilio = async () => {
    try {
      const r = await fetch(`${API}/api/voice/webhook-url`, { headers: hdr() });
      const d = await r.json();
      if (d.webhook_url) setWebhookUrl(d.webhook_url);
      if (d.twilio_account_sid) { setSid(d.twilio_account_sid); setTwilioActive(true); }
      if (d.twilio_phone_number) setPhone(d.twilio_phone_number);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); loadTwilio(); }, []);

  const addWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const r = await fetch(`${API}/api/workers`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ ...wForm, monthly_salary: parseFloat(wForm.monthly_salary) || 0 }),
      });
      const d = await r.json();
      if (d.worker) {
        setWorkers(w => [...w, d.worker]);
        setWForm({ name: "", phone: "", role: "delivery", monthly_salary: "" });
        setShowAdd(false);
      }
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

  const saveTwilio = async () => {
    if (!sid || !token || !phone) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const r = await fetch(`${API}/api/settings/twilio`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ account_sid: sid, auth_token: token, phone_number: phone }),
      });
      const d = await r.json();
      if (d.success) {
        setSaveStatus("saved");
        setTwilioActive(true);
        await loadTwilio();
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally { setSaving(false); }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex gap-2">
            <button onClick={() => setShowSetup(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                twilioActive
                  ? "bg-success/10 border-success/30 text-success hover:bg-success/20"
                  : "bg-surface-2 border-white/10 text-muted hover:text-primary"
              }`}>
              <FiSettings size={14} />
              {twilioActive ? "✓ Calling Active" : "⚙️ Call Setup"}
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold shadow-button-accent hover:bg-accent/90 transition-colors">
              <FiPlus size={15} /> Add Worker
            </button>
          </div>
        </div>

        {/* ── Call Setup Panel ── */}
        {showSetup && (
          <div className="card p-5 space-y-4 border border-accent/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <FiZap size={15} className="text-accent" />
              </div>
              <div>
                <p className="font-bold text-primary text-sm">AI Calling Setup</p>
                <p className="text-xs text-muted">Twilio credentials — no Railway env vars needed</p>
              </div>
              {twilioActive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-success font-semibold">
                  <FiCheckCircle size={12} /> Active
                </span>
              )}
            </div>

            {/* Step guide */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { n: "1", t: "twilio.com pe account banao" },
                { n: "2", t: "Credentials neeche paste karo" },
                { n: "3", t: "Webhook URL Twilio me lagao" },
              ].map(s => (
                <div key={s.n} className="p-2.5 bg-surface-2 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center mx-auto mb-1.5">{s.n}</div>
                  <p className="text-2xs text-muted leading-tight">{s.t}</p>
                </div>
              ))}
            </div>

            {/* Credentials form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Account SID <span className="text-accent">*</span></label>
                <input
                  value={sid}
                  onChange={e => setSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent/50 placeholder:text-muted/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Auth Token <span className="text-accent">*</span></label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 pr-10 text-sm text-primary font-mono focus:outline-none focus:border-accent/50 placeholder:text-muted/40"
                  />
                  <button type="button" onClick={() => setShowToken(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                    {showToken ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Twilio Phone Number <span className="text-accent">*</span></label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+12015551234"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent/50 placeholder:text-muted/40"
                />
              </div>

              <button
                onClick={saveTwilio}
                disabled={saving || !sid || !token || !phone}
                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-accent/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                {saving ? (
                  <><FiRefreshCw size={14} className="animate-spin" /> Saving...</>
                ) : saveStatus === "saved" ? (
                  <><FiCheckCircle size={14} /> Saved & Activated!</>
                ) : saveStatus === "error" ? (
                  <><FiAlertCircle size={14} /> Error — try again</>
                ) : (
                  <><FiZap size={14} /> Save & Activate Calling</>
                )}
              </button>
            </div>

            {/* Webhook URL — only show after save */}
            {webhookUrl && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-muted mb-2">
                  📋 <span className="font-semibold text-secondary">Twilio Dashboard</span> → Phone Numbers → Your Number → Voice → Webhook:
                </p>
                <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2.5 border border-white/8">
                  <code className="flex-1 text-xs text-accent font-mono truncate">{webhookUrl}</code>
                  <button onClick={copyWebhook}
                    className="shrink-0 text-muted hover:text-primary transition-colors">
                    {copied ? <FiCheck size={13} className="text-success" /> : <FiCopy size={13} />}
                  </button>
                </div>
                <p className="text-2xs text-muted mt-1.5">
                  HTTP POST — paste this exactly in Twilio → Voice → "A call comes in"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Workers list */}
        {loading ? (
          <div className="flex justify-center py-12"><FiRefreshCw className="animate-spin text-muted" size={20} /></div>
        ) : workers.length === 0 ? (
          <div className="card p-10 text-center">
            <FiUser size={40} className="mx-auto mb-3 text-muted opacity-30" />
            <p className="font-semibold text-primary mb-1">Koi worker nahi abhi tak</p>
            <p className="text-sm text-muted mb-4">Delivery boy, driver, helper — sab add karo</p>
            <button onClick={() => setShowAdd(true)} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">
              <FiPlus size={14} className="inline mr-1.5" /> Add First Worker
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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

        {/* Calling tip — shown only when twilio is active */}
        {twilioActive && workers.length > 0 && (
          <div className="p-3 bg-success/5 border border-success/20 rounded-xl">
            <p className="text-xs text-success font-semibold mb-0.5">✅ AI Calling is Live</p>
            <p className="text-xs text-muted">
              Jab customer call karega, AI automatically
              <span className="text-primary font-medium"> {active[0]?.name || "first active worker"} </span>
              ko call karega with order details.
            </p>
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
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">
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
              {["delivery","sales","driver","manager","helper","accountant","supervisor","loader"].map(r =>
                <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>
              )}
            </select>
            <input type="number" value={editData.monthly_salary ?? w.monthly_salary ?? ""}
              onChange={e => setEditData((d: any) => ({ ...d, monthly_salary: parseFloat(e.target.value) || 0 }))}
              placeholder="Monthly ₹" className="bg-surface-2 border border-white/8 rounded-lg px-2.5 py-2 text-sm text-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSave(w.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-success/20 text-success text-xs font-bold hover:bg-success/30 transition-colors">
              <FiCheck size={12} /> Save
            </button>
            <button onClick={() => { setEditId(null); setEditData({}); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-2 text-muted text-xs hover:text-primary transition-colors">
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
              {w.phone && (
                <span className="text-2xs text-muted flex items-center gap-0.5">
                  <FiPhone size={9} /> {w.phone}
                </span>
              )}
              {w.monthly_salary > 0 && (
                <span className="text-2xs text-success flex items-center gap-0.5">
                  <FiDollarSign size={9} /> ₹{Number(w.monthly_salary).toLocaleString("en-IN")}/mo
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onToggle(w.id, !w.is_active)}
              title={w.is_active ? "Deactivate" : "Activate"}
              className={`text-xl transition-colors ${w.is_active ? "text-success" : "text-muted"}`}>
              {w.is_active ? <FiToggleRight size={24} /> : <FiToggleLeft size={24} />}
            </button>
            {w.phone && (
              <a href={`https://wa.me/91${w.phone.replace(/\D/g,"")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-2xs bg-[#25D366]/10 text-[#25D366] px-2 py-1 rounded-lg font-semibold hover:bg-[#25D366]/20">
                WA
              </a>
            )}
            <button onClick={() => { setEditId(w.id); setEditData({}); }}
              className="p-1.5 text-muted hover:text-primary transition-colors">
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => onDelete(w.id)}
              className="p-1.5 text-muted hover:text-danger transition-colors">
              <FiTrash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

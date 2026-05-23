"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUser, FiPlus, FiTrash2, FiPhone, FiBriefcase,
  FiBook, FiMic, FiZap, FiCopy, FiCheck,
  FiSettings, FiRefreshCw, FiAlertCircle, FiToggleLeft, FiToggleRight,
  FiEye, FiEyeOff, FiSave,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const ROLES = ["delivery", "sales", "driver", "manager", "helper", "accountant"];
const INDUSTRIES = [
  { id: "construction", label: "🏗️ Construction Material" },
  { id: "textile",      label: "🧵 Textile / Kapda" },
  { id: "grocery",      label: "🛒 Grocery / Kirana" },
  { id: "pharma",       label: "💊 Pharma / Medical" },
];
const VOCAB_CATEGORIES = ["product", "unit", "location", "process", "customer"];

interface Worker { id: string; name: string; phone?: string; role: string; is_active: boolean; }
interface VocabItem { id: string; term: string; meaning: string; category: string; aliases?: string[]; }

export default function TeamPage() {
  const [tab, setTab] = useState<"team" | "vocab" | "setup">("team");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [twilioForm, setTwilioForm] = useState({ account_sid: "", auth_token: "", phone_number: "" });
  const [showToken, setShowToken]   = useState(false);
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioSaved, setTwilioSaved]   = useState(false);

  // Worker form
  const [wForm, setWForm] = useState({ name: "", phone: "", role: "delivery" });
  const [addingWorker, setAddingWorker] = useState(false);

  // Vocab form
  const [vForm, setVForm] = useState({ term: "", meaning: "", category: "product", aliases: "" });
  const [addingVocab, setAddingVocab] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

  const load = async () => {
    setLoading(true);
    try {
      const [wRes, vRes, urlRes] = await Promise.all([
        fetch(`${API}/api/workers`,           { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/vocabulary`,         { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${API}/api/voice/webhook-url`,  { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [w, v, u] = await Promise.all([wRes.json(), vRes.json(), urlRes.json()]);
      setWorkers(w.workers || []);
      setVocab(v.vocabulary || []);
      setWebhookUrl(u.webhook_url || "");
      setTwilioConfigured(u.twilio_configured || false);
      if (u.twilio_account_sid) setTwilioForm(f => ({ ...f, account_sid: u.twilio_account_sid, phone_number: u.twilio_phone_number || "" }));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Workers ──────────────────────────────────
  const addWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingWorker(true);
    try {
      const res = await fetch(`${API}/api/workers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(wForm),
      });
      const d = await res.json();
      if (d.worker) { setWorkers(w => [...w, d.worker]); setWForm({ name: "", phone: "", role: "delivery" }); }
    } finally { setAddingWorker(false); }
  };

  const toggleWorker = async (id: string, is_active: boolean) => {
    await fetch(`${API}/api/workers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ is_active }),
    });
    setWorkers(w => w.map(x => x.id === id ? { ...x, is_active } : x));
  };

  const deleteWorker = async (id: string) => {
    if (!confirm("Delete this worker?")) return;
    await fetch(`${API}/api/workers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setWorkers(w => w.filter(x => x.id !== id));
  };

  // ── Vocabulary ────────────────────────────────
  const addVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingVocab(true);
    try {
      const aliases = vForm.aliases ? vForm.aliases.split(",").map(s => s.trim()).filter(Boolean) : [];
      const res = await fetch(`${API}/api/vocabulary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...vForm, aliases }),
      });
      const d = await res.json();
      if (d.item) { setVocab(v => [...v, d.item]); setVForm({ term: "", meaning: "", category: "product", aliases: "" }); }
    } finally { setAddingVocab(false); }
  };

  const deleteVocab = async (id: string) => {
    await fetch(`${API}/api/vocabulary/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setVocab(v => v.filter(x => x.id !== id));
  };

  const seedVocab = async (industry: string) => {
    setSeedLoading(true);
    try {
      await fetch(`${API}/api/vocabulary/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ industry }),
      });
      await load();
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 3000);
    } finally { setSeedLoading(false); }
  };

  const saveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioForm.account_sid || !twilioForm.auth_token || !twilioForm.phone_number) return;
    setSavingTwilio(true);
    try {
      const r = await fetch(`${API}/api/settings/twilio`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(twilioForm),
      });
      const d = await r.json();
      if (d.success) {
        setTwilioConfigured(true);
        setTwilioSaved(true);
        setTimeout(() => setTwilioSaved(false), 3000);
        load(); // refresh webhook URL
      }
    } finally { setSavingTwilio(false); }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group vocab by category
  const vocabGroups = VOCAB_CATEGORIES.reduce<Record<string, VocabItem[]>>((acc, cat) => {
    const items = vocab.filter(v => v.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const TABS = [
    { id: "team",  label: "👥 Team",           count: workers.length },
    { id: "vocab", label: "🧠 AI Vocabulary",  count: vocab.length },
    { id: "setup", label: "⚙️ Call Setup",     count: null },
  ];

  return (
    <DashboardLayout pageTitle="Team & AI Training">
      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-xl p-1 mb-5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-surface-2 text-primary shadow-sm" : "text-muted hover:text-secondary"}`}>
            {t.label}
            {t.count !== null && <span className="text-2xs bg-surface-2 text-muted px-1.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted">
          <FiRefreshCw className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : (
        <>
          {/* ── TEAM TAB ── */}
          {tab === "team" && (
            <div className="space-y-4">
              {/* Add worker form */}
              <div className="card-base p-4">
                <p className="font-semibold text-primary mb-3 flex items-center gap-2"><FiPlus size={15} /> Add Worker</p>
                <form onSubmit={addWorker} className="flex flex-wrap gap-2">
                  <input required value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))}
                    className="input-base text-sm flex-1 min-w-[120px]" placeholder="Worker name *" />
                  <input value={wForm.phone} onChange={e => setWForm(f => ({ ...f, phone: e.target.value }))}
                    className="input-base text-sm w-32" placeholder="Phone no." type="tel" />
                  <select value={wForm.role} onChange={e => setWForm(f => ({ ...f, role: e.target.value }))}
                    className="input-base text-sm w-28">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <button type="submit" disabled={addingWorker}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                    {addingWorker ? <FiRefreshCw className="animate-spin" size={13} /> : <FiPlus size={13} />} Add
                  </button>
                </form>
              </div>

              {/* Workers list */}
              {workers.length === 0 ? (
                <div className="card-base p-8 text-center">
                  <FiUser size={36} className="text-muted mx-auto mb-3" />
                  <p className="font-semibold text-primary mb-1">Koi worker nahi abhi tak</p>
                  <p className="text-sm text-muted">Workers add karo — jab order aayega, AI unhe auto-call karega</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workers.map(w => (
                    <div key={w.id} className={`card-base p-4 flex items-center gap-3 transition-opacity ${!w.is_active ? "opacity-50" : ""}`}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-accent flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary text-sm">{w.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {w.phone && (
                            <a href={`tel:${w.phone}`} className="text-xs text-muted flex items-center gap-1 hover:text-brand-primary">
                              <FiPhone size={10} /> {w.phone}
                            </a>
                          )}
                          <span className="text-2xs text-muted bg-surface-2 px-2 py-0.5 rounded-full capitalize">{w.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleWorker(w.id, !w.is_active)}
                          className={`text-xl transition-colors ${w.is_active ? "text-success" : "text-muted"}`}
                          title={w.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}>
                          {w.is_active ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
                        </button>
                        {w.phone && (
                          <a href={`https://wa.me/91${w.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                            className="text-success hover:opacity-80 text-xs font-medium bg-success/10 px-2 py-1 rounded-lg">
                            WA
                          </a>
                        )}
                        <button onClick={() => deleteWorker(w.id)} className="text-danger/60 hover:text-danger p-1">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Worker tip */}
              <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-3 text-xs text-secondary">
                <FiMic size={13} className="inline mr-1.5 text-brand-primary" />
                Jab koi customer call karta hai aur order deta hai, AI pehle active worker ko auto-call karega with full order details.
              </div>
            </div>
          )}

          {/* ── VOCABULARY TAB ── */}
          {tab === "vocab" && (
            <div className="space-y-4">
              {/* What is this */}
              <div className="bg-brand-primary/8 border border-brand-primary/20 rounded-xl p-4">
                <p className="font-semibold text-brand-primary text-sm mb-1 flex items-center gap-2">
                  <FiZap size={14} /> Yahi hai aapka "Custom AI"
                </p>
                <p className="text-xs text-secondary">
                  Aap yahan apne business ki language sikhaate ho — AI phir call mein wahi words automatically samjhega.
                  "Bajri" = sand, "Sariya" = TMT rods — sab AI ko pata hoga bina bataye.
                </p>
              </div>

              {/* Seed by industry */}
              <div className="card-base p-4">
                <p className="text-sm font-semibold text-primary mb-3">🚀 Quick Seed — apni industry choose karo</p>
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button key={ind.id} onClick={() => seedVocab(ind.id)} disabled={seedLoading}
                      className="text-sm text-left px-3 py-2 rounded-xl border border-border hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-secondary hover:text-primary">
                      {seedLoading ? <FiRefreshCw className="inline animate-spin mr-1" size={12} /> : null}
                      {ind.label}
                    </button>
                  ))}
                </div>
                {seedDone && <p className="text-xs text-success mt-2 flex items-center gap-1"><FiCheck size={12} /> Vocabulary added! Check below.</p>}
              </div>

              {/* Add vocab form */}
              <div className="card-base p-4">
                <p className="font-semibold text-primary mb-3 text-sm flex items-center gap-2"><FiPlus size={14} /> Add Your Own Term</p>
                <form onSubmit={addVocab} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-2xs text-muted mb-0.5 block">Local Term *</label>
                      <input required value={vForm.term} onChange={e => setVForm(f => ({ ...f, term: e.target.value }))}
                        className="input-base text-sm w-full" placeholder="e.g. Bajri" />
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-0.5 block">Category</label>
                      <select value={vForm.category} onChange={e => setVForm(f => ({ ...f, category: e.target.value }))}
                        className="input-base text-sm w-full">
                        {VOCAB_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-2xs text-muted mb-0.5 block">What it means *</label>
                    <input required value={vForm.meaning} onChange={e => setVForm(f => ({ ...f, meaning: e.target.value }))}
                      className="input-base text-sm w-full" placeholder="e.g. Fine river sand used for plastering and concrete mix" />
                  </div>
                  <div>
                    <label className="text-2xs text-muted mb-0.5 block">Also called (comma separated)</label>
                    <input value={vForm.aliases} onChange={e => setVForm(f => ({ ...f, aliases: e.target.value }))}
                      className="input-base text-sm w-full" placeholder="e.g. bairi, najri, rait" />
                  </div>
                  <button type="submit" disabled={addingVocab}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
                    {addingVocab ? <FiRefreshCw className="animate-spin" size={12} /> : <FiPlus size={12} />} Add Term
                  </button>
                </form>
              </div>

              {/* Vocabulary list by category */}
              {Object.keys(vocabGroups).length === 0 ? (
                <div className="card-base p-8 text-center">
                  <FiBook size={36} className="text-muted mx-auto mb-3" />
                  <p className="font-semibold text-primary mb-1">AI vocabulary empty hai</p>
                  <p className="text-sm text-muted">Upar se industry choose karo ya manually apne terms daalo</p>
                </div>
              ) : (
                Object.entries(vocabGroups).map(([cat, items]) => (
                  <div key={cat} className="card-base p-4">
                    <p className="text-2xs text-muted font-semibold uppercase mb-2.5">{cat}</p>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-start gap-2 group">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-primary text-sm">{item.term}</span>
                            <span className="text-muted text-xs mx-1.5">→</span>
                            <span className="text-secondary text-xs">{item.meaning}</span>
                            {item.aliases && item.aliases.length > 0 && (
                              <p className="text-2xs text-muted mt-0.5">Also: {item.aliases.join(", ")}</p>
                            )}
                          </div>
                          <button onClick={() => deleteVocab(item.id)}
                            className="text-danger/40 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0">
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── SETUP TAB ── */}
          {tab === "setup" && (
            <div className="space-y-4">
              {/* Status card */}
              <div className={`card-base p-4 border ${twilioConfigured ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {twilioConfigured ? <FiCheck size={16} className="text-success" /> : <FiAlertCircle size={16} className="text-warning" />}
                  <p className={`font-semibold text-sm ${twilioConfigured ? "text-success" : "text-warning"}`}>
                    {twilioConfigured ? "✅ AI Calling Active" : "⚠ Twilio Setup Required"}
                  </p>
                </div>
                <p className="text-xs text-secondary">
                  {twilioConfigured
                    ? "Customers call → AI records order → auto-call worker. Sab automatic!"
                    : "Neeche apna Twilio account SID, token aur number daalo. Bas ek baar karna hai."}
                </p>
              </div>

              {/* ── TWILIO CREDENTIALS FORM ── */}
              <div className="card-base p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <FiPhone size={15} className="text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-primary text-sm">Twilio Credentials</p>
                    <p className="text-2xs text-muted">
                      <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        twilio.com
                      </a> pe free account banao → Console mein SID aur token copy karo
                    </p>
                  </div>
                </div>
                <form onSubmit={saveTwilio} className="space-y-3">
                  <div>
                    <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Account SID</label>
                    <input
                      value={twilioForm.account_sid}
                      onChange={e => setTwilioForm(f => ({ ...f, account_sid: e.target.value }))}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent placeholder:text-muted/50"
                    />
                    <p className="text-2xs text-muted mt-0.5">Twilio Console → Dashboard pe milega (AC... se shuru)</p>
                  </div>
                  <div>
                    <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Auth Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={twilioForm.auth_token}
                        onChange={e => setTwilioForm(f => ({ ...f, auth_token: e.target.value }))}
                        placeholder="your_auth_token_here"
                        className="w-full bg-surface-2 border border-border rounded-xl px-3 pr-10 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent placeholder:text-muted/50"
                      />
                      <button type="button" onClick={() => setShowToken(t => !t)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                        {showToken ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                      </button>
                    </div>
                    <p className="text-2xs text-muted mt-0.5">Console → Account Info → Auth Token (show karo aur copy karo)</p>
                  </div>
                  <div>
                    <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Twilio Phone Number</label>
                    <input
                      value={twilioForm.phone_number}
                      onChange={e => setTwilioForm(f => ({ ...f, phone_number: e.target.value }))}
                      placeholder="+14155552671"
                      className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent placeholder:text-muted/50"
                    />
                    <p className="text-2xs text-muted mt-0.5">Console → Phone Numbers → +E.164 format (e.g. +14155552671)</p>
                  </div>
                  <button type="submit" disabled={savingTwilio || !twilioForm.account_sid || !twilioForm.auth_token || !twilioForm.phone_number}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 ${twilioSaved ? "bg-success/20 text-success border border-success/30" : "bg-accent text-white shadow-button-accent hover:bg-accent/90"}`}>
                    {twilioSaved ? <><FiCheck size={14} /> Saved! Calling Active ✅</> : savingTwilio ? <><FiRefreshCw size={13} className="animate-spin" /> Saving…</> : <><FiSave size={14} /> Save & Activate Calling</>}
                  </button>
                </form>
              </div>

              {/* Webhook URL */}
              {webhookUrl && (
                <div className="card-base p-4">
                  <p className="font-semibold text-primary text-sm mb-2">Step 2 — Webhook URL Twilio mein daalo</p>
                  <p className="text-xs text-muted mb-2">Twilio Console → Phone Numbers → Active Numbers → select number → Voice → "A call comes in" → POST:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-2xs bg-surface-2 rounded-xl px-3 py-2.5 text-accent font-mono break-all border border-white/5">
                      {webhookUrl}
                    </code>
                    <button onClick={copyWebhook}
                      className="shrink-0 p-2.5 rounded-xl bg-surface-2 hover:bg-surface text-muted hover:text-primary transition-colors border border-white/5">
                      {copied ? <FiCheck size={14} className="text-success" /> : <FiCopy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="card-base p-4">
                <p className="font-bold text-primary mb-3 text-sm">Kaise kaam karta hai</p>
                <div className="space-y-2.5">
                  {[
                    { icon: "📞", text: "Customer aapka Twilio number call karta hai" },
                    { icon: "🎙️", text: "AI namaste bolta hai aur order record karta hai (Hindi/Hinglish mein)" },
                    { icon: "🧠", text: "Groq Whisper recording transcribe karta hai" },
                    { icon: "📦", text: "LLaMA 3.3 + aapka vocabulary order extract karta hai (customer name, items, address, time)" },
                    { icon: "💾", text: "Order automatically Today's Orders mein add ho jata hai" },
                    { icon: "🔔", text: "Aapko push notification aata hai turant" },
                    { icon: "🚚", text: "First active worker ko auto-call: full order details se" },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0">{icon}</span>
                      <p className="text-xs text-secondary">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

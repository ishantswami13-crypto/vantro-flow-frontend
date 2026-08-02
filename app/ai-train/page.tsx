"use client";
import { authHeaders } from "@/lib/api";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiTrash2, FiRefreshCw, FiCheck, FiZap, FiBook,
  FiCopy, FiAlertCircle, FiPhone, FiEye, FiEyeOff, FiSave, FiMic,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const INDUSTRIES = [
  { id: "construction", emoji: "🏗️", label: "Construction / Building Material" },
  { id: "textile",      emoji: "👗", label: "Textile / Kapda" },
  { id: "grocery",      emoji: "🛒", label: "Grocery / Kirana" },
  { id: "pharma",       emoji: "💊", label: "Pharma / Medical" },
  { id: "restaurant",   emoji: "🍽️", label: "Restaurant / Dhaba" },
  { id: "general",      emoji: "🏢", label: "General Business" },
];
const VOCAB_CATEGORIES = ["product", "unit", "location", "process", "customer"];

interface VocabItem { id: string; term: string; meaning: string; category: string; aliases?: string[]; }

export default function AITrainPage() {
  const [tab, setTab]               = useState<"vocab" | "setup">("vocab");
  const [vocab, setVocab]           = useState<VocabItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [seedLoading, setSeedLoad]  = useState(false);
  const [seedDone, setSeedDone]     = useState(false);
  const [addingVocab, setAddingV]   = useState(false);
  const [vForm, setVForm]           = useState({ term: "", meaning: "", category: "product", aliases: "" });

  // Twilio setup
  const [webhookUrl, setWebhookUrl]       = useState("");
  const [twilioConfigured, setTwilioConf] = useState(false);
  const [copied, setCopied]               = useState(false);
  const [twilioForm, setTwilioForm]       = useState({ account_sid: "", auth_token: "", phone_number: "" });
  const [showToken, setShowToken]         = useState(false);
  const [savingTwilio, setSavingTwilio]   = useState(false);
  const [twilioSaved, setTwilioSaved]     = useState(false);

  const hdr = () => ({ ...authHeaders(), "Content-Type": "application/json" });

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, urlRes] = await Promise.all([
        fetch(`${API}/api/vocabulary`, { headers: hdr(), credentials: "include" as RequestCredentials }),
        fetch(`${API}/api/voice/webhook-url`, { headers: hdr(), credentials: "include" as RequestCredentials }),
      ]);
      const [v, u] = await Promise.all([vRes.json(), urlRes.json()]);
      setVocab(v.vocabulary || []);
      setWebhookUrl(u.webhook_url || "");
      setTwilioConf(u.twilio_configured || false);
      if (u.twilio_account_sid) setTwilioForm(f => ({ ...f, account_sid: u.twilio_account_sid, phone_number: u.twilio_phone_number || "" }));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const seedVocab = async (industry: string) => {
    setSeedLoad(true);
    try {
      await fetch(`${API}/api/vocabulary/seed`, { method: "POST", headers: hdr(), credentials: "include" as RequestCredentials, body: JSON.stringify({ industry }) });
      await load();
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 3000);
    } finally { setSeedLoad(false); }
  };

  const addVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingV(true);
    try {
      const aliases = vForm.aliases ? vForm.aliases.split(",").map(s => s.trim()).filter(Boolean) : [];
      const r = await fetch(`${API}/api/vocabulary`, { method: "POST", headers: hdr(), credentials: "include" as RequestCredentials, body: JSON.stringify({ ...vForm, aliases }) });
      const d = await r.json();
      if (d.item) { setVocab(v => [...v, d.item]); setVForm({ term: "", meaning: "", category: "product", aliases: "" }); }
    } finally { setAddingV(false); }
  };

  const deleteVocab = async (id: string) => {
    await fetch(`${API}/api/vocabulary/${id}`, { method: "DELETE", headers: hdr(), credentials: "include" as RequestCredentials });
    setVocab(v => v.filter(x => x.id !== id));
  };

  const saveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioForm.account_sid || !twilioForm.auth_token || !twilioForm.phone_number) return;
    setSavingTwilio(true);
    try {
      const r = await fetch(`${API}/api/settings/twilio`, { method: "POST", headers: hdr(), credentials: "include" as RequestCredentials, body: JSON.stringify(twilioForm) });
      const d = await r.json();
      if (d.success) { setTwilioConf(true); setTwilioSaved(true); setTimeout(() => setTwilioSaved(false), 3000); load(); }
    } finally { setSavingTwilio(false); }
  };

  const vocabByCategory = VOCAB_CATEGORIES.reduce<Record<string, VocabItem[]>>((acc, cat) => {
    const items = vocab.filter(v => v.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <DashboardLayout pageTitle="AI Training">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2/50 rounded-xl p-1 border border-white/5">
          {[
            { id: "vocab", label: "🧠 AI Vocabulary", count: vocab.length },
            { id: "setup", label: "📞 Call Setup", count: null, dot: twilioConfigured },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-surface-1 text-primary shadow-sm border border-white/5" : "text-muted hover:text-secondary"}`}>
              {t.label}
              {t.count !== null && <span className="text-2xs bg-surface-2 text-muted px-1.5 rounded-full">{t.count}</span>}
              {t.dot && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><FiRefreshCw className="animate-spin text-muted" size={20} /></div> : (

          <>
            {/* ── VOCABULARY TAB ── */}
            {tab === "vocab" && (
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <p className="font-semibold text-accent text-sm mb-1 flex items-center gap-2"><FiZap size={14} /> Yahi hai aapka "Custom AI"</p>
                  <p className="text-xs text-secondary">
                    Apne business ki language sikhao — "Bajri" = sand, "Sariya" = TMT rods.
                    Jab customer call kare, AI in words ko automatically samjhega bina bataye.
                  </p>
                </div>

                {/* Quick seed */}
                <div className="card p-4">
                  <p className="text-sm font-semibold text-primary mb-3">⚡ Quick Seed — apni industry choose karo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button key={ind.id} onClick={() => seedVocab(ind.id)} disabled={seedLoading}
                        className="text-sm text-left px-3 py-2.5 rounded-xl border border-white/8 bg-surface-2 hover:border-accent/40 hover:bg-accent/5 transition-all text-secondary hover:text-primary">
                        {seedLoading ? <FiRefreshCw className="inline animate-spin mr-1" size={11} /> : null}
                        {ind.emoji} {ind.label}
                      </button>
                    ))}
                  </div>
                  {seedDone && <p className="text-xs text-success mt-2 flex items-center gap-1"><FiCheck size={12} /> Vocabulary added!</p>}
                </div>

                {/* Add custom term */}
                <div className="card p-4">
                  <p className="font-semibold text-primary mb-3 text-sm flex items-center gap-2"><FiPlus size={14} /> Apna Term Add Karo</p>
                  <form onSubmit={addVocab} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-2xs text-muted mb-1 block">Local Term *</label>
                        <input required value={vForm.term} onChange={e => setVForm(f => ({ ...f, term: e.target.value }))}
                          placeholder="e.g. Bajri"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50" />
                      </div>
                      <div>
                        <label className="text-2xs text-muted mb-1 block">Category</label>
                        <select value={vForm.category} onChange={e => setVForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50">
                          {VOCAB_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">Matlab (meaning) *</label>
                      <input required value={vForm.meaning} onChange={e => setVForm(f => ({ ...f, meaning: e.target.value }))}
                        placeholder="e.g. Fine river sand used for plastering"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50" />
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">Other names (comma separated)</label>
                      <input value={vForm.aliases} onChange={e => setVForm(f => ({ ...f, aliases: e.target.value }))}
                        placeholder="e.g. bairi, najri, rait"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent/50" />
                    </div>
                    <button type="submit" disabled={addingVocab}
                      className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors">
                      {addingVocab ? <FiRefreshCw className="animate-spin" size={12} /> : <FiPlus size={12} />} Add Term
                    </button>
                  </form>
                </div>

                {/* Vocab list */}
                {Object.keys(vocabByCategory).length === 0 ? (
                  <div className="card p-8 text-center">
                    <FiBook size={32} className="mx-auto mb-3 text-muted opacity-30" />
                    <p className="text-sm text-muted">AI vocabulary empty hai — upar se industry choose karo</p>
                  </div>
                ) : (
                  Object.entries(vocabByCategory).map(([cat, items]) => (
                    <div key={cat} className="card p-4">
                      <p className="text-2xs text-muted font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        {cat} <span className="opacity-50">({items.length})</span>
                      </p>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-start gap-2 group">
                            <div className="flex-1">
                              <span className="font-semibold text-primary text-sm">{item.term}</span>
                              <span className="text-muted text-xs mx-1.5">→</span>
                              <span className="text-secondary text-xs">{item.meaning}</span>
                              {item.aliases && item.aliases.length > 0 && (
                                <p className="text-2xs text-muted mt-0.5 italic">Also: {item.aliases.join(", ")}</p>
                              )}
                            </div>
                            <button onClick={() => deleteVocab(item.id)}
                              className="text-muted/40 hover:text-danger opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0">
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

            {/* ── CALL SETUP TAB ── */}
            {tab === "setup" && (
              <div className="space-y-4">
                {/* Status */}
                <div className={`card p-4 border ${twilioConfigured ? "border-success/30 bg-success/5" : "border-yellow-400/20 bg-yellow-400/5"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {twilioConfigured ? <FiCheck size={15} className="text-success" /> : <FiAlertCircle size={15} className="text-yellow-400" />}
                    <p className={`font-semibold text-sm ${twilioConfigured ? "text-success" : "text-yellow-400"}`}>
                      {twilioConfigured ? "✅ AI Calling Active" : "⚠ Setup Required"}
                    </p>
                  </div>
                  <p className="text-xs text-secondary">
                    {twilioConfigured
                      ? "Customers call → AI records order → auto-call worker. Sab automatic!"
                      : "Apna Twilio account connect karo — ek baar karna hai, hamesha ke liye."}
                  </p>
                </div>

                {/* Twilio form */}
                <div className="card p-4">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                      <FiPhone size={14} className="text-red-400" />
                    </div>
                    <div>
                      <p className="font-bold text-primary text-sm">Twilio Credentials</p>
                      <p className="text-2xs text-muted">
                        <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">twilio.com</a>
                        {" "}pe free account → Console mein SID aur token copy karo
                      </p>
                    </div>
                  </div>
                  <form onSubmit={saveTwilio} className="space-y-3">
                    <div>
                      <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Account SID</label>
                      <input value={twilioForm.account_sid} onChange={e => setTwilioForm(f => ({ ...f, account_sid: e.target.value }))}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-accent/50 placeholder:text-muted/40" />
                      <p className="text-2xs text-muted mt-0.5">Dashboard pe milega — AC... se shuru hota hai</p>
                    </div>
                    <div>
                      <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Auth Token</label>
                      <div className="relative">
                        <input type={showToken ? "text" : "password"} value={twilioForm.auth_token}
                          onChange={e => setTwilioForm(f => ({ ...f, auth_token: e.target.value }))}
                          placeholder="••••••••••••••••••••••••••••••••"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 pr-10 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-accent/50 placeholder:text-muted/40" />
                        <button type="button" onClick={() => setShowToken(t => !t)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                          {showToken ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                        </button>
                      </div>
                      <p className="text-2xs text-muted mt-0.5">Account Info → Auth Token (reveal karo, copy karo)</p>
                    </div>
                    <div>
                      <label className="text-2xs text-muted font-semibold uppercase tracking-wider block mb-1">Phone Number</label>
                      <input value={twilioForm.phone_number} onChange={e => setTwilioForm(f => ({ ...f, phone_number: e.target.value }))}
                        placeholder="+14155552671"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-mono text-primary focus:outline-none focus:border-accent/50 placeholder:text-muted/40" />
                      <p className="text-2xs text-muted mt-0.5">+E.164 format — e.g. +14155552671</p>
                    </div>
                    <button type="submit" disabled={savingTwilio || !twilioForm.account_sid || !twilioForm.auth_token || !twilioForm.phone_number}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 ${twilioSaved ? "bg-success/20 text-success border border-success/30" : "bg-white text-black shadow-button-accent hover:bg-white/90"}`}>
                      {twilioSaved ? <><FiCheck size={14} /> Saved! Calling Active</> : savingTwilio ? <><FiRefreshCw size={13} className="animate-spin" /> Saving…</> : <><FiSave size={14} /> Save & Activate</>}
                    </button>
                  </form>
                </div>

                {/* Webhook URL */}
                {webhookUrl && (
                  <div className="card p-4">
                    <p className="font-semibold text-primary text-sm mb-1">Webhook URL — Twilio mein daalo</p>
                    <p className="text-xs text-muted mb-2">Console → Phone Numbers → Active Numbers → Voice → "A call comes in" → POST:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-2xs bg-surface-2 rounded-xl px-3 py-2.5 text-accent font-mono break-all border border-white/5">{webhookUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="shrink-0 p-2.5 rounded-xl bg-surface-2 hover:bg-surface-1 text-muted hover:text-primary transition-colors border border-white/5">
                        {copied ? <FiCheck size={14} className="text-success" /> : <FiCopy size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div className="card p-4">
                  <p className="font-bold text-primary mb-3 text-sm">Kaise kaam karta hai</p>
                  <div className="space-y-2.5">
                    {[
                      { icon: "📞", text: "Customer aapka Twilio number call karta hai" },
                      { icon: "🎙️", text: "AI namaste bolta hai, order record karta hai (Hindi/Hinglish)" },
                      { icon: "🧠", text: "Groq Whisper + aapka vocabulary → order extract" },
                      { icon: "💾", text: "Order automatically Today's Orders mein save" },
                      { icon: "🔔", text: "Aapko push notification milta hai turant" },
                      { icon: "🚚", text: "First active worker ko auto-call — full details ke saath" },
                    ].map(({ icon, text }, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-sm shrink-0">{icon}</span>
                        <p className="text-xs text-secondary">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

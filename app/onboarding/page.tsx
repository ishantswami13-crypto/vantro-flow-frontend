"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";
import {
  FiZap, FiArrowRight, FiCheck, FiUpload, FiUser,
  FiMapPin, FiRefreshCw, FiPlus, FiTrash2, FiPhone,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface ManualEntry { name: string; amount: string; days: string; phone: string }

const BUSINESS_TYPES = [
  { value: "distributor",  emoji: "📦", label: "Distributor / Wholesaler",       desc: "I sell goods to retailers and collect from them" },
  { value: "manufacturer", emoji: "🏭", label: "Manufacturer",                    desc: "I make products and invoice buyers" },
  { value: "service",      emoji: "💼", label: "Service / Agency / Freelancer",  desc: "I bill clients for services or projects" },
  { value: "retailer",     emoji: "🏪", label: "Retailer / Shop Owner",          desc: "I run a shop and manage supplier payments" },
  { value: "trader",       emoji: "📊", label: "Trader / Broker",                desc: "I buy and sell, managing receivables from many parties" },
  { value: "startup",      emoji: "🚀", label: "Startup / Tech Business",        desc: "I invoice clients or track subscriptions" },
];

const CITIES = [
  "Mumbai","Delhi","Bangalore","Pune","Hyderabad","Chennai",
  "Ahmedabad","Kolkata","Surat","Jaipur","Lucknow","Indore",
  "Nashik","Nagpur","Vadodara","Ludhiana","Agra","Patna","Other",
];

const tierColor = (t: string) => t === "high" ? "#10D98A" : t === "medium" ? "#F5A524" : "#F5424D";
const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`;

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-surface-3">
          <div className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: i < step ? "100%" : i === step ? "60%" : "0%" }} />
        </div>
      ))}
      <span className="text-2xs text-muted font-mono shrink-0">{Math.min(step + 1, total)}/{total}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const token  = typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importOk, setImportOk]   = useState(false);
  const [scored, setScored]       = useState<any[]>([]);
  const [briefing, setBriefing]   = useState("");

  // Step 0
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity]           = useState("");
  // Step 1
  const [bizType, setBizType]     = useState("");
  // Step 2
  const [mode, setMode]           = useState<"import" | "manual">("import");
  const [dragOver, setDragOver]   = useState(false);
  const [manualRows, setManualRows] = useState<ManualEntry[]>([
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveSettings = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ owner_name: ownerName, city, industry: bizType }),
      });
    } catch { /* non-blocking */ }
  }, [ownerName, city, bizType, token]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true); setImportMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${BASE}/api/import/excel`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const d = await r.json();
      if (d.success) { setImportMsg(`✅ ${d.imported} customers imported${d.skipped ? ` (${d.skipped} skipped)` : ""}`); setImportOk(true); }
      else setImportMsg(`❌ ${d.error || "Import failed"}${d.hint ? "\n💡 " + d.hint : ""}`);
    } catch { setImportMsg("❌ Upload failed. Check your connection."); }
    finally { setLoading(false); }
  }, [token]);

  const submitManual = useCallback(async () => {
    const entries = manualRows.filter(r => r.name.trim() && r.amount.trim());
    if (!entries.length) return false;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/import/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entries: entries.map(e => ({
          customer_name: e.name,
          invoice_amount: parseFloat(e.amount.replace(/[₹,]/g, "")),
          days_overdue: parseInt(e.days) || 0,
          customer_phone: e.phone,
        })) }),
      });
      const d = await r.json();
      if (d.success) { setImportOk(true); setImportMsg(`✅ ${d.imported} customers added`); return true; }
      else { setImportMsg(`❌ ${d.error}`); return false; }
    } catch { setImportMsg("❌ Failed."); return false; }
    finally { setLoading(false); }
  }, [manualRows, token]);

  const runScoring = useCallback(async () => {
    setStep(3);
    try {
      const r = await fetch(`${BASE}/api/ml/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) { setScored(d.debtors?.slice(0, 5) || []); setBriefing(d.briefing || ""); }
    } catch { /* show empty */ }
    setStep(4);
  }, [token]);

  const proceed = useCallback(async () => {
    if (step === 0) { if (!ownerName.trim()) return; setStep(1); }
    else if (step === 1) { if (!bizType) return; setStep(2); }
    else if (step === 2) {
      await saveSettings();
      if (mode === "manual") { const ok = await submitManual(); if (!ok && !importOk) return; }
      runScoring();
    }
  }, [step, ownerName, bizType, mode, saveSettings, submitManual, importOk, runScoring]);

  const useDemoData = useCallback(async () => {
    await saveSettings();
    const user = getUser();
    if (user?.id) try { await api.seed(user.id); } catch { /* ignore */ }
    runScoring();
  }, [saveSettings, runScoring]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gradient-accent rounded-xl flex items-center justify-center shadow-button-accent">
            <FiZap size={15} className="text-white" />
          </div>
          <span className="font-bold text-primary text-lg tracking-tight">Vantro</span>
        </div>

        <ProgressBar step={step} total={5} />

        {/* ── STEP 0: Name + City ──────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-primary">Namaste! 👋</h1>
              <p className="text-sm text-secondary mt-1">Let's set up your AI co-founder. 3 minutes.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">Your first name</label>
                <div className="relative">
                  <FiUser size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && ownerName.trim() && proceed()}
                    placeholder="Rajesh, Suresh, Priya..." autoFocus
                    className="w-full bg-surface-2 border border-border rounded-xl text-primary text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-accent transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-2">Your city</label>
                <div className="relative">
                  <FiMapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <select value={city} onChange={e => setCity(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl text-primary text-sm pl-9 pr-4 py-3 focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer">
                    <option value="">Select city (optional)</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={proceed} disabled={!ownerName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              Continue <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 1: Business type ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-primary">What's your business, {ownerName}?</h1>
              <p className="text-sm text-secondary mt-1">AI will customize everything for your workflow.</p>
            </div>
            <div className="space-y-2">
              {BUSINESS_TYPES.map(bt => (
                <button key={bt.value} onClick={() => setBizType(bt.value)}
                  className={[
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                    bizType === bt.value ? "border-accent/50 bg-accent-dim" : "border-border bg-surface-2 hover:border-border/60 hover:bg-surface-3",
                  ].join(" ")}>
                  <span className="text-2xl shrink-0">{bt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary">{bt.label}</p>
                    <p className="text-2xs text-muted mt-0.5">{bt.desc}</p>
                  </div>
                  {bizType === bt.value && <FiCheck size={16} className="text-accent shrink-0" />}
                </button>
              ))}
            </div>
            <button onClick={proceed} disabled={!bizType}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              Continue <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Data ──────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-primary">Add your customers</h1>
              <p className="text-sm text-secondary mt-1">Who owes you money? AI will score and prioritize instantly.</p>
            </div>

            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
              {(["import", "manual"] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={["flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    mode === m ? "bg-accent text-white shadow-button-accent" : "text-secondary hover:text-primary",
                  ].join(" ")}>
                  {m === "import" ? "📁 Import Excel / CSV" : "✍️ Add Manually"}
                </button>
              ))}
            </div>

            {/* IMPORT mode */}
            {mode === "import" && (
              <div className="space-y-3">
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current?.click()}
                  className={["border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    dragOver ? "border-accent bg-accent-dim" : "border-border hover:border-accent/40 hover:bg-surface-2",
                  ].join(" ")}>
                  {loading
                    ? <><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-muted">Importing...</p></>
                    : <><FiUpload size={22} className={`mx-auto mb-2 ${dragOver ? "text-accent" : "text-muted"}`} /><p className="text-sm font-semibold text-primary mb-1">Drop Excel or CSV here</p><p className="text-xs text-muted">Supports .xlsx, .xls, .csv · Any column names</p></>
                  }
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>

                <div className="p-3 bg-surface-2 rounded-xl border border-border">
                  <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-2">Your file just needs:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[["Customer Name","Ramesh Traders, Gupta & Co"],["Amount","45000, 28500, 72000"],["Date","15/03/2025, 2025-01-20"],["Phone (optional)","9876543210"]].map(([col, ex]) => (
                      <div key={col} className="text-2xs"><span className="font-bold text-secondary">{col}</span><span className="text-muted"> — {ex}</span></div>
                    ))}
                  </div>
                </div>

                {importMsg && (
                  <p className={`text-sm font-medium whitespace-pre-wrap ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>
                )}
              </div>
            )}

            {/* MANUAL mode */}
            {mode === "manual" && (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-1.5 px-1">
                  {["Customer Name *","Amount (₹) *","Days Due","Phone"].map((h, i) => (
                    <p key={h} className={`text-2xs font-bold text-muted uppercase tracking-wider ${i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : "col-span-3"}`}>{h}</p>
                  ))}
                </div>
                {manualRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5">
                    <input value={row.name} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, name: e.target.value } : v))}
                      placeholder="Ramesh Traders"
                      className="col-span-4 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-accent" />
                    <input value={row.amount} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, amount: e.target.value } : v))}
                      placeholder="45000" type="number"
                      className="col-span-3 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-accent" />
                    <input value={row.days} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, days: e.target.value } : v))}
                      placeholder="30" type="number"
                      className="col-span-2 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-accent" />
                    <div className="col-span-3 flex gap-1">
                      <input value={row.phone} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, phone: e.target.value } : v))}
                        placeholder="9876543210"
                        className="flex-1 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-accent min-w-0" />
                      {manualRows.length > 1 && (
                        <button onClick={() => setManualRows(r => r.filter((_, j) => j !== i))} className="text-muted hover:text-danger shrink-0">
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setManualRows(r => [...r, { name: "", amount: "", days: "", phone: "" }])}
                  className="flex items-center gap-1.5 text-xs text-accent hover:opacity-80 transition-colors">
                  <FiPlus size={13} /> Add another row
                </button>
                {importMsg && <p className={`text-sm font-medium ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            <button onClick={proceed}
              disabled={loading || (mode === "manual" && !manualRows.some(r => r.name && r.amount))}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              {loading ? <FiRefreshCw size={15} className="animate-spin" /> : null}
              {loading ? "Processing..." : "Score My Customers →"}
            </button>

            <button onClick={useDemoData} className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              Skip — use demo data instead →
            </button>
          </div>
        )}

        {/* ── STEP 3: Scoring animation ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-button-accent mx-auto animate-pulse">
              <FiZap size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary">AI is scoring your customers...</h2>
              <p className="text-sm text-muted mt-2">Running ML model · calculating payment probabilities</p>
            </div>
            <div className="space-y-2 max-w-xs mx-auto text-left">
              {["Running gradient boosting model...","Calculating payment probabilities...","Generating your morning briefing...","Building priority call list..."].map((msg, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
                  <p className="text-xs text-secondary">{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 4: Results ────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center shrink-0">
                <FiCheck size={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-primary">Ready, {ownerName}! 🎉</h1>
                <p className="text-sm text-secondary">Here's your first AI briefing:</p>
              </div>
            </div>

            {briefing && (
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
                <p className="text-2xs font-bold text-accent uppercase tracking-wider mb-2">AI Morning Briefing</p>
                <p className="text-sm text-secondary leading-relaxed">{briefing}</p>
              </div>
            )}

            {scored.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-secondary uppercase tracking-wider">Call These First Today</p>
                {scored.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-black shrink-0"
                      style={{ background: `${tierColor(d.tier)}18`, color: tierColor(d.tier), border: `1px solid ${tierColor(d.tier)}30` }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{d.customer_name}</p>
                      <p className="text-2xs text-muted">{fmt(d.invoice_amount)} · {d.days_overdue}d overdue</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black" style={{ color: tierColor(d.tier) }}>{d.paymentProb}%</p>
                      <p className="text-2xs text-muted">pay prob.</p>
                    </div>
                    {d.customer_phone && (
                      <a href={`tel:+91${d.customer_phone}`}
                        className="w-7 h-7 rounded-lg bg-success-dim border border-success/20 flex items-center justify-center text-success hover:bg-success hover:text-white transition-all">
                        <FiPhone size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {scored.length === 0 && !briefing && (
              <div className="p-5 bg-surface-2 border border-border rounded-xl text-center">
                <p className="text-sm text-secondary">Your AI Founder is ready. Add customers from Collections to see live scoring.</p>
              </div>
            )}

            <button onClick={() => router.push("/ai-chat")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-accent text-white font-black text-base shadow-button-accent hover:opacity-90 transition-all">
              Open AI Founder <FiArrowRight size={16} />
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              Go to Dashboard →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

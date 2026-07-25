"use client";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getUser, authHeaders } from "@/lib/api";
import {
  FiZap, FiArrowRight, FiCheck, FiUpload, FiUser,
  FiMapPin, FiRefreshCw, FiPlus, FiTrash2, FiPhone,
  FiAlertCircle, FiChevronRight,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { BUSINESS_TYPES, INDUSTRY_OPTIONS, type BusinessTypeKey } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface ManualEntry { name: string; amount: string; days: string; phone: string }

const CITIES = [
  "Mumbai","Delhi","Bangalore","Pune","Hyderabad","Chennai",
  "Ahmedabad","Kolkata","Surat","Jaipur","Lucknow","Indore",
  "Nashik","Nagpur","Vadodara","Ludhiana","Agra","Patna","Other",
];

// Industries — all 16 with emoji + short label for cards
const INDUSTRIES: { value: BusinessTypeKey; emoji: string; label: string }[] = [
  { value: "trading",       emoji: "🏪", label: "Trading / Distribution" },
  { value: "manufacturing", emoji: "🏭", label: "Manufacturing" },
  { value: "construction",  emoji: "🏗️", label: "Construction" },
  { value: "textile",       emoji: "🧵", label: "Textile & Garments" },
  { value: "pharma",        emoji: "💊", label: "Pharma / Medical" },
  { value: "grocery",       emoji: "🛒", label: "Grocery / FMCG" },
  { value: "restaurant",    emoji: "🍽️", label: "Restaurant / F&B" },
  { value: "real_estate",   emoji: "🏢", label: "Real Estate" },
  { value: "education",     emoji: "🎓", label: "Education" },
  { value: "healthcare",    emoji: "🏥", label: "Healthcare" },
  { value: "steel_metals",  emoji: "⚙️", label: "Steel & Metals" },
  { value: "auto_parts",    emoji: "🔧", label: "Auto Parts" },
  { value: "it_services",   emoji: "💻", label: "IT / Software" },
  { value: "logistics",     emoji: "🚛", label: "Logistics" },
  { value: "jewellery",     emoji: "💍", label: "Jewellery" },
  { value: "agriculture",   emoji: "🌾", label: "Agriculture" },
];

const tierColor = (t: string) =>
  t === "high" ? "#10D98A" : t === "medium" ? "#F5A524" : "#F5424D";
const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

// ── Paste-text parser ─────────────────────────────────────────────────────────
function parsePastedText(text: string): ManualEntry[] {
  const lines = text.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
  const results: ManualEntry[] = [];
  for (const line of lines) {
    const phoneMatch = line.match(/\b(\d{10})\b/);
    const phone = phoneMatch?.[1] || "";
    const stripped = phone ? line.replace(phone, "") : line;
    const parts = stripped.split(/[-,|:\t]+/).map(p => p.trim()).filter(Boolean);
    const namePart = parts.find(p => /[a-zA-Zऀ-ॿ]/.test(p)) || parts[0] || "";
    const name = namePart.replace(/[₹]/g, "").trim();
    let amount = "";
    let days = "";
    for (const p of parts) {
      if (p.trim() === namePart.trim()) continue;
      const cleaned = p.replace(/[₹,\s]/g, "");
      const lMatch = cleaned.match(/^(\d+\.?\d*)L$/i);
      if (lMatch) { amount = String(Math.round(parseFloat(lMatch[1]) * 100000)); continue; }
      const kMatch = cleaned.match(/^(\d+\.?\d*)K$/i);
      if (kMatch) { amount = String(Math.round(parseFloat(kMatch[1]) * 1000)); continue; }
      const daysMatch = p.match(/(\d+)\s*(days?|din|d)\b/i);
      if (daysMatch) { days = daysMatch[1]; continue; }
      const num = parseFloat(cleaned);
      if (!isNaN(num) && cleaned !== "") {
        if (num >= 500 && !amount) amount = String(Math.round(num));
        else if (num < 500 && !days) days = String(Math.round(num));
      }
    }
    if (name && (amount || days)) results.push({ name, amount, days, phone });
  }
  return results;
}

// ── Progress ──────────────────────────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={[
          "h-1 rounded-full transition-all duration-700",
          i < step ? "bg-white flex-1" : i === step ? "bg-white/40 flex-[2]" : "bg-surface-3 flex-1",
        ].join(" ")} />
      ))}
      <span className="text-2xs text-muted font-mono shrink-0 ml-1">{Math.min(step + 1, total)}/{total}</span>
    </div>
  );
}

// ── Feature preview card for selected industry ────────────────────────────────
function IndustryFeaturePreview({ industryKey }: { industryKey: BusinessTypeKey }) {
  const cfg = BUSINESS_TYPES[industryKey];
  if (!cfg) return null;
  return (
    <div className="mt-4 p-4 rounded-2xl border border-border bg-surface-2 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{cfg.emoji}</span>
        <div>
          <p className="text-xs font-black text-primary">{cfg.label}</p>
          <p className="text-2xs text-muted">{cfg.description}</p>
        </div>
      </div>
      <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-2">Key features activated →</p>
      <div className="space-y-1.5">
        {cfg.coreFeatures.slice(0, 4).map(f => (
          <div key={f.title} className="flex items-start gap-2">
            <span className="text-sm mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <p className="text-xs font-semibold text-primary">{f.title}</p>
              <p className="text-2xs text-muted leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {cfg.terms && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
          {[
            { label: "Customer", value: cfg.terms.customer },
            { label: "Invoice", value: cfg.terms.invoice },
          ].map(t => (
            <div key={t.label} className="px-2 py-1 rounded-lg bg-surface-3 border border-border">
              <span className="text-2xs text-muted">{t.label}: </span>
              <span className="text-2xs font-bold text-primary">{t.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  // Session lives in an HttpOnly cookie or localStorage depending on mode;

  // this component authenticates through authHeaders() either way.

  const TOTAL_STEPS = 5;
  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importOk, setImportOk]   = useState(false);
  const [scored, setScored]       = useState<any[]>([]);
  const [briefing, setBriefing]   = useState("");
  const [animating, setAnimating] = useState(false);

  // Step 0
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity]           = useState("");
  // Step 1 — Industry (primary selection)
  const [industry, setIndustry]   = useState<BusinessTypeKey | "">("");
  // Step 2 — Business profile
  const [bizSize, setBizSize]     = useState<"micro" | "small" | "medium" | "">("");
  const [gstReg, setGstReg]       = useState<boolean | null>(null);
  const [sellsCredit, setSellsCredit] = useState<boolean | null>(null);
  const [hasWorkers, setHasWorkers]   = useState<boolean | null>(null);
  // Step 3 — Data import
  const [mode, setMode]           = useState<"paste" | "import" | "manual">("paste");
  const [dragOver, setDragOver]   = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showTallyGuide, setShowTallyGuide] = useState(false);
  const [manualRows, setManualRows] = useState<ManualEntry[]>([
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsedEntries = useMemo(() => parsePastedText(pasteText), [pasteText]);

  const goNext = useCallback((target: number) => {
    setAnimating(true);
    setTimeout(() => { setStep(target); setAnimating(false); }, 200);
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/settings`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ owner_name: ownerName, city, industry }),
      });
    } catch {}
  }, [ownerName, city, industry]);

  const setupOnboarding = useCallback(async () => {
    localStorage.setItem("vantro_industry",      industry);
    localStorage.setItem("vantro_business_type", industry);
    localStorage.setItem("vantro_biz_size",      bizSize || "micro");
    localStorage.setItem("vantro_has_gst",       String(!!gstReg));
    localStorage.setItem("vantro_has_workers",   String(!!hasWorkers));
    localStorage.setItem("vantro_has_salesmen",  String(!!hasWorkers));
    localStorage.setItem("vantro_team_size",     hasWorkers ? "small" : "solo");
    localStorage.setItem("vantro_biz_flags", JSON.stringify({
      biz_type:       industry,
      sells_credit:   sellsCredit,
      has_workers:    hasWorkers,
      gst_registered: gstReg,
      biz_size:       bizSize,
    }));
    try {
      const r = await fetch(`${BASE}/api/onboarding/setup`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ industry, business_size: bizSize, gst_registered: gstReg, sells_on_credit: sellsCredit, has_workers: hasWorkers }),
      });
      const d = await r.json();
      if (d.success && d.feature_flags) localStorage.setItem("vantro_features", JSON.stringify(d.feature_flags));
    } catch {}
  }, [industry, bizSize, gstReg, sellsCredit, hasWorkers]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true); setImportMsg("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${BASE}/api/import/excel`, {
        method: "POST", headers: { ...authHeaders() }, credentials: "include", body: form,
      });
      const d = await r.json();
      if (d.success) { setImportMsg(`✅ ${d.imported} customers imported${d.skipped ? ` (${d.skipped} skipped)` : ""}`); setImportOk(true); }
      else setImportMsg(`❌ ${d.error || "Import failed"}${d.hint ? "\n💡 " + d.hint : ""}`);
    } catch { setImportMsg("❌ Upload failed. Check your connection."); }
    finally { setLoading(false); }
  }, []);

  const submitManual = useCallback(async (entries: ManualEntry[]) => {
    const valid = entries.filter(r => r.name.trim() && r.amount.trim());
    if (!valid.length) return false;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/import/manual`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ entries: valid.map(e => ({
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
  }, []);

  const runScoring = useCallback(async () => {
    goNext(4); // scoring animation step
    try {
      const r = await fetch(`${BASE}/api/ml/briefing`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
      });
      const d = await r.json();
      if (d.success) { setScored(d.debtors?.slice(0, 5) || []); setBriefing(d.briefing || ""); }
    } catch {}
    goNext(5); // results step
  }, [goNext]);

  const skipDataForNow = useCallback(async () => {
    await saveSettings();
    runScoring();
  }, [saveSettings, runScoring]);

  const step1Valid = !!industry;
  const step2Valid = bizSize && gstReg !== null && sellsCredit !== null && hasWorkers !== null;
  const canProceedStep3 = mode === "paste"
    ? (parsedEntries.length > 0 || importOk)
    : mode === "import" ? importOk
    : manualRows.some(r => r.name && r.amount);

  const proceed = useCallback(async () => {
    if (step === 0) { if (!ownerName.trim()) return; goNext(1); }
    else if (step === 1) { if (!industry) return; goNext(2); }
    else if (step === 2) {
      if (!step2Valid) return;
      await setupOnboarding();
      goNext(3);
    }
    else if (step === 3) {
      await saveSettings();
      if (mode === "paste" && parsedEntries.length > 0) await submitManual(parsedEntries);
      else if (mode === "manual") {
        const ok = await submitManual(manualRows);
        if (!ok && !importOk) return;
      }
      runScoring();
    }
  }, [step, ownerName, industry, step2Valid, mode, parsedEntries, manualRows, saveSettings, setupOnboarding, submitManual, importOk, runScoring, goNext]);

  const cfg = industry ? BUSINESS_TYPES[industry as BusinessTypeKey] : null;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark size={32} />
          <span className="font-black text-primary text-base tracking-tight">Starlane</span>
        </div>

        {step < 4 && <ProgressBar step={step} total={TOTAL_STEPS} />}

        <div className={animating ? "opacity-0 translate-y-2 transition-all duration-200" : "opacity-100 translate-y-0 transition-all duration-200"}>

        {/* ── STEP 0: Name + City ──────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <p className="text-2xs font-bold text-muted uppercase tracking-widest mb-1">Welcome to Starlane</p>
              <h1 className="text-3xl font-black text-primary leading-tight">Namaste! 👋</h1>
              <p className="text-sm text-secondary mt-1.5">
                Let's build your business OS. Takes 3 minutes — and your first AI briefing is ready at the end.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Your first name</label>
                <div className="relative">
                  <FiUser size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text" value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && ownerName.trim() && proceed()}
                    placeholder="Rajesh, Sunita, Priya..."
                    autoFocus
                    className="w-full bg-surface-2 border border-border rounded-xl text-primary text-sm pl-9 pr-4 py-3.5 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wider block mb-2">Your city <span className="text-muted font-normal normal-case">(optional)</span></label>
                <div className="relative">
                  <FiMapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <select
                    value={city} onChange={e => setCity(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl text-primary text-sm pl-9 pr-4 py-3.5 focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer">
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={proceed} disabled={!ownerName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-30 shadow-sm">
              Let's Go <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 1: Industry Selection ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-2xs font-bold text-muted uppercase tracking-widest mb-1">Industry</p>
              <h1 className="text-2xl font-black text-primary">What's your business, {ownerName}?</h1>
              <p className="text-sm text-secondary mt-1">
                We'll activate only the features your industry actually uses — and hide everything else.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.value}
                  onClick={() => setIndustry(ind.value)}
                  className={[
                    "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                    industry === ind.value
                      ? "border-white/30 bg-white/5"
                      : "border-border bg-surface-2 hover:border-border/80 hover:bg-surface-3",
                  ].join(" ")}>
                  <span className="text-2xl shrink-0">{ind.emoji}</span>
                  <p className="text-xs font-bold text-primary leading-tight">{ind.label}</p>
                  {industry === ind.value && (
                    <FiCheck size={14} className="text-white ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Feature preview — slides in when industry is selected */}
            {industry && <IndustryFeaturePreview industryKey={industry as BusinessTypeKey} />}

            <button onClick={proceed} disabled={!step1Valid}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-30 shadow-sm">
              Activate {cfg?.label || "My"} Features <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Business profile ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-2xs font-bold text-muted uppercase tracking-widest mb-1">Business Profile</p>
              <h1 className="text-2xl font-black text-primary">Tell us a bit more 🎯</h1>
              <p className="text-sm text-secondary mt-1">
                Answering these unlocks the exact right tools — no clutter.
              </p>
            </div>

            {/* Turnover */}
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Annual turnover?</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "micro",  emoji: "🌱", label: "Under ₹50L" },
                  { v: "small",  emoji: "📈", label: "₹50L – ₹5Cr" },
                  { v: "medium", emoji: "🏢", label: "₹5Cr+" },
                ].map(s => (
                  <button key={s.v} onClick={() => setBizSize(s.v as any)}
                    className={[
                      "p-3 rounded-xl border text-center transition-all",
                      bizSize === s.v ? "border-white/30 bg-white/5" : "border-border bg-surface-2 hover:border-border/80",
                    ].join(" ")}>
                    <span className="text-xl block mb-1.5">{s.emoji}</span>
                    <p className="text-xs font-bold text-primary leading-tight">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Yes/No questions */}
            <div className="space-y-4">
              {[
                { q: "Are you GST registered?",           val: gstReg,      set: setGstReg,      yes: "✅ Yes, I have GSTIN",       no: "❌ No / Not yet" },
                { q: "Do you sell on credit (udhaar)?",   val: sellsCredit, set: setSellsCredit, yes: "✅ Yes, most sales on credit", no: "💰 No, mostly cash/UPI" },
                { q: "Do you have employees or workers?", val: hasWorkers,  set: setHasWorkers,  yes: "👥 Yes, I have a team",       no: "🙋 Just me" },
              ].map(({ q, val, set, yes, no }) => (
                <div key={q}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: yes, v: true }, { label: no, v: false }].map(({ label, v }) => (
                      <button key={label} onClick={() => set(v)}
                        className={[
                          "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all text-left",
                          val === v ? "border-white/30 bg-white/5 text-primary" : "border-border bg-surface-2 text-secondary hover:border-border/80",
                        ].join(" ")}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={proceed} disabled={!step2Valid}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-30 shadow-sm">
              Build My Dashboard <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Data import ───────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-2xs font-bold text-muted uppercase tracking-widest mb-1">Your Data</p>
              <h1 className="text-2xl font-black text-primary">Add your customers</h1>
              <p className="text-sm text-secondary mt-1">
                Who owes you money? AI will score and prioritize them instantly.
              </p>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
              {([
                { id: "paste",  label: "📋 Paste List" },
                { id: "import", label: "📁 Excel" },
                { id: "manual", label: "✍️ Manual" },
              ] as const).map(({ id, label }) => (
                <button key={id} onClick={() => setMode(id)}
                  className={[
                    "flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    mode === id ? "bg-white text-black" : "text-secondary hover:text-primary",
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>

            {/* PASTE MODE */}
            {mode === "paste" && (
              <div className="space-y-3">
                <div className="p-3 bg-surface-2 border border-border rounded-xl">
                  <p className="text-xs font-bold text-primary mb-0.5">📝 Type or paste your list — any format</p>
                  <p className="text-2xs text-muted leading-relaxed">
                    "Sharma - 45000 - 60 days" · "Mehta, 82000, 30" · "Gupta 1.2L 45d 9876543210"
                  </p>
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={6}
                  placeholder={`Sharma Traders - 45000 - 60 days - 9876543210\nMehta Fabrics, 82000, 30\nGupta Steel 1.2L 45d\nPatel Agro - 28500 - 15 days`}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-4 py-3 focus:outline-none focus:border-white/20 transition-colors resize-none font-mono placeholder-muted/40"
                />
                {parsedEntries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FiCheck size={12} className="text-success" />
                      <p className="text-xs font-bold text-success">{parsedEntries.length} customers detected</p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border bg-surface-3">
                        {[["Customer","col-span-4"],["Amount","col-span-3"],["Days","col-span-2"],["Phone","col-span-3"]].map(([h, cls]) => (
                          <p key={h} className={`text-2xs font-bold text-muted uppercase tracking-wider ${cls}`}>{h}</p>
                        ))}
                      </div>
                      {parsedEntries.slice(0, 5).map((e, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border/50 last:border-0">
                          <p className="col-span-4 text-xs font-semibold text-primary truncate">{e.name}</p>
                          <p className="col-span-3 text-xs text-success font-mono">{e.amount ? `₹${Number(e.amount).toLocaleString("en-IN")}` : "—"}</p>
                          <p className="col-span-2 text-xs text-secondary">{e.days ? `${e.days}d` : "—"}</p>
                          <p className="col-span-3 text-xs text-muted">{e.phone || "—"}</p>
                        </div>
                      ))}
                      {parsedEntries.length > 5 && (
                        <p className="px-3 py-2 text-2xs text-muted">+{parsedEntries.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
                {pasteText && parsedEntries.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
                    <FiAlertCircle size={13} className="text-warning shrink-0" />
                    <p className="text-xs text-warning">Try "Name - Amount" (e.g. "Sharma - 45000")</p>
                  </div>
                )}
                {importMsg && <p className={`text-sm font-medium ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            {/* IMPORT MODE */}
            {mode === "import" && (
              <div className="space-y-3">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current?.click()}
                  className={[
                    "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    dragOver ? "border-white/30 bg-white/5" : "border-border hover:border-white/20 hover:bg-surface-2",
                  ].join(" ")}>
                  {loading
                    ? <><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-muted">Importing...</p></>
                    : <><FiUpload size={22} className={`mx-auto mb-2 ${dragOver ? "text-white" : "text-muted"}`} /><p className="text-sm font-semibold text-primary mb-1">Drop Excel or CSV here</p><p className="text-xs text-muted">Supports .xlsx, .xls, .csv · Any column names</p></>}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>

                {/* Tally guide */}
                <button onClick={() => setShowTallyGuide(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-border hover:border-white/20 transition-all text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏦</span>
                    <div>
                      <p className="text-xs font-bold text-primary">Use Tally? Export in 3 steps</p>
                      <p className="text-2xs text-muted">Tally Prime / ERP 9 → Outstanding Reports</p>
                    </div>
                  </div>
                  <span className="text-muted text-xs">{showTallyGuide ? "▲" : "▼"}</span>
                </button>
                {showTallyGuide && (
                  <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
                    {[
                      { step: "1", title: "Go to Reports", desc: "Gateway → Display → Statements of Accounts → Outstandings → Receivables" },
                      { step: "2", title: "Export Excel", desc: "Set date range to current. Press Alt+E to export." },
                      { step: "3", title: "Upload here", desc: "Drop that file above — Starlane auto-detects columns." },
                    ].map(({ step: s, title, desc }) => (
                      <div key={s} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-surface-3 border border-border flex items-center justify-center shrink-0">
                          <span className="text-2xs font-black text-secondary">{s}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{title}</p>
                          <p className="text-2xs text-muted mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {importMsg && <p className={`text-sm font-medium whitespace-pre-wrap ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            {/* MANUAL MODE */}
            {mode === "manual" && (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-1.5 px-1">
                  {[["Customer *","col-span-4"],["Amount *","col-span-3"],["Days","col-span-2"],["Phone","col-span-3"]].map(([h, cls]) => (
                    <p key={h} className={`text-2xs font-bold text-muted uppercase tracking-wider ${cls}`}>{h}</p>
                  ))}
                </div>
                {manualRows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5">
                    <input value={row.name} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, name: e.target.value } : v))}
                      placeholder="Ramesh Traders"
                      className="col-span-4 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-white/20" />
                    <input value={row.amount} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, amount: e.target.value } : v))}
                      placeholder="45000" type="number"
                      className="col-span-3 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-white/20" />
                    <input value={row.days} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, days: e.target.value } : v))}
                      placeholder="30" type="number"
                      className="col-span-2 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-white/20" />
                    <div className="col-span-3 flex gap-1">
                      <input value={row.phone} onChange={e => setManualRows(r => r.map((v, j) => j === i ? { ...v, phone: e.target.value } : v))}
                        placeholder="9876543210"
                        className="flex-1 bg-surface-2 border border-border rounded-lg text-xs text-primary px-2.5 py-2 focus:outline-none focus:border-white/20 min-w-0" />
                      {manualRows.length > 1 && (
                        <button onClick={() => setManualRows(r => r.filter((_, j) => j !== i))} className="text-muted hover:text-danger transition-colors shrink-0">
                          <FiTrash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => setManualRows(r => [...r, { name: "", amount: "", days: "", phone: "" }])}
                  className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors">
                  <FiPlus size={13} /> Add row
                </button>
                {importMsg && <p className={`text-sm font-medium ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            <button onClick={proceed} disabled={loading || !canProceedStep3}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all disabled:opacity-30 shadow-sm">
              {loading ? <FiRefreshCw size={15} className="animate-spin" /> : null}
              {loading ? "Processing..." : parsedEntries.length > 0 && mode === "paste" ? `Score ${parsedEntries.length} Customers →` : "Score & Prioritize →"}
            </button>

            {/* Clean skip — NO demo data */}
            <button onClick={skipDataForNow} className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              I'll add customers later — skip for now →
            </button>
          </div>
        )}

        {/* ── STEP 4: Scoring animation ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center space-y-8 py-10">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-surface-2 border border-border flex items-center justify-center">
                <FiZap size={28} className="text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-ping" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary">Building your workspace…</h2>
              <p className="text-sm text-muted mt-1">Activating features · Running AI model · Configuring for {cfg?.label}</p>
            </div>
            <div className="space-y-3 max-w-xs mx-auto text-left">
              {[
                `Activating ${cfg?.label || "industry"} features…`,
                "Running AI scoring model…",
                "Building your priority call list…",
                "Generating morning briefing…",
              ].map((msg, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
                  </div>
                  <p className="text-xs text-secondary">{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Results + Dashboard CTA ──────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/15 border border-success/30 flex items-center justify-center shrink-0">
                <FiCheck size={14} className="text-success" />
              </div>
              <div>
                <h1 className="text-xl font-black text-primary">Ready, {ownerName}! 🎉</h1>
                <p className="text-sm text-secondary">Your {cfg?.label || "business"} workspace is live.</p>
              </div>
            </div>

            {/* Features activated */}
            <div className="p-4 bg-surface-2 border border-border rounded-xl">
              <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-3">Features activated for you</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { on: true,              label: "Collections & Receivables" },
                  { on: true,              label: "WhatsApp Messaging" },
                  { on: true,              label: "AI Brain & Chat" },
                  { on: true,              label: "Today's Priority View" },
                  { on: !!gstReg,          label: "GST Invoice Generator" },
                  { on: !!sellsCredit,     label: `${cfg?.terms?.customer || "Customer"} Khata` },
                  { on: !!hasWorkers,      label: "Staff Attendance & Salary" },
                  { on: true,              label: "Cash Flow Forecast" },
                ].map(f => (
                  <div key={f.label} className={`flex items-center gap-2 ${f.on ? "text-primary" : "text-muted/30"}`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-2xs ${f.on ? "bg-success/15 text-success" : "bg-surface-3 text-muted/20"}`}>
                      {f.on ? "✓" : "—"}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Briefing */}
            {briefing && (
              <div className="p-4 bg-surface-2 border border-border rounded-xl">
                <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-2">AI Morning Briefing</p>
                <p className="text-sm text-secondary leading-relaxed">{briefing}</p>
              </div>
            )}

            {/* Top customers to call */}
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
                        className="w-7 h-7 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-muted hover:text-primary transition-all">
                        <FiPhone size={11} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {scored.length === 0 && !briefing && (
              <div className="p-5 bg-surface-2 border border-border rounded-xl text-center">
                <p className="text-sm text-secondary">Your workspace is ready. Add customers from the Collections page to start collecting.</p>
              </div>
            )}

            <button onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-black font-black text-base hover:bg-white/90 transition-all shadow-sm">
              Open My Dashboard <FiArrowRight size={16} />
            </button>
            <button onClick={() => router.push("/ai-chat")}
              className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              Talk to AI Founder first →
            </button>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

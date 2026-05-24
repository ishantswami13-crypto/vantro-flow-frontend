"use client";
// v2 — paste-list import, Tally guide
import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/api";
import {
  FiZap, FiArrowRight, FiCheck, FiUpload, FiUser,
  FiMapPin, FiRefreshCw, FiPlus, FiTrash2, FiPhone,
  FiAlertCircle,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface ManualEntry { name: string; amount: string; days: string; phone: string }

const BUSINESS_TYPES = [
  { value: "distributor",  emoji: "📦", label: "Distributor / Wholesaler",      desc: "I sell goods to retailers and collect from them" },
  { value: "manufacturer", emoji: "🏭", label: "Manufacturer",                   desc: "I make products and invoice buyers" },
  { value: "service",      emoji: "💼", label: "Service / Agency / Freelancer", desc: "I bill clients for services or projects" },
  { value: "retailer",     emoji: "🏪", label: "Retailer / Shop Owner",         desc: "I run a shop and manage supplier payments" },
  { value: "trader",       emoji: "📊", label: "Trader / Broker",               desc: "I buy and sell, managing receivables from many parties" },
  { value: "startup",      emoji: "🚀", label: "Startup / Tech Business",       desc: "I invoice clients or track subscriptions" },
];

const INDUSTRIES = [
  { value: "construction", emoji: "🏗️", label: "Construction / Building Material", desc: "Cement, rod, sand, tiles, bricks" },
  { value: "textile",      emoji: "👗", label: "Textile / Garments / Fashion",     desc: "Fabric, readymade, wholesale clothing" },
  { value: "grocery",      emoji: "🛒", label: "Grocery / FMCG / Food",            desc: "Atta, dal, oil, packaged food, beverages" },
  { value: "pharma",       emoji: "💊", label: "Pharma / Medical / Healthcare",    desc: "Medicines, surgical, medical supplies" },
  { value: "restaurant",   emoji: "🍽️", label: "Restaurant / Dhaba / Hotel",       desc: "Food & beverage service business" },
  { value: "general",      emoji: "🏢", label: "Other / General Business",         desc: "Doesn't fit above categories" },
];

const CITIES = [
  "Mumbai","Delhi","Bangalore","Pune","Hyderabad","Chennai",
  "Ahmedabad","Kolkata","Surat","Jaipur","Lucknow","Indore",
  "Nashik","Nagpur","Vadodara","Ludhiana","Agra","Patna","Other",
];

const tierColor = (t: string) => t === "high" ? "#10D98A" : t === "medium" ? "#F5A524" : "#F5424D";
const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n}`;

// ── Paste-text parser ─────────────────────────────────────────────────────────
function parsePastedText(text: string): ManualEntry[] {
  const lines = text.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
  const results: ManualEntry[] = [];

  for (const line of lines) {
    // Extract 10-digit phone first
    const phoneMatch = line.match(/\b(\d{10})\b/);
    const phone = phoneMatch?.[1] || "";
    const stripped = phone ? line.replace(phone, "") : line;

    // Split by common separators
    const parts = stripped.split(/[-,|:\t]+/).map(p => p.trim()).filter(Boolean);

    // Name = first part containing letters
    const namePart = parts.find(p => /[a-zA-Zऀ-ॿ]/.test(p)) || parts[0] || "";
    const name = namePart.replace(/[₹]/g, "").trim();

    let amount = "";
    let days = "";

    for (const p of parts) {
      if (p.trim() === namePart.trim()) continue;
      const cleaned = p.replace(/[₹,\s]/g, "");

      // L suffix (lakhs)
      const lMatch = cleaned.match(/^(\d+\.?\d*)L$/i);
      if (lMatch) { amount = String(Math.round(parseFloat(lMatch[1]) * 100000)); continue; }

      // K suffix (thousands)
      const kMatch = cleaned.match(/^(\d+\.?\d*)K$/i);
      if (kMatch) { amount = String(Math.round(parseFloat(kMatch[1]) * 1000)); continue; }

      // "X days" or "X din" or "Xd"
      const daysMatch = p.match(/(\d+)\s*(days?|din|d)\b/i);
      if (daysMatch) { days = daysMatch[1]; continue; }

      const num = parseFloat(cleaned);
      if (!isNaN(num) && cleaned !== "") {
        if (num >= 500 && !amount) { amount = String(Math.round(num)); }
        else if (num < 500 && !days) { days = String(Math.round(num)); }
      }
    }

    if (name && (amount || days)) {
      results.push({ name, amount, days, phone });
    }
  }
  return results;
}

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

function OptionCard({ selected, onClick, emoji, label, desc }: { selected: boolean; onClick: () => void; emoji: string; label: string; desc: string }) {
  return (
    <button onClick={onClick}
      className={[
        "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
        selected ? "border-accent/50 bg-accent-dim" : "border-border bg-surface-2 hover:border-border/60 hover:bg-surface-3",
      ].join(" ")}>
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-primary">{label}</p>
        <p className="text-2xs text-muted mt-0.5">{desc}</p>
      </div>
      {selected && <FiCheck size={16} className="text-accent shrink-0" />}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const token  = typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

  const TOTAL_STEPS = 6;
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
  const [industry, setIndustry]   = useState("");
  const [bizSize, setBizSize]     = useState<"micro" | "small" | "medium" | "">("");
  const [gstReg, setGstReg]       = useState<boolean | null>(null);
  const [sellsCredit, setSellsCredit] = useState<boolean | null>(null);
  const [hasWorkers, setHasWorkers]   = useState<boolean | null>(null);
  // Step 3 — Data import
  const [mode, setMode]           = useState<"paste" | "import" | "manual">("paste");
  const [dragOver, setDragOver]   = useState(false);
  // Paste mode
  const [pasteText, setPasteText] = useState("");
  const [showTallyGuide, setShowTallyGuide] = useState(false);
  // Manual mode
  const [manualRows, setManualRows] = useState<ManualEntry[]>([
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
    { name: "", amount: "", days: "", phone: "" },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live-parse paste text
  const parsedEntries = useMemo(() => parsePastedText(pasteText), [pasteText]);

  const saveSettings = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ owner_name: ownerName, city, industry }),
      });
    } catch { /* non-blocking */ }
  }, [ownerName, city, industry, token]);

  const setupOnboarding = useCallback(async () => {
    localStorage.setItem("vantro_industry", industry);
    localStorage.setItem("vantro_biz_flags", JSON.stringify({
      biz_type:       bizType,
      sells_credit:   sellsCredit,
      has_workers:    hasWorkers,
      gst_registered: gstReg,
      biz_size:       bizSize,
    }));

    try {
      const r = await fetch(`${BASE}/api/onboarding/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          industry,
          business_size: bizSize,
          gst_registered: gstReg,
          sells_on_credit: sellsCredit,
          has_workers: hasWorkers,
        }),
      });
      const d = await r.json();
      if (d.success && d.feature_flags) {
        localStorage.setItem("vantro_features", JSON.stringify(d.feature_flags));
      }
    } catch { /* non-blocking */ }
  }, [industry, bizType, bizSize, gstReg, sellsCredit, hasWorkers, token]);

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

  const submitManual = useCallback(async (entries: ManualEntry[]) => {
    const valid = entries.filter(r => r.name.trim() && r.amount.trim());
    if (!valid.length) return false;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/import/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
  }, [token]);

  const runScoring = useCallback(async () => {
    setStep(4);
    try {
      const r = await fetch(`${BASE}/api/ml/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.success) { setScored(d.debtors?.slice(0, 5) || []); setBriefing(d.briefing || ""); }
    } catch { /* show empty */ }
    setStep(5);
  }, [token]);

  const step2Valid = industry && bizSize && gstReg !== null && sellsCredit !== null && hasWorkers !== null;

  const proceed = useCallback(async () => {
    if (step === 0) { if (!ownerName.trim()) return; setStep(1); }
    else if (step === 1) { if (!bizType) return; setStep(2); }
    else if (step === 2) {
      if (!step2Valid) return;
      await setupOnboarding();
      setStep(3);
    }
    else if (step === 3) {
      await saveSettings();
      if (mode === "paste" && parsedEntries.length > 0) {
        await submitManual(parsedEntries);
      } else if (mode === "manual") {
        const ok = await submitManual(manualRows);
        if (!ok && !importOk) return;
      }
      runScoring();
    }
  }, [step, ownerName, bizType, step2Valid, mode, parsedEntries, manualRows, saveSettings, setupOnboarding, submitManual, importOk, runScoring]);

  const useDemoData = useCallback(async () => {
    await setupOnboarding();
    await saveSettings();
    const user = getUser();
    if (user?.id) try { await api.seed(user.id); } catch { /* ignore */ }
    runScoring();
  }, [saveSettings, setupOnboarding, runScoring]);

  const canProceedStep3 = mode === "paste"
    ? (parsedEntries.length > 0 || importOk)
    : mode === "import"
    ? importOk
    : manualRows.some(r => r.name && r.amount);

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

        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* ── STEP 0: Name + City ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-primary">Namaste! 👋</h1>
              <p className="text-sm text-secondary mt-1">Let's set up your AI business OS. 3 minutes.</p>
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

        {/* ── STEP 1: Business type ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-primary">What's your business, {ownerName}?</h1>
              <p className="text-sm text-secondary mt-1">AI will customize everything for your workflow.</p>
            </div>
            <div className="space-y-2">
              {BUSINESS_TYPES.map(bt => (
                <OptionCard key={bt.value} selected={bizType === bt.value} onClick={() => setBizType(bt.value)}
                  emoji={bt.emoji} label={bt.label} desc={bt.desc} />
              ))}
            </div>
            <button onClick={proceed} disabled={!bizType}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              Continue <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Industry + Operational Questions ─────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-primary">Tell us more 🎯</h1>
              <p className="text-sm text-secondary mt-1">We'll activate only the features you'll actually use.</p>
            </div>

            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">What industry are you in?</p>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map(ind => (
                  <button key={ind.value} onClick={() => setIndustry(ind.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${industry === ind.value ? "border-accent/50 bg-accent-dim" : "border-border bg-surface-2 hover:border-border/60"}`}>
                    <span className="text-xl block mb-1">{ind.emoji}</span>
                    <p className="text-xs font-bold text-primary leading-tight">{ind.label}</p>
                    {industry === ind.value && <FiCheck size={12} className="text-accent mt-1" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Annual turnover?</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "micro",  emoji: "🌱", label: "Under ₹50L",   desc: "Micro" },
                  { v: "small",  emoji: "📈", label: "₹50L – ₹5Cr",  desc: "Small" },
                  { v: "medium", emoji: "🏢", label: "₹5Cr+",         desc: "Medium" },
                ].map(s => (
                  <button key={s.v} onClick={() => setBizSize(s.v as any)}
                    className={`p-3 rounded-xl border text-center transition-all ${bizSize === s.v ? "border-accent/50 bg-accent-dim" : "border-border bg-surface-2 hover:border-border/60"}`}>
                    <span className="text-xl block mb-1">{s.emoji}</span>
                    <p className="text-xs font-bold text-primary">{s.label}</p>
                    <p className="text-2xs text-muted">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                { q: "Are you GST registered?",              val: gstReg,       set: setGstReg,       yes: "✅ Yes, I have GSTIN",          no: "❌ No / Not yet" },
                { q: "Do you sell on credit (udhaar)?",      val: sellsCredit,  set: setSellsCredit,  yes: "✅ Yes, most sales on credit",   no: "💰 No, mostly cash/UPI" },
                { q: "Do you have employees or workers?",    val: hasWorkers,   set: setHasWorkers,   yes: "👥 Yes, I have a team",          no: "🙋 No, just me" },
              ].map(({ q, val, set, yes, no }) => (
                <div key={q}>
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">{q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => set(true)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${val === true ? "border-accent/50 bg-accent-dim text-accent" : "border-border bg-surface-2 text-secondary hover:border-border/60"}`}>
                      {yes}
                    </button>
                    <button onClick={() => set(false)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${val === false ? "border-accent/50 bg-accent-dim text-accent" : "border-border bg-surface-2 text-secondary hover:border-border/60"}`}>
                      {no}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={proceed} disabled={!step2Valid}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              Activate My Features <FiArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Data import ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black text-primary">Add your customers</h1>
              <p className="text-sm text-secondary mt-1">Who owes you money? AI will score and prioritize instantly.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
              {([
                { id: "paste",  label: "📋 Paste List" },
                { id: "import", label: "📁 Import Excel" },
                { id: "manual", label: "✍️ Add Manually" },
              ] as const).map(({ id, label }) => (
                <button key={id} onClick={() => setMode(id)}
                  className={["flex-1 py-2 rounded-lg text-xs font-semibold transition-all",
                    mode === id ? "bg-accent text-white shadow-button-accent" : "text-secondary hover:text-primary",
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── PASTE MODE ── */}
            {mode === "paste" && (
              <div className="space-y-3">
                <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl">
                  <p className="text-xs font-bold text-accent mb-1">📝 Just type or paste your customer list</p>
                  <p className="text-2xs text-muted leading-relaxed">
                    Any format works — "Sharma - 45000 - 60 days", "Mehta, 82000, 30" or even "Gupta 1.2L 45d 9876543210"
                  </p>
                </div>

                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={6}
                  placeholder={`Sharma Traders - 45000 - 60 days - 9876543210\nMehta Fabrics, 82000, 30\nGupta Steel 1.2L 45d\nPatel Agro - 28500 - 15 days - 9654321098`}
                  className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-4 py-3 focus:outline-none focus:border-accent transition-colors resize-none font-mono placeholder-muted/50"
                />

                {/* Live preview */}
                {parsedEntries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FiCheck size={12} className="text-success" />
                      <p className="text-xs font-bold text-success">{parsedEntries.length} customers detected</p>
                    </div>
                    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border bg-surface-3">
                        {["Customer", "Amount", "Days", "Phone"].map((h, i) => (
                          <p key={h} className={`text-2xs font-bold text-muted uppercase tracking-wider ${i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : "col-span-3"}`}>{h}</p>
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
                    <p className="text-xs text-warning">Couldn't parse yet — try adding a name and amount (e.g. "Sharma - 45000")</p>
                  </div>
                )}

                {importMsg && <p className={`text-sm font-medium ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            {/* ── IMPORT MODE ── */}
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
                    {[["Customer Name","Ramesh Traders"],["Amount","45000, 28500"],["Date","15/03/2025"],["Phone (optional)","9876543210"]].map(([col, ex]) => (
                      <div key={col} className="text-2xs"><span className="font-bold text-secondary">{col}</span><span className="text-muted"> — {ex}</span></div>
                    ))}
                  </div>
                </div>

                {/* Tally Guide */}
                <button onClick={() => setShowTallyGuide(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent/30 transition-all text-left">
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
                    <p className="text-xs font-bold text-accent uppercase tracking-wider">Tally Export Guide</p>
                    {[
                      { step: "1", icon: "📂", title: "Go to Reports", desc: "In Tally: Gateway → Display → Statements of Accounts → Outstandings → Receivables" },
                      { step: "2", icon: "📊", title: "Select All Parties", desc: "Set date range to current. Press Alt+E or click Export to get the Excel file." },
                      { step: "3", icon: "⬆️", title: "Upload here", desc: "Drop that Excel file above. Vantro auto-detects columns — no formatting needed." },
                    ].map(({ step, icon, title, desc }) => (
                      <div key={step} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                          <span className="text-2xs font-black text-accent">{step}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{icon} {title}</p>
                          <p className="text-2xs text-muted mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-lg">
                      <p className="text-2xs text-warning font-medium">💡 Tip: Tally's "Ledger Outstanding" report works best. Any format is fine — Vantro reads it.</p>
                    </div>
                  </div>
                )}

                {importMsg && <p className={`text-sm font-medium whitespace-pre-wrap ${importOk ? "text-success" : "text-danger"}`}>{importMsg}</p>}
              </div>
            )}

            {/* ── MANUAL MODE ── */}
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
              disabled={loading || !canProceedStep3}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:opacity-90 transition-all disabled:opacity-40">
              {loading ? <FiRefreshCw size={15} className="animate-spin" /> : null}
              {loading ? "Processing..." : mode === "paste" && parsedEntries.length > 0 ? `Import ${parsedEntries.length} Customers →` : "Score My Customers →"}
            </button>

            <button onClick={useDemoData} className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              Skip — use demo data instead →
            </button>
          </div>
        )}

        {/* ── STEP 4: Scoring animation ─────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-button-accent mx-auto animate-pulse">
              <FiZap size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-primary">Setting up your workspace...</h2>
              <p className="text-sm text-muted mt-2">Activating features · Running AI model · Building your dashboard</p>
            </div>
            <div className="space-y-2 max-w-xs mx-auto text-left">
              {["Activating features based on your industry...","Running AI scoring model...","Building your priority call list...","Generating morning briefing..."].map((msg, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
                  <p className="text-xs text-secondary">{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Results ─────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center shrink-0">
                <FiCheck size={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-primary">Ready, {ownerName}! 🎉</h1>
                <p className="text-sm text-secondary">Your features are activated. Here's your first briefing:</p>
              </div>
            </div>

            <div className="p-4 bg-surface-2 border border-border rounded-xl">
              <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-3">Features Activated For You</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { on: true,                     label: "Collections & Receivables" },
                  { on: true,                     label: "WhatsApp Messaging" },
                  { on: true,                     label: "AI Brain & Chat" },
                  { on: true,                     label: "Today's P&L" },
                  { on: Boolean(gstReg),          label: "GST Invoice Generator" },
                  { on: Boolean(sellsCredit),     label: "Customer Khata / Udhaar" },
                  { on: Boolean(hasWorkers),      label: "Staff Attendance & Salary" },
                  { on: true,                     label: "Cash Flow Forecast" },
                ].map(f => (
                  <div key={f.label} className={`flex items-center gap-2 ${f.on ? "text-primary" : "text-muted/40"}`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${f.on ? "bg-success/20 text-success" : "bg-surface-3 text-muted/30"}`}>
                      {f.on ? "✓" : "—"}
                    </span>
                    {f.label}
                  </div>
                ))}
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
                <p className="text-sm text-secondary">Your workspace is ready. Explore your activated features in the sidebar.</p>
              </div>
            )}

            <button onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-accent text-white font-black text-base shadow-button-accent hover:opacity-90 transition-all">
              Open Dashboard <FiArrowRight size={16} />
            </button>
            <button onClick={() => router.push("/ai-chat")}
              className="w-full text-center text-xs text-muted hover:text-secondary transition-colors py-1">
              Talk to AI Founder →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import {
  FiUser, FiBriefcase, FiSliders, FiLink, FiCreditCard,
  FiLogOut, FiCheck, FiRefreshCw, FiCpu, FiMic,
  FiCheckCircle, FiZap, FiTrash2,
  FiMessageSquare, FiPhone, FiPackage,
} from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";
import { INDUSTRY_OPTIONS, setBusinessType } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Tab = "profile" | "business" | "voice" | "preferences" | "integrations" | "billing";

const TABS: { key: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: "profile",      label: "Profile",       icon: FiUser },
  { key: "business",     label: "Business",      icon: FiBriefcase },
  { key: "voice",        label: "AI Voice",      icon: FiCpu, badge: "NEW" },
  { key: "preferences",  label: "Preferences",   icon: FiSliders },
  { key: "integrations", label: "Integrations",  icon: FiLink },
  { key: "billing",      label: "Billing",       icon: FiCreditCard },
];

const industryOptions = INDUSTRY_OPTIONS;

const languageOptions = [
  { value: "hinglish", label: "Hinglish (Hindi + English)" },
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
];

const voiceStyleOptions = [
  { value: "casual_hinglish", label: "Casual Hinglish — 'Bhai', 'yaar', short & direct" },
  { value: "formal_hindi",    label: "Formal Hindi — 'Aap', respectful, full sentences" },
  { value: "direct_english",  label: "Direct English — professional, no-nonsense" },
  { value: "friendly_urdu",   label: "Friendly Urdu-Hindi mix — warm, relationship-first" },
  { value: "regional_hindi",  label: "Regional Hinglish — local dialect, city-specific" },
];

const timezoneOptions = [
  { value: "Asia/Kolkata", label: "IST — Asia/Kolkata (UTC+5:30)" },
];

const employeeOptions = [
  { value: "1-5",    label: "1–5 employees" },
  { value: "6-20",   label: "6–20 employees" },
  { value: "21-50",  label: "21–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "200+",   label: "200+ employees" },
];

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune",
  "Ahmedabad", "Kolkata", "Surat", "Jaipur", "Lucknow", "Kanpur",
  "Nagpur", "Indore", "Bhopal", "Patna", "Ludhiana", "Agra",
  "Nashik", "Vadodara", "Other",
];

export default function SettingsPage() {
  const [tab, setTab]       = useState<Tab>("profile");
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [profile, setProfile]   = useState({ full_name: "", email: "", phone: "", password: "" });
  const [business, setBusiness] = useState({ business_name: "", gstin: "", industry: "trading", team_size: "6-20", business_address: "", city: "", upi_id: "", invoice_prefix: "INV" });
  const [prefs, setPrefs]       = useState({ language: "hinglish", contact_time: "" });

  // Voice profile state
  const [voice, setVoice] = useState({
    owner_name:  "",
    city:        "",
    voice_style: "casual_hinglish",
    ai_persona:  "",
  });
  const [samples, setSamples] = useState(["", "", ""]);
  const [extracting, setExtracting]   = useState(false);
  const [extractResult, setExtractResult] = useState<{ style_description: string; sample_phrase: string } | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setProfile(p => ({ ...p, full_name: user.business_name || "", email: user.email || "", phone: user.phone || "" }));
      setBusiness(b => ({ ...b, business_name: user.business_name || "", gstin: user.gstin || "" }));
    }
    api.settings.get().then(({ settings }: any) => {
      if (settings.industry) {
        setBusiness(b => ({ ...b, industry: settings.industry }));
        setBusinessType(settings.industry); // keep localStorage in sync
      }
      if (settings.business_address)  setBusiness(b => ({ ...b, business_address: settings.business_address }));
      if (settings.city)              setBusiness(b => ({ ...b, city: settings.city }));
      if (settings.upi_id)            setBusiness(b => ({ ...b, upi_id: settings.upi_id }));
      if (settings.invoice_prefix)    setBusiness(b => ({ ...b, invoice_prefix: settings.invoice_prefix }));
      if (settings.language)          setPrefs(p => ({ ...p, language: settings.language }));
      if (settings.contact_time) setPrefs(p => ({ ...p, contact_time: settings.contact_time }));
      // Load voice profile
      if (settings.owner_name || settings.ai_persona) {
        setVoice({
          owner_name:  settings.owner_name  || "",
          city:        settings.city        || "",
          voice_style: settings.voice_style || "casual_hinglish",
          ai_persona:  settings.ai_persona  || "",
        });
        setVoiceActive(!!(settings.owner_name && settings.ai_persona));
      }
    }).catch(() => {});
  }, []);

  const save = async (body: Record<string, string>) => {
    setSaving(true); setError(""); setSaved(false);
    try {
      await api.settings.update(body as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave  = (e: React.FormEvent) => { e.preventDefault(); const body: Record<string, string> = { business_name: profile.full_name, phone: profile.phone }; if (profile.password) body.password = profile.password; save(body); };
  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Sync industry to localStorage so sidebar + industry page update immediately
    setBusinessType(business.industry);
    save({ business_name: business.business_name, gstin: business.gstin, industry: business.industry, business_address: business.business_address, city: business.city, upi_id: business.upi_id, invoice_prefix: business.invoice_prefix });
  };
  const handlePrefsSave    = (e: React.FormEvent) => { e.preventDefault(); save({ language: prefs.language, contact_time: prefs.contact_time }); };

  const handleVoiceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await save({
      owner_name:  voice.owner_name,
      city:        voice.city,
      voice_style: voice.voice_style,
      ai_persona:  voice.ai_persona,
    });
    setVoiceActive(!!(voice.owner_name && voice.ai_persona));
  };

  const handleExtractVoice = async () => {
    const validSamples = samples.filter(s => s.trim().length > 5);
    if (validSamples.length < 1) return;
    setExtracting(true);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${BASE}/api/ai/extract-voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ samples: validSamples }),
      });
      const data = await r.json();
      if (data.success) {
        setExtractResult({ style_description: data.style_description, sample_phrase: data.sample_phrase });
        setVoice(v => ({
          ...v,
          ai_persona:  data.style_description || v.ai_persona,
          voice_style: data.detected_style    || v.voice_style,
        }));
        setVoiceActive(true);
      }
    } catch { /* noop */ }
    finally { setExtracting(false); }
  };

  const clearVoice = async () => {
    setVoice({ owner_name: "", city: "", voice_style: "casual_hinglish", ai_persona: "" });
    setSamples(["", "", ""]);
    setExtractResult(null);
    setVoiceActive(false);
    await save({ owner_name: "", city: "", voice_style: "", ai_persona: "" });
  };

  const handleTallySync = () => { setSyncing(true); setTimeout(() => setSyncing(false), 2000); };
  const handleLogout    = () => { clearAuth(); document.cookie = "vantro_token=; path=/; max-age=0"; window.location.href = "/login"; };
  const initials = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Settings</h2>
          <p className="text-sm text-secondary mt-0.5">Manage your account, business, and AI preferences.</p>
        </div>

        {saved && <Alert variant="success" title="Saved">Your changes have been saved successfully.</Alert>}
        {error && <Alert variant="danger" title="Error">{error}</Alert>}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Tab nav */}
          <nav className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 shrink-0">
            {TABS.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  tab === key ? "bg-accent-dim text-accent" : "text-secondary hover:text-primary hover:bg-surface-2",
                ].join(" ")}>
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badge && (
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-success-dim text-success border border-success/20">
                    {badge}
                  </span>
                )}
                {key === "voice" && voiceActive && (
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">

            {/* ── Profile ─────────────────────────────── */}
            {tab === "profile" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">User Profile</h3>
                <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-14 h-14 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-accent">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{profile.full_name || "—"}</p>
                      <p className="text-xs text-secondary">{profile.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Full Name" type="text" value={profile.full_name}
                      onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                    <Input label="Phone" type="tel" prefix="+91" value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <Input label="Email" type="email" value={profile.email} readOnly />
                  <Input label="New Password" type="password" placeholder="Leave blank to keep current"
                    value={profile.password}
                    onChange={e => setProfile(p => ({ ...p, password: e.target.value }))} />
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Profile</Button>
                </form>
              </Card>
            )}

            {/* ── Business ────────────────────────────── */}
            {tab === "business" && (
              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">Business Information</h3>
                  <form onSubmit={handleBusinessSave} className="space-y-4 max-w-lg">
                    <Input label="Business / Company Name" type="text" value={business.business_name}
                      onChange={e => setBusiness(b => ({ ...b, business_name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="GST Number (GSTIN)" type="text" placeholder="22AAAAA0000A1Z5" value={business.gstin}
                        onChange={e => setBusiness(b => ({ ...b, gstin: e.target.value.toUpperCase() }))} />
                      <Select label="Industry" options={industryOptions} value={business.industry}
                        onChange={e => setBusiness(b => ({ ...b, industry: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Business Address</label>
                      <textarea value={business.business_address}
                        onChange={e => setBusiness(b => ({ ...b, business_address: e.target.value }))}
                        placeholder="Shop No. 12, Gandhi Nagar, Delhi - 110031"
                        rows={2}
                        className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none" />
                      <p className="text-2xs text-muted mt-1">Shown on GST invoices</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">City</label>
                        <select value={business.city}
                          onChange={e => setBusiness(b => ({ ...b, city: e.target.value }))}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors">
                          <option value="">Select city</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <Select label="Team Size" options={employeeOptions} value={business.team_size}
                        onChange={e => setBusiness(b => ({ ...b, team_size: e.target.value }))} />
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-secondary mb-3">Invoice Settings</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Invoice Prefix</label>
                          <input value={business.invoice_prefix}
                            onChange={e => setBusiness(b => ({ ...b, invoice_prefix: e.target.value.toUpperCase() }))}
                            placeholder="INV" maxLength={6}
                            className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                          <p className="text-2xs text-muted mt-1">Bills will be INV-2025-0001</p>
                        </div>
                        <Input label="UPI ID (for invoices)" type="text" placeholder="yourname@upi"
                          value={business.upi_id}
                          onChange={e => setBusiness(b => ({ ...b, upi_id: e.target.value }))} />
                      </div>
                    </div>
                    <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Business Info</Button>
                  </form>
                </Card>
              </div>
            )}

            {/* ── AI VOICE PROFILE ─────────────────────── */}
            {tab === "voice" && (
              <div className="space-y-4">
                {/* Header banner */}
                <div className="card-premium p-5 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
                      <FiCpu size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-primary">AI Voice Profile</p>
                        {voiceActive && (
                          <span className="flex items-center gap-1 text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full">
                            <FiCheckCircle size={10} /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary leading-relaxed">
                        Train AI Founder to sound exactly like you — your voice, your Hinglish, your style.
                        Every WhatsApp message, call script, and briefing will match how you actually talk.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 1: Basic info */}
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">1</span>
                    Your Identity
                  </h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Your First Name" type="text" placeholder="e.g. Rajesh"
                        value={voice.owner_name}
                        onChange={e => setVoice(v => ({ ...v, owner_name: e.target.value }))} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider">Business City</label>
                        <select value={voice.city}
                          onChange={e => setVoice(v => ({ ...v, city: e.target.value }))}
                          className="bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors">
                          <option value="">Select city</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Communication Style</label>
                      <div className="space-y-2">
                        {voiceStyleOptions.map(opt => (
                          <label key={opt.value} className={[
                            "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                            voice.voice_style === opt.value
                              ? "border-accent/40 bg-accent-dim"
                              : "border-border bg-surface-2 hover:border-border/70",
                          ].join(" ")}>
                            <input type="radio" name="voice_style" value={opt.value}
                              checked={voice.voice_style === opt.value}
                              onChange={e => setVoice(v => ({ ...v, voice_style: e.target.value }))}
                              className="accent-blue-500" />
                            <span className="text-sm text-secondary">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Step 2: Sample messages → AI extracts style */}
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">2</span>
                    Paste Your Real Messages
                  </h3>
                  <p className="text-xs text-muted mb-4 ml-7">Copy 2-3 WhatsApp messages you've actually sent to customers. AI will learn your exact style.</p>

                  <div className="space-y-3 max-w-lg">
                    {samples.map((s, i) => (
                      <div key={i}>
                        <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1">
                          Message {i + 1} {i === 0 ? "(required)" : "(optional)"}
                        </label>
                        <textarea value={s}
                          onChange={e => setSamples(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                          placeholder={i === 0
                            ? "e.g. Ramesh bhai, aapka ₹45,000 pending hai. Aaj possible hai kya?"
                            : "Paste another message..."}
                          rows={2}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none" />
                      </div>
                    ))}

                    <button onClick={handleExtractVoice}
                      disabled={extracting || !samples[0].trim()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-dim border border-accent/30 text-accent text-sm font-bold hover:bg-accent hover:text-white transition-all disabled:opacity-50">
                      {extracting
                        ? <><FiRefreshCw size={13} className="animate-spin" /> Analyzing your style...</>
                        : <><FiZap size={13} /> Train AI on My Voice</>}
                    </button>

                    {extractResult && (
                      <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <FiCheckCircle size={13} className="text-success" />
                          <p className="text-xs font-bold text-success">Voice Extracted!</p>
                        </div>
                        <p className="text-sm text-secondary leading-relaxed mb-2">{extractResult.style_description}</p>
                        {extractResult.sample_phrase && (
                          <div className="mt-2 p-2.5 bg-surface-2 rounded-lg border border-border">
                            <p className="text-2xs text-muted mb-1">Sample in your style:</p>
                            <p className="text-xs text-secondary italic">"{extractResult.sample_phrase}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Step 3: Manual description */}
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">3</span>
                    Describe Your Style (optional)
                  </h3>
                  <p className="text-xs text-muted mb-4 ml-7">Tell AI how you talk. Can be auto-filled from step 2, or write it yourself.</p>
                  <div className="max-w-lg">
                    <textarea
                      value={voice.ai_persona}
                      onChange={e => setVoice(v => ({ ...v, ai_persona: e.target.value }))}
                      placeholder="e.g. I talk in casual Hinglish. I use 'bhai' often. I keep messages short and to the point. I'm firm but not rude. I sometimes use 'theek hai' and 'kal pakka'."
                      rows={4}
                      className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none"
                    />
                    <p className="text-2xs text-muted mt-1.5">This description is injected into every AI prompt to match your voice.</p>
                  </div>
                </Card>

                {/* Save + Clear */}
                <form onSubmit={handleVoiceSave} className="flex items-center gap-3">
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>
                    Save Voice Profile
                  </Button>
                  {voiceActive && (
                    <button type="button" onClick={clearVoice}
                      className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors">
                      <FiTrash2 size={13} /> Reset Voice
                    </button>
                  )}
                </form>

                {/* How it works */}
                <div className="card-premium p-5">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">How It Works</p>
                  <div className="space-y-3">
                    {[
                      { Icon: FiMessageSquare, title: "WhatsApp Messages", desc: "Every message AI drafts sounds like YOU wrote it — not a robot",     color: "#10D98A" },
                      { Icon: FiPhone,         title: "Call Scripts",      desc: "Opening lines, objection handling in YOUR Hinglish style",            color: "#0066FF" },
                      { Icon: FiCpu,           title: "AI Chat",           desc: "Briefings and advice use your name and match your communication style", color: "#9B6DFF" },
                      { Icon: FiPackage,       title: "Bulk Messages",     desc: "Even bulk sends feel personal because they match your voice",           color: "#F5A524" },
                    ].map(({ Icon, title, desc, color }) => (
                      <div key={title} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                          <Icon size={13} style={{ color }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-primary">{title}</p>
                          <p className="text-2xs text-muted mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Preferences ─────────────────────────── */}
            {tab === "preferences" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Preferences</h3>
                <form onSubmit={handlePrefsSave} className="space-y-4 max-w-lg">
                  <Select label="Message Language" options={languageOptions} value={prefs.language}
                    onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} />
                  <Select label="Time Zone" options={timezoneOptions} value="Asia/Kolkata" onChange={() => {}} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary uppercase tracking-wider">Best Time to Call Customers</label>
                    <input type="time" value={prefs.contact_time}
                      onChange={e => setPrefs(p => ({ ...p, contact_time: e.target.value }))}
                      className="bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary uppercase tracking-wider">Currency</label>
                    <input type="text" defaultValue="INR — Indian Rupee (₹)" readOnly
                      className="bg-surface-2 border border-border rounded-md text-sm text-muted px-3 py-2.5 cursor-not-allowed" />
                  </div>
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Preferences</Button>
                </form>
              </Card>
            )}

            {/* ── Integrations ────────────────────────── */}
            {tab === "integrations" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Integrations</h3>
                <div className="space-y-4 max-w-lg">
                  {[
                    { name: "WhatsApp Business", desc: "Send collection messages via WhatsApp (wa.me deep links)", status: "connected", lastSync: "Active" },
                    { name: "Tally ERP 9",        desc: "Sync customers and invoices from Tally",                  status: "coming_soon", lastSync: null },
                    { name: "Razorpay",            desc: "Accept UPI and card payments via payment links",          status: "coming_soon", lastSync: null },
                    { name: "GST Portal",          desc: "Verify GSTIN and pull invoice data",                     status: "coming_soon", lastSync: null },
                  ].map((intg) => (
                    <div key={intg.name} className="flex items-start justify-between gap-4 p-4 bg-surface-2 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-primary">{intg.name}</p>
                          <Badge variant={intg.status === "connected" ? "success" : "muted"}>
                            {intg.status === "connected" ? "Connected" : "Coming Soon"}
                          </Badge>
                        </div>
                        <p className="text-xs text-secondary">{intg.desc}</p>
                        {intg.lastSync && <p className="text-2xs text-muted mt-1">Status: {intg.lastSync}</p>}
                      </div>
                      {intg.status === "connected" ? (
                        <Button variant="ghost" size="sm" loading={syncing} onClick={handleTallySync} icon={<FiRefreshCw size={12} />}>Sync</Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled>Soon</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Billing ─────────────────────────────── */}
            {tab === "billing" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-4">Billing & Plan</h3>
                <p className="text-sm text-secondary mb-4">Manage your subscription, upgrade your plan, and view invoice history.</p>
                <Button onClick={() => window.location.href = "/billing"} icon={<FiCreditCard size={14} />}>
                  Go to Billing Page
                </Button>
              </Card>
            )}

            {/* Logout — only on Profile tab */}
            {tab === "profile" && (
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-secondary">Sign out of Vantro</p>
                  <p className="text-2xs text-muted">You can log back in anytime</p>
                </div>
                <button onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-danger/30 text-danger text-xs font-semibold hover:bg-danger/10 transition-colors">
                  <FiLogOut size={12} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

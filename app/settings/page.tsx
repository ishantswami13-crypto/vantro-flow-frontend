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
  FiToggleLeft, FiToggleRight, FiPlus, FiSend,
  FiKey, FiAlertCircle, FiCopy, FiInfo,
} from "react-icons/fi";
import { api, getUser, clearAuth, type DunningRule } from "@/lib/api";
import { INDUSTRY_OPTIONS, setBusinessType } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Tab = "profile" | "business" | "voice" | "preferences" | "integrations" | "automation" | "billing";

const TABS: { key: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: "profile",      label: "Profile",       icon: FiUser },
  { key: "business",     label: "Business",      icon: FiBriefcase },
  { key: "voice",        label: "AI Voice",      icon: FiCpu, badge: "AI" },
  { key: "preferences",  label: "Preferences",   icon: FiSliders },
  { key: "integrations", label: "Integrations",  icon: FiLink },
  { key: "automation",   label: "Automation",    icon: FiZap, badge: "NEW" },
  { key: "billing",      label: "Billing",       icon: FiCreditCard },
];

const industryOptions  = INDUSTRY_OPTIONS;
const languageOptions  = [
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
const TONE_COLORS: Record<string, string> = {
  gentle: "#10D98A", firm: "#F5A524", urgent: "#F5424D",
};
const TONE_LABELS: Record<string, string> = {
  gentle: "🤝 Gentle", firm: "📢 Firm", urgent: "🚨 Urgent",
};
const employeeOptions = [
  { value: "1-5", label: "1–5 employees" }, { value: "6-20", label: "6–20 employees" },
  { value: "21-50", label: "21–50 employees" }, { value: "51-200", label: "51–200 employees" },
  { value: "200+", label: "200+ employees" },
];
const CITIES = [
  "Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Pune","Ahmedabad","Kolkata",
  "Surat","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Bhopal","Patna",
  "Ludhiana","Agra","Nashik","Vadodara","Other",
];
const timezoneOptions = [{ value: "Asia/Kolkata", label: "IST — Asia/Kolkata (UTC+5:30)" }];

const WEBHOOK_URL    = `${BASE}/api/payments/webhook`;
const WA_WEBHOOK_URL = `${BASE}/api/webhooks/whatsapp-inbound`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 border border-border text-xs text-secondary hover:text-accent transition-all">
      {copied ? <FiCheck size={11} className="text-success" /> : <FiCopy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab]       = useState<Tab>("profile");
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Form state
  const [profile, setProfile]   = useState({ full_name: "", email: "", phone: "", password: "" });
  const [business, setBusiness] = useState({ business_name: "", gstin: "", industry: "trading", team_size: "6-20", business_address: "", city: "", upi_id: "", invoice_prefix: "INV" });
  const [prefs, setPrefs]       = useState({ language: "hinglish", contact_time: "" });

  // Voice profile
  const [voice, setVoice] = useState({ owner_name: "", city: "", voice_style: "casual_hinglish", ai_persona: "" });
  const [samples, setSamples]         = useState(["", "", ""]);
  const [extracting, setExtracting]   = useState(false);
  const [extractResult, setExtractResult] = useState<{ style_description: string; sample_phrase: string } | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);

  // ── Integrations state ──────────────────────────────────
  const [waProvider, setWaProvider]       = useState<"interakt" | "wati">("interakt");
  const [waConnected, setWaConnected]     = useState(false);
  const [interaktKey, setInteraktKey]     = useState("");
  const [watiUrl, setWatiUrl]             = useState("");
  const [watiToken, setWatiToken]         = useState("");
  const [waLoading, setWaLoading]         = useState(false);
  const [waResult, setWaResult]           = useState<{ ok: boolean; msg: string } | null>(null);
  const [testLoading, setTestLoading]     = useState(false);
  const [testResult, setTestResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  const [rzpKeyId, setRzpKeyId]           = useState("");
  const [rzpSecret, setRzpSecret]         = useState("");
  const [rzpConnected, setRzpConnected]   = useState(false);
  const [rzpLoading, setRzpLoading]       = useState(false);
  const [rzpResult, setRzpResult]         = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Automation state ────────────────────────────────────
  const [autoEnabled, setAutoEnabled]     = useState(false);
  const [autoToggling, setAutoToggling]   = useState(false);
  const [rules, setRules]                 = useState<DunningRule[]>([]);
  const [rulesLoading, setRulesLoading]   = useState(false);
  const [newRule, setNewRule]             = useState({ trigger_day: 3, tone: "gentle", action: "whatsapp" });
  const [addingRule, setAddingRule]       = useState(false);
  const [showAddRule, setShowAddRule]     = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setProfile(p => ({ ...p, full_name: user.business_name || "", email: user.email || "", phone: user.phone || "" }));
      setBusiness(b => ({ ...b, business_name: user.business_name || "", gstin: user.gstin || "" }));
    }
    api.settings.get().then(({ settings }: any) => {
      if (settings.industry)          { setBusiness(b => ({ ...b, industry: settings.industry })); setBusinessType(settings.industry); }
      if (settings.business_address)  setBusiness(b => ({ ...b, business_address: settings.business_address }));
      if (settings.city)              setBusiness(b => ({ ...b, city: settings.city }));
      if (settings.upi_id)            setBusiness(b => ({ ...b, upi_id: settings.upi_id }));
      if (settings.invoice_prefix)    setBusiness(b => ({ ...b, invoice_prefix: settings.invoice_prefix }));
      if (settings.language)          setPrefs(p => ({ ...p, language: settings.language }));
      if (settings.contact_time)      setPrefs(p => ({ ...p, contact_time: settings.contact_time }));
      if (settings.owner_name || settings.ai_persona) {
        setVoice({ owner_name: settings.owner_name || "", city: settings.city || "", voice_style: settings.voice_style || "casual_hinglish", ai_persona: settings.ai_persona || "" });
        setVoiceActive(!!(settings.owner_name && settings.ai_persona));
      }
      // Integration fields
      if (settings.wa_provider)       setWaProvider(settings.wa_provider);
      if (settings.interakt_api_key)  setWaConnected(true);  // masked = key exists
      if (settings.wati_token)        setWaConnected(true);
      if (settings.razorpay_key_id)   { setRzpKeyId(settings.razorpay_key_id); setRzpConnected(true); }
      if (settings.automation_enabled !== undefined) setAutoEnabled(!!settings.automation_enabled);
    }).catch(() => {});
  }, []);

  // Load dunning rules when automation tab opens
  useEffect(() => {
    if (tab !== "automation") return;
    const user = getUser();
    if (!user?.id) return;
    setRulesLoading(true);
    api.dunning.list(user.id).then(d => setRules(d.rules || [])).catch(() => {}).finally(() => setRulesLoading(false));
  }, [tab]);

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const save = async (body: Record<string, unknown>) => {
    setSaving(true); setError(""); setSaved(false);
    try { await api.settings.update(body as any); showSaved(); }
    catch (e: any) { setError(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleProfileSave  = (e: React.FormEvent) => { e.preventDefault(); const body: Record<string, string> = { business_name: profile.full_name, phone: profile.phone }; if (profile.password) body.password = profile.password; save(body); };
  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessType(business.industry);
    try { const ex = JSON.parse(localStorage.getItem("vantro_biz_flags") || "{}"); localStorage.setItem("vantro_biz_flags", JSON.stringify({ ...ex, industry_override: business.industry })); } catch {}
    save({ business_name: business.business_name, gstin: business.gstin, industry: business.industry, business_address: business.business_address, city: business.city, upi_id: business.upi_id, invoice_prefix: business.invoice_prefix });
  };
  const handlePrefsSave    = (e: React.FormEvent) => { e.preventDefault(); save({ language: prefs.language, contact_time: prefs.contact_time }); };
  const handleVoiceSave    = async (e: React.FormEvent) => { e.preventDefault(); await save({ owner_name: voice.owner_name, city: voice.city, voice_style: voice.voice_style, ai_persona: voice.ai_persona }); setVoiceActive(!!(voice.owner_name && voice.ai_persona)); };
  const clearVoice         = async () => { setVoice({ owner_name: "", city: "", voice_style: "casual_hinglish", ai_persona: "" }); setSamples(["", "", ""]); setExtractResult(null); setVoiceActive(false); await save({ owner_name: "", city: "", voice_style: "", ai_persona: "" }); };

  const handleExtractVoice = async () => {
    const validSamples = samples.filter(s => s.trim().length > 5);
    if (!validSamples.length) return;
    setExtracting(true);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${BASE}/api/ai/extract-voice`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ samples: validSamples }) });
      const data = await r.json();
      if (data.success) { setExtractResult({ style_description: data.style_description, sample_phrase: data.sample_phrase }); setVoice(v => ({ ...v, ai_persona: data.style_description || v.ai_persona, voice_style: data.detected_style || v.voice_style })); setVoiceActive(true); }
    } catch { /* noop */ }
    finally { setExtracting(false); }
  };

  // ── Integration handlers ────────────────────────────────
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaLoading(true); setWaResult(null);
    try {
      const body: any = { provider: waProvider };
      if (waProvider === "interakt") body.interakt_api_key = interaktKey;
      else { body.wati_api_url = watiUrl; body.wati_token = watiToken; }
      await api.settings.saveWhatsApp(body);
      setWaConnected(true);
      setWaResult({ ok: true, msg: "WhatsApp credentials saved ✅" });
      setInteraktKey(""); setWatiToken(""); // clear secrets from state
    } catch (e: any) {
      setWaResult({ ok: false, msg: e.message || "Save failed" });
    } finally { setWaLoading(false); }
  };

  const handleTestWhatsApp = async () => {
    setTestLoading(true); setTestResult(null);
    try {
      const r = await api.settings.testWhatsApp();
      setTestResult({ ok: true, msg: r.message });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || "Test failed" });
    } finally { setTestLoading(false); }
  };

  const handleSaveRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    setRzpLoading(true); setRzpResult(null);
    try {
      const r = await api.settings.saveRazorpay({ key_id: rzpKeyId, key_secret: rzpSecret });
      setRzpConnected(true);
      setRzpResult({ ok: true, msg: r.message });
      setRzpSecret(""); // clear secret from state
    } catch (e: any) {
      setRzpResult({ ok: false, msg: e.message || "Save failed" });
    } finally { setRzpLoading(false); }
  };

  // ── Automation handlers ─────────────────────────────────
  const handleToggleAutomation = async () => {
    setAutoToggling(true);
    try {
      const r = await api.settings.toggleAutomation(!autoEnabled);
      setAutoEnabled(r.automation_enabled);
    } catch { /* noop */ }
    finally { setAutoToggling(false); }
  };

  const handleAddRule = async () => {
    setAddingRule(true);
    try {
      const user = getUser();
      const r = await api.dunning.create({ ...newRule, user_id: user?.id, enabled: true, name: `Day ${newRule.trigger_day} — ${newRule.tone}` });
      setRules(prev => [...prev, r.rule].sort((a, b) => a.trigger_day - b.trigger_day));
      setShowAddRule(false);
      setNewRule({ trigger_day: 3, tone: "gentle", action: "whatsapp" });
    } catch { /* noop */ }
    finally { setAddingRule(false); }
  };

  const handleToggleRule = async (rule: DunningRule) => {
    try {
      await api.dunning.update(rule.id, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch { /* noop */ }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.dunning.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { /* noop */ }
  };

  const handleLogout = () => { clearAuth(); document.cookie = "vantro_token=; path=/; max-age=0"; window.location.href = "/login"; };
  const initials = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Settings</h2>
          <p className="text-sm text-secondary mt-0.5">Manage your account, integrations, and automation.</p>
        </div>

        {saved && <Alert variant="success" title="Saved">Your changes have been saved successfully.</Alert>}
        {error && <Alert variant="danger" title="Error">{error}</Alert>}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Tab nav */}
          <nav className="lg:w-52 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 shrink-0">
            {TABS.map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setTab(key)}
                className={["flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all", tab === key ? "bg-accent-dim text-accent" : "text-secondary hover:text-primary hover:bg-surface-2"].join(" ")}>
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badge && <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-success-dim text-success border border-success/20">{badge}</span>}
                {key === "voice" && voiceActive && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
                {key === "automation" && autoEnabled && <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Profile ──────────────────────────────────── */}
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
                    <Input label="Full Name" type="text" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                    <Input label="Phone" type="tel" prefix="+91" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <Input label="Email" type="email" value={profile.email} readOnly />
                  <Input label="New Password" type="password" placeholder="Leave blank to keep current" value={profile.password} onChange={e => setProfile(p => ({ ...p, password: e.target.value }))} />
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Profile</Button>
                </form>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div><p className="text-xs font-semibold text-secondary">Sign out of Vantro</p><p className="text-2xs text-muted">You can log back in anytime</p></div>
                  <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-danger/30 text-danger text-xs font-semibold hover:bg-danger/10 transition-colors">
                    <FiLogOut size={12} /> Sign Out
                  </button>
                </div>
              </Card>
            )}

            {/* ── Business ──────────────────────────────────── */}
            {tab === "business" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Business Information</h3>
                <form onSubmit={handleBusinessSave} className="space-y-4 max-w-lg">
                  <Input label="Business / Company Name" type="text" value={business.business_name} onChange={e => setBusiness(b => ({ ...b, business_name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="GSTIN" type="text" placeholder="22AAAAA0000A1Z5" value={business.gstin} onChange={e => setBusiness(b => ({ ...b, gstin: e.target.value.toUpperCase() }))} />
                    <Select label="Industry" options={industryOptions} value={business.industry} onChange={e => setBusiness(b => ({ ...b, industry: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Business Address</label>
                    <textarea value={business.business_address} onChange={e => setBusiness(b => ({ ...b, business_address: e.target.value }))} placeholder="Shop No. 12, Gandhi Nagar, Delhi - 110031" rows={2}
                      className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">City</label>
                      <select value={business.city} onChange={e => setBusiness(b => ({ ...b, city: e.target.value }))}
                        className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors">
                        <option value="">Select city</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <Select label="Team Size" options={employeeOptions} value={business.team_size} onChange={e => setBusiness(b => ({ ...b, team_size: e.target.value }))} />
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-secondary mb-3">Invoice Settings</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Invoice Prefix</label>
                        <input value={business.invoice_prefix} onChange={e => setBusiness(b => ({ ...b, invoice_prefix: e.target.value.toUpperCase() }))} placeholder="INV" maxLength={6}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                        <p className="text-2xs text-muted mt-1">Bills will be INV-2025-0001</p>
                      </div>
                      <Input label="UPI ID (for invoices)" type="text" placeholder="yourname@upi" value={business.upi_id} onChange={e => setBusiness(b => ({ ...b, upi_id: e.target.value }))} />
                    </div>
                  </div>
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Business Info</Button>
                </form>
              </Card>
            )}

            {/* ── AI Voice ──────────────────────────────────── */}
            {tab === "voice" && (
              <div className="space-y-4">
                <div className="card-premium p-5 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0"><FiCpu size={16} className="text-white" /></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-primary">AI Voice Profile</p>
                        {voiceActive && <span className="flex items-center gap-1 text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full"><FiCheckCircle size={10} /> Active</span>}
                      </div>
                      <p className="text-xs text-secondary leading-relaxed">Train AI to sound exactly like you — your voice, your Hinglish, your style.</p>
                    </div>
                  </div>
                </div>
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">1</span>Your Identity</h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Your First Name" type="text" placeholder="e.g. Rajesh" value={voice.owner_name} onChange={e => setVoice(v => ({ ...v, owner_name: e.target.value }))} />
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider">Business City</label>
                        <select value={voice.city} onChange={e => setVoice(v => ({ ...v, city: e.target.value }))} className="bg-surface-2 border border-border rounded-xl text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors">
                          <option value="">Select city</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Communication Style</label>
                      <div className="space-y-2">
                        {voiceStyleOptions.map(opt => (
                          <label key={opt.value} className={["flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", voice.voice_style === opt.value ? "border-accent/40 bg-accent-dim" : "border-border bg-surface-2 hover:border-border/70"].join(" ")}>
                            <input type="radio" name="voice_style" value={opt.value} checked={voice.voice_style === opt.value} onChange={e => setVoice(v => ({ ...v, voice_style: e.target.value }))} className="accent-blue-500" />
                            <span className="text-sm text-secondary">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">2</span>Paste Your Real Messages</h3>
                  <p className="text-xs text-muted mb-4 ml-7">Copy 2-3 WhatsApp messages you've actually sent. AI learns your exact style.</p>
                  <div className="space-y-3 max-w-lg">
                    {samples.map((s, i) => (
                      <div key={i}>
                        <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1">Message {i + 1} {i === 0 ? "(required)" : "(optional)"}</label>
                        <textarea value={s} onChange={e => setSamples(prev => prev.map((v, j) => j === i ? e.target.value : v))} rows={2}
                          placeholder={i === 0 ? 'e.g. Ramesh bhai, aapka ₹45,000 pending hai. Aaj possible hai kya?' : 'Paste another message...'}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none" />
                      </div>
                    ))}
                    <button onClick={handleExtractVoice} disabled={extracting || !samples[0].trim()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-dim border border-accent/30 text-accent text-sm font-bold hover:bg-accent hover:text-white transition-all disabled:opacity-50">
                      {extracting ? <><FiRefreshCw size={13} className="animate-spin" /> Analyzing...</> : <><FiZap size={13} /> Train AI on My Voice</>}
                    </button>
                    {extractResult && (
                      <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-2"><FiCheckCircle size={13} className="text-success" /><p className="text-xs font-bold text-success">Voice Extracted!</p></div>
                        <p className="text-sm text-secondary leading-relaxed mb-2">{extractResult.style_description}</p>
                        {extractResult.sample_phrase && <div className="mt-2 p-2.5 bg-surface-2 rounded-lg border border-border"><p className="text-2xs text-muted mb-1">Sample in your style:</p><p className="text-xs text-secondary italic">"{extractResult.sample_phrase}"</p></div>}
                      </div>
                    )}
                  </div>
                </Card>
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-accent text-white text-2xs font-black flex items-center justify-center">3</span>Describe Your Style (optional)</h3>
                  <p className="text-xs text-muted mb-4 ml-7">Tell AI how you talk — auto-filled from step 2, or write it yourself.</p>
                  <div className="max-w-lg">
                    <textarea value={voice.ai_persona} onChange={e => setVoice(v => ({ ...v, ai_persona: e.target.value }))}
                      placeholder="e.g. I talk in casual Hinglish. I use 'bhai' often. I keep messages short and to the point."
                      rows={4} className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors resize-none" />
                  </div>
                </Card>
                <form onSubmit={handleVoiceSave} className="flex items-center gap-3">
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Voice Profile</Button>
                  {voiceActive && <button type="button" onClick={clearVoice} className="flex items-center gap-1.5 text-sm text-muted hover:text-danger transition-colors"><FiTrash2 size={13} /> Reset Voice</button>}
                </form>
              </div>
            )}

            {/* ── Preferences ──────────────────────────────── */}
            {tab === "preferences" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Preferences</h3>
                <form onSubmit={handlePrefsSave} className="space-y-4 max-w-lg">
                  <Select label="Message Language" options={languageOptions} value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} />
                  <Select label="Time Zone" options={timezoneOptions} value="Asia/Kolkata" onChange={() => {}} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary uppercase tracking-wider">Best Time to Call Customers</label>
                    <input type="time" value={prefs.contact_time} onChange={e => setPrefs(p => ({ ...p, contact_time: e.target.value }))}
                      className="bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                  </div>
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Preferences</Button>
                </form>
              </Card>
            )}

            {/* ── INTEGRATIONS ─────────────────────────────── */}
            {tab === "integrations" && (
              <div className="space-y-5">

                {/* WhatsApp */}
                <Card>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 flex items-center justify-center">
                        <FiMessageSquare size={15} className="text-[#25D366]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">WhatsApp Business</p>
                        <p className="text-2xs text-muted">Auto-send payment reminders & updates</p>
                      </div>
                    </div>
                    <Badge variant={waConnected ? "success" : "muted"}>{waConnected ? "Connected" : "Not connected"}</Badge>
                  </div>

                  <form onSubmit={handleSaveWhatsApp} className="space-y-4 max-w-lg">
                    {/* Provider selector */}
                    <div>
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-2">WhatsApp Provider</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["interakt", "wati"] as const).map(p => (
                          <button key={p} type="button" onClick={() => setWaProvider(p)}
                            className={["p-3 rounded-xl border text-sm font-semibold transition-all text-left", waProvider === p ? "border-accent/50 bg-accent-dim text-accent" : "border-border bg-surface-2 text-secondary hover:border-accent/30"].join(" ")}>
                            <p className="font-bold">{p === "interakt" ? "Interakt" : "WATI"}</p>
                            <p className="text-2xs font-normal opacity-70 mt-0.5">{p === "interakt" ? "interakt.ai — Popular in India" : "wati.io — WhatsApp BSP"}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {waProvider === "interakt" && (
                      <div>
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Interakt API Key</label>
                        <input type="password" value={interaktKey} onChange={e => setInteraktKey(e.target.value)} placeholder={waConnected ? "••••••••  (already saved — paste new to update)" : "Paste your Interakt API Key"}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                        <p className="text-2xs text-muted mt-1">Find it in <span className="text-accent">app.interakt.ai → Settings → API Key</span></p>
                      </div>
                    )}

                    {waProvider === "wati" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">WATI API URL</label>
                          <input type="text" value={watiUrl} onChange={e => setWatiUrl(e.target.value)} placeholder="https://live-server-XXXXX.wati.io"
                            className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">WATI Token</label>
                          <input type="password" value={watiToken} onChange={e => setWatiToken(e.target.value)} placeholder={waConnected ? "••••••••  (already saved — paste new to update)" : "Paste your WATI access token"}
                            className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                          <p className="text-2xs text-muted mt-1">Find it in <span className="text-accent">WATI Dashboard → API → Access Token</span></p>
                        </div>
                      </div>
                    )}

                    {waResult && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${waResult.ok ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                        {waResult.ok ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />} {waResult.msg}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="submit" icon={<FiKey size={13} />} loading={waLoading}>
                        {waConnected ? "Update Keys" : "Connect WhatsApp"}
                      </Button>
                      {waConnected && (
                        <button type="button" onClick={handleTestWhatsApp} disabled={testLoading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-2 text-secondary text-xs font-semibold hover:text-primary hover:border-accent/30 transition-all disabled:opacity-60">
                          {testLoading ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <FiSend size={12} />}
                          {testLoading ? "Sending..." : "Send Test Message"}
                        </button>
                      )}
                    </div>
                    {testResult && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${testResult.ok ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                        {testResult.ok ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />} {testResult.msg}
                      </div>
                    )}
                    {/* WA Inbound Webhook URL */}
                    <div className="p-3 bg-surface-2 border border-border rounded-xl mt-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-secondary">Reply-Pause Webhook (copy into your provider)</p>
                        <CopyButton text={WA_WEBHOOK_URL} />
                      </div>
                      <p className="text-xs font-mono text-muted break-all">{WA_WEBHOOK_URL}</p>
                      <p className="text-2xs text-muted mt-1.5">
                        When customers reply "kal", "2 din", "next week" etc., dunning auto-pauses for that invoice.
                        Interakt → Settings → Developer → Webhook URL. WATI → Configuration → Webhook.
                      </p>
                    </div>
                  </form>
                </Card>

                {/* Razorpay */}
                <Card>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                        <FiCreditCard size={15} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">Razorpay</p>
                        <p className="text-2xs text-muted">Accept UPI, card & netbanking via payment links</p>
                      </div>
                    </div>
                    <Badge variant={rzpConnected ? "success" : "muted"}>{rzpConnected ? "Connected" : "Not connected"}</Badge>
                  </div>

                  <form onSubmit={handleSaveRazorpay} className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Key ID (Public)</label>
                        <input type="text" value={rzpKeyId} onChange={e => setRzpKeyId(e.target.value)} placeholder="rzp_live_..."
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Key Secret</label>
                        <input type="password" value={rzpSecret} onChange={e => setRzpSecret(e.target.value)} placeholder={rzpConnected ? "••••••••" : "Your secret key"}
                          className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-3.5 py-2.5 focus:outline-none focus:border-accent transition-colors font-mono" />
                      </div>
                    </div>
                    <p className="text-2xs text-muted">Find both in <span className="text-accent">dashboard.razorpay.com → Settings → API Keys</span></p>

                    {/* Webhook URL */}
                    <div className="p-3 bg-surface-2 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-secondary">Webhook URL (copy this into Razorpay)</p>
                        <CopyButton text={WEBHOOK_URL} />
                      </div>
                      <p className="text-xs font-mono text-muted break-all">{WEBHOOK_URL}</p>
                      <p className="text-2xs text-muted mt-1.5">Razorpay → Settings → Webhooks → Add URL. Select event: <span className="font-mono">payment_link.paid</span></p>
                    </div>

                    {rzpResult && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${rzpResult.ok ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"}`}>
                        {rzpResult.ok ? <FiCheckCircle size={12} /> : <FiAlertCircle size={12} />} {rzpResult.msg}
                      </div>
                    )}
                    <Button type="submit" icon={<FiKey size={13} />} loading={rzpLoading} disabled={!rzpKeyId || !rzpSecret}>
                      {rzpConnected ? "Update Razorpay Keys" : "Connect Razorpay"}
                    </Button>
                  </form>
                </Card>

                {/* Info card */}
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex gap-3">
                  <FiInfo size={14} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-accent mb-1">How it works after connecting</p>
                    <ul className="text-2xs text-secondary space-y-1">
                      <li>• WhatsApp → Reminders auto-send to customers via your API</li>
                      <li>• Razorpay → Payment link included in every reminder message</li>
                      <li>• Customer pays → Invoice auto-closes → You get a push notification</li>
                      <li>• Customer gets a thank-you WhatsApp automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ── AUTOMATION ───────────────────────────────── */}
            {tab === "automation" && (
              <div className="space-y-5">

                {/* Master toggle */}
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-primary">Collections Automation</p>
                      <p className="text-xs text-secondary mt-0.5">
                        {autoEnabled ? "Running — reminders fire automatically every day at 9 AM IST" : "Paused — no reminders will auto-send until you enable this"}
                      </p>
                    </div>
                    <button onClick={handleToggleAutomation} disabled={autoToggling}
                      className={["flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border", autoEnabled ? "bg-success text-white border-success hover:opacity-90" : "bg-surface-2 text-secondary border-border hover:border-accent/40 hover:text-primary"].join(" ")}>
                      {autoToggling
                        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : autoEnabled ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />
                      }
                      {autoEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </Card>

                {/* How the automation loop works */}
                <div className="card-premium p-5">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-4">The Automation Loop</p>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {[
                        { icon: "📄", label: "Invoice Created", desc: "Customer gets WhatsApp: Invoice raised, pay by [date]", color: "#0066FF", always: true },
                        { icon: "🔔", label: "Your Dunning Rules", desc: "Reminders go out at Day 3, 7, 15... with payment link", color: "#F5A524", always: false },
                        { icon: "💰", label: "Customer Pays", desc: "Invoice auto-closed → Thank you WhatsApp → Push notification", color: "#10D98A", always: true },
                        { icon: "📊", label: "Daily Briefing (8 AM)", desc: "You get a WhatsApp summary of outstanding collections", color: "#9B6DFF", always: true },
                      ].map(({ icon, label, desc, color, always }) => (
                        <div key={label} className="relative flex gap-4 pl-10">
                          <div className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                            {icon}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-primary">{label}</p>
                              {always && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-muted">Always on</span>}
                            </div>
                            <p className="text-2xs text-muted mt-0.5">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dunning Rules */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-primary">Reminder Rules</p>
                      <p className="text-2xs text-muted">Set when and how reminders go out. Cron fires daily at 9 AM IST.</p>
                    </div>
                    <button onClick={() => setShowAddRule(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all shadow-sm">
                      <FiPlus size={12} /> Add Rule
                    </button>
                  </div>

                  {/* Add rule form */}
                  {showAddRule && (
                    <div className="mb-4 p-4 bg-surface-2 border border-border rounded-xl space-y-4">
                      <p className="text-xs font-semibold text-primary">New Reminder Rule</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-2xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Trigger (days overdue)</label>
                          <input type="number" min={1} max={90} value={newRule.trigger_day}
                            onChange={e => setNewRule(r => ({ ...r, trigger_day: Number(e.target.value) }))}
                            className="w-full bg-surface border border-border rounded-lg text-sm text-primary px-3 py-2 focus:outline-none focus:border-accent font-mono" />
                        </div>
                        <div>
                          <label className="text-2xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Tone</label>
                          <div className="flex gap-1">
                            {(["gentle", "firm", "urgent"] as const).map(t => (
                              <button key={t} type="button" onClick={() => setNewRule(r => ({ ...r, tone: t }))}
                                className="flex-1 py-2 rounded-lg text-2xs font-bold border transition-all"
                                style={newRule.tone === t ? { background: `${TONE_COLORS[t]}20`, borderColor: `${TONE_COLORS[t]}60`, color: TONE_COLORS[t] } : { background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--secondary)" }}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-2xs font-medium text-secondary uppercase tracking-wider block mb-1.5">Action</label>
                          <div className="flex gap-1">
                            {(["whatsapp", "call"] as const).map(a => (
                              <button key={a} type="button" onClick={() => setNewRule(r => ({ ...r, action: a }))}
                                className={["flex-1 py-2 rounded-lg text-2xs font-bold border transition-all", newRule.action === a ? "bg-accent-dim border-accent/50 text-accent" : "bg-surface border-border text-secondary"].join(" ")}>
                                {a === "whatsapp" ? "📱 WA" : "📞 Call"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-surface border border-border rounded-lg">
                        <p className="text-2xs text-muted">
                          Preview: <span className="text-secondary font-medium">When an invoice is <span className="text-primary font-bold">{newRule.trigger_day} days</span> overdue, send a <span style={{ color: TONE_COLORS[newRule.tone] }} className="font-bold">{newRule.tone}</span> {newRule.action === "whatsapp" ? "WhatsApp" : "call"} with a payment link.</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddRule} disabled={addingRule}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-60 shadow-sm">
                          {addingRule ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck size={12} />}
                          Save Rule
                        </button>
                        <button onClick={() => setShowAddRule(false)} className="px-4 py-2 rounded-xl text-xs text-secondary hover:text-primary transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Rules list */}
                  {rulesLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-2 rounded-xl animate-pulse" />)}
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                      <FiZap size={24} className="mx-auto mb-2 text-muted opacity-50" />
                      <p className="text-sm text-secondary">No automation rules yet</p>
                      <p className="text-2xs text-muted mt-1">Add a rule to start auto-sending reminders</p>
                      <button onClick={() => setShowAddRule(true)} className="mt-3 text-xs text-accent hover:underline">Add your first rule →</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Visual timeline */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
                        <div className="shrink-0 text-2xs text-muted px-2">Day 0</div>
                        {rules.map((rule, i) => (
                          <div key={rule.id} className="flex items-center gap-2 shrink-0">
                            <div className="w-12 h-px bg-border" />
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-2xs font-black border-2"
                                style={{ background: rule.enabled ? `${TONE_COLORS[rule.tone]}20` : "var(--surface-2)", borderColor: rule.enabled ? TONE_COLORS[rule.tone] : "var(--border)", color: rule.enabled ? TONE_COLORS[rule.tone] : "var(--muted)" }}>
                                {rule.trigger_day}
                              </div>
                              <span className="text-2xs text-muted mt-0.5">{rule.action === "whatsapp" ? "📱" : "📞"}</span>
                            </div>
                          </div>
                        ))}
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="w-12 h-px bg-border" />
                          <span className="text-sm text-muted">→</span>
                        </div>
                      </div>

                      {/* Rule cards */}
                      {rules.map(rule => (
                        <div key={rule.id} className={["flex items-center gap-4 p-4 rounded-xl border transition-all", rule.enabled ? "bg-surface border-border" : "bg-surface-2/50 border-border/50 opacity-60"].join(" ")}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border"
                            style={{ background: `${TONE_COLORS[rule.tone]}15`, borderColor: `${TONE_COLORS[rule.tone]}30`, color: TONE_COLORS[rule.tone] }}>
                            {rule.trigger_day}d
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-primary">Day {rule.trigger_day} overdue</span>
                              <span className="text-2xs font-bold px-2 py-0.5 rounded-full border" style={{ background: `${TONE_COLORS[rule.tone]}15`, borderColor: `${TONE_COLORS[rule.tone]}30`, color: TONE_COLORS[rule.tone] }}>
                                {TONE_LABELS[rule.tone]}
                              </span>
                              <span className="text-2xs text-muted">{rule.action === "whatsapp" ? "📱 WhatsApp" : "📞 Call"} with payment link</span>
                            </div>
                            {rule.sent != null && <p className="text-2xs text-muted mt-0.5">{rule.sent} reminders sent</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => handleToggleRule(rule)}
                              className={["px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all", rule.enabled ? "bg-success-dim text-success border-success/30 hover:opacity-80" : "bg-surface border-border text-muted hover:text-secondary"].join(" ")}>
                              {rule.enabled ? "On" : "Off"}
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommended setup */}
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl">
                  <p className="text-xs font-bold text-accent mb-2">⚡ Recommended Setup for Indian MSMEs</p>
                  <div className="space-y-1">
                    {[
                      { day: 3,  tone: "gentle",  desc: "Gentle reminder — most customers pay here" },
                      { day: 7,  tone: "firm",    desc: "Firm follow-up — payment link prominent" },
                      { day: 15, tone: "urgent",  desc: "Urgent notice — this is your last soft ask" },
                      { day: 30, tone: "urgent",  desc: "Final notice — consider legal action" },
                    ].map(({ day, tone, desc }) => (
                      <div key={day} className="flex items-center gap-2 text-2xs text-secondary">
                        <span className="w-12 font-bold text-primary">Day {day}</span>
                        <span className="font-bold" style={{ color: TONE_COLORS[tone] }}>{tone}</span>
                        <span className="text-muted">— {desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Billing ──────────────────────────────────── */}
            {tab === "billing" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-4">Billing & Plan</h3>
                <p className="text-sm text-secondary mb-4">Manage your subscription, upgrade your plan, and view invoice history.</p>
                <Button onClick={() => window.location.href = "/billing"} icon={<FiCreditCard size={14} />}>Go to Billing Page</Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

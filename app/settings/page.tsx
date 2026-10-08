"use client";

import { IdentityAvatar } from "@/components/identity/IdentityAvatar";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, SkeletonRows, EmptyLine } from "@/components/v32/ui";
import {
  IconUser, IconBox, IconSparkle, IconSettings, IconWhatsApp, IconSync, IconInvoice,
  IconLogout, IconTrash, IconPlus, IconSun, IconMoon,
} from "@/components/v32/icons";
import { Panel, Group, Fields, Field, Prefixed, Segmented, Switch, SaveBar, SettingsStyles } from "@/components/settings/SettingsUI";
import { api, getUser, clearAuth, type DunningRule, type DeliveryLine, type DeliveryStatus, authHeaders } from "@/lib/api";
import { INDUSTRY_OPTIONS, setBusinessType } from "@/lib/businessTypes";
import { getTheme, setTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { formatCount } from "@/lib/format";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const OFFLINE = "Couldn't reach Starlane. Check your connection and try again.";
const NOT_SAVED = "Your changes weren't saved. Check your connection and try again.";

type Tab = "profile" | "business" | "preferences" | "voice" | "integrations" | "automation" | "billing";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile",      label: "Profile",        icon: <IconUser size={15} /> },
  { key: "business",     label: "Business",       icon: <IconBox size={15} /> },
  { key: "preferences",  label: "Preferences",    icon: <IconSettings size={15} /> },
  { key: "voice",        label: "Message voice",  icon: <IconSparkle size={15} /> },
  { key: "integrations", label: "Delivery",       icon: <IconWhatsApp size={15} /> },
  { key: "automation",   label: "Reminder rules", icon: <IconSync size={15} /> },
  { key: "billing",      label: "Billing",        icon: <IconInvoice size={15} /> },
];
// Older links (?tab=integrations, ?tab=automation, ?tab=voice) keep working.
const TAB_KEYS = new Set<Tab>(TABS.map(t => t.key));

const languageOptions = [
  { value: "hinglish", label: "Hinglish (Hindi and English)" },
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
];
const voiceStyleOptions = [
  { value: "casual_hinglish", label: "Casual Hinglish", hint: "'Bhai', 'yaar', short and direct" },
  { value: "formal_hindi",    label: "Formal Hindi", hint: "'Aap', respectful, full sentences" },
  { value: "direct_english",  label: "Direct English", hint: "Professional, no-nonsense" },
  { value: "friendly_urdu",   label: "Friendly Urdu-Hindi", hint: "Warm, relationship-first" },
  { value: "regional_hindi",  label: "Regional Hinglish", hint: "Local dialect, city-specific" },
];
const CITIES = [
  "Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Pune","Ahmedabad","Kolkata",
  "Surat","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Bhopal","Patna",
  "Ludhiana","Agra","Nashik","Vadodara","Other",
];

// Reminder tone in the shared status language.
const TONE: Record<string, { label: string; tone: StatusTone }> = {
  gentle: { label: "Gentle", tone: "positive" },
  firm: { label: "Firm", tone: "attention" },
  urgent: { label: "Urgent", tone: "critical" },
};
const ACTION_LABEL: Record<string, string> = { whatsapp: "WhatsApp", call: "Call", email: "Email" };

/** Delivery line status: unknown (not loaded) is never shown as active. */
function DeliveryChip({ line }: { line?: DeliveryLine }) {
  if (!line) return <StatusChip tone="unknown">Not known yet</StatusChip>;
  return line.active ? <StatusChip tone="positive">Active</StatusChip> : <StatusChip tone="attention">Not active</StatusChip>;
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const notify = useToast();
  const requestedTab = searchParams.get("tab");
  const initialTab: Tab = requestedTab && TAB_KEYS.has(requestedTab as Tab) ? (requestedTab as Tab) : "profile";
  const [tab, setTabState] = useState<Tab>(initialTab);
  // Keep the URL in sync so each section is a real deep-linkable destination.
  const setTab = (t: Tab) => {
    setTabState(t);
    setError(""); setSaved(false);
    router.replace(`${pathname}?tab=${t}`, { scroll: false });
  };
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Form state
  const [profile, setProfile]   = useState({ full_name: "", email: "", phone: "", current_password: "", password: "" });
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null);
  const [business, setBusiness] = useState({ business_name: "", gstin: "", industry: "trading", business_address: "", city: "", upi_id: "", invoice_prefix: "INV" });
  const [prefs, setPrefs]       = useState({ language: "hinglish", contact_time: "" });
  const [theme, setThemeState]  = useState<Theme>("dark");

  // Voice profile
  const [voice, setVoice] = useState({ owner_name: "", city: "", voice_style: "casual_hinglish", ai_persona: "" });
  const [samples, setSamples]         = useState(["", "", ""]);
  const [extracting, setExtracting]   = useState(false);
  const [extractResult, setExtractResult] = useState<{ style_description: string; sample_phrase: string } | null>(null);
  const [extractFailed, setExtractFailed] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  // Delivery test (WhatsApp only; the rest is Starlane-managed)
  const [testLoading, setTestLoading]     = useState(false);
  const [testResult, setTestResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  // Reminder rules
  const [autoEnabled, setAutoEnabled]     = useState(false);
  const [autoToggling, setAutoToggling]   = useState(false);
  const [rules, setRules]                 = useState<DunningRule[]>([]);
  const [rulesLoading, setRulesLoading]   = useState(false);
  const [rulesFailed, setRulesFailed]     = useState(false);
  const [newRule, setNewRule]             = useState({ trigger_day: 3, tone: "gentle", action: "whatsapp" });
  const [addingRule, setAddingRule]       = useState(false);
  const [showAddRule, setShowAddRule]     = useState(false);
  const [deleteRule, setDeleteRule]       = useState<DunningRule | null>(null);

  useEffect(() => {
    setThemeState(getTheme());
    const on = () => setThemeState(getTheme());
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);

  const loadSettings = useCallback(() => {
    setLoadFailed(false);
    const user = getUser();
    if (user) {
      setProfile(p => ({ ...p, email: user.email || "", phone: user.phone || "" }));
      setBusiness(b => ({ ...b, business_name: user.business_name || "", gstin: user.gstin || "" }));
    }
    api.settings.get().then(({ settings: raw }) => {
      const bag = (raw || {}) as unknown as Record<string, unknown>;
      // Read a saved text value; anything that isn't a non-empty string is "not set".
      const str = (k: string): string => (typeof bag[k] === "string" ? (bag[k] as string) : "");
      const settings = { automation_enabled: raw?.automation_enabled };
      const industry = str("industry"), address = str("business_address"), city = str("city"), upi = str("upi_id"), prefix = str("invoice_prefix");
      const language = str("language"), contactTime = str("contact_time"), ownerName = str("owner_name"), phone = str("phone");
      const voiceStyle = str("voice_style"), persona = str("ai_persona");
      if (industry)    { setBusiness(b => ({ ...b, industry })); setBusinessType(industry); }
      if (address)     setBusiness(b => ({ ...b, business_address: address }));
      if (city)        setBusiness(b => ({ ...b, city }));
      if (upi)         setBusiness(b => ({ ...b, upi_id: upi }));
      if (prefix)      setBusiness(b => ({ ...b, invoice_prefix: prefix }));
      if (language)    setPrefs(p => ({ ...p, language }));
      if (contactTime) setPrefs(p => ({ ...p, contact_time: contactTime }));
      if (ownerName)   setProfile(p => ({ ...p, full_name: ownerName }));
      if (phone)       setProfile(p => ({ ...p, phone: p.phone || phone }));
      if (ownerName || persona) {
        setVoice({ owner_name: ownerName, city, voice_style: voiceStyle || "casual_hinglish", ai_persona: persona });
        setVoiceActive(!!(ownerName && persona));
      }
      if (settings.automation_enabled !== undefined) setAutoEnabled(!!settings.automation_enabled);
      setLoaded(true);
    }).catch(() => setLoadFailed(true));
    api.settings.deliveryStatus().then(setDelivery).catch(() => setDelivery(null));
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Load reminder rules when that section opens
  const loadRules = useCallback(() => {
    const user = getUser();
    if (!user?.id) return;
    setRulesLoading(true); setRulesFailed(false);
    api.dunning.list(user.id).then(d => setRules(d.rules || [])).catch(() => setRulesFailed(true)).finally(() => setRulesLoading(false));
  }, []);
  useEffect(() => { if (tab === "automation") loadRules(); }, [tab, loadRules]);

  const showSaved = () => { setSaved(true); notify("Saved", "positive"); setTimeout(() => setSaved(false), 4000); };

  const save = async (body: Record<string, unknown>) => {
    // Saving after a failed load would overwrite real values with blank defaults.
    if (loadFailed) { setError("Your saved settings couldn't be loaded, so nothing was saved. Try again once they load."); return false; }
    setSaving(true); setError(""); setSaved(false);
    try { await api.settings.update(body as Parameters<typeof api.settings.update>[0]); showSaved(); return true; }
    catch { setError(NOT_SAVED); return false; }
    finally { setSaving(false); }
  };

  // Full name is the owner's name (owner_name); the business name lives in
  // Business. A password change goes to its own route and needs the current
  // password.
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.password && !profile.current_password) { setError("Enter your current password to set a new one."); return; }
    if (profile.password && profile.password.length < 8) { setError("The new password must be at least 8 characters."); return; }
    const ok = await save({ owner_name: profile.full_name, phone: profile.phone });
    if (ok && profile.password) {
      setSaving(true);
      try {
        await api.settings.changePassword(profile.current_password, profile.password);
        setProfile(p => ({ ...p, current_password: "", password: "" }));
        showSaved();
      } catch (err) {
        const m = err instanceof Error ? err.message : "";
        setError(/current|incorrect|invalid|wrong/i.test(m) ? "Your current password didn't match, so the password wasn't changed." : "Your password wasn't changed. Check your connection and try again.");
      }
      finally { setSaving(false); }
    }
  };
  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessType(business.industry);
    try { const ex = JSON.parse(localStorage.getItem("vantro_biz_flags") || "{}"); localStorage.setItem("vantro_biz_flags", JSON.stringify({ ...ex, industry_override: business.industry })); } catch {}
    save({ business_name: business.business_name, gstin: business.gstin, industry: business.industry, business_address: business.business_address, city: business.city, upi_id: business.upi_id, invoice_prefix: business.invoice_prefix });
  };
  const handlePrefsSave = (e: React.FormEvent) => { e.preventDefault(); save({ language: prefs.language, contact_time: prefs.contact_time }); };
  const handleVoiceSave = async (e: React.FormEvent) => { e.preventDefault(); const ok = await save({ owner_name: voice.owner_name, city: voice.city, voice_style: voice.voice_style, ai_persona: voice.ai_persona }); if (ok) setVoiceActive(!!(voice.owner_name && voice.ai_persona)); };
  const clearVoice = async () => { setVoice({ owner_name: "", city: "", voice_style: "casual_hinglish", ai_persona: "" }); setSamples(["", "", ""]); setExtractResult(null); setVoiceActive(false); await save({ owner_name: "", city: "", voice_style: "", ai_persona: "" }); };

  const handleExtractVoice = async () => {
    const validSamples = samples.filter(s => s.trim().length > 5);
    if (!validSamples.length) return;
    setExtracting(true); setExtractFailed(false);
    try {
      const r = await fetch(`${BASE}/api/ai/extract-voice`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ samples: validSamples }) });
      const data = await r.json();
      if (data.success) { setExtractResult({ style_description: data.style_description, sample_phrase: data.sample_phrase }); setVoice(v => ({ ...v, ai_persona: data.style_description || v.ai_persona, voice_style: data.detected_style || v.voice_style })); setVoiceActive(true); }
      else setExtractFailed(true);
    } catch { setExtractFailed(true); }
    finally { setExtracting(false); }
  };

  const handleTestWhatsApp = async () => {
    setTestLoading(true); setTestResult(null);
    try {
      const r = await api.settings.testWhatsApp();
      setTestResult({ ok: true, msg: r.message || "Test message sent." });
    } catch {
      setTestResult({ ok: false, msg: delivery?.whatsapp.reason ? `The test message wasn't sent: ${delivery.whatsapp.reason.replace(/\.$/, "")}.` : `The test message wasn't sent. ${OFFLINE}` });
    } finally { setTestLoading(false); }
  };

  const handleToggleAutomation = async () => {
    setAutoToggling(true);
    try {
      const r = await api.settings.toggleAutomation(!autoEnabled);
      setAutoEnabled(r.automation_enabled);
      notify(r.automation_enabled ? "Reminders turned on" : "Reminders paused", "positive");
    } catch { notify(`Reminders weren't changed. ${OFFLINE}`, "critical"); }
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
      notify("Rule added", "positive");
    } catch { notify(`The rule wasn't added. ${OFFLINE}`, "critical"); }
    finally { setAddingRule(false); }
  };

  const handleToggleRule = async (rule: DunningRule) => {
    try {
      await api.dunning.update(rule.id, { enabled: !rule.enabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    } catch { notify(`The rule wasn't changed. ${OFFLINE}`, "critical"); }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.dunning.delete(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setDeleteRule(null);
      notify("Rule deleted", "neutral");
    } catch { notify(`The rule wasn't deleted. ${OFFLINE}`, "critical"); }
  };

  const handleLogout = () => { clearAuth(); document.cookie = "vantro_token=; path=/; max-age=0"; window.location.href = "/login"; };
  const initials = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  // A section that edits saved values waits for them; a failed load says so
  // and disables saving rather than showing blanks that look real.
  const gate = (node: React.ReactNode) => {
    if (loadFailed) return <div className="ui-panel"><ErrorState title="Couldn't load your settings" message={OFFLINE} onRetry={loadSettings} /></div>;
    if (!loaded) return <div className="ui-panel" style={{ padding: "8px 22px" }}><SkeletonRows rows={4} height={56} /></div>;
    return node;
  };
  const bar = (label: string) => <SaveBar saving={saving} saved={saved} error={error} label={label} disabled={loadFailed} />;

  return (
    <DashboardLayout pageTitle="Settings">
      <SettingsStyles />
      <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader title="Settings" subtitle="Your account, your business and how Starlane works for you." />

        <div className="set-layout">
          <nav aria-label="Settings sections" className="set-nav">
            {TABS.map(({ key, label, icon }) => (
              <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}>
                <span aria-hidden="true" style={{ display: "inline-flex", color: tab === key ? "var(--ink)" : "var(--ink-3)" }}>{icon}</span>
                <span>{label}</span>
                {key === "voice" && voiceActive && <span className="set-on">On</span>}
                {key === "automation" && autoEnabled && <span className="set-on">On</span>}
              </button>
            ))}
          </nav>

          <div className="min-w-0 fade-once" key={tab} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Profile */}
            {tab === "profile" && gate(
              <>
                <form onSubmit={handleProfileSave}>
                  <Panel id="sec-profile" title="Profile" description="Your name and how Starlane reaches you." footer={bar("Save profile")}>
                    <div className="flex items-center" style={{ gap: 14, marginBottom: 20 }}>
                      <IdentityAvatar name={initials} size={44} initial />
                      <div className="min-w-0">
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{profile.full_name || "Your name"}</div>
                        <div className="truncate" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{profile.email}</div>
                      </div>
                    </div>
                    <Fields>
                      <Field label="Full name" htmlFor="full_name">
                        <input id="full_name" className="ui-input" type="text" autoComplete="name" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                      </Field>
                      <Field label="Phone" htmlFor="phone">
                        <Prefixed prefix="+91">
                          <input id="phone" className="ui-input tabular-nums" type="tel" autoComplete="tel-national" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                        </Prefixed>
                      </Field>
                      <Field label="Email" htmlFor="email" hint="Your sign-in email can't be changed here." wide>
                        <input id="email" className="ui-input" type="email" value={profile.email} readOnly />
                      </Field>
                    </Fields>
                    <Group title="Password" hint="Leave both blank to keep your current password.">
                      <Fields>
                        <Field label="Current password" htmlFor="current_password">
                          <input id="current_password" className="ui-input" type="password" autoComplete="current-password" value={profile.current_password} onChange={e => setProfile(p => ({ ...p, current_password: e.target.value }))} />
                        </Field>
                        <Field label="New password" htmlFor="new_password" hint="At least 8 characters.">
                          <input id="new_password" className="ui-input" type="password" autoComplete="new-password" value={profile.password} onChange={e => setProfile(p => ({ ...p, password: e.target.value }))} />
                        </Field>
                      </Fields>
                    </Group>
                  </Panel>
                </form>
                <div className="ui-panel flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "16px 22px" }}>
                  <div>
                    <div style={{ fontSize: 13.5, color: "var(--ink)" }}>Sign out</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Ends your session in this browser.</div>
                  </div>
                  <Button variant="secondary" onClick={handleLogout} icon={<IconLogout size={14} />}>Sign out</Button>
                </div>
              </>
            )}

            {/* Business */}
            {tab === "business" && gate(
              <form onSubmit={handleBusinessSave}>
                <Panel id="sec-business" title="Business" description="Shown on your invoices and used to tailor what Starlane looks for." footer={bar("Save business details")}>
                  <Fields>
                    <Field label="Business name" htmlFor="business_name" wide>
                      <input id="business_name" className="ui-input" type="text" autoComplete="organization" value={business.business_name} onChange={e => setBusiness(b => ({ ...b, business_name: e.target.value }))} />
                    </Field>
                    <Field label="GSTIN" htmlFor="gstin">
                      <input id="gstin" className="ui-input tabular-nums" type="text" placeholder="22AAAAA0000A1Z5" value={business.gstin} onChange={e => setBusiness(b => ({ ...b, gstin: e.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Industry" htmlFor="industry">
                      <select id="industry" className="ui-input" value={business.industry} onChange={e => setBusiness(b => ({ ...b, industry: e.target.value }))}>
                        {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Address" htmlFor="business_address" wide>
                      <textarea id="business_address" className="ui-input" rows={2} style={{ resize: "vertical" }} placeholder="Shop 12, Gandhi Nagar, Delhi 110031" value={business.business_address} onChange={e => setBusiness(b => ({ ...b, business_address: e.target.value }))} />
                    </Field>
                    <Field label="City" htmlFor="city">
                      <select id="city" className="ui-input" value={business.city} onChange={e => setBusiness(b => ({ ...b, city: e.target.value }))}>
                        <option value="">Select a city</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </Fields>
                  <Group title="Invoices">
                    <Fields>
                      <Field label="Invoice prefix" htmlFor="invoice_prefix" hint={`Bills are numbered ${business.invoice_prefix || "INV"}-${new Date().getFullYear()}-0001.`}>
                        <input id="invoice_prefix" className="ui-input" maxLength={6} placeholder="INV" value={business.invoice_prefix} onChange={e => setBusiness(b => ({ ...b, invoice_prefix: e.target.value.toUpperCase() }))} />
                      </Field>
                      <Field label="UPI ID" htmlFor="upi_id" hint="Printed on invoices for quick payment.">
                        <input id="upi_id" className="ui-input" type="text" placeholder="yourname@upi" value={business.upi_id} onChange={e => setBusiness(b => ({ ...b, upi_id: e.target.value }))} />
                      </Field>
                    </Fields>
                  </Group>
                </Panel>
              </form>
            )}

            {/* Preferences */}
            {tab === "preferences" && (
              <>
                <Panel id="sec-appearance" title="Appearance" description="Applies straight away, on this device only.">
                  <div className="set-row">
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>Theme</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Dark is the default.</div>
                    </div>
                    <Segmented<Theme>
                      label="Theme"
                      value={theme}
                      onChange={(t) => { setTheme(t); setThemeState(t); }}
                      options={[
                        { value: "dark", label: <><IconMoon size={13} /> Dark</> },
                        { value: "light", label: <><IconSun size={13} /> Light</> },
                      ]}
                    />
                  </div>
                  <div className="set-row" style={{ alignItems: "flex-start" }}>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>Accent</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Used sparingly: focus rings, selection and the active tab.</div>
                    </div>
                    <IdentityPicker dark={theme === "dark"} />
                  </div>
                </Panel>

                {gate(
                  <form onSubmit={handlePrefsSave}>
                    <Panel id="sec-prefs" title="Messages and calls" description="How reminders are written and when Starlane suggests calling." footer={bar("Save preferences")}>
                      <Fields>
                        <Field label="Message language" htmlFor="language">
                          <select id="language" className="ui-input" value={prefs.language} onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}>
                            {languageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Best time to call customers" htmlFor="contact_time">
                          <input id="contact_time" className="ui-input tabular-nums" type="time" value={prefs.contact_time} onChange={e => setPrefs(p => ({ ...p, contact_time: e.target.value }))} />
                        </Field>
                        <Field label="Time zone" htmlFor="tz" hint="Starlane runs on India Standard Time." wide>
                          <input id="tz" className="ui-input" value="IST, Asia/Kolkata (UTC+5:30)" readOnly />
                        </Field>
                      </Fields>
                    </Panel>
                  </form>
                )}
              </>
            )}

            {/* Message voice */}
            {tab === "voice" && gate(
              <form onSubmit={handleVoiceSave}>
                <Panel
                  id="sec-voice"
                  title="Message voice"
                  description="Reminders Starlane drafts can sound like you. Drafts still wait for your approval before anything is sent."
                  footer={
                    <SaveBar saving={saving} saved={saved} error={error} label="Save voice" disabled={loadFailed}
                      extra={voiceActive ? <Button variant="ghost" onClick={clearVoice} icon={<IconTrash size={14} />}>Reset voice</Button> : undefined} />
                  }
                >
                  <div className="flex items-center" style={{ gap: 8, marginBottom: 18 }}>
                    <StatusChip tone={voiceActive ? "positive" : "unknown"}>{voiceActive ? "Voice on" : "Not set up"}</StatusChip>
                  </div>
                  <Group first title="About you">
                    <Fields>
                      <Field label="First name" htmlFor="owner_name">
                        <input id="owner_name" className="ui-input" type="text" placeholder="Rajesh" value={voice.owner_name} onChange={e => setVoice(v => ({ ...v, owner_name: e.target.value }))} />
                      </Field>
                      <Field label="Business city" htmlFor="voice_city">
                        <select id="voice_city" className="ui-input" value={voice.city} onChange={e => setVoice(v => ({ ...v, city: e.target.value }))}>
                          <option value="">Select a city</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </Field>
                    </Fields>
                  </Group>
                  <Group title="Style">
                    <div role="radiogroup" aria-label="Communication style" style={{ display: "grid", gap: 8 }}>
                      {voiceStyleOptions.map(opt => {
                        const on = voice.voice_style === opt.value;
                        return (
                          <label key={opt.value} className="flex items-center" style={{ gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${on ? "rgba(var(--accent-rgb), 0.5)" : "var(--line)"}`, background: on ? "rgba(var(--accent-rgb), 0.06)" : "transparent" }}>
                            <input type="radio" name="voice_style" value={opt.value} checked={on} onChange={e => setVoice(v => ({ ...v, voice_style: e.target.value }))} />
                            <span style={{ fontSize: 13, color: "var(--ink)" }}>{opt.label}</span>
                            <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{opt.hint}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Group>
                  <Group title="Learn from your messages" hint="Paste two or three WhatsApp messages you have actually sent.">
                    <div style={{ display: "grid", gap: 12 }}>
                      {samples.map((s, i) => (
                        <Field key={i} label={`Message ${i + 1}${i === 0 ? "" : " (optional)"}`} htmlFor={`sample_${i}`}>
                          <textarea id={`sample_${i}`} className="ui-input" rows={2} style={{ resize: "vertical" }}
                            placeholder={i === 0 ? "Ramesh bhai, aapka ₹45,000 pending hai. Aaj possible hai kya?" : "Another message"}
                            value={s} onChange={e => setSamples(prev => prev.map((v, j) => j === i ? e.target.value : v))} />
                        </Field>
                      ))}
                      <div>
                        <Button variant="secondary" onClick={handleExtractVoice} loading={extracting} disabled={!samples[0].trim()} icon={<IconSparkle size={14} />}>
                          {extracting ? "Reading your style…" : "Learn my style"}
                        </Button>
                      </div>
                      {extractFailed && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--critical)" }}>Starlane couldn&apos;t read a style from those messages. Try again, or describe your style below.</p>}
                      {extractResult && (
                        <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                          <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>What Starlane picked up</div>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>{extractResult.style_description}</p>
                          {extractResult.sample_phrase && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-2)", fontStyle: "italic" }}>&ldquo;{extractResult.sample_phrase}&rdquo;</p>}
                        </div>
                      )}
                    </div>
                  </Group>
                  <Group title="Describe your style" hint="Filled in from your messages above, or write it yourself.">
                    <textarea id="ai_persona" aria-label="Describe your style" className="ui-input" rows={4} style={{ resize: "vertical" }}
                      placeholder="I talk in casual Hinglish, use 'bhai' often and keep messages short."
                      value={voice.ai_persona} onChange={e => setVoice(v => ({ ...v, ai_persona: e.target.value }))} />
                  </Group>
                </Panel>
              </form>
            )}

            {/* Delivery */}
            {tab === "integrations" && (
              <>
                <Panel id="sec-delivery" title="Delivery" description="What carries reminders and payment links, and whether each line actually works on this account today.">
                  {[
                    { key: "wa", title: "WhatsApp reminders", line: delivery?.whatsapp, hint: "Sent from Starlane's verified WhatsApp number" },
                    { key: "pay", title: "Payment links", line: delivery?.paymentLinks, hint: "UPI, card and netbanking through Razorpay" },
                    { key: "dun", title: "Daily reminder run", line: delivery?.dunning, hint: "Runs every day at 9 am IST and follows your reminder rules" },
                    { key: "push", title: "Payment received alerts", line: delivery?.push, hint: "A push notification when a customer pays" },
                  ].map((r) => (
                    <div key={r.key} className="set-row">
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{r.title}</div>
                        <div style={{ fontSize: 12.5, color: r.line && !r.line.active && r.line.reason ? "var(--warning)" : "var(--ink-3)", marginTop: 2 }}>{r.line?.reason || r.hint}</div>
                      </div>
                      <DeliveryChip line={r.line} />
                    </div>
                  ))}
                </Panel>

                <Panel id="sec-test" title="Test WhatsApp delivery" description="Sends one test message to your registered number."
                  footer={
                    <>
                      {testResult && <span role="status" style={{ fontSize: 12.5, color: testResult.ok ? "var(--positive)" : "var(--critical)", marginRight: "auto", lineHeight: 1.5 }}>{testResult.msg}</span>}
                      <Button variant="secondary" loading={testLoading} onClick={handleTestWhatsApp} icon={<IconWhatsApp size={14} />}>Send a test message</Button>
                    </>
                  }
                >
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                    {[
                      "A new invoice sends the customer a WhatsApp message with a payment link.",
                      "Every day at 9 am IST, overdue invoices get a reminder according to your rules.",
                      "When the customer pays, the invoice closes and you are notified.",
                    ].map((t) => (
                      <li key={t} className="flex" style={{ gap: 10, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
                        <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 2, background: "var(--ink-3)", marginTop: 8, flexShrink: 0 }} />{t}
                      </li>
                    ))}
                  </ul>
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-3)" }}>This is what happens once sending is on. Nothing above is sent while a line shows Not active.</p>
                </Panel>
              </>
            )}

            {/* Reminder rules */}
            {tab === "automation" && (
              <>
                <Panel id="sec-auto" title="Collections reminders" description="Reminders go out once a day at 9 am IST, following the rules below.">
                  <div className="set-row">
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{autoEnabled ? "On" : "Paused"}</div>
                      <div style={{ fontSize: 12.5, color: autoEnabled && delivery && !delivery.whatsapp.active ? "var(--warning)" : "var(--ink-3)", marginTop: 2 }}>
                        {!loaded && !loadFailed ? "Checking…"
                          : !autoEnabled ? "No reminders go out until you turn this on."
                          : delivery && !delivery.whatsapp.active ? `On, but nothing is sent yet: ${delivery.whatsapp.reason || "WhatsApp delivery is not active"}.`
                          : "Reminders go out every day at 9 am IST."}
                      </div>
                    </div>
                    <Switch checked={autoEnabled} onChange={handleToggleAutomation} disabled={autoToggling || !loaded} label="Collections reminders" />
                  </div>
                </Panel>

                <Panel id="sec-rules" title="Reminder rules" description="When an invoice is this many days overdue, Starlane prepares this kind of reminder with a payment link.">
                  {rulesLoading && <SkeletonRows rows={3} height={52} />}
                  {!rulesLoading && rulesFailed && <ErrorState title="Couldn't load your rules" message={OFFLINE} onRetry={loadRules} />}
                  {!rulesLoading && !rulesFailed && rules.length === 0 && !showAddRule && (
                    <EmptyLine icon={<IconSync size={17} />} title="No reminder rules yet" body="A common start: a gentle reminder at day 3, firm at day 7 and urgent at day 15."
                      action={<Button variant="secondary" size="sm" icon={<IconPlus size={13} />} onClick={() => setShowAddRule(true)}>Add your first rule</Button>} />
                  )}
                  {!rulesLoading && !rulesFailed && rules.length > 0 && (
                    <div>
                      {rules.map(rule => {
                        const t = TONE[rule.tone] || { label: rule.tone, tone: "neutral" as StatusTone };
                        return (
                          <div key={rule.id} className="set-row" style={{ opacity: rule.enabled ? 1 : 0.6 }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                                <span className="tabular-nums" style={{ fontSize: 13.5, color: "var(--ink)" }}>Day {rule.trigger_day}</span>
                                <StatusChip tone={t.tone}>{t.label}</StatusChip>
                              </div>
                              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>
                                {ACTION_LABEL[rule.action] || rule.action} with payment link
                                {rule.sent != null && <span className="tabular-nums"> · {formatCount(rule.sent)} sent</span>}
                              </div>
                            </div>
                            <Switch checked={rule.enabled} onChange={() => handleToggleRule(rule)} label={`Day ${rule.trigger_day} rule ${rule.enabled ? "on" : "off"}`} />
                            <button type="button" className="icon-btn" aria-label={`Delete the day ${rule.trigger_day} rule`} onClick={() => setDeleteRule(rule)}>
                              <IconTrash size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showAddRule && (
                    <div style={{ marginTop: rules.length ? 18 : 0, padding: 16, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 12 }}>New rule</div>
                      <div className="flex flex-wrap items-end" style={{ gap: 16 }}>
                        <Field label="Days overdue" htmlFor="trigger_day">
                          <input id="trigger_day" className="ui-input tabular-nums" style={{ width: 96 }} type="number" min={1} max={90} value={newRule.trigger_day}
                            onChange={e => setNewRule(r => ({ ...r, trigger_day: Number(e.target.value) }))} />
                        </Field>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Tone</span>
                          <Segmented label="Tone" value={newRule.tone} onChange={(v) => setNewRule(r => ({ ...r, tone: v }))}
                            options={[{ value: "gentle", label: "Gentle" }, { value: "firm", label: "Firm" }, { value: "urgent", label: "Urgent" }]} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Channel</span>
                          <Segmented label="Channel" value={newRule.action} onChange={(v) => setNewRule(r => ({ ...r, action: v }))}
                            options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "call", label: "Call" }]} />
                        </div>
                      </div>
                      <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>
                        When an invoice is <span className="tabular-nums" style={{ color: "var(--ink)" }}>{newRule.trigger_day} days</span> overdue, prepare a {TONE[newRule.tone]?.label.toLowerCase()} {newRule.action === "whatsapp" ? "WhatsApp message" : "call"} with a payment link.
                      </p>
                      <div className="flex justify-end" style={{ gap: 8, marginTop: 14 }}>
                        <Button variant="ghost" onClick={() => setShowAddRule(false)}>Cancel</Button>
                        <Button variant="primary" loading={addingRule} onClick={handleAddRule}>Save rule</Button>
                      </div>
                    </div>
                  )}

                  {!showAddRule && !rulesLoading && !rulesFailed && rules.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <Button variant="secondary" size="sm" icon={<IconPlus size={13} />} onClick={() => setShowAddRule(true)}>Add rule</Button>
                    </div>
                  )}
                </Panel>
              </>
            )}

            {/* Billing */}
            {tab === "billing" && (
              <Panel id="sec-billing" title="Billing and plan" description="Your subscription, plan changes and invoice history live on the Billing page.">
                <Link href="/billing" className="ui-btn ui-btn-secondary">Open Billing</Link>
              </Panel>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        title={`Delete the day ${deleteRule?.trigger_day ?? ""} rule?`}
        description="Reminders from this rule stop. Reminders already sent are not affected."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteRule(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteRule && handleDeleteRule(deleteRule.id)}>Delete rule</Button>
          </>
        }
      />
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

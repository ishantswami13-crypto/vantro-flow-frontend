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
import { PageHeader, SkeletonRows } from "@/components/v32/ui";
import { IconWhatsApp, IconLogout, IconTrash, IconPlus, IconSun, IconMoon } from "@/components/v32/icons";
import { Panel, Group, Fields, Field, Prefixed, Segmented, Switch, SaveBar, SettingsStyles } from "@/components/settings/SettingsUI";
import { api, getUser, clearAuth, type DunningRule, type DeliveryLine, type DeliveryStatus } from "@/lib/api";
import { INDUSTRY_OPTIONS, setBusinessType } from "@/lib/businessTypes";
import { getTheme, setTheme, THEME_EVENT, type Theme } from "@/lib/theme";
import { formatCount } from "@/lib/format";

const OFFLINE = "Couldn't reach Starlane. Check your connection and try again.";
const NOT_SAVED = "Your changes weren't saved. Check your connection and try again.";

type Tab = "profile" | "business" | "preferences" | "integrations" | "automation" | "billing";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile",      label: "Profile" },
  { key: "business",     label: "Business" },
  { key: "preferences",  label: "Preferences" },
  { key: "integrations", label: "Delivery" },
  { key: "automation",   label: "Reminder rules" },
  { key: "billing",      label: "Billing" },
];
// Older links (?tab=integrations, ?tab=automation) keep working.
const TAB_KEYS = new Set<Tab>(TABS.map(t => t.key));

const languageOptions = [
  { value: "hinglish", label: "Hinglish (Hindi and English)" },
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
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
      if (industry)    { setBusiness(b => ({ ...b, industry })); setBusinessType(industry); }
      if (address)     setBusiness(b => ({ ...b, business_address: address }));
      if (city)        setBusiness(b => ({ ...b, city }));
      if (upi)         setBusiness(b => ({ ...b, upi_id: upi }));
      if (prefix)      setBusiness(b => ({ ...b, invoice_prefix: prefix }));
      if (language)    setPrefs(p => ({ ...p, language }));
      if (contactTime) setPrefs(p => ({ ...p, contact_time: contactTime }));
      if (ownerName)   setProfile(p => ({ ...p, full_name: ownerName }));
      if (phone)       setProfile(p => ({ ...p, phone: p.phone || phone }));
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
    if (loadFailed) return <ErrorState title="Couldn't load your settings" message={OFFLINE} onRetry={loadSettings} />;
    if (!loaded) return <SkeletonRows rows={4} height={52} />;
    return node;
  };
  const bar = (label: string) => <SaveBar saving={saving} saved={saved} error={error} label={label} disabled={loadFailed} />;

  return (
    <DashboardLayout pageTitle="Settings">
      <SettingsStyles />
      <div style={{ maxWidth: 952, display: "flex", flexDirection: "column", gap: 32 }}>
        <PageHeader title="Settings" subtitle="Your account, your business and how Starlane works for you." />

        <div className="set-layout">
          <nav aria-label="Settings sections" className="set-nav">
            {TABS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}>
                <span>{label}</span>
                {key === "automation" && autoEnabled && <span className="set-on">On</span>}
              </button>
            ))}
          </nav>

          <div className="min-w-0 fade-once set-stack" key={tab}>

            {/* Profile */}
            {tab === "profile" && gate(
              <>
                <form onSubmit={handleProfileSave}>
                  <Panel id="sec-profile" title="Profile" description="Your name and how Starlane reaches you." footer={bar("Save profile")}>
                    <div className="flex items-center" style={{ gap: 12, marginBottom: 20 }}>
                      <IdentityAvatar name={initials} size={36} initial />
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
                <Panel id="sec-session" title="Session">
                  <div className="set-list">
                    <div className="set-row">
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13.5, color: "var(--ink)" }}>Sign out</div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Ends your session in this browser.</div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleLogout} icon={<IconLogout size={14} />}>Sign out</Button>
                    </div>
                  </div>
                </Panel>
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
                  <div className="set-list">
                  <div className="set-row">
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 13.5, color: "var(--ink)" }}>Theme</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Light is the default.</div>
                    </div>
                    <Segmented<Theme>
                      label="Theme"
                      value={theme}
                      onChange={(t) => { setTheme(t); setThemeState(t); }}
                      options={[
                        { value: "light", label: <><IconSun size={13} /> Light</> },
                        { value: "dark", label: <><IconMoon size={13} /> Dark</> },
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

            {/* Delivery */}
            {tab === "integrations" && (
              <>
                <Panel id="sec-delivery" title="Delivery" description="What carries reminders and payment links, and whether each line actually works on this account today.">
                  <div className="set-list">
                  {[
                    { key: "wa", title: "WhatsApp reminders", line: delivery?.whatsapp, hint: "Sent from Starlane's verified WhatsApp number" },
                    { key: "pay", title: "Payment links", line: delivery?.paymentLinks, hint: "UPI, card and netbanking through Razorpay" },
                    { key: "dun", title: "Daily reminder run", line: delivery?.dunning, hint: "Runs every day at 9 am IST and follows your reminder rules" },
                    { key: "push", title: "Payment received alerts", line: delivery?.push, hint: "A push notification when a customer pays" },
                  ].map((r) => (
                    <div key={r.key} className="set-row">
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{r.title}</div>
                        <div style={{ fontSize: 12.5, color: r.line && !r.line.active && r.line.reason ? "var(--ink-2)" : "var(--ink-3)", marginTop: 2 }}>{r.line?.reason || r.hint}</div>
                      </div>
                      <DeliveryChip line={r.line} />
                    </div>
                  ))}
                  </div>
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
                  <div className="set-list">
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
                  </div>
                </Panel>

                <Panel id="sec-rules" title="Reminder rules" description="When an invoice is this many days overdue, Starlane prepares this kind of reminder with a payment link.">
                  {rulesLoading && <SkeletonRows rows={3} height={52} />}
                  {!rulesLoading && rulesFailed && <ErrorState title="Couldn't load your rules" message={OFFLINE} onRetry={loadRules} />}
                  {!rulesLoading && !rulesFailed && rules.length === 0 && !showAddRule && (
                    <div className="set-list"><div className="set-row">
                      <p className="flex-1 min-w-0" style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>No reminder rules yet. A common start: gentle at day 3, firm at day 7, urgent at day 15.</p>
                      <Button variant="secondary" size="sm" icon={<IconPlus size={13} />} onClick={() => setShowAddRule(true)}>Add your first rule</Button>
                    </div></div>
                  )}
                  {!rulesLoading && !rulesFailed && rules.length > 0 && (
                    <div className="set-list">
                      {rules.map(rule => {
                        const t = TONE[rule.tone] || { label: rule.tone, tone: "neutral" as StatusTone };
                        return (
                          <div key={rule.id} className="set-row" style={{ opacity: rule.enabled ? 1 : 0.6 }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                                <span style={{ fontSize: 13.5, color: "var(--ink)" }}>Day <span className="num">{rule.trigger_day}</span></span>
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
                    <div style={{ padding: "16px 0", borderBottom: "1px solid var(--line)", borderTop: rules.length ? "none" : "1px solid var(--line)" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", marginBottom: 12 }}>New rule</div>
                      <div className="flex flex-wrap items-end" style={{ gap: 16 }}>
                        <Field label="Days overdue" htmlFor="trigger_day">
                          <input id="trigger_day" className="ui-input tabular-nums" style={{ width: 96 }} type="number" min={1} max={90} value={newRule.trigger_day}
                            onChange={e => setNewRule(r => ({ ...r, trigger_day: Number(e.target.value) }))} />
                        </Field>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Tone</span>
                          <Segmented label="Tone" value={newRule.tone} onChange={(v) => setNewRule(r => ({ ...r, tone: v }))}
                            options={[{ value: "gentle", label: "Gentle" }, { value: "firm", label: "Firm" }, { value: "urgent", label: "Urgent" }]} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Channel</span>
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
                    <div style={{ marginTop: 14 }}>
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

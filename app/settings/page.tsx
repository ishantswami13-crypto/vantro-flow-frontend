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
  FiLogOut, FiCheck, FiRefreshCw,
} from "react-icons/fi";
import { api, getUser, clearAuth } from "@/lib/api";

type Tab = "profile" | "business" | "preferences" | "integrations" | "billing";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile",      label: "Profile",       icon: FiUser },
  { key: "business",     label: "Business",      icon: FiBriefcase },
  { key: "preferences",  label: "Preferences",   icon: FiSliders },
  { key: "integrations", label: "Integrations",  icon: FiLink },
  { key: "billing",      label: "Billing",       icon: FiCreditCard },
];

const industryOptions = [
  { value: "trading",       label: "Trading / Distribution" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "services",      label: "Services" },
  { value: "retail",        label: "Retail" },
  { value: "construction",  label: "Construction" },
  { value: "other",         label: "Other" },
];

const languageOptions = [
  { value: "hinglish", label: "Hinglish (Hindi + English)" },
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [business, setBusiness] = useState({ business_name: "", gstin: "", industry: "trading", team_size: "6-20" });
  const [prefs, setPrefs] = useState({ language: "hinglish", contact_time: "" });

  useEffect(() => {
    const user = getUser();
    if (user) {
      setProfile(p => ({ ...p, full_name: user.business_name || "", email: user.email || "", phone: user.phone || "" }));
      setBusiness(b => ({ ...b, business_name: user.business_name || "", gstin: user.gstin || "" }));
    }
    api.settings.get().then(({ settings }) => {
      if ((settings as any).industry)    setBusiness(b => ({ ...b, industry: (settings as any).industry }));
      if ((settings as any).language)    setPrefs(p => ({ ...p, language: (settings as any).language }));
      if ((settings as any).contact_time) setPrefs(p => ({ ...p, contact_time: (settings as any).contact_time }));
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

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = { business_name: profile.full_name, phone: profile.phone };
    if (profile.password) body.password = profile.password;
    save(body);
  };

  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    save({ business_name: business.business_name, gstin: business.gstin, industry: business.industry });
  };

  const handlePrefsSave = (e: React.FormEvent) => {
    e.preventDefault();
    save({ language: prefs.language, contact_time: prefs.contact_time });
  };

  const handleTallySync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const handleLogout = () => {
    clearAuth();
    document.cookie = "vantro_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const initials = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Settings</h2>
          <p className="text-sm text-secondary mt-0.5">Manage your account, business, and preferences.</p>
        </div>

        {saved && <Alert variant="success" title="Saved">Your changes have been saved successfully.</Alert>}
        {error && <Alert variant="danger" title="Error">{error}</Alert>}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Tab nav */}
          <nav className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 shrink-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  tab === key
                    ? "bg-accent-dim text-accent"
                    : "text-secondary hover:text-primary hover:bg-surface-2",
                ].join(" ")}
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 min-w-0">

            {/* Profile */}
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
                    <Input label="Full Name" type="text"
                      value={profile.full_name}
                      onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                    <Input label="Phone" type="tel" prefix="+91"
                      value={profile.phone}
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

            {/* Business */}
            {tab === "business" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Business Information</h3>
                <form onSubmit={handleBusinessSave} className="space-y-4 max-w-lg">
                  <Input label="Business Name" type="text"
                    value={business.business_name}
                    onChange={e => setBusiness(b => ({ ...b, business_name: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="GST Number" type="text"
                      value={business.gstin}
                      onChange={e => setBusiness(b => ({ ...b, gstin: e.target.value }))} />
                    <Select label="Industry" options={industryOptions}
                      value={business.industry}
                      onChange={e => setBusiness(b => ({ ...b, industry: e.target.value }))} />
                  </div>
                  <Select label="Team Size" options={employeeOptions}
                    value={business.team_size}
                    onChange={e => setBusiness(b => ({ ...b, team_size: e.target.value }))} />
                  <Button type="submit" icon={<FiCheck size={14} />} loading={saving}>Save Business Info</Button>
                </form>
              </Card>
            )}

            {/* Preferences */}
            {tab === "preferences" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-5">Preferences</h3>
                <form onSubmit={handlePrefsSave} className="space-y-4 max-w-lg">
                  <Select label="Message Language" options={languageOptions}
                    value={prefs.language}
                    onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))} />
                  <Select label="Time Zone" options={timezoneOptions} value="Asia/Kolkata" onChange={() => {}} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-secondary uppercase tracking-wider">Best Time to Call Customers</label>
                    <input type="time"
                      value={prefs.contact_time}
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

            {/* Integrations */}
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
                        <Button variant="ghost" size="sm" loading={syncing} onClick={handleTallySync} icon={<FiRefreshCw size={12} />}>
                          Sync
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled>Soon</Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Billing (redirect to billing page) */}
            {tab === "billing" && (
              <Card>
                <h3 className="text-sm font-semibold text-primary mb-4">Billing & Plan</h3>
                <p className="text-sm text-secondary mb-4">Manage your subscription, upgrade your plan, and view invoice history.</p>
                <Button onClick={() => window.location.href = "/billing"} icon={<FiCreditCard size={14} />}>
                  Go to Billing Page
                </Button>
              </Card>
            )}

            {/* Logout */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="danger" icon={<FiLogOut size={14} />} onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

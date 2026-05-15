"use client";

import { useState } from "react";
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
  const [syncing, setSyncing] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTallySync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Settings</h2>
          <p className="text-sm text-secondary mt-0.5">Manage your account, business, and preferences.</p>
        </div>

        {saved && <Alert variant="success" title="Saved">Your changes have been saved successfully.</Alert>}

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
            <form onSubmit={handleSave}>
              {/* Profile */}
              {tab === "profile" && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">User Profile</h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="flex items-center gap-4 pb-4 border-b border-border">
                      <div className="w-14 h-14 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-accent">R</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">Rajesh Kumar</p>
                        <p className="text-xs text-secondary">Owner · Kumar Traders</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Full Name"  type="text" defaultValue="Rajesh Kumar" />
                      <Input label="Phone"      type="tel" prefix="+91" defaultValue="9876543210" />
                    </div>
                    <Input label="Email"  type="email" defaultValue="rajesh@kumartraders.com" />
                    <Input label="New Password" type="password" placeholder="Leave blank to keep current" />
                    <Button type="submit" icon={<FiCheck size={14} />}>Save Profile</Button>
                  </div>
                </Card>
              )}

              {/* Business */}
              {tab === "business" && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">Business Information</h3>
                  <div className="space-y-4 max-w-lg">
                    <Input label="Business Name" type="text" defaultValue="Kumar Traders Pvt Ltd" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="GST Number" type="text" defaultValue="27AABCM1234A1Z5" />
                      <Input label="PAN Number"  type="text" defaultValue="AABCM1234A" />
                    </div>
                    <Select label="Industry" options={industryOptions} defaultValue="trading" />
                    <Select label="Team Size" options={employeeOptions} defaultValue="6-20" />
                    <Input label="Annual Revenue (INR)" type="number" prefix="₹" defaultValue="12000000" />
                    <Button type="submit" icon={<FiCheck size={14} />}>Save Business Info</Button>
                  </div>
                </Card>
              )}

              {/* Preferences */}
              {tab === "preferences" && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">Preferences</h3>
                  <div className="space-y-4 max-w-lg">
                    <Select label="Message Language" options={languageOptions} defaultValue="hinglish" />
                    <Select label="Time Zone" options={timezoneOptions} defaultValue="Asia/Kolkata" />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider">Working Hours</label>
                      <div className="flex items-center gap-2">
                        <input type="time" defaultValue="09:00" className="flex-1 bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                        <span className="text-xs text-secondary">to</span>
                        <input type="time" defaultValue="18:00" className="flex-1 bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-secondary uppercase tracking-wider">Currency</label>
                      <input type="text" defaultValue="INR — Indian Rupee (₹)" readOnly
                        className="bg-surface-2 border border-border rounded-md text-sm text-muted px-3 py-2.5 cursor-not-allowed" />
                    </div>
                    <Button type="submit" icon={<FiCheck size={14} />}>Save Preferences</Button>
                  </div>
                </Card>
              )}

              {/* Integrations */}
              {tab === "integrations" && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">Integrations</h3>
                  <div className="space-y-4 max-w-lg">
                    {[
                      {
                        name: "Tally ERP 9",
                        desc: "Sync customers and invoices from Tally",
                        status: "connected",
                        lastSync: "15 May 2024, 9:14 AM",
                      },
                      {
                        name: "WhatsApp Business",
                        desc: "Send collection messages via WhatsApp",
                        status: "connected",
                        lastSync: "Active",
                      },
                      {
                        name: "Razorpay",
                        desc: "Accept UPI and card payments via payment links",
                        status: "disconnected",
                        lastSync: null,
                      },
                      {
                        name: "GST Portal",
                        desc: "Verify GSTIN and pull invoice data",
                        status: "disconnected",
                        lastSync: null,
                      },
                    ].map((intg) => (
                      <div key={intg.name} className="flex items-start justify-between gap-4 p-4 bg-surface-2 border border-border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-primary">{intg.name}</p>
                            <Badge variant={intg.status === "connected" ? "success" : "muted"}>
                              {intg.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-secondary">{intg.desc}</p>
                          {intg.lastSync && <p className="text-2xs text-muted mt-1">Last sync: {intg.lastSync}</p>}
                        </div>
                        {intg.status === "connected" ? (
                          <Button variant="ghost" size="sm" loading={syncing} onClick={handleTallySync} icon={<FiRefreshCw size={12} />}>
                            Sync
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm">Connect</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Billing */}
              {tab === "billing" && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-5">Billing & Plan</h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="p-4 bg-surface-2 border border-accent/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-primary">Model B — Hybrid</p>
                        <Badge variant="accent">Active</Badge>
                      </div>
                      <p className="text-xs text-secondary mb-3">₹999/mo base + 1% of collections processed</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {[
                          { label: "Next billing",    value: "1 June 2024" },
                          { label: "Customers",       value: "42 / Unlimited" },
                          { label: "Collections (May)", value: "₹4.2L processed" },
                          { label: "Variable fee",    value: "₹4,200 (1%)" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-muted">{label}</p>
                            <p className="font-medium text-primary mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-secondary mb-3">Payment method on file: Visa ···· 4242</p>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">Update Payment Method</Button>
                        <Button variant="ghost" size="sm">Download Invoice</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </form>

            {/* Logout */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="danger" icon={<FiLogOut size={14} />} onClick={() => { localStorage.clear(); window.location.href = "/login"; }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

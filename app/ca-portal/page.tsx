"use client";
import { authHeaders, isLoggedIn } from "@/lib/api";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface CADashboard {
  ca: { firm_name: string; referral_code: string; city?: string; license_no?: string; specialization?: string };
  stats: { total_clients: number; paid_clients: number; monthly_commission: number; referral_code: string };
}

interface Client {
  id: string; business_name: string; phone?: string; plan: string; industry?: string; created_at: string;
}

export default function CAPortalPage() {
  const [dashboard, setDashboard] = useState<CADashboard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [notCA, setNotCA] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ firm_name: "", license_no: "", city: "", specialization: "" });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);


  async function fetchDashboard() {
    if (!isLoggedIn()) return;
    setLoading(true);
    try {
      const [dashRes, clientRes] = await Promise.all([
        fetch(`${BASE}/api/ca-partners/dashboard`, { headers: { ...authHeaders() }, credentials: "include" }),
        fetch(`${BASE}/api/ca-partners/clients`, { headers: { ...authHeaders() }, credentials: "include" }),
      ]);
      const dashData = await dashRes.json();
      const clientData = await clientRes.json();
      if (dashData.success) { setDashboard(dashData); setNotCA(false); }
      else if (dashRes.status === 404) setNotCA(true);
      if (clientData.success) setClients(clientData.clients || []);
    } catch (e) { console.error(e); setNotCA(true); }
    setLoading(false);
  }

  useEffect(() => { fetchDashboard(); }, []);

  async function register() {
    if (!regForm.firm_name) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/ca-partners/register`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(regForm),
      });
      const d = await r.json();
      if (d.success) { setShowRegister(false); fetchDashboard(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.atlas.vantro.io";

  function copyCode(code: string) {
    navigator.clipboard.writeText(`${appOrigin}/signup?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp(code: string) {
    const msg = `Namaskar! Main ek CA hoon aur mere clients ke liye Starlane recommend karta hoon — outstanding payments WhatsApp se automatically collect hote hain. Free trial ke liye signup karein: ${appOrigin}/signup?ref=${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (loading) return <DashboardLayout pageTitle="CA Partner Portal"><div className="p-6 text-center text-secondary text-sm">Loading...</div></DashboardLayout>;

  if (notCA && !showRegister) return (
    <DashboardLayout pageTitle="CA Partner Portal">
      <div className="max-w-2xl">
        <div className="text-center py-16 space-y-5">
          <h1 className="text-2xl font-bold text-primary">CA Partner Portal</h1>
          <p className="text-secondary">Are you a CA (Chartered Accountant) or business consultant? Register as a Starlane partner and earn commission for every client you bring.</p>
          <div className="flex divide-x divide-border justify-center max-w-md mx-auto">
            {[
              { value: "₹300/mo", label: "Per paying client" },
              { value: "Unlimited", label: "Clients you can refer" },
              { value: "Lifetime", label: "Commission duration" },
            ].map((s, i) => (
              <div key={s.label} className={["flex-1 text-center", i > 0 ? "pl-4" : "", i < 2 ? "pr-4" : ""].join(" ")}>
                <p className="metric-value text-xl text-primary">{s.value}</p>
                <p className="text-2xs text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setShowRegister(true)} className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Register as CA Partner
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (showRegister) return (
    <DashboardLayout pageTitle="CA Partner Portal">
      <div className="max-w-lg">
        <h1 className="text-xl font-bold text-primary mb-5">Register as CA Partner</h1>
        <div className="card-premium p-5 space-y-4">
          {[
            { label: "CA Firm Name *", key: "firm_name", placeholder: "Sharma & Associates" },
            { label: "ICAI Membership No.", key: "license_no", placeholder: "123456" },
            { label: "City", key: "city", placeholder: "Delhi" },
            { label: "Specialization", key: "specialization", placeholder: "SME Accounting, GST, Tax" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-2xs text-muted block mb-1">{f.label}</label>
              <input
                value={(regForm as Record<string, string>)[f.key]}
                onChange={e => setRegForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="input-base"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={register} disabled={saving || !regForm.firm_name} className="flex-1 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
              {saving ? "Registering..." : "Register"}
            </button>
            <button onClick={() => setShowRegister(false)} className="px-4 py-2 border border-border text-secondary text-sm rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout pageTitle="CA Partner Portal">
      <div className="max-w-4xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary">CA Partner Portal</h1>
          <p className="text-sm text-secondary">{dashboard?.ca.firm_name} · {dashboard?.ca.city}</p>
        </div>

        {/* Stats — three related counts, open typographic row instead of
            three arbitrarily-hued cards (blue/green/purple for no semantic
            reason). */}
        <div className="flex divide-x divide-border">
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-primary">{dashboard?.stats.total_clients || 0}</p>
            <p className="text-2xs text-muted mt-1">Total clients</p>
          </div>
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-success">{dashboard?.stats.paid_clients || 0}</p>
            <p className="text-2xs text-muted mt-1">Paying clients</p>
          </div>
          <div className="flex-1 text-center">
            <p className="metric-value text-2xl text-primary">₹{(dashboard?.stats.monthly_commission || 0).toLocaleString("en-IN")}</p>
            <p className="text-2xs text-muted mt-1">Monthly commission</p>
          </div>
        </div>

        {/* Referral tools */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="text-primary font-semibold">Share with Clients</h2>
          <div className="input-base flex items-center justify-between gap-2">
            <span className="text-sm text-accent truncate">
              {appOrigin}/signup?ref={dashboard?.stats.referral_code}
            </span>
            <button onClick={() => copyCode(dashboard?.stats.referral_code || "")} className="text-xs px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-primary rounded-lg transition-colors shrink-0">
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <button onClick={() => shareWhatsApp(dashboard?.stats.referral_code || "")} className="w-full py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-xl transition-colors">
            Share with Client on WhatsApp
          </button>
          <p className="text-2xs text-muted text-center">You earn ₹300/month per paying client referred with your code</p>
        </div>

        {/* Client list */}
        <div className="card-premium p-5">
          <h2 className="text-primary font-semibold mb-4">Your Clients ({clients.length})</h2>
          {clients.length === 0 ? (
            <p className="text-secondary text-sm text-center py-6">No clients referred yet. Share your link to get started.</p>
          ) : (
            <div className="divide-y divide-border">
              {clients.map(c => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-primary text-sm font-medium">{c.business_name}</p>
                    <p className="text-2xs text-muted">{c.industry || "General"} · Joined {new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className={["text-2xs px-2 py-0.5 rounded-full", c.plan !== "free" ? "bg-success-dim text-success" : "bg-surface-2 text-muted"].join(" ")}>
                    {c.plan !== "free" ? "Paying" : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

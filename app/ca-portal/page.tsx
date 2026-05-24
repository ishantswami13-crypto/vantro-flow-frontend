"use client";
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

  const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;

  async function fetchDashboard() {
    if (!token) return;
    setLoading(true);
    try {
      const [dashRes, clientRes] = await Promise.all([
        fetch(`${BASE}/api/ca-partners/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE}/api/ca-partners/clients`, { headers: { Authorization: `Bearer ${token}` } }),
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      const d = await r.json();
      if (d.success) { setShowRegister(false); fetchDashboard(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(`https://vantroflow.app/signup?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp(code: string) {
    const msg = `Namaskar! Main ek CA hoon aur mere clients ke liye Vantro Flow recommend karta hoon — outstanding payments WhatsApp se automatically collect hote hain. Free trial ke liye signup karein: https://vantroflow.app/signup?ref=${code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (loading) return <DashboardLayout><div className="p-6 text-center text-gray-400">Loading...</div></DashboardLayout>;

  if (notCA && !showRegister) return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="text-center py-16 space-y-5">
          <div className="text-6xl">🏦</div>
          <h1 className="text-2xl font-bold text-white">CA Partner Portal</h1>
          <p className="text-gray-400">Are you a CA (Chartered Accountant) or business consultant? Register as a Vantro partner and earn commission for every client you bring.</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "₹300/mo", label: "Per paying client" },
              { value: "Unlimited", label: "Clients you can refer" },
              { value: "Lifetime", label: "Commission duration" },
            ].map(s => (
              <div key={s.label} className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5">
                <div className="text-xl font-bold text-green-400">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowRegister(true)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition">
            Register as CA Partner
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (showRegister) return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-white mb-5">Register as CA Partner</h1>
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-5 space-y-4">
          {[
            { label: "CA Firm Name *", key: "firm_name", placeholder: "Sharma & Associates" },
            { label: "ICAI Membership No.", key: "license_no", placeholder: "123456" },
            { label: "City", key: "city", placeholder: "Delhi" },
            { label: "Specialization", key: "specialization", placeholder: "SME Accounting, GST, Tax" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
              <input
                value={(regForm as Record<string, string>)[f.key]}
                onChange={e => setRegForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-[#0f0f23] border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={register} disabled={saving || !regForm.firm_name} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50">
              {saving ? "Registering..." : "Register"}
            </button>
            <button onClick={() => setShowRegister(false)} className="px-4 py-2 border border-white/10 text-gray-400 text-sm rounded-lg hover:bg-white/5">Cancel</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">CA Partner Portal</h1>
          <p className="text-sm text-gray-400">{dashboard?.ca.firm_name} · {dashboard?.ca.city}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Clients", value: dashboard?.stats.total_clients || 0, color: "text-blue-400" },
            { label: "Paying Clients", value: dashboard?.stats.paid_clients || 0, color: "text-green-400" },
            { label: "Monthly Commission", value: `₹${(dashboard?.stats.monthly_commission || 0).toLocaleString("en-IN")}`, color: "text-purple-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral tools */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Share with Clients</h2>
          <div className="bg-[#0f0f23] border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-sm text-blue-400 truncate">
              https://vantroflow.app/signup?ref={dashboard?.stats.referral_code}
            </span>
            <button onClick={() => copyCode(dashboard?.stats.referral_code || "")} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg shrink-0">
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <button onClick={() => shareWhatsApp(dashboard?.stats.referral_code || "")} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium rounded-xl transition">
            Share with Client on WhatsApp
          </button>
          <p className="text-xs text-gray-500 text-center">You earn ₹300/month per paying client referred with your code</p>
        </div>

        {/* Client list */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Your Clients ({clients.length})</h2>
          {clients.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No clients referred yet. Share your link to get started.</p>
          ) : (
            <div className="space-y-2">
              {clients.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-[#0f0f23] rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{c.business_name}</p>
                    <p className="text-xs text-gray-400">{c.industry || "General"} · Joined {new Date(c.created_at).toLocaleDateString("en-IN")}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.plan !== "free" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
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

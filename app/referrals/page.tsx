"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface ReferralStats {
  total_referrals: number;
  paid_referrals: number;
  free_months_earned: number;
  referral_code: string;
  referral_link: string;
  rewards: { id: string; type: string; value: number; status: string; created_at: string }[];
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/referrals/my-stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats); })
      .finally(() => setLoading(false));
  }, []);

  async function claimReward() {
    if (!token) return;
    setClaiming(true); setClaimMsg("");
    const r = await fetch(`${BASE}/api/referrals/claim-reward`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    setClaimMsg(d.message || "");
    if (d.success) {
      const r2 = await fetch(`${BASE}/api/referrals/my-stats`, { headers: { Authorization: `Bearer ${token}` } });
      const d2 = await r2.json();
      if (d2.success) setStats(d2.stats);
    }
    setClaiming(false);
  }

  function copyLink() {
    if (!stats) return;
    navigator.clipboard.writeText(stats.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!stats) return;
    const msg = `Bhai, Starlane try karo — outstanding payments automatically collect karta hai WhatsApp se. Mujhe bahut kaam aaya. Mere link se signup karo: ${stats.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const newRewardsPending = stats ? (stats.paid_referrals - stats.free_months_earned) : 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white">Refer & Earn</h1>
          <p className="text-sm text-gray-400">Refer a business owner → they pay → you get 1 free month per referral</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : !stats ? (
          <div className="text-center py-10 text-gray-400">Failed to load stats</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Referrals", value: stats.total_referrals, color: "text-blue-400" },
                { label: "Paying Users", value: stats.paid_referrals, color: "text-green-400" },
                { label: "Free Months Earned", value: stats.free_months_earned, color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pending claim */}
            {newRewardsPending > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-semibold">{newRewardsPending} free month{newRewardsPending > 1 ? "s" : ""} ready to claim!</p>
                  <p className="text-xs text-gray-400">Your referrals have started paying</p>
                </div>
                <button onClick={claimReward} disabled={claiming} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
                  {claiming ? "Claiming..." : "Claim Now"}
                </button>
              </div>
            )}
            {claimMsg && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-blue-400 text-sm">{claimMsg}</div>
            )}

            {/* Referral link */}
            <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">Your Referral Link</h2>
              <div className="bg-[#0f0f23] border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-sm text-blue-400 truncate">{stats.referral_link}</span>
                <button onClick={copyLink} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition shrink-0">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-[#0f0f23] border border-white/10 rounded-lg px-4 py-3">
                <span className="text-xs text-gray-400">Your code:</span>
                <span className="text-white font-mono font-bold">{stats.referral_code}</span>
              </div>
              <button onClick={shareWhatsApp} className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium rounded-xl transition flex items-center justify-center gap-2">
                <span>Share on WhatsApp</span>
              </button>
            </div>

            {/* How it works */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">How It Works</h2>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Share your referral link with business owner friends, CA, or distributor network" },
                  { step: "2", text: "They sign up using your link and start using Starlane" },
                  { step: "3", text: "They upgrade to a paid plan (₹999+/month)" },
                  { step: "4", text: "You get 1 free month added to your account — automatically" },
                ].map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{s.step}</div>
                    <p className="text-sm text-gray-300 pt-1">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reward history */}
            {stats.rewards.length > 0 && (
              <div className="bg-[#1a1a2e] border border-white/5 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-3">Reward History</h2>
                <div className="space-y-2">
                  {stats.rewards.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">1 Free Month</span>
                      <span className="text-green-400">+{r.value} month</span>
                      <span className="text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

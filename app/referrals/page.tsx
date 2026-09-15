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
    const msg = `Bhai, Vantro Flow try karo — outstanding payments automatically collect karta hai WhatsApp se. Mujhe bahut kaam aaya. Mere link se signup karo: ${stats.referral_link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const newRewardsPending = stats ? (stats.paid_referrals - stats.free_months_earned) : 0;

  return (
    <DashboardLayout pageTitle="Refer & Earn">
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-primary">Refer &amp; Earn</h1>
          <p className="text-sm text-secondary">Refer a business owner → they pay → you get 1 free month per referral</p>
        </div>

        {loading ? (
          <div className="text-center text-secondary py-10 text-sm">Loading...</div>
        ) : !stats ? (
          <div className="text-center py-10 text-secondary text-sm">Failed to load stats</div>
        ) : (
          <>
            {/* Stats — three related counts, not three independently-hued
                metrics. Open typographic row instead of three colored
                cards. */}
            <div className="flex divide-x divide-border">
              <div className="flex-1 text-center">
                <p className="metric-value text-2xl text-primary">{stats.total_referrals}</p>
                <p className="text-2xs text-muted mt-1">Total referrals</p>
              </div>
              <div className="flex-1 text-center">
                <p className="metric-value text-2xl text-success">{stats.paid_referrals}</p>
                <p className="text-2xs text-muted mt-1">Paying users</p>
              </div>
              <div className="flex-1 text-center">
                <p className="metric-value text-2xl text-primary">{stats.free_months_earned}</p>
                <p className="text-2xs text-muted mt-1">Free months earned</p>
              </div>
            </div>

            {/* Pending claim */}
            {newRewardsPending > 0 && (
              <div className="bg-success-dim border border-success/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-success font-semibold text-sm">{newRewardsPending} free month{newRewardsPending > 1 ? "s" : ""} ready to claim!</p>
                  <p className="text-2xs text-muted">Your referrals have started paying</p>
                </div>
                <button onClick={claimReward} disabled={claiming} className="px-4 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50">
                  {claiming ? "Claiming..." : "Claim Now"}
                </button>
              </div>
            )}
            {claimMsg && (
              <div className="bg-surface-2 border border-border rounded-lg p-3 text-secondary text-sm">{claimMsg}</div>
            )}

            {/* Referral link */}
            <div className="card-premium p-5 space-y-4">
              <h2 className="text-primary font-semibold">Your Referral Link</h2>
              <div className="input-base flex items-center justify-between gap-2">
                <span className="text-sm text-secondary truncate">{stats.referral_link}</span>
                <button onClick={copyLink} className="text-xs px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-primary rounded-lg transition-colors shrink-0">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="input-base flex items-center gap-2">
                <span className="text-2xs text-muted">Your code:</span>
                <span className="text-primary font-mono font-bold">{stats.referral_code}</span>
              </div>
              <button onClick={shareWhatsApp} className="w-full py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <span>Share on WhatsApp</span>
              </button>
            </div>

            {/* How it works */}
            <div className="card-premium p-5">
              <h2 className="text-primary font-semibold mb-4">How It Works</h2>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Share your referral link with business owner friends, CA, or distributor network" },
                  { step: "2", text: "They sign up using your link and start using Vantro Flow" },
                  { step: "3", text: "They upgrade to a paid plan (₹999+/month)" },
                  { step: "4", text: "You get 1 free month added to your account — automatically" },
                ].map(s => (
                  <div key={s.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-secondary text-xs font-bold shrink-0">{s.step}</div>
                    <p className="text-sm text-secondary pt-1">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reward history */}
            {stats.rewards.length > 0 && (
              <div className="card-premium p-5">
                <h2 className="text-primary font-semibold mb-3">Reward History</h2>
                <div className="divide-y divide-border">
                  {stats.rewards.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm py-2 first:pt-0 last:pb-0">
                      <span className="text-secondary">1 Free Month</span>
                      <span className="text-success">+{r.value} month</span>
                      <span className="text-muted text-2xs">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
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

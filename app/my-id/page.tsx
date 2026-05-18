"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser } from "@/lib/api";
import { FiZap, FiShield, FiTrendingUp, FiUsers, FiCopy, FiShare2, FiCheckCircle, FiAward, FiLock, FiGift } from "react-icons/fi";
import Link from "next/link";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface Profile {
  vantro_id: string;
  business_name: string;
  member_since: string;
  plan: string;
  trust_score: number;
  recovery_rate: number;
  total_customers: number;
  total_managed: number;
  total_invoices: number;
  member_days: number;
  badges: string[];
}

function TrustRing({ score }: { score: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10D98A" : score >= 40 ? "#F5A524" : "#F5424D";

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#1E2D4A" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-black" style={{ color }}>{score}</p>
        <p className="text-2xs text-muted uppercase tracking-wider mt-0.5">Trust Score</p>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` :
         n >= 100000   ? `₹${(n / 100000).toFixed(1)}L` :
         n >= 1000     ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;
}

export default function MyIdPage() {
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [copied, setCopied]             = useState(false);
  const [referralCount, setReferralCount] = useState<number>(0);
  const user = getUser();

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    Promise.all([
      fetch(`${BASE}/api/public/profile/${user.id}`).then(r => r.json()),
      fetch(`${BASE}/api/public/referrals/${user.id}`).then(r => r.json()),
    ]).then(([profileData, refData]) => {
      if (profileData.profile) setProfile(profileData.profile);
      if (refData.referral_count !== undefined) setReferralCount(refData.referral_count);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/b/${user?.id}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: `${profile?.business_name} — Vantro ID`, url: profileUrl });
    } else copyLink();
  };

  if (loading) return (
    <DashboardLayout pageTitle="My Vantro ID">
      <div className="flex items-center justify-center py-20 text-sm text-muted animate-pulse">
        Building your financial identity...
      </div>
    </DashboardLayout>
  );

  const trustColor = !profile ? "text-muted" :
    profile.trust_score >= 70 ? "text-success" :
    profile.trust_score >= 40 ? "text-warning" : "text-danger";

  return (
    <DashboardLayout pageTitle="My Vantro ID">
      <div className="max-w-2xl mx-auto space-y-5 page-enter">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-primary tracking-tight">Your Vantro Business ID</h2>
          <p className="text-sm text-muted mt-0.5">Your verified financial identity — share it with anyone to build trust instantly.</p>
        </div>

        {/* ID Card */}
        <div className="card-premium p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-accent/8 rounded-full blur-3xl" />

          <div className="flex items-start justify-between mb-6 relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-accent bg-accent-dim border border-accent/20 px-3 py-1 rounded-full font-mono tracking-widest">
                  {profile?.vantro_id ?? `VAN-${user?.id?.replace(/-/g, '').slice(0,8).toUpperCase()}`}
                </span>
                {profile?.plan !== "free" && (
                  <span className="text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full">PRO</span>
                )}
              </div>
              <h3 className="text-xl font-black text-primary">{user?.business_name}</h3>
              <p className="text-xs text-muted mt-1">
                Member since {new Date(user?.created_at || Date.now()).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiZap size={20} className="text-white" />
            </div>
          </div>

          {/* Trust ring */}
          {profile ? (
            <>
              <TrustRing score={profile.trust_score} />
              <p className={`text-center text-sm font-bold mt-3 ${trustColor}`}>
                {profile.trust_score >= 70 ? "Highly Trusted Business" :
                 profile.trust_score >= 40 ? "Growing Business" : "New Business — upload invoices to grow score"}
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-surface-2 border-4 border-border mx-auto mb-3 flex items-center justify-center">
                <FiLock size={20} className="text-muted" />
              </div>
              <p className="text-sm text-secondary">Upload invoices to generate your Trust Score</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Amount Managed",  value: fmt(profile.total_managed),       icon: FiTrendingUp, color: "#0066FF" },
              { label: "Collection Rate", value: `${profile.recovery_rate}%`,       icon: FiAward,      color: "#10D98A" },
              { label: "Customers",       value: String(profile.total_customers),   icon: FiUsers,      color: "#9B6DFF" },
              { label: "Invoices Tracked",value: String(profile.total_invoices),    icon: FiShield,     color: "#F5A524" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card-premium p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                    <Icon size={13} style={{ color }} />
                  </div>
                  <p className="text-2xs text-muted">{label}</p>
                </div>
                <p className="text-xl font-black text-primary">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badges */}
        {profile && profile.badges.length > 0 && (
          <div className="card-premium p-5">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Your Badges</p>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map(badge => (
                <div key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-dim border border-success/20">
                  <FiCheckCircle size={11} className="text-success" />
                  <span className="text-xs font-semibold text-success">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Share */}
        <div className="card-premium p-5">
          <p className="text-sm font-bold text-primary mb-1">Share Your Vantro ID</p>
          <p className="text-xs text-muted mb-4">Share this link with customers, suppliers, and partners to build instant trust.</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-xs text-muted font-mono truncate">
              {profileUrl || "vantroflow.com/b/..."}
            </div>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-xs font-semibold text-secondary hover:text-primary hover:border-accent/40 transition-all shrink-0">
              {copied ? <FiCheckCircle size={13} className="text-success" /> : <FiCopy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button onClick={shareLink}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all shrink-0 shadow-button-accent">
              <FiShare2 size={13} />
              Share
            </button>
          </div>
        </div>

        {/* Referral widget */}
        <div className="card-premium p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-primary">Invite & Earn</p>
              <p className="text-xs text-muted mt-0.5">Share your ID — when someone signs up through your link, you both win.</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-success-dim border border-success/20 flex items-center justify-center shrink-0">
              <FiGift size={15} className="text-success" />
            </div>
          </div>
          <div className="flex items-center gap-4 py-3 px-4 bg-surface-2 rounded-xl border border-border mb-3">
            <div className="text-center">
              <p className="text-3xl font-black text-primary">{referralCount}</p>
              <p className="text-2xs text-muted mt-0.5">Businesses referred</p>
            </div>
            <div className="flex-1 text-xs text-secondary">
              {referralCount === 0
                ? "Share your Vantro ID link — every signup through it counts as your referral."
                : `You've helped ${referralCount} business${referralCount > 1 ? "es" : ""} build their financial identity. Keep sharing!`}
            </div>
          </div>
          {profile?.plan === "free" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-accent-dim border border-accent/20 rounded-lg">
              <FiZap size={12} className="text-accent shrink-0" />
              <p className="text-xs text-accent">Refer 3 businesses and get 1 month Pro free. <Link href="/billing" className="font-bold underline">Upgrade now →</Link></p>
            </div>
          )}
        </div>

        {/* How trust score works */}
        <div className="card-premium p-5">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">How Your Score Is Calculated</p>
          <div className="space-y-2.5">
            {[
              { label: "Collection Rate",   weight: "40%", desc: "% of invoices collected successfully" },
              { label: "Invoice Volume",    weight: "20%", desc: "Number of invoices tracked on Vantro" },
              { label: "Time on Platform",  weight: "20%", desc: "How long you've been a Vantro member" },
              { label: "Calls & Follow-ups",weight: "20%", desc: "Active collection efforts logged" },
            ].map(({ label, weight, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-2xs font-black text-accent bg-accent-dim px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5">{weight}</span>
                <div>
                  <p className="text-xs font-semibold text-primary">{label}</p>
                  <p className="text-2xs text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

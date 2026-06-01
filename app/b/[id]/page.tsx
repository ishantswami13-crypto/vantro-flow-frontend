"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FiZap, FiShield, FiTrendingUp, FiUsers, FiAward, FiCheckCircle } from "react-icons/fi";

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
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10D98A" : score >= 40 ? "#F5A524" : "#F5424D";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1E2D4A" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-black" style={{ color }}>{score}</p>
        <p className="text-2xs text-muted uppercase tracking-wider">Trust Score</p>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` :
         n >= 100000   ? `₹${(n / 100000).toFixed(1)}L` :
         n >= 1000     ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/public/profile/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) setProfile(d.profile);
        else setError("Business not found");
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-sm text-muted animate-pulse">Loading business profile...</div>
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-14 h-14 bg-danger-dim rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FiShield size={24} className="text-danger" />
        </div>
        <p className="text-primary font-bold mb-1">Profile Not Found</p>
        <p className="text-sm text-muted mb-6">This Atlas Business ID doesn't exist.</p>
        <Link href="/" className="text-accent text-sm hover:underline">Go to Atlas →</Link>
      </div>
    </div>
  );

  const memberSince = new Date(profile.member_since).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const trustColor  = profile.trust_score >= 70 ? "text-success" : profile.trust_score >= 40 ? "text-warning" : "text-danger";

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-accent flex items-center justify-center">
              <FiZap size={13} className="text-white" />
            </div>
            <span className="font-bold text-sm text-primary">Atlas</span>
          </div>
          <Link href={`/signup?ref=${id}`} className="text-xs px-3 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-all">
            Get Your Free ID →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">

        {/* Identity Card */}
        <div className="card-premium p-6 relative overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />

          <div className="flex items-start justify-between mb-6 relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xs font-bold text-accent bg-accent-dim border border-accent/20 px-2 py-0.5 rounded-full font-mono tracking-wider">
                  {profile.vantro_id}
                </span>
                {profile.plan !== "free" && (
                  <span className="text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full">
                    PRO
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-primary">{profile.business_name}</h1>
              <p className="text-sm text-muted mt-1">Atlas Member since {memberSince} · {profile.member_days} days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiZap size={20} className="text-white" />
            </div>
          </div>

          {/* Trust Ring */}
          <TrustRing score={profile.trust_score} />

          <p className={`text-center text-sm font-semibold mt-3 ${trustColor}`}>
            {profile.trust_score >= 70 ? "Highly Trusted Business" :
             profile.trust_score >= 40 ? "Growing Business" : "New Business"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Amount Tracked",  value: fmt(profile.total_managed), icon: FiTrendingUp, color: "#0066FF" },
            { label: "Collection Rate", value: `${profile.recovery_rate}%`, icon: FiAward,      color: "#10D98A" },
            { label: "Customers",       value: String(profile.total_customers), icon: FiUsers,  color: "#9B6DFF" },
            { label: "Invoices",        value: String(profile.total_invoices),  icon: FiShield, color: "#F5A524" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-premium p-4 text-center">
              <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center"
                style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-xl font-black text-primary">{value}</p>
              <p className="text-2xs text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div className="card-premium p-5">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Verified Badges</p>
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

        {/* CTA */}
        <div className="card-premium p-6 text-center">
          <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-3 shadow-button-accent">
            <FiZap size={18} className="text-white" />
          </div>
          <p className="font-bold text-primary mb-1">Get Your Atlas Business ID</p>
          <p className="text-xs text-muted mb-4">
            Join thousands of Indian businesses building verified financial identities. Free to start.
          </p>
          <Link href={`/signup?ref=${id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-all shadow-button-accent">
            Create Free Account →
          </Link>
        </div>

        <p className="text-center text-2xs text-muted pb-4">
          Verified by Atlas · vantro-flow-frontend.vercel.app
        </p>
      </div>
    </div>
  );
}

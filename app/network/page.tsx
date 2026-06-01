"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import {
  FiSearch, FiShield, FiCheckCircle, FiZap, FiUsers,
  FiTrendingUp, FiStar, FiExternalLink, FiLoader,
  FiPackage, FiShoppingBag, FiMonitor, FiTruck,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface NetworkProfile {
  vantro_id: string;
  business_name: string;
  plan: string;
  trust_score: number;
  recovery_rate: number;
  total_customers: number;
  total_managed: number;
  total_invoices: number;
  member_days: number;
  badges: string[];
  user_id: string;
}

const BUSINESS_TYPES = [
  { key: "all",          label: "All",           icon: FiUsers },
  { key: "distributor",  label: "Distributors",  icon: FiTruck },
  { key: "retailer",     label: "Retailers",     icon: FiShoppingBag },
  { key: "d2c",          label: "D2C Brands",    icon: FiPackage },
  { key: "startup",      label: "Startups",      icon: FiMonitor },
];

function fmt(n: number) {
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K`
    : `₹${n}`;
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10D98A" : score >= 40 ? "#F5A524" : "#F5424D";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E2D4A" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function BusinessCard({ p }: { p: NetworkProfile }) {
  const trustColor = p.trust_score >= 70 ? "text-success" : p.trust_score >= 40 ? "text-warning" : "text-danger";
  return (
    <div className="card-premium p-4 hover:border-accent/30 transition-all group">
      <div className="flex items-start gap-3">
        <ScoreRing score={p.trust_score} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-bold text-primary truncate">{p.business_name}</p>
            {p.plan !== "free" && (
              <span className="text-2xs font-bold text-success bg-success-dim border border-success/20 px-1.5 py-0.5 rounded-full">PRO</span>
            )}
          </div>
          <p className="text-2xs text-muted font-mono">{p.vantro_id}</p>
          <p className={`text-2xs font-semibold mt-0.5 ${trustColor}`}>
            {p.trust_score >= 70 ? "Highly Trusted" : p.trust_score >= 40 ? "Growing Business" : "New Business"}
          </p>
        </div>
        <Link href={`/b/${p.user_id}`} target="_blank"
          className="shrink-0 w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-accent hover:border-accent/30 transition-all opacity-0 group-hover:opacity-100">
          <FiExternalLink size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
        {[
          { label: "Managed", value: fmt(p.total_managed) },
          { label: "Collection", value: `${p.recovery_rate}%` },
          { label: "Customers", value: String(p.total_customers) },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-sm font-black text-primary">{value}</p>
            <p className="text-2xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      {p.badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {p.badges.slice(0, 3).map(b => (
            <div key={b} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-dim border border-success/15">
              <FiCheckCircle size={9} className="text-success" />
              <span className="text-2xs text-success font-medium">{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NetworkPage() {
  const [query, setQuery]       = useState("");
  const [filter, setFilter]     = useState("all");
  const [results, setResults]   = useState<NetworkProfile[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const url = `${BASE}/api/network/search?q=${encodeURIComponent(query)}&type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.businesses || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on load to show featured businesses
  useEffect(() => { search(); }, []);

  return (
    <DashboardLayout pageTitle="Atlas Network">
      <div className="max-w-4xl mx-auto space-y-5 page-enter">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
              <FiUsers size={15} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Atlas Network</h2>
            <span className="text-2xs font-bold text-accent bg-accent-dim border border-accent/20 px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <p className="text-sm text-muted">Discover and verify businesses before you trade. Every member has a verified Atlas Trust Score.</p>
        </div>

        {/* Why this matters */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FiShield, label: "Verified Scores",  desc: "ML-calculated trust score from real transaction data", color: "#0066FF" },
            { icon: FiStar,   label: "All Business Types", desc: "D2C, B2B, retailers, distributors, startups — one network", color: "#9B6DFF" },
            { icon: FiTrendingUp, label: "Trade Safely", desc: "Check payment behavior before extending credit", color: "#10D98A" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card-premium p-3 text-center">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <p className="text-xs font-bold text-primary mb-0.5">{label}</p>
              <p className="text-2xs text-muted">{desc}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="card-premium p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder="Search business name or Vantro ID..."
                className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted pl-9 pr-4 py-2.5 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button onClick={search} disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-button-accent disabled:opacity-50 shrink-0">
              {loading ? <FiLoader size={14} className="animate-spin" /> : "Search"}
            </button>
          </div>

          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BUSINESS_TYPES.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setFilter(key); }}
                className={[
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border shrink-0",
                  filter === key
                    ? "bg-white text-black border-accent shadow-button-accent"
                    : "bg-surface-2 text-secondary border-border hover:border-accent/30 hover:text-accent",
                ].join(" ")}>
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="card-premium p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                </div>
                <div className="skeleton h-8 w-full" />
              </div>
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-3">
              <FiUsers size={20} className="text-muted" />
            </div>
            <p className="text-sm font-semibold text-primary mb-1">No businesses found</p>
            <p className="text-xs text-muted">Try a different name, or invite businesses to join Vantro.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.length > 0 && (
              <p className="text-xs text-muted">{results.length} verified business{results.length !== 1 ? "es" : ""} found</p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {results.map(p => <BusinessCard key={p.vantro_id} p={p} />)}
            </div>
          </div>
        )}

        {/* Invite CTA */}
        <div className="card-premium p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
            <FiZap size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">Grow the network</p>
            <p className="text-xs text-muted">Invite your suppliers, retailers, and customers to get verified. The more businesses on Vantro, the more powerful the trust graph.</p>
          </div>
          <Link href="/my-id"
            className="shrink-0 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all shadow-button-accent whitespace-nowrap">
            Share My ID →
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Link from "next/link";
import {
  FiCpu, FiZap, FiActivity, FiTrendingUp, FiTarget,
  FiShield, FiDatabase, FiLayers, FiArrowRight,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface MLData {
  health_score: number;
  total_outstanding: number;
  expected_inflow_7d: number;
  avg_payment_probability: number;
  debtors: Array<{ customer_name: string; paymentProb: number; tier: string; score: number }>;
  stats: { total: number; high_priority: number; medium_priority: number; low_priority: number };
}

const MODELS = [
  {
    name: "Debtor Priority Model",
    version: "v2.1",
    type: "Gradient Boosting Ensemble",
    description: "Ranks every debtor by payment probability using 5 engineered features. Trained on MSME collections behavior patterns.",
    features: ["Days overdue (35%)", "Engagement signals (25%)", "Amount normalized (20%)", "Relationship depth (10%)", "Contact recency (10%)"],
    accuracy: "87%",
    icon: FiTarget,
    color: "#0066FF",
    latency: "<50ms",
  },
  {
    name: "Language Model",
    version: "LLaMA 3.3 70B",
    type: "Neural Network (70B params)",
    description: "70 billion parameter transformer neural network. Generates Hinglish messages, interprets business questions, produces morning briefings.",
    features: ["Hinglish generation", "Intent classification", "Cash flow analysis", "Strategic advice", "WhatsApp drafting"],
    accuracy: "92%",
    icon: FiCpu,
    color: "#9B6DFF",
    latency: "<800ms",
  },
  {
    name: "Cash Flow Predictor",
    version: "v1.4",
    type: "Ensemble (ARIMA + ML)",
    description: "Combines time-series seasonality modeling with ML-based individual debtor behavior to forecast 7/14/30 day inflows.",
    features: ["Promise date weighting", "Historical payment patterns", "Seasonal adjustments", "Scenario modeling (3x)"],
    accuracy: "79%",
    icon: FiTrendingUp,
    color: "#10D98A",
    latency: "<200ms",
  },
  {
    name: "Business Health Scorer",
    version: "v1.0",
    type: "Weighted Neural Score",
    description: "Computes a 0-100 health score from collection rate, engagement depth, and pickup rate. Powers the Starlane Trust Score.",
    features: ["Collection efficiency", "Engagement depth", "Network trust", "Activity signals"],
    accuracy: "94%",
    icon: FiShield,
    color: "#F5A524",
    latency: "<30ms",
  },
];

const TECH_STACK = [
  { label: "LLaMA 3.3 70B", sub: "Language model inference", icon: FiCpu, color: "#9B6DFF" },
  { label: "Groq LPU", sub: "Ultra-low latency AI chip", icon: FiCpu, color: "#0066FF" },
  { label: "Feature Store", sub: "Real-time ML features from Supabase", icon: FiDatabase, color: "#10D98A" },
  { label: "Ensemble Engine", sub: "Gradient boosting + neural scoring", icon: FiLayers, color: "#F5A524" },
  { label: "Edge Inference", sub: "Railway serverless, <100ms API", icon: FiZap, color: "#F5424D" },
  { label: "Behavioral Graph", sub: "Cross-business trust network", icon: FiActivity, color: "#0066FF" },
];

function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 300 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

export default function NeuralEnginePage() {
  const [mlData, setMlData] = useState<MLData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : "";
    if (!token) { setLoading(false); return; }
    fetch(`${BASE}/api/ml/briefing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d.success) setMlData(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout pageTitle="Neural Engine">
      <div className="max-w-4xl mx-auto space-y-5 page-enter">

        {/* Header */}
        <div className="card-premium p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
                <FiCpu size={18} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-primary">Starlane Neural Engine</h2>
                  <span className="text-2xs font-black text-accent bg-accent-dim border border-accent/20 px-2 py-0.5 rounded-full font-mono">v2.1</span>
                </div>
                <p className="text-xs text-muted">Proprietary AI infrastructure powering every intelligent feature</p>
              </div>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              The Starlane Neural Engine is a multi-model AI system combining a 70-billion parameter language neural network with purpose-built ML scoring models trained specifically on Indian MSME collections behavior. It runs in real-time, on your data, with sub-second latency.
            </p>
          </div>
        </div>

        {/* No verified data yet — shown once the network has run but found no real debtors */}
        {!loading && (!mlData || !mlData.debtors?.length) && (
          <div className="card-premium p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-3">
              <FiDatabase size={20} className="text-muted" />
            </div>
            <p className="text-sm font-bold text-primary mb-1">No verified business data yet</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              The models are live, but there are no real debtors to score yet. Add invoices or sales from Collections — your actual data will appear here.
            </p>
          </div>
        )}

        {/* Live model outputs — only when there is real scored data */}
        {mlData && !loading && (mlData.debtors?.length ?? 0) > 0 && (
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <p className="text-xs font-bold text-success uppercase tracking-wider">Live Model Output — Your Business</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Health Score",      value: `${mlData.health_score}/100`,              color: "#10D98A" },
                { label: "Avg Pay Prob",       value: `${mlData.avg_payment_probability}%`,      color: "#0066FF" },
                { label: "High Priority",     value: `${mlData.stats.high_priority} debtors`,   color: "#9B6DFF" },
                { label: "7-Day Forecast",    value: mlData.expected_inflow_7d >= 1000
                    ? `₹${(mlData.expected_inflow_7d/1000).toFixed(0)}K`
                    : `₹${mlData.expected_inflow_7d}`,                                           color: "#F5A524" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border">
                  <p className="text-2xs text-muted mb-1">{label}</p>
                  <p className="text-lg font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            {/* Top 5 scored debtors */}
            {mlData.debtors.length > 0 && (
              <div className="space-y-2">
                <p className="text-2xs font-bold text-secondary uppercase tracking-wider mb-2">Neural Probability Scores — Top Debtors</p>
                {mlData.debtors.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xs font-black text-muted w-4">{i + 1}</span>
                    <p className="text-xs text-secondary w-40 truncate">{d.customer_name}</p>
                    <div className="flex-1">
                      <AnimatedBar
                        value={d.paymentProb}
                        color={d.tier === "high" ? "#10D98A" : d.tier === "medium" ? "#F5A524" : "#F5424D"}
                        delay={i * 100}
                      />
                    </div>
                    <span className="text-xs font-black w-10 text-right"
                      style={{ color: d.tier === "high" ? "#10D98A" : d.tier === "medium" ? "#F5A524" : "#F5424D" }}>
                      {d.paymentProb}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Model cards */}
        <div>
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">AI Models Running in Production</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {MODELS.map((m) => (
              <div key={m.name} className="card-premium p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}>
                      <m.icon size={16} style={{ color: m.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{m.name}</p>
                      <p className="text-2xs text-muted font-mono">{m.type}</p>
                    </div>
                  </div>
                  <span className="text-2xs font-black font-mono text-muted border border-border px-1.5 py-0.5 rounded">{m.version}</span>
                </div>

                <p className="text-xs text-secondary mb-3 leading-relaxed">{m.description}</p>

                <div className="space-y-1 mb-3">
                  {m.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: m.color }} />
                      <span className="text-2xs text-muted">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-2xs text-muted">Accuracy</p>
                    <p className="text-sm font-black" style={{ color: m.color }}>{m.accuracy}</p>
                  </div>
                  <div className="w-px h-6 bg-border" />
                  <div>
                    <p className="text-2xs text-muted">Latency</p>
                    <p className="text-sm font-black text-primary">{m.latency}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-2xs text-success font-semibold">Live</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="card-premium p-5">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Technology Stack</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TECH_STACK.map(({ label, sub, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2.5 p-3 bg-surface-2 rounded-xl border border-border">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary truncate">{label}</p>
                  <p className="text-2xs text-muted truncate">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="card-premium p-5">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Neural Engine Roadmap</p>
          <div className="space-y-3">
            {[
              { version: "v3.0", label: "Payment Intent Classifier", desc: "Classify debtor WhatsApp replies in real-time: 'Kal pakka' → Promise, 'Dekhunga' → Uncertain", status: "Building", color: "#F5A524" },
              { version: "v3.5", label: "Custom Starlane LLM", desc: "Fine-tuned language model trained on 1M+ Hinglish MSME conversations for collections", status: "Planned", color: "#9B6DFF" },
              { version: "v4.0", label: "Credit Underwriting Model", desc: "B2B credit score from collections behavior — partner with NBFCs for embedded lending", status: "Planned", color: "#10D98A" },
            ].map(({ version, label, desc, status, color }) => (
              <div key={version} className="flex items-start gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                <span className="text-2xs font-black font-mono text-muted border border-border px-1.5 py-0.5 rounded shrink-0 mt-0.5">{version}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary">{label}</p>
                  <p className="text-2xs text-muted mt-0.5">{desc}</p>
                </div>
                <span className="text-2xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link href="/ai-chat">
          <div className="card-premium p-5 flex items-center gap-4 hover:border-accent/30 transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiCpu size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-primary">Talk to the Neural Engine</p>
              <p className="text-xs text-muted">Open AI Founder to see all models working live on your business data</p>
            </div>
            <FiArrowRight size={16} className="text-muted group-hover:text-accent transition-all" />
          </div>
        </Link>

      </div>
    </DashboardLayout>
  );
}

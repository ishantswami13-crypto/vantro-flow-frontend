"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  BUSINESS_TYPES, INDUSTRY_OPTIONS, getBusinessType, setBusinessType,
  type BusinessTypeKey, type BusinessTypeConfig,
} from "@/lib/businessTypes";
import { FiCheck, FiCopy, FiArrowRight, FiEdit2, FiX } from "react-icons/fi";

// ── BusinessType Selector card ────────────────────────────────────────────────
function TypeCard({
  config, selected, onClick,
}: { config: BusinessTypeConfig; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all w-full",
        selected
          ? "border-accent/60 bg-accent-dim"
          : "border-border bg-surface-2 hover:border-accent/30 hover:bg-surface-3",
      ].join(" ")}
    >
      <span className="text-2xl shrink-0">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${selected ? "text-accent" : "text-primary"}`}>
          {config.label}
        </p>
        <p className="text-2xs text-muted truncate">{config.description}</p>
      </div>
      {selected && <FiCheck size={15} className="text-accent shrink-0" />}
    </button>
  );
}

// ── WhatsApp template with copy button ───────────────────────────────────────
function WaTemplate({ label, message }: { label: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(message).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-secondary">{label}</span>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-2xs text-muted hover:text-accent transition-colors">
          {copied ? <FiCheck size={11} className="text-success" /> : <FiCopy size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-secondary leading-relaxed font-mono whitespace-pre-wrap break-words">
        {message}
      </p>
      <p className="text-2xs text-muted mt-2">
        Replace <span className="font-mono text-accent">{"{name}"}</span>,{" "}
        <span className="font-mono text-accent">{"{amount}"}</span> etc. with real values
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IndustryPage() {
  const router = useRouter();
  const [config, setConfig]       = useState<BusinessTypeConfig | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [pending, setPending]     = useState<BusinessTypeKey | null>(null);

  useEffect(() => {
    const bt = getBusinessType();
    setConfig(bt);
    if (!bt) setSelecting(true); // no type set yet → open picker immediately
  }, []);

  const applyType = (key: BusinessTypeKey) => {
    // Find the industry option value that maps to this key
    const optionValue = INDUSTRY_OPTIONS.find(o => {
      const mapped = (() => {
        const map: Record<string, BusinessTypeKey> = {
          trading: "trading", distribution: "trading", manufacturing: "manufacturing",
          construction: "construction", textile: "textile", pharma: "pharma",
          grocery: "grocery", restaurant: "restaurant", real_estate: "real_estate",
          services: "trading", retail: "grocery", other: "trading",
        };
        return map[o.value];
      })();
      return mapped === key;
    })?.value || key;

    setBusinessType(optionValue);
    setConfig(BUSINESS_TYPES[key]);
    setSelecting(false);
    setPending(null);
    // Reload page to update sidebar
    window.location.reload();
  };

  // ── No type set yet — full-screen picker ─────────────────────────────────
  if (selecting) {
    return (
      <DashboardLayout pageTitle="My Industry">
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center mb-8">
            <p className="text-3xl mb-3">🏢</p>
            <h1 className="text-2xl font-black text-primary mb-2">What kind of business are you?</h1>
            <p className="text-sm text-secondary">
              Vantro will show only the features that matter for your business.
              Useless pages will be hidden.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {(Object.values(BUSINESS_TYPES) as BusinessTypeConfig[]).map((bt) => (
              <TypeCard
                key={bt.key}
                config={bt}
                selected={pending === bt.key}
                onClick={() => setPending(bt.key)}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 justify-center">
            <button
              disabled={!pending}
              onClick={() => pending && applyType(pending)}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            >
              Set My Business Type
              <FiArrowRight size={15} />
            </button>
            {config && (
              <button onClick={() => setSelecting(false)}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors">
                <FiX size={14} /> Cancel
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Industry dashboard ────────────────────────────────────────────────────
  if (!config) return null;

  return (
    <DashboardLayout pageTitle={`${config.emoji} ${config.label} Features`}>
      <div className="space-y-6 max-w-3xl">

        {/* ── Header ── */}
        <div className="card-premium p-5 flex items-start gap-4">
          <div className="text-4xl shrink-0">{config.emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-black text-primary">{config.label}</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                style={{ color: config.color, background: `${config.color}18`, borderColor: `${config.color}30` }}>
                Active
              </span>
            </div>
            <p className="text-sm text-secondary mb-3">{config.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>📋 <b className="text-primary">{config.label}</b> calls invoices <b className="text-secondary">&ldquo;{config.terms.invoice}&rdquo;</b></span>
              <span>👤 Customers are <b className="text-secondary">&ldquo;{config.terms.customer}&rdquo;</b></span>
            </div>
          </div>
          <button
            onClick={() => { setPending(config.key); setSelecting(true); }}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors shrink-0 px-3 py-2 rounded-lg border border-border hover:border-accent/30">
            <FiEdit2 size={12} /> Change
          </button>
        </div>

        {/* ── Features built for this type ── */}
        <div>
          <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
            ✅ Features Built for {config.label}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {config.coreFeatures.map((f) => (
              <div key={f.title} className="bg-surface-2 border border-border rounded-xl p-4 flex gap-3">
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-sm font-bold text-primary mb-0.5">{f.title}</p>
                  <p className="text-xs text-secondary leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Not needed ── */}
        {config.notNeeded.length > 0 && (
          <div className="bg-surface-1 border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
              🚫 Hidden — Not useful for {config.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {config.notNeeded.map((item) => (
                <span key={item}
                  className="text-xs text-muted bg-surface-2 border border-border rounded-lg px-3 py-1.5 line-through decoration-muted/40">
                  {item}
                </span>
              ))}
            </div>
            <p className="text-2xs text-muted mt-3">
              These pages are hidden from your sidebar. Change business type in Settings → Business to see them.
            </p>
          </div>
        )}

        {/* ── WhatsApp Templates ── */}
        <div>
          <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
            📱 WhatsApp Templates for {config.label}
          </h2>
          <div className="space-y-3">
            {config.waTemplates.map((t) => (
              <WaTemplate key={t.label} label={t.label} message={t.message} />
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            Go to <b className="text-secondary">WhatsApp</b> page to send these to customers directly.
            AI auto-fills {"{name}"}, {"{amount}"} from your data.
          </p>
        </div>

        {/* ── Tips ── */}
        <div>
          <h2 className="text-sm font-bold text-secondary uppercase tracking-wider mb-3">
            💡 Tips for {config.label} Owners
          </h2>
          <div className="space-y-2">
            {config.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-surface-2 border border-border rounded-xl">
                <span className="w-5 h-5 rounded-full bg-accent-dim border border-accent/20 text-accent text-2xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-secondary leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick links to relevant pages ── */}
        <div className="card-premium p-5">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
            🚀 Your Most Important Pages
          </p>
          <div className="grid sm:grid-cols-3 gap-2">
            {[
              { href: "/collections", label: "Collections", emoji: "💰" },
              { href: "/today",       label: "Today's P&L", emoji: "📊" },
              { href: "/whatsapp",    label: "WhatsApp",    emoji: "📱" },
              { href: "/khata",       label: "Customer Khata", emoji: "📋" },
              { href: "/analytics",   label: "Analytics",   emoji: "📈" },
              { href: "/settings",    label: "Settings",    emoji: "⚙️"  },
            ].filter(l => !config.hiddenRoutes.includes(l.href)).slice(0, 6).map(l => (
              <a key={l.href} href={l.href}
                className="flex items-center gap-2 p-3 rounded-xl bg-surface-2 border border-border hover:border-accent/30 hover:bg-surface-3 transition-all text-sm font-medium text-secondary hover:text-primary">
                <span>{l.emoji}</span>
                {l.label}
                <FiArrowRight size={12} className="ml-auto text-muted" />
              </a>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

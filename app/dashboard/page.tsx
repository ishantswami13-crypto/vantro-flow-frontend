"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiList, FiPlus, FiArrowRight,
  FiMessageSquare, FiCheckSquare, FiTrendingUp, FiSettings, FiZap,
} from "react-icons/fi";
import { api, getUser, type Metrics, type Invoice, type OwnerBriefingResponse, type IntelligenceSignal } from "@/lib/api";
import QuickSale from "@/components/QuickSale";
import OwnerBriefingCard from "@/components/agents/OwnerBriefingCard";
import { isDemoMode } from "@/lib/demo";

const DEMO_BRIEFING = "3 priority calls today — Mehta Fabrics (₹8.4L, 62 days overdue) first. Sharma Steel didn't pick up last time — try again. Cash runway is 12 days; ₹5L+ is needed this week.";

function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const CUSTOMERS: { id: number; name: string; outstanding: number; days: number; score: number; lastPayment: string; contact: string }[] = [];

function fmtAmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

// Three example prompts shown BELOW the input, not chip buttons inside it —
// text hints, not a consumer-AI pill row.
const ASK_EXAMPLES = [
  "Why is cash falling this week?",
  "What changed in supplier risk?",
  "Where are receivables deteriorating?",
];

export default function DashboardPage() {
  const router = useRouter();
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [query, setQuery] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [promises, setPromises] = useState<{ customer_name: string; promised_payment_date?: string; amount: number }[]>([]);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [bizOverview, setBizOverview] = useState({ unpaidBills: 0, unpaidBillsAmt: 0, khataReceivable: 0, purchasesDue: 0 });
  const [ownerName, setOwnerName] = useState("there");
  const [briefing, setBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [liveCustomers, setLiveCustomers] = useState<typeof CUSTOMERS>([]);
  const [rawInvoices, setRawInvoices] = useState<Invoice[]>([]);
  const [ownerBriefing, setOwnerBriefing] = useState<OwnerBriefingResponse | null>(null);
  const [ownerBriefingLoading, setOwnerBriefingLoading] = useState(true);
  const [ownerBriefingError, setOwnerBriefingError] = useState(false);
  const [ownerBriefingFetchedAt, setOwnerBriefingFetchedAt] = useState<Date | null>(null);
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;
    setUserPlan(user.plan || "free");

    const stored = (() => { try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; } })();
    setOwnerName((stored.business_name || user.business_name || user.email?.split("@")[0] || "there").split(" ")[0]);

    if (isDemoMode()) {
      setBriefing(DEMO_BRIEFING);
      setBriefingLoading(false);
    } else {
      api.briefing().then(d => {
        if (d.success && d.briefing) setBriefing(d.briefing);
      }).catch(() => {}).finally(() => setBriefingLoading(false));
    }

    if (!isDemoMode()) {
      api.ownerBriefingPreview()
        .then(d => { setOwnerBriefing(d); setOwnerBriefingFetchedAt(new Date()); })
        .catch(err => {
          if ((err as { status?: number }).status === 404) { setOwnerBriefingLoading(false); return; }
          setOwnerBriefingError(true);
        })
        .finally(() => setOwnerBriefingLoading(false));
    } else {
      setOwnerBriefingLoading(false);
    }

    api.metrics(user.id).then(d => setMetrics(d.metrics)).catch(() => {});

    // Real "what changed" signals — same active-status filter as the
    // Intelligence list page. Empty array (not null) once resolved, so the
    // section can tell "loading" from "genuinely nothing active."
    api.intelligence.signals()
      .then(d => {
        const active = (d.signals || []).filter(s => s.status === "CANDIDATE" || s.status === "ACTIVE" || s.status === "UPDATED");
        setSignals(active.slice(0, 2));
      })
      .catch(() => setSignals([]));

    api.invoices.list(user.id).then(d => {
      const pending = (d.invoices || []).filter(inv => inv.payment_status === "Pending");
      setRawInvoices(pending);
      const sorted = [...pending].sort((a, b) => b.days_overdue - a.days_overdue);
      const mapped = sorted.slice(0, 5).map((inv, i) => ({
        id: i + 1,
        name: inv.customer_name,
        outstanding: inv.invoice_amount,
        days: inv.days_overdue,
        score: Math.max(10, Math.min(99, 90 - inv.days_overdue)),
        lastPayment: inv.payment_date || "—",
        contact: inv.customer_phone || "",
      }));
      if (mapped.length > 0) setLiveCustomers(mapped);
    }).catch(() => {});

    api.calls.list(user.id).then(d => {
      const todayPromises = (d.calls || []).filter(
        (c: any) => c.promised_payment_date && c.promised_payment_date >= today
      );
      setPromises(todayPromises);
    }).catch(() => {});

    Promise.all([
      api.bills.list().catch(() => ({ bills: [] })),
      api.khata.list().catch(() => ({ customers: [] })),
      api.purchases.list().catch(() => ({ purchases: [] })),
    ]).then(([billsD, khataD, purchasesD]) => {
      const unpaidBills = (billsD.bills || []).filter((b: any) => b.status !== "paid");
      const khataReceivable = (khataD.customers || []).reduce((s: number, c: any) => s + (c.balance > 0 ? c.balance : 0), 0);
      const purchasesDue = (purchasesD.purchases || [])
        .filter((p: any) => p.status !== "paid")
        .reduce((s: number, p: any) => {
          const amount = Number(p.amount ?? p.total_amount ?? 0);
          const paid = Number(p.paid_amount ?? 0);
          return s + Math.max(amount - paid, 0);
        }, 0);
      setBizOverview({
        unpaidBills: unpaidBills.length,
        unpaidBillsAmt: unpaidBills.reduce((s: number, b: any) => s + Number(b.total), 0),
        khataReceivable,
        purchasesDue,
      });
    });
  }, []);

  const callsLeft = rawInvoices.length;
  const promisedAmt = promises.reduce((s, p) => s + ((p as any).amount || 0), 0);
  const liveRiskCustomers = liveCustomers.filter(c => c.days >= 60 && c.days < 90);
  const riskTotal = liveRiskCustomers.reduce((s, c) => s + c.outstanding, 0);

  const payablesDue = bizOverview.purchasesDue + bizOverview.unpaidBillsAmt;
  const netCash = (metrics?.total_outstanding || 0) - payablesDue;
  const recoveryRate = metrics ? Number(metrics.avg_recovery_rate) || 0 : 0;
  const overdue30 = rawInvoices.filter(inv => inv.days_overdue > 30).reduce((s, inv) => s + inv.invoice_amount, 0);

  // Open typographic metrics, not a card wall — a related set of business
  // facts, not five independent "statuses" each demanding its own color.
  // Color appears only where a number is genuinely a problem.
  const healthDomains: { label: string; value: string; sub: string; critical: boolean }[] = [
    {
      label: "Cashflow",
      value: `${netCash < 0 ? "-" : ""}₹${(Math.abs(netCash) / 100000).toFixed(1)}L`,
      sub: netCash < 0 ? "payables exceed receivables" : "net position",
      critical: netCash < 0,
    },
    {
      label: "Collections",
      value: `${recoveryRate}%`,
      sub: "recovery rate",
      critical: recoveryRate < 40 && metrics !== null,
    },
    {
      label: "Payables",
      value: `₹${(payablesDue / 100000).toFixed(1)}L`,
      sub: "bills + purchases due",
      critical: payablesDue > (metrics?.total_outstanding || 0) && payablesDue > 0,
    },
    {
      label: "Credit risk",
      value: String(liveRiskCustomers.length),
      sub: liveRiskCustomers.length > 0 ? `₹${(riskTotal / 100000).toFixed(1)}L at 60–89d` : "no customers at risk",
      critical: liveRiskCustomers.length > 2,
    },
    {
      label: "Overdue 30d+",
      value: `₹${(overdue30 / 100000).toFixed(1)}L`,
      sub: "past 30 days",
      critical: overdue30 > (metrics?.total_outstanding || 1) * 0.3,
    },
  ];

  function submitQuery(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/ai-chat?q=${encodeURIComponent(q)}`);
  }

  const hasBusinessData = metrics !== null;
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <DashboardLayout pageTitle="Overview">
      {showQuickSale && <QuickSale onClose={() => setShowQuickSale(false)} onSaved={() => {}} />}

      {/* Dark shell, light workspace. The app's Tailwind color tokens
          (text-primary, border-border, etc.) compile to fixed dark-mode hex
          values, not CSS variables, so a light page can't reuse them via a
          wrapper scope — every color here is written explicitly against a
          warm-neutral gray scale instead. -m-4/-m-5 bleeds past
          DashboardLayout's own padding so the canvas reaches the shell
          edges; max content width 1280px per institutional-density spacing,
          not a centered narrow column. */}
      <div className="-m-4 lg:-m-5 min-h-[calc(100vh-3rem)]" style={{ background: "#F7F7F4" }}>
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-8 space-y-12">
          {/* ── Page header — left-aligned, normal weight. No centered
              50px serif hero; the greeting is the subtitle, not the title. ── */}
          <div>
            <h1 className="text-[30px] leading-[1.15] text-gray-900" style={{ fontWeight: 450 }}>Overview</h1>
            <p className="text-sm text-gray-500 mt-1">{getGreeting()}, {ownerName} · {dateLabel}</p>
          </div>

          {/* ── Command input — compact, no pill row inside it. Real
              destination: the actual AI Founder chat. Suggestions sit below
              as plain text, not chip buttons. ── */}
          <div>
            <form onSubmit={submitQuery} className="flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] px-3 h-12">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask Starlane about this organization…"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <button type="submit" disabled={!query.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-900 text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors">
                <FiArrowRight size={13} />
              </button>
            </form>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 px-1">
              {ASK_EXAMPLES.map(q => (
                <button key={q} type="button" onClick={() => router.push(`/ai-chat?q=${encodeURIComponent(q)}`)}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* ── What changed — real active intelligence signals, at most
              two. Not a fake example card; an honest empty state when
              signals is an empty array (fetch resolved, nothing active) and
              nothing at all while signals is still null (loading). ── */}
          {signals && signals.length > 0 && (
            <div>
              <p className="text-[13px] font-medium text-gray-500 mb-3">What changed</p>
              <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
                {signals.map(s => (
                  <Link key={s.id} href={`/intelligence/${s.id}`}
                    className="flex items-center justify-between gap-4 py-3.5 group">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 group-hover:text-gray-600 transition-colors truncate">{s.event_title || "External event"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.related_entity_type === "supplier" ? "Supplier exposure" : "Business exposure"} · detected {new Date(s.first_detected_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <FiArrowRight size={13} className="text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Business state — open metrics, one dividing rule per
              column, no cards, no glow, no pulsing icons. Honest "no data"
              state instead of a wall of ₹0.0L. ── */}
          <div>
            <p className="text-[13px] font-medium text-gray-500 mb-4">Business state</p>
            {!hasBusinessData ? (
              <p className="text-sm text-gray-400">No business data recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-x-10 gap-y-5 divide-x divide-gray-200">
                {healthDomains.map(({ label, value, sub, critical }, i) => (
                  <div key={label} className={i === 0 ? "" : "pl-10"}>
                    <p className={["metric-value text-[26px]", critical ? "text-danger" : "text-gray-900"].join(" ")}>{value}</p>
                    <p className="text-xs text-gray-400 mt-1">{label} · {sub}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── AI briefing — a quiet bordered note, not a bouncing-dot
              loading animation or a gradient panel. ── */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-[13px] font-medium text-gray-500 mb-2">Briefing</p>
            {briefingLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin shrink-0" />
                <span className="text-xs text-gray-400">Preparing...</span>
              </div>
            ) : briefing ? (
              <p className="text-sm text-gray-600 leading-relaxed">{briefing}</p>
            ) : (
              <p className="text-sm text-gray-400">Upload invoices — Starlane will start briefing you daily.</p>
            )}
          </div>

          {(!isDemoMode() && (ownerBriefingLoading || ownerBriefingError || ownerBriefing)) && (
            <OwnerBriefingCard
              data={ownerBriefing}
              loading={ownerBriefingLoading}
              error={ownerBriefingError}
              fetchedAt={ownerBriefingFetchedAt}
            />
          )}

          {/* ── Free plan nudge — a text line, not a gradient promo card
              with an emoji icon. ── */}
          {userPlan === "free" && (metrics?.pending_invoices ?? 0) > 0 && (
            <p className="text-xs text-gray-400">
              {metrics!.pending_invoices} invoices are overdue with no automated reminder sent.{" "}
              <Link href="/billing" className="text-accent hover:underline">Enable automation →</Link>
            </p>
          )}

          {/* ── Promises due today — a plain list, not a Hindi-language
              urgency banner. ── */}
          {promises.length > 0 && (() => {
            const dueToday = promises.filter(p => p.promised_payment_date && p.promised_payment_date <= today);
            if (dueToday.length === 0) return null;
            return (
              <div className="border-t border-gray-200 pt-6">
                <p className="text-[13px] font-medium text-gray-500 mb-3">Promised today</p>
                <div className="divide-y divide-gray-200">
                  {dueToday.map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <span className="text-sm text-gray-900">{p.customer_name}</span>
                      <span className="text-sm metric-value text-gray-600">{p.amount > 0 ? fmtAmt(p.amount) : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Top customers to call — same table, calmer treatment: no
              colored priority pill, no per-row tinted avatar circle. Row
              height 44px+, hairline horizontal borders only. ── */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-gray-500">Top customers to call today</p>
              <Link href="/collections" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                View all {metrics?.pending_invoices ?? "—"} <FiArrowRight size={11} />
              </Link>
            </div>
            {liveCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 py-6">
                No outstanding invoices yet. <Link href="/collections" className="text-accent underline">Add your first invoice →</Link>
              </p>
            ) : (
              <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Customer</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">Outstanding</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Days overdue</th>
                    <th className="py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Score</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {liveCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-white transition-colors">
                      <td className="py-3.5">
                        <p className="font-medium text-gray-900 text-[13px]">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.contact}</p>
                      </td>
                      <td className="py-3.5 text-right metric-value text-gray-900">{fmtAmt(c.outstanding)}</td>
                      <td className="py-3.5 text-right hidden sm:table-cell">
                        <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>{c.days}d</Badge>
                      </td>
                      <td className="py-3.5 hidden md:table-cell">
                        <span className={["text-xs font-semibold metric-value", c.score >= 70 ? "text-success" : c.score >= 40 ? "text-warning" : "text-danger"].join(" ")}>
                          {c.score}%
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a href={`https://wa.me/91${c.contact}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors">
                            <FiMessageSquare size={11} />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors">
                            <FiCheckSquare size={11} />
                            <span className="hidden sm:inline">Log</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Quick actions — plain list, no gradient icon chips. ── */}
          <div className="border-t border-gray-200 pt-6 pb-10">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { href: "/collections", Icon: FiList, label: "Full collections", sub: "Sorted by priority" },
                { href: "/forecast", Icon: FiTrendingUp, label: "Cash forecast", sub: "Runway and projections" },
                { href: "/settings", Icon: FiSettings, label: "Settings", sub: "Tally sync, preferences" },
              ].map(({ href, Icon, label, sub }) => (
                <Link href={href} key={href} className="flex items-start gap-3 py-2 group">
                  <Icon size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  <FiArrowRight size={12} className="text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all ml-auto mt-1 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        {/* Starlane ID mini-card */}
        <Link href="/my-id">
          <div className="card-premium p-5 flex items-center gap-4 group cursor-pointer hover:border-accent/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
              <FiZap size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-bold text-primary">Your Starlane Business ID</p>
                <span className="text-2xs font-bold text-accent bg-accent-dim border border-accent/20 px-1.5 py-0.5 rounded font-mono">
                  VAN-ID
                </span>
              </div>
              <p className="text-xs text-muted">Share your verified financial identity — build instant trust with customers & suppliers</p>
            </div>
            <FiArrowRight size={16} className="text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </Link>

        {/* Bottom nav cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: "/collections", Icon: FiList,       label: "Full Collections",   sub: "42 active · Sort by priority", color: "#4F6EF7" },
            { href: "/forecast",    Icon: FiTrendingUp,  label: "Cash Forecast",      sub: "12d runway · Act now",         color: "#F5424D" },
            { href: "/settings",    Icon: FiSettings,   label: "Settings",           sub: "Tally sync · Preferences",     color: "#10D98A" },
          ].map(({ href, Icon, label, sub, color }) => (
            <Link href={href} key={href}>
              <div className="card-metric p-4 group cursor-pointer flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{label}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">{sub}</p>
                </div>
                <FiArrowRight size={14} className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Floating Quick Sale — a real feature, monochrome instead of an
          orange gradient pill. */}
      <button onClick={() => setShowQuickSale(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-700 transition-colors shadow-sm">
        <FiPlus size={15} /> Quick Sale
      </button>
    </DashboardLayout>
  );
}

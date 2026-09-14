"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiTarget, FiGlobe, FiList, FiPlus, FiArrowRight, FiPhone,
  FiMessageSquare, FiCheckSquare, FiTrendingUp, FiSettings, FiZap,
} from "react-icons/fi";
import { api, getUser, type Metrics, type Invoice, type OwnerBriefingResponse } from "@/lib/api";
import QuickSale from "@/components/QuickSale";
import OwnerBriefingCard from "@/components/agents/OwnerBriefingCard";
import { isDemoMode } from "@/lib/demo";

const DEMO_BRIEFING = "3 priority calls today — Mehta Fabrics (₹8.4L, 62 days overdue) first. Sharma Steel didn't pick up last time — try again. Cash runway is 12 days; ₹5L+ is needed this week.";

// Plain, time-based, no salutation dressing — the greeting states a fact,
// it doesn't perform enthusiasm.
function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const CUSTOMERS: { id: number; name: string; outstanding: number; days: number; score: number; lastPayment: string; contact: string }[] = [];

function fmtAmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

// Real Starlane destinations, not Harvey's legal-specific integrations
// (Vault / Web search / LexisNexis don't exist in this product).
const QUICK_LINKS = [
  { href: "/business-state", label: "Business State", icon: FiTarget },
  { href: "/intelligence", label: "Intelligence", icon: FiGlobe },
  { href: "/collections", label: "Collections", icon: FiList },
  { href: "/invoice/new", label: "New Invoice", icon: FiPlus },
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

  return (
    <DashboardLayout pageTitle="Dashboard">
      {showQuickSale && <QuickSale onClose={() => setShowQuickSale(false)} onSaved={() => {}} />}

      <div className="max-w-3xl mx-auto space-y-10 page-enter">
        {/* ── Greeting + command input — the workspace's one entry point,
            not a KPI card wall. Real destination: the actual AI Founder
            chat, not a fake search box that goes nowhere. ── */}
        <div className="pt-6 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl text-primary" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {getGreeting()}, {ownerName}
          </h1>
        </div>

        <form onSubmit={submitQuery} className="card-premium p-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask Starlane anything about your business..."
            className="w-full bg-transparent px-3 py-3 text-sm text-primary placeholder:text-muted focus:outline-none"
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium text-secondary border border-border hover:border-border-2 hover:text-primary transition-colors">
                  <Icon size={12} />
                  {label}
                </Link>
              ))}
            </div>
            <button type="submit" disabled={!query.trim()}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors">
              <FiArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* ── Business health — open metrics, one dividing rule per column,
            no cards, no glow, no pulsing icons. ── */}
        <div>
          <p className="section-label mb-3">Business health</p>
          <div className="flex flex-wrap gap-x-8 gap-y-4 divide-x divide-border">
            {healthDomains.map(({ label, value, sub, critical }, i) => (
              <div key={label} className={i === 0 ? "" : "pl-8"}>
                <p className={["metric-value text-xl", critical ? "text-danger" : "text-primary"].join(" ")}>{value}</p>
                <p className="text-2xs text-muted mt-0.5">{label} · {sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI briefing — a quiet bordered note, not a bouncing-dot
            loading animation or a gradient panel. ── */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-1.5 mb-2">
            <FiZap size={11} className="text-muted" />
            <p className="section-label">Briefing</p>
          </div>
          {briefingLoading ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
              <span className="text-xs text-muted">Preparing...</span>
            </div>
          ) : briefing ? (
            <p className="text-sm text-secondary leading-relaxed">{briefing}</p>
          ) : (
            <p className="text-sm text-muted">Upload invoices — Starlane will start briefing you daily.</p>
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
          <p className="text-2xs text-muted">
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
            <div className="border-t border-border pt-6">
              <p className="section-label mb-3">Promised today</p>
              <div className="divide-y divide-border">
                {dueToday.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-primary">{p.customer_name}</span>
                    <span className="text-sm metric-value text-secondary">{p.amount > 0 ? fmtAmt(p.amount) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Top customers to call — same table, calmer treatment: no
            colored priority pill, no per-row tinted avatar circle. ── */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Top customers to call today</p>
            <Link href="/collections" className="inline-flex items-center gap-1 text-2xs text-secondary hover:text-primary transition-colors">
              View all {metrics?.pending_invoices ?? "—"} <FiArrowRight size={11} />
            </Link>
          </div>
          {liveCustomers.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              No outstanding invoices yet. <Link href="/collections" className="text-accent underline">Add your first invoice →</Link>
            </p>
          ) : (
            <table className="w-full text-sm table-premium">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 section-label">Customer</th>
                  <th className="text-right py-2 section-label">Outstanding</th>
                  <th className="text-right py-2 section-label hidden sm:table-cell">Days overdue</th>
                  <th className="py-2 section-label hidden md:table-cell">Score</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {liveCustomers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3">
                      <p className="font-medium text-primary text-xs">{c.name}</p>
                      <p className="text-2xs text-muted">{c.contact}</p>
                    </td>
                    <td className="py-3 text-right metric-value text-primary">{fmtAmt(c.outstanding)}</td>
                    <td className="py-3 text-right hidden sm:table-cell">
                      <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>{c.days}d</Badge>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className={["text-xs font-semibold metric-value", c.score >= 70 ? "text-success" : c.score >= 40 ? "text-warning" : "text-danger"].join(" ")}>
                        {c.score}%
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a href={`https://wa.me/91${c.contact}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-2xs font-medium rounded-lg border border-border text-secondary hover:text-primary hover:border-border-2 transition-colors">
                          <FiMessageSquare size={11} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-2xs font-medium rounded-lg border border-border text-secondary hover:text-primary hover:border-border-2 transition-colors">
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
        <div className="border-t border-border pt-6 pb-10">
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { href: "/collections", Icon: FiList, label: "Full collections", sub: "Sorted by priority" },
              { href: "/forecast", Icon: FiTrendingUp, label: "Cash forecast", sub: "Runway and projections" },
              { href: "/settings", Icon: FiSettings, label: "Settings", sub: "Tally sync, preferences" },
            ].map(({ href, Icon, label, sub }) => (
              <Link href={href} key={href} className="flex items-start gap-3 py-2 group">
                <Icon size={16} className="text-muted mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary">{label}</p>
                  <p className="text-2xs text-muted mt-0.5">{sub}</p>
                </div>
                <FiArrowRight size={13} className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Quick Sale — a real feature, monochrome instead of an
          orange gradient pill. */}
      <button onClick={() => setShowQuickSale(true)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 hidden lg:flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg">
        <FiPlus size={16} /> Quick Sale
      </button>
    </DashboardLayout>
  );
}

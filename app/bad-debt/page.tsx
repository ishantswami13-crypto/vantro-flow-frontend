"use client";
import { isLoggedIn } from "@/lib/api";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiAlertTriangle, FiPhone, FiMessageSquare, FiDownload } from "react-icons/fi";
import { getUser, authHeaders } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface BadDebtAccount {
  id: string;
  customer_name: string;
  customer_phone?: string;
  invoice_amount: number;
  days_overdue: number;
  risk_level: "medium" | "high" | "critical";
  recommendation: string;
}

const RISK_CONFIG = {
  critical: { label: "Critical",  color: "#F5424D", bg: "bg-danger-dim",   border: "border-danger/30",   badge: "bg-danger/20 text-danger"    },
  high:     { label: "High Risk", color: "#F5A524", bg: "bg-warning/10",   border: "border-warning/30",  badge: "bg-warning/20 text-warning"  },
  medium:   { label: "Medium",    color: "#9B6DFF", bg: "bg-purple-500/10",border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-400" },
};

export default function BadDebtPage() {
  const [accounts, setAccounts] = useState<BadDebtAccount[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [filter, setFilter]     = useState<"all" | "critical" | "high" | "medium">("all");

  // Session lives in an HttpOnly cookie or localStorage depending on mode;


  // this component authenticates through authHeaders() either way.
  const user   = getUser();
  const userId = user?.id || "";

  useEffect(() => {
    if (!userId || !isLoggedIn()) return;
    setLoading(true);
    fetch(`${BASE}/api/bad-debt-flags/${userId}`, { headers: { ...authHeaders() }, credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.success) setAccounts(d.flagged || []);
        else setError(d.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = filter === "all" ? accounts : accounts.filter(a => a.risk_level === filter);

  const totalAtRisk = accounts.reduce((s, a) => s + Number(a.invoice_amount), 0);
  const criticalCount = accounts.filter(a => a.risk_level === "critical").length;
  const highCount = accounts.filter(a => a.risk_level === "high").length;

  function waLink(phone: string, name: string, amount: number) {
    const msg = `Dear ${name}, ₹${amount.toLocaleString("en-IN")} ka aapka payment bahut der se pending hai. Kripya turant contact karein — legal action liya ja sakta hai.`;
    return `https://wa.me/91${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  }

  function exportCSV() {
    const rows = [
      ["Customer", "Amount (₹)", "Days Overdue", "Risk Level", "Recommendation"],
      ...accounts.map(a => [a.customer_name, a.invoice_amount, a.days_overdue, a.risk_level, a.recommendation]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "vantro-bad-debt.csv";
    a.click();
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <FiAlertTriangle size={20} className="text-danger" />
              Bad Debt Risk Radar
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              Accounts 60+ days overdue — flagged before they become write-offs
            </p>
          </div>
          {accounts.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-surface-2 border border-border rounded-xl text-secondary hover:text-primary hover:border-border-2 transition-all">
              <FiDownload size={13} />
              Export CSV
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total at Risk",    value: `₹${(totalAtRisk / 100000).toFixed(1)}L`, sub: `${accounts.length} accounts`, color: "text-danger" },
            { label: "Critical (120d+)", value: criticalCount,                             sub: "Needs legal notice",           color: "text-danger" },
            { label: "High Risk (90d+)", value: highCount,                                 sub: "Personal call needed",         color: "text-warning" },
          ].map(s => (
            <div key={s.label} className="card-premium p-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-secondary mt-1">{s.label}</div>
              <div className="text-2xs text-muted mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
          {(["all", "critical", "high", "medium"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={["px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize",
                filter === f ? "bg-white text-black" : "text-muted hover:text-primary",
              ].join(" ")}>
              {f === "all" ? `All (${accounts.length})` : `${f} (${accounts.filter(a => a.risk_level === f).length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-premium p-4 animate-pulse">
                <div className="h-4 bg-surface-3 rounded w-48 mb-2" />
                <div className="h-3 bg-surface-3 rounded w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-premium p-6 text-center">
            <p className="text-danger text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-12 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-primary font-bold text-lg">
              {accounts.length === 0 ? "No bad debt risk detected!" : `No ${filter} risk accounts`}
            </p>
            <p className="text-secondary text-sm mt-1">
              {accounts.length === 0
                ? "All overdue accounts are under 60 days — keep following up!"
                : "Try changing the filter above"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(account => {
              const cfg = RISK_CONFIG[account.risk_level];
              return (
                <div key={account.id} className={`card-premium p-4 border ${cfg.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-primary truncate">{account.customer_name}</h3>
                        <span className={`text-2xs font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-lg font-black" style={{ color: cfg.color }}>
                        ₹{Number(account.invoice_amount).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {account.days_overdue} days overdue
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {account.customer_phone && (
                        <>
                          <a href={`tel:+91${account.customer_phone.replace(/\D/g, "")}`}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-success/10 border border-success/20 text-success hover:bg-success hover:text-white transition-all"
                            title="Call">
                            <FiPhone size={14} />
                          </a>
                          <a href={waLink(account.customer_phone, account.customer_name, account.invoice_amount)}
                            target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                            title="WhatsApp">
                            <FiMessageSquare size={14} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className={`mt-3 px-3 py-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                    <p className="text-xs font-semibold" style={{ color: cfg.color }}>
                      Recommended Action
                    </p>
                    <p className="text-xs text-secondary mt-0.5">{account.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info panel */}
        <div className="card-premium p-4">
          <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">How Bad Debt Radar Works</p>
          <div className="space-y-2">
            {[
              { risk: "Medium",   days: "60–89 days",  action: "Escalate — send firm WhatsApp + call yourself",     color: "text-purple-400" },
              { risk: "High",     days: "90–119 days", action: "Personal call mandatory — consider settlement offer", color: "text-warning"   },
              { risk: "Critical", days: "120+ days",   action: "Send legal notice via CA — last chance before write-off", color: "text-danger" },
            ].map(r => (
              <div key={r.risk} className="flex items-start gap-3">
                <span className={`text-xs font-bold w-16 shrink-0 ${r.color}`}>{r.risk}</span>
                <span className="text-xs text-muted w-24 shrink-0">{r.days}</span>
                <span className="text-xs text-secondary">{r.action}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

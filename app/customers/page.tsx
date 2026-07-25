"use client";
import { authHeaders } from "@/lib/api";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FiBook, FiMessageSquare, FiPhone, FiSearch, FiUser, FiUsers } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Customer = {
  customer_name: string;
  customer_phone?: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
  last_entry: string;
  entry_count: number;
};

const fmtINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmtDate = (value?: string | null) => {
  if (!value) return "No activity";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scoreMap, setScoreMap] = useState<Record<string, { score: number; tier: string; overdue_amount: number }>>({});

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/khata`, {
        headers: authHeaders(), credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load customers");
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    fetch(`${API}/api/customer-scores`, { headers: authHeaders(), credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.scores) return;
        const map: Record<string, any> = {};
        d.scores.forEach((s: any) => { map[s.customer_name] = s; });
        setScoreMap(map);
      }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [customer.customer_name, customer.customer_phone].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }, [customers, search]);

  const totalReceivable = customers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  const totalAdvance = customers.reduce((sum, c) => sum + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);
  const activeCustomers = customers.filter((c) => Number(c.balance) > 0).length;

  const whatsappStatement = (customer: Customer) => {
    const balance = Number(customer.balance || 0);
    const message = balance > 0
      ? `Namaste ${customer.customer_name} ji, aapka hamare yahan ${fmtINR(balance)} baaki hai. Kripya payment update karein.`
      : balance < 0
        ? `Namaste ${customer.customer_name} ji, aapka ${fmtINR(Math.abs(balance))} advance hamare paas hai.`
        : `Namaste ${customer.customer_name} ji, aapka account clear hai.`;

    if (customer.customer_phone) {
      window.open(`https://wa.me/91${customer.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
      return;
    }
    navigator.clipboard.writeText(message);
  };

  return (
    <DashboardLayout pageTitle="Customers">
      <div className="space-y-5 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Customers</h2>
            <p className="text-sm text-secondary mt-0.5">Auto-added from Sales, Invoices and Khata</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadCustomers} className="px-4 py-2 rounded-xl bg-surface-2 text-secondary text-xs font-bold border border-border">
              Refresh
            </button>
            <Link href="/khata" className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold">
              Open Khata
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card-metric p-5">
            <p className="section-label mb-3">Total Customers</p>
            <p className="metric-lg text-primary">{customers.length}</p>
            <p className="text-2xs text-muted mt-1">{activeCustomers} with dues</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">We Need To Collect</p>
            <p className="metric-lg text-danger">{fmtINR(totalReceivable)}</p>
            <p className="text-2xs text-muted mt-1">lena hai</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">Customer Advance</p>
            <p className="metric-lg text-success">{fmtINR(totalAdvance)}</p>
            <p className="text-2xs text-muted mt-1">dena / adjust karna hai</p>
          </div>
          <div className="card-metric p-5">
            <p className="section-label mb-3">Ledger Entries</p>
            <p className="metric-lg text-accent">{customers.reduce((s, c) => s + Number(c.entry_count || 0), 0)}</p>
            <p className="text-2xs text-muted mt-1">linked automatically</p>
          </div>
        </div>

        <div className="relative">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or phone..."
            className="w-full bg-surface-2 border border-white/8 rounded-xl pl-9 pr-3 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50"
          />
        </div>

        {loading ? (
          <div className="card-premium p-10 text-center text-sm text-muted">Loading customers...</div>
        ) : error ? (
          <div className="card-premium p-10 text-center text-sm text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <FiUsers size={34} className="mx-auto mb-3 text-muted opacity-40" />
            <p className="text-sm font-bold text-primary">No customers yet</p>
            <p className="text-xs text-muted mt-1">Scan a sale invoice, create an invoice, or add a Khata entry.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((customer) => {
              const balance = Number(customer.balance || 0);
              return (
                <div key={customer.customer_name} className="card-premium p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent/12 border border-accent/25 text-accent flex items-center justify-center shrink-0">
                        <FiUser size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-primary truncate">{customer.customer_name}</p>
                        <p className="text-2xs text-muted">{customer.entry_count || 0} entries · {fmtDate(customer.last_entry)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={balance > 0 ? "metric-value text-danger" : balance < 0 ? "metric-value text-success" : "metric-value text-muted"}>
                        {fmtINR(Math.abs(balance))}
                      </p>
                      <p className="text-2xs text-muted">{balance > 0 ? "lena hai" : balance < 0 ? "advance" : "clear"}</p>
                      {scoreMap[customer.customer_name] && (() => {
                        const risk = scoreMap[customer.customer_name];
                        const tierColor = risk.tier === "HIGH_RISK" ? "#F5424D" : risk.tier === "MEDIUM" ? "#F5A524" : "#10D98A";
                        const tierLabel = risk.tier === "HIGH_RISK" ? "High Risk" : risk.tier === "MEDIUM" ? "Medium" : "Low Risk";
                        return (
                          <span className="inline-block mt-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                            style={{ color: tierColor, background: `${tierColor}18`, border: `1px solid ${tierColor}40` }}>
                            {tierLabel} · {risk.score}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Given</p>
                      <p className="text-sm font-bold text-primary">{fmtINR(Number(customer.total_debit || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Paid</p>
                      <p className="text-sm font-bold text-primary">{fmtINR(Number(customer.total_credit || 0))}</p>
                    </div>
                    <div className="rounded-xl bg-surface-2/70 p-3">
                      <p className="text-2xs text-muted">Last</p>
                      <p className="text-sm font-bold text-primary truncate">{fmtDate(customer.last_entry)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link
                      href={`/khata?customer=${encodeURIComponent(customer.customer_name)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-accent/10 text-accent border border-accent/20"
                    >
                      <FiBook size={11} /> Khata
                    </Link>
                    {customer.customer_phone && (
                      <a
                        href={`tel:${customer.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-surface-2 text-secondary border border-border"
                      >
                        <FiPhone size={11} /> Call
                      </a>
                    )}
                    <button
                      onClick={() => whatsappStatement(customer)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-semibold rounded-lg bg-success/10 text-success border border-success/20"
                    >
                      <FiMessageSquare size={11} /> WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

"use client";

// Customers: everyone you sell to, built from sales, invoices and khata
// (GET /api/khata), with the balance each one carries, their risk tier when
// scoring is on, and the customers the portfolio view says need attention.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, authHeaders, getUser, type CustomerPortfolioResponse } from "@/lib/api";
import { inrWhole, formatDate, formatCount } from "@/lib/format";
import { PageHeader, SearchField, SkeletonRows } from "@/components/v32/ui";
import { IconRefresh, IconUsers } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { LensDrawer, type LensSection } from "@/components/ui/LensDrawer";
import { MorePage, FigureRow, GridTable, RowMenu, Panel, OFFLINE_TEXT, plain, moreStyles as s, type Column } from "@/components/more/ui";

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

type Score = { score: number; tier: string; overdue_amount: number; health_label?: string | null };

const TIER: Record<string, { label: string; tone: StatusTone }> = {
  HIGH_RISK: { label: "High risk", tone: "critical" },
  MEDIUM: { label: "Medium risk", tone: "attention" },
  LOW: { label: "Low risk", tone: "neutral" },
};

const HEALTH: Record<string, { label: string; tone: StatusTone }> = {
  DORMANT: { label: "Dormant", tone: "neutral" },
  AT_RISK: { label: "At risk", tone: "critical" },
  WATCH: { label: "Watch", tone: "attention" },
  GROWING: { label: "Growing", tone: "positive" },
  HEALTHY: { label: "Healthy", tone: "positive" },
};

export default function CustomersPage() {
  const notify = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scoreMap, setScoreMap] = useState<Record<string, Score>>({});
  const [portfolio, setPortfolio] = useState<CustomerPortfolioResponse | null>(null);
  const [lensCustomer, setLensCustomer] = useState<Customer | null>(null);
  // Real open invoice, if any, this Lens customer maps to: pre-fills Simulate
  // honestly. Stays null (button omitted) when there is no matching invoice.
  const [lensSimInvoiceId, setLensSimInvoiceId] = useState<string | null>(null);
  const router = useRouter();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API}/api/khata`, { headers: authHeaders(), credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("load failed");
      setCustomers(data.customers || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    fetch(`${API}/api/customer-scores`, { headers: authHeaders(), credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.scores) return;
        const map: Record<string, Score> = {};
        d.scores.forEach((sc: Score & { customer_name: string }) => { map[sc.customer_name] = sc; });
        setScoreMap(map);
      }).catch(() => {});
    // Portfolio concentration + attention list. Stays null when the feature
    // flag is off or the request fails: purely additive.
    api.customers.portfolio().then(setPortfolio).catch(() => {});
  }, [loadCustomers]);

  useEffect(() => {
    if (!lensCustomer) { setLensSimInvoiceId(null); return; }
    const user = getUser();
    if (!user?.id) { setLensSimInvoiceId(null); return; }
    let cancelled = false;
    api.intelligence.scenarioInvoices(user.id)
      .then(res => {
        if (cancelled) return;
        const match = (res.invoices || []).find(inv => inv.customer_name === lensCustomer.customer_name);
        setLensSimInvoiceId(match ? match.id : null);
      })
      .catch(() => { if (!cancelled) setLensSimInvoiceId(null); });
    return () => { cancelled = true; };
  }, [lensCustomer]);

  const attentionList = (portfolio?.customers || []).filter(c => c.healthLabel !== "HEALTHY").slice(0, 5);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? customers.filter(c => [c.customer_name, c.customer_phone].some(v => String(v || "").toLowerCase().includes(q)))
      : customers;
    return [...list].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  }, [customers, search]);

  const totalReceivable = customers.reduce((sum, c) => sum + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  const totalAdvance = customers.reduce((sum, c) => sum + (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0), 0);
  const withDues = customers.filter(c => Number(c.balance) > 0).length;

  const whatsappStatement = (customer: Customer) => {
    const balance = Number(customer.balance || 0);
    const message = balance > 0
      ? `Namaste ${customer.customer_name} ji, aapka hamare yahan ${inrWhole(balance)} baaki hai. Kripya payment update karein.`
      : balance < 0
        ? `Namaste ${customer.customer_name} ji, aapka ${inrWhole(Math.abs(balance))} advance hamare paas hai.`
        : `Namaste ${customer.customer_name} ji, aapka account clear hai.`;

    if (customer.customer_phone) {
      window.open(`https://wa.me/91${customer.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
      return;
    }
    navigator.clipboard.writeText(message).then(() => notify("No phone on file, so the statement was copied"));
  };

  const balanceCell = (c: Customer) => {
    const b = Number(c.balance || 0);
    if (b > 0) return <span className={s.amount}>{inrWhole(b)}</span>;
    if (b < 0) return <span className={s.amount} style={{ color: "var(--positive)" }} title="Advance held for this customer">{inrWhole(Math.abs(b))} adv.</span>;
    return <span className={s.muted}>Settled</span>;
  };

  const columns: Column<Customer>[] = [
    {
      key: "name", header: "Customer", width: "minmax(0, 1.6fr)",
      render: c => (
        <div className="min-w-0">
          <button type="button" className={`${s.name} ${s.nameBtn}`} onClick={() => setLensCustomer(c)} title={c.customer_name}>{c.customer_name}</button>
          <div className={s.sub}><span>{[c.customer_phone, `${formatCount(Number(c.entry_count || 0))} entries`].filter(Boolean).join(" · ")}</span></div>
        </div>
      ),
    },
    { key: "given", header: "Billed", width: "120px", align: "right", hide: "md", render: c => <span>{inrWhole(Number(c.total_debit || 0))}</span> },
    { key: "paid", header: "Paid", width: "120px", align: "right", hide: "md", render: c => <span>{inrWhole(Number(c.total_credit || 0))}</span> },
    { key: "balance", header: "Balance", width: "130px", widthSm: "auto", align: "right", render: balanceCell },
    {
      key: "risk", header: "Risk", width: "120px", hide: "sm",
      render: c => {
        const r = scoreMap[c.customer_name];
        const t = r && TIER[r.tier];
        return t ? <StatusChip tone={t.tone} title={`Risk score ${r.score} of 100`}>{t.label}</StatusChip> : <StatusChip tone="unknown">Not scored</StatusChip>;
      },
    },
    { key: "last", header: "Last activity", width: "110px", hide: "sm", render: c => <span>{c.last_entry ? formatDate(c.last_entry) : <span className={s.muted}>None yet</span>}</span> },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, width: "40px", align: "right",
      render: c => (
        <RowMenu label={`Actions for ${c.customer_name}`} items={[
          { label: "Open details", onSelect: () => setLensCustomer(c) },
          { label: "Open khata", href: `/khata?customer=${encodeURIComponent(c.customer_name)}` },
          ...(c.customer_phone ? [{ label: "Call", href: `tel:${c.customer_phone}` }] : []),
          { label: c.customer_phone ? "Send statement on WhatsApp" : "Copy statement", onSelect: () => whatsappStatement(c) },
        ]} />
      ),
    },
  ];

  const figures = [
    { label: "Customers", value: formatCount(customers.length), note: `${formatCount(withDues)} with a balance due` },
    { label: "To collect", value: inrWhole(totalReceivable), note: "Owed to you across all customers" },
    { label: "Advances held", value: inrWhole(totalAdvance), note: "Paid ahead, to adjust or return" },
    ...(portfolio?.enabled && portfolio.customers.length > 0
      ? [{ label: "Top 3 share of sales", value: `${portfolio.top3SharePct}%`, note: `Top customer ${portfolio.top1SharePct}%, last ${portfolio.windowDays || 90} days` }]
      : []),
  ];

  return (
    <DashboardLayout pageTitle="Customers">
      <MorePage>
        <PageHeader
          title="Customers"
          subtitle="Everyone you sell to, added from sales, invoices and khata."
          right={
            <>
              <button type="button" className="icon-btn" aria-label="Refresh customers" title="Refresh" onClick={loadCustomers}><IconRefresh size={15} /></button>
              <Button variant="primary" onClick={() => router.push("/khata")}>Open khata</Button>
            </>
          }
        />

        {loading && customers.length === 0 && (
          <div className={s.panel}><SkeletonRows rows={6} height={50} /></div>
        )}

        {!loading && error && (
          <div className={s.panel}><ErrorState title="Couldn't load your customers" message={OFFLINE_TEXT} onRetry={loadCustomers} /></div>
        )}

        {!loading && !error && customers.length === 0 && (
          <div className={s.panel}>
            <EmptyState
              icon={<IconUsers size={17} />}
              title="No customers yet"
              message="Customers appear here on their own when you record a sale, raise an invoice or add a khata entry."
              action={<Button variant="secondary" onClick={() => router.push("/khata")}>Add a khata entry</Button>}
            />
          </div>
        )}

        {customers.length > 0 && !error && (
          <>
            <FigureRow items={figures} />

            {portfolio?.enabled && attentionList.length > 0 && (
              <Panel title="Needs attention" sub="From the last 90 days of sales and payments" flush>
                <div style={{ borderTop: "1px solid var(--line)" }}>
                  {attentionList.map(c => {
                    const h = HEALTH[c.healthLabel] || { label: c.healthLabel, tone: "neutral" as StatusTone };
                    return (
                      <div key={c.customerId || c.customerName} className={`${s.attnRow} flex items-center justify-between`}>
                        <div className="min-w-0">
                          <div className="flex items-center" style={{ gap: 8 }}>
                            <span className={s.name}>{c.customerName}</span>
                            <StatusChip tone={h.tone}>{h.label}</StatusChip>
                          </div>
                          <div className={s.sub} style={{ color: "var(--ink-2)", fontSize: 12.5 }}><span>{plain(c.healthEvidence[0] || c.evidence[0])}</span></div>
                        </div>
                        {(() => {
                          const match = customers.find(x => x.customer_name === c.customerName);
                          return match
                            ? <Button variant="ghost" size="sm" onClick={() => setLensCustomer(match)}>View customer</Button>
                            : <Link href={`/khata?customer=${encodeURIComponent(c.customerName)}`} className="ui-btn ui-btn-ghost ui-btn-sm">Open khata</Link>;
                        })()}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            <div className={s.toolbar}>
              <SearchField id="customer-search" value={search} onChange={setSearch} placeholder="Search customer or phone" />
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Largest balance first</span>
            </div>

            <div className={s.panel}>
              {filtered.length > 0 ? (
                <GridTable label="Customers" columns={columns} rows={filtered} rowKey={c => c.customer_name} onRowClick={setLensCustomer} />
              ) : (
                <EmptyState title="No customers match" message={`Nothing matches “${search}”.`} action={<Button variant="secondary" size="sm" onClick={() => setSearch("")}>Clear search</Button>} />
              )}
            </div>
          </>
        )}
      </MorePage>

      {lensCustomer && (() => {
        const risk = scoreMap[lensCustomer.customer_name];
        const balance = Number(lensCustomer.balance || 0);
        const sections: LensSection[] = [
          {
            label: "Ledger",
            rows: [
              { label: "Billed", value: inrWhole(Number(lensCustomer.total_debit || 0)) },
              { label: "Paid", value: inrWhole(Number(lensCustomer.total_credit || 0)) },
              { label: "Balance", value: balance > 0 ? `${inrWhole(balance)} due` : balance < 0 ? `${inrWhole(Math.abs(balance))} advance` : "Settled" },
              { label: "Ledger entries", value: formatCount(Number(lensCustomer.entry_count || 0)) },
              { label: "Last activity", value: lensCustomer.last_entry ? formatDate(lensCustomer.last_entry) : "None yet" },
            ],
          },
          ...(risk
            ? [{
                label: "Risk",
                rows: [
                  { label: "Risk score", value: `${risk.score} of 100` },
                  { label: "Tier", value: TIER[risk.tier]?.label || risk.tier },
                  ...(risk.health_label ? [{ label: "Health", value: HEALTH[risk.health_label]?.label || risk.health_label }] : []),
                  { label: "Overdue amount", value: inrWhole(Number(risk.overdue_amount || 0)) },
                ],
              }]
            : []),
          { label: "Contact", rows: [{ label: "Phone", value: lensCustomer.customer_phone || "Not on file" }] },
        ];
        return (
          <LensDrawer
            entityType="Customer"
            name={lensCustomer.customer_name}
            statusLabel={balance > 0 ? "Balance owed" : balance < 0 ? "Advance on account" : "Account settled"}
            sections={sections}
            actions={[
              { label: "Open khata", onClick: () => { window.location.href = `/khata?customer=${encodeURIComponent(lensCustomer.customer_name)}`; } },
              { label: "WhatsApp", onClick: () => whatsappStatement(lensCustomer) },
              // Simulate: only when a real open invoice for this customer exists.
              ...(lensSimInvoiceId
                ? [{ label: "Simulate", onClick: () => router.push(`/simulate?invoiceId=${encodeURIComponent(lensSimInvoiceId)}`) }]
                : []),
            ]}
            onClose={() => setLensCustomer(null)}
          />
        );
      })()}
    </DashboardLayout>
  );
}

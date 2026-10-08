"use client";

// Reports: download your data for your CA, your bank or your own records,
// from GET /api/reports/export. Each report is generated when you ask for
// it; nothing here is pre-generated or scheduled.

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { authHeaders } from "@/lib/api";
import { PageHeader } from "@/components/v32/ui";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MorePage, Segmented, moreStyles as s } from "@/components/more/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

// Date range → number of days back
const RANGES = [
  { key: "month", label: "Last 30 days", days: 30 },
  { key: "2m", label: "60 days", days: 60 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "6m", label: "6 months", days: 180 },
  { key: "year", label: "12 months", days: 365 },
] as const;
type RangeKey = typeof RANGES[number]["key"];

const REPORTS = [
  { id: "outstanding", name: "Outstanding receivables", desc: "Every unpaid invoice with the customer, amount and days overdue.", formats: ["Excel", "CSV", "PDF"] },
  { id: "collection", name: "Collection performance", desc: "Money recovered month by month, calls made and reminders sent.", formats: ["Excel", "CSV", "PDF"] },
  { id: "customer", name: "Customer statement", desc: "Each customer's invoices, payments and balance, ready to send.", formats: ["Excel", "CSV", "PDF"] },
  { id: "cashflow", name: "Cash forecast", desc: "The 30, 60 and 90 day cash projection with all three cases.", formats: ["Excel", "PDF"] },
  { id: "calls", name: "Call log", desc: "Every collection call with outcome, promises made and follow-up.", formats: ["Excel", "CSV", "PDF"] },
  { id: "gst", name: "GST summary", desc: "Sales and outstanding by GSTIN, ready for your CA and filing.", formats: ["Excel", "CSV", "PDF"] },
];

export default function ReportsPage() {
  const notify = useToast();
  const [range, setRange] = useState<RangeKey>("month");
  const [downloading, setDownloading] = useState<string | null>(null);
  const days = RANGES.find(r => r.key === range)?.days || 30;
  const rangeLabel = RANGES.find(r => r.key === range)?.label.toLowerCase() || "";

  const handleDownload = async (reportId: string, format: string) => {
    const key = `${reportId}-${format}`;
    setDownloading(key);
    try {
      const toDate   = new Date().toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      // PDF: fetch the backend HTML report and open it in a new tab to print.
      if (format === "pdf") {
        const url = `${BASE}/api/reports/export?report=${reportId}&format=html&from=${fromDate}&to=${toDate}`;
        const res = await fetch(url, { headers: { ...authHeaders() }, credentials: "include" });
        if (!res.ok) { notify("That report couldn't be generated. Try again in a moment.", "critical"); return; }
        const html = await res.text();
        const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        const win = window.open(blobUrl, "_blank");
        if (!win) notify("Your browser blocked the new tab. Allow pop-ups for Starlane and try again.", "critical");
        else notify("Report opened in a new tab. Print it to save as PDF.", "positive");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
        return;
      }

      const fmt = format === "excel" ? "xlsx" : "csv";
      const url = `${BASE}/api/reports/export?report=${reportId}&format=${fmt}&from=${fromDate}&to=${toDate}`;
      const res = await fetch(url, { headers: { ...authHeaders() }, credentials: "include" });
      if (!res.ok) { notify("That report couldn't be generated. Try again in a moment.", "critical"); return; }
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] || `starlane-${reportId}.${fmt}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      notify(`Downloaded ${filename}`, "positive");
    } catch {
      notify("Couldn't reach Starlane. Check your connection and try again.", "critical");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Reports">
      <MorePage>
        <PageHeader
          title="Reports"
          subtitle="Download your data for your CA, your bank or your own records."
          right={<Button variant="primary" loading={downloading === "outstanding-excel"} onClick={() => handleDownload("outstanding", "excel")}>Export outstanding</Button>}
        />

        <div className={s.toolbar}>
          <Segmented label="Date range" value={range} onChange={setRange} options={RANGES.map(r => ({ key: r.key, label: r.label }))} />
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Each report covers the {rangeLabel} and is built when you download it.</span>
        </div>

        <div className={s.panel} role="table" aria-label="Reports">
          <div role="row" className={`${s.head} flex items-center justify-between`} style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", color: "var(--ink-3)" }}>
            <span role="columnheader">Report</span>
            <span role="columnheader">Download as</span>
          </div>
          {REPORTS.map(r => (
            <div key={r.id} role="row" className={`${s.attnRow} flex items-center justify-between flex-wrap`}>
              <div role="cell" className="min-w-0" style={{ flex: "1 1 280px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
              <div role="cell" className="flex items-center" style={{ gap: 2, marginRight: -8 }} aria-label={`Download ${r.name}`}>
                {r.formats.map(fmt => {
                  const key = `${r.id}-${fmt.toLowerCase()}`;
                  return (
                    <Button key={fmt} variant="ghost" size="sm" loading={downloading === key} disabled={!!downloading && downloading !== key}
                      onClick={() => handleDownload(r.id, fmt.toLowerCase())} aria-label={`${r.name} as ${fmt}`}>
                      {fmt}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </MorePage>
    </DashboardLayout>
  );
}

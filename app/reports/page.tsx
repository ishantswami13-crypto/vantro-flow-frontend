"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiDownload, FiFileText, FiCalendar, FiFilter, FiTrendingUp, FiDollarSign, FiUsers, FiPhone } from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

// Map date-range label → number of days back
const DATE_RANGE_DAYS: Record<string, number> = {
  "This Month":      30,
  "Last Month":      60,
  "Last 3 Months":   90,
  "Last 6 Months":   180,
  "Financial Year":  365,
  "Custom":          30,
};

const REPORTS = [
  {
    id: "outstanding",
    name: "Outstanding Receivables",
    desc: "Full list of all unpaid invoices with customer details, days overdue, and AI collection score",
    icon: <FiDollarSign size={18}/>,
    color: "#F5424D",
    formats: ["Excel", "CSV"],
    lastGenerated: "Today 9:00 AM",
    pages: 4,
  },
  {
    id: "collection",
    name: "Collection Performance",
    desc: "Monthly recovery rates, call logs, WhatsApp delivery, payment trends over time",
    icon: <FiTrendingUp size={18}/>,
    color: "#10D98A",
    formats: ["Excel", "CSV"],
    lastGenerated: "Yesterday",
    pages: 6,
  },
  {
    id: "customer",
    name: "Customer Statement",
    desc: "Individual customer account statement — all invoices, payments, and outstanding balance",
    icon: <FiUsers size={18}/>,
    color: "#0066FF",
    formats: ["Excel", "CSV"],
    lastGenerated: "12 May 2025",
    pages: 2,
  },
  {
    id: "cashflow",
    name: "Cash Flow Forecast Report",
    desc: "30/60/90-day cash projection with optimistic, expected, and pessimistic scenarios",
    icon: <FiCalendar size={18}/>,
    color: "#F5A524",
    formats: ["Excel"],
    lastGenerated: "14 May 2025",
    pages: 3,
  },
  {
    id: "calls",
    name: "Call Activity Log",
    desc: "All collection calls — duration, outcome, promises made, follow-up status",
    icon: <FiPhone size={18}/>,
    color: "#9B6DFF",
    formats: ["Excel", "CSV"],
    lastGenerated: "13 May 2025",
    pages: 5,
  },
  {
    id: "gst",
    name: "GST Summary Report",
    desc: "GSTIN-wise breakdown of all sales and outstanding — ready for CA and filing",
    icon: <FiFileText size={18}/>,
    color: "#0066FF",
    formats: ["Excel", "CSV"],
    lastGenerated: "1 May 2025",
    pages: 2,
  },
];

const DATE_RANGES = ["This Month", "Last Month", "Last 3 Months", "Last 6 Months", "Financial Year", "Custom"];

export default function ReportsPage() {
  const [dateRange, setDateRange]     = useState("This Month");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded]   = useState<string[]>([]);

  const handleDownload = async (reportId: string, format: string) => {
    // PDF not yet supported — prompt user to use Excel/CSV
    if (format.toLowerCase() === "pdf") {
      alert("PDF export coming soon. Please use Excel or CSV for now.");
      return;
    }
    const key = `${reportId}-${format}`;
    setDownloading(key);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;
      const days = DATE_RANGE_DAYS[dateRange] || 30;
      const toDate   = new Date().toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const fmt = format.toLowerCase() === "excel" ? "xlsx" : "csv";
      const url = `${BASE}/api/reports/export?report=${reportId}&format=${fmt}&from=${fromDate}&to=${toDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        alert(err.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const filename = res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1]
        || `vantro-${reportId}.${fmt}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setDownloaded(prev => [...prev, key]);
      setTimeout(() => setDownloaded(prev => prev.filter(k => k !== key)), 4000);
    } catch (e) {
      alert("Download failed. Check your connection.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-primary">Reports & Export</h1>
            <p className="text-sm text-muted mt-0.5">Download your data as PDF, Excel, or CSV</p>
          </div>
          <div className="flex items-center gap-2">
            <FiFilter size={13} className="text-muted" />
            <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border flex-wrap">
              {DATE_RANGES.map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={["px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    dateRange === r ? "bg-accent text-white" : "text-muted hover:text-primary",
                  ].join(" ")}>{r}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick export bar */}
        <div className="card-premium p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-primary">Quick Export — All Data</p>
            <p className="text-xs text-muted">Export everything for {dateRange} in one file</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<FiDownload size={12}/>}
              onClick={() => handleDownload("outstanding", "CSV")}
              loading={downloading === "outstanding-CSV"}>
              CSV
            </Button>
            <Button size="sm" icon={<FiDownload size={12}/>}
              onClick={() => handleDownload("outstanding", "Excel")}
              loading={downloading === "outstanding-Excel"}>
              Excel (Outstanding)
            </Button>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map(report => (
            <div key={report.id} className="card-premium p-5 hover:border-border-2 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${report.color}18`, border: `1px solid ${report.color}30` }}>
                  <span style={{ color: report.color }}>{report.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary">{report.name}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{report.desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-2xs text-muted">
                  <FiCalendar size={10}/>
                  <span>Last: {report.lastGenerated}</span>
                  <span>· {report.pages} pages</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {report.formats.map(fmt => {
                  const key = `${report.id}-${fmt.toLowerCase()}`;
                  const isDone = downloaded.includes(key);
                  return (
                    <Button
                      key={fmt}
                      variant={isDone ? "success" : "secondary"}
                      size="xs"
                      icon={isDone ? undefined : <FiDownload size={11}/>}
                      loading={downloading === key}
                      onClick={() => handleDownload(report.id, fmt.toLowerCase())}
                    >
                      {isDone ? `✓ ${fmt}` : fmt}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Scheduled Reports */}
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-primary">Scheduled Reports</p>
              <p className="text-xs text-muted">Auto-email reports to you or your CA</p>
            </div>
            <Button variant="secondary" size="sm" icon={<FiCalendar size={12}/>}>Schedule Report</Button>
          </div>
          <div className="divide-y divide-border/50">
            {[
              { name: "Outstanding Summary",    freq: "Every Monday 9 AM",    to: "you@business.com",  active: true  },
              { name: "Monthly P&L Overview",   freq: "1st of every month",   to: "ca@charteredco.in", active: true  },
              { name: "Collections Performance",freq: "Every Friday 6 PM",    to: "you@business.com",  active: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{s.name}</p>
                  <p className="text-xs text-muted">{s.freq} → {s.to}</p>
                </div>
                <Badge variant={s.active ? "success" : "muted"}>{s.active ? "Active" : "Paused"}</Badge>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

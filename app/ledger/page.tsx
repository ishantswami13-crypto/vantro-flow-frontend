"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser } from "@/lib/api";
import {
  FiArrowDown, FiArrowUp, FiActivity, FiPlus, FiX, FiZap,
  FiShield, FiAlertTriangle, FiCheckCircle, FiTrendingUp,
  FiUpload, FiCamera,
} from "react-icons/fi";

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES_IN  = ["Customer Payment", "Loan / Credit", "Investment", "Refund Received", "Other Income"];
const CATEGORIES_OUT = [
  "Supplier Payment", "Worker Salary", "Rent", "Utilities", "Raw Materials",
  "Logistics / Transport", "Maintenance", "Marketing", "Tax / GST", "Loan Repayment", "Other Expense",
];
const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Cheque", "NEFT/RTGS"];

// ─── Formatters ──────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function fmtFull(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}
function fmtDate(d: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toInputDate(value?: string): string {
  if (!value) return new Date().toISOString().split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return new Date().toISOString().split("T")[0];
}

function numericAmount(value: unknown): string {
  if (value === null || value === undefined) return "";
  const amount = String(value).replace(/[₹,\s]/g, "");
  const parsed = Number(amount);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

function resizeImage(file: File, maxWidth = 1200): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.86), mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image"));
    };
    img.src = url;
  });
}

function fileToDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: String(reader.result || ""), mimeType: file.type || "application/octet-stream" });
    reader.onerror = () => reject(new Error("Could not read this file"));
    reader.readAsDataURL(file);
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  type: "in" | "out";
  category: string;
  amount: number;
  party_name?: string;
  description?: string;
  notes?: string;
  transaction_date: string;
  payment_method?: string;
  reference?: string;
}
interface LedgerSummary {
  totalIn: number; totalOut: number; balance: number;
  monthIn: number; monthOut: number; monthBalance: number;
}
interface AIAnalysis {
  health_score: number;
  status: string;
  summary: string;
  alerts?: { type: string; message: string }[];
  insights?: { title: string; description: string; action?: string }[];
  top_expenses?: { category: string; amount: number; pct: number }[];
}
interface ParsedBankTransaction {
  type: "in" | "out";
  category: string;
  amount: string;
  party_name: string;
  description: string;
  transaction_date: string;
  payment_method: string;
  reference: string;
}

function parseLedgerDate(value: string): string {
  const [day, month, year] = value.split("-");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function amountFromLedger(value: string): string {
  return value.replace(/,/g, "");
}

function cleanPartyName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseBankLedgerText(text: string): ParsedBankTransaction[] {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rows: ParsedBankTransaction[] = [];
  const tokens = normalized.split(" ");
  const datePattern = /^\d{1,2}-\d{1,2}-\d{4}$/;
  const amountPattern = /^\d{1,3}(?:,\d{2,3})*(?:\.\d{2})$|^\d+(?:\.\d{2})$/;
  let currentDate = "";
  let i = 0;

  while (i < tokens.length) {
    if (datePattern.test(tokens[i])) {
      currentDate = parseLedgerDate(tokens[i]);
      i += 1;
      continue;
    }

    if ((tokens[i] !== "Cr" && tokens[i] !== "Dr") || !currentDate) {
      i += 1;
      continue;
    }

    const direction = tokens[i] as "Cr" | "Dr";
    const partyTokens: string[] = [];
    let j = i + 1;
    let found = false;

    while (j < tokens.length) {
      if (datePattern.test(tokens[j]) && (tokens[j + 1] === "Cr" || tokens[j + 1] === "Dr")) {
        break;
      }

      if (
        amountPattern.test(tokens[j]) &&
        /^\d+$/.test(tokens[j + 1] || "") &&
        /^(Receipt|Payment)$/.test(tokens[j + 2] || "")
      ) {
        const partyName = cleanPartyName(partyTokens.join(" "));
        if (partyName && !/^(opening|closing|carried|brought)\b/i.test(partyName)) {
          const type = direction === "Cr" ? "in" : "out";
          rows.push({
            type,
            category: type === "in" ? "Customer Payment" : "Supplier Payment",
            amount: amountFromLedger(tokens[j]),
            party_name: partyName,
            description: `${tokens[j + 2]} imported from bank ledger PDF`,
            transaction_date: currentDate,
            payment_method: "Bank Transfer",
            reference: `${tokens[j + 2]} #${tokens[j + 1]}`,
          });
        }
        i = j + 3;
        found = true;
        break;
      }

      partyTokens.push(tokens[j]);
      j += 1;
    }

    if (!found) i += 1;
  }

  return rows;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const pages: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str || "").join(" "));
  }

  return pages.join("\n");
}

function loadPdfJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("PDF scanner runs in the browser"));
  const existing = (window as any).pdfjsLib;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById("pdfjs-ledger-loader") as HTMLScriptElement | null;
    const finish = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (!pdfjs) {
        reject(new Error("PDF reader failed to load"));
        return;
      }
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
      }
      resolve(pdfjs);
    };

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("PDF reader failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-ledger-loader";
    script.src = "/pdfjs/pdf.min.js";
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("PDF reader failed to load"));
    document.head.appendChild(script);
  });
}

// ─── AI Monitor ──────────────────────────────────────────────────────────────
function AIMonitor({ userId }: { userId: string }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/ai-financial-monitor/${userId}`);
      const data = await res.json();
      setAnalysis(data.analysis);
      setExpanded(true);
    } catch {}
    setLoading(false);
  };

  const scoreColor = (s: number) =>
    s >= 70 ? "#10D98A" : s >= 40 ? "#F5A524" : "#F5424D";

  const alertVariant: Record<string, string> = {
    danger:  "bg-danger-dim border-danger/20 text-danger",
    warning: "bg-warning-dim border-warning/20 text-warning",
    info:    "bg-accent-dim border-accent/20 text-accent",
  };

  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent shrink-0">
            <FiZap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">AI Financial Monitor</p>
            <p className="text-xs text-muted">Groq AI analyses your cash flow and flags issues</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-60 transition-all shadow-button-accent"
        >
          {loading ? "Analysing…" : expanded ? "Re-analyse" : "Run Analysis"}
        </button>
      </div>

      {analysis && expanded && (
        <div className="p-5 space-y-5">
          {/* Score row */}
          <div className="flex items-center gap-5">
            <div className="shrink-0 text-center">
              <p className="font-mono font-black text-5xl leading-none" style={{ color: scoreColor(analysis.health_score) }}>
                {analysis.health_score}
              </p>
              <p className="text-2xs text-muted mt-1 font-semibold">/100 Health</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: scoreColor(analysis.health_score) }}>
                {analysis.status}
              </p>
              <p className="text-sm text-secondary leading-relaxed">{analysis.summary}</p>
            </div>
          </div>

          {/* Alerts */}
          {analysis.alerts && analysis.alerts.length > 0 && (
            <div className="space-y-2">
              {analysis.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm ${alertVariant[a.type] || alertVariant.info}`}>
                  <FiAlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Items */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div>
              <p className="section-label mb-3">Action Items</p>
              <div className="space-y-2.5">
                {analysis.insights.map((ins, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl bg-surface-2 border border-border">
                    <div className="flex items-start gap-2">
                      <FiCheckCircle size={14} className="text-success shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-primary">{ins.title}</p>
                        <p className="text-xs text-secondary mt-0.5">{ins.description}</p>
                        {ins.action && (
                          <p className="text-xs text-accent mt-1 font-medium">{ins.action}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Expenses */}
          {analysis.top_expenses && analysis.top_expenses.length > 0 && (
            <div>
              <p className="section-label mb-3">Top Expenses (30d)</p>
              <div className="space-y-2.5">
                {analysis.top_expenses.map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-secondary w-36 shrink-0 truncate">{e.category}</span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-danger/70 rounded-full transition-all duration-700" style={{ width: `${Math.min(e.pct || 0, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-primary w-20 text-right shrink-0">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  type: "out" as "in" | "out",
  category: "Supplier Payment",
  amount: "",
  party_name: "",
  description: "",
  transaction_date: new Date().toISOString().split("T")[0],
  payment_method: "UPI",
  reference: "",
};

export default function LedgerPage() {
  const [userId, setUserId]           = useState<string>("");
  const [bizName, setBizName]         = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]         = useState<LedgerSummary>({ totalIn: 0, totalOut: 0, balance: 0, monthIn: 0, monthOut: 0, monthBalance: 0 });
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [typeFilter, setTypeFilter]   = useState<"all" | "in" | "out">("all");
  const [catFilter, setCatFilter]     = useState("all");
  const [form, setForm]               = useState({ ...DEFAULT_FORM });
  const [scanning, setScanning]        = useState(false);
  const [scanMessage, setScanMessage]  = useState("");
  const [pdfRows, setPdfRows]          = useState<ParsedBankTransaction[]>([]);
  const [importingPdf, setImportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Migrate table if needed
  const migrate = useCallback(async () => {
    try { await api.transactions.migrate(); } catch {}
  }, []);

  const createTransaction = useCallback(async (body: {
    user_id: string;
    type: string;
    category: string;
    amount: string;
    party_name?: string;
    description?: string;
    transaction_date: string;
    payment_method?: string;
    reference?: string;
  }) => {
    try {
      return await api.transactions.create(body);
    } catch (err: any) {
      const message = String(err?.message || "");
      if (!message.includes("Internal server error") && !message.includes("Request failed")) throw err;
      await migrate();
      return api.transactions.create(body);
    }
  }, [migrate]);

  const fetchData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const data = await api.transactions.list(uid);
      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalIn: 0, totalOut: 0, balance: 0, monthIn: 0, monthOut: 0, monthBalance: 0 });
    } catch (err: any) {
      if (err?.message?.includes("500") || err?.message?.includes("failed") || err?.message?.includes("Internal server error")) {
        await migrate();
        try {
          const data = await api.transactions.list(uid);
          setTransactions(data.transactions || []);
          setSummary(data.summary || { totalIn: 0, totalOut: 0, balance: 0, monthIn: 0, monthOut: 0, monthBalance: 0 });
        } catch {}
      }
      setError("");
    }
    setLoading(false);
  }, [migrate]);

  useEffect(() => {
    const u = getUser();
    if (!u?.id) return;
    setUserId(u.id);
    setBizName(u.business_name || "Your Business");
    fetchData(u.id);
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    try {
      await createTransaction({ ...form, user_id: userId });
      setShowForm(false);
      setForm({ ...DEFAULT_FORM });
      setError("");
      await fetchData(userId);
    } catch { setError("Failed to save. Please try again."); }
    setSaving(false);
  };

  const handleScanFile = async (file?: File | null) => {
    if (!file) return;
    setScanning(true);
    setScanMessage("AI reading file...");
    setError("");
    setPdfRows([]);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setScanMessage("Reading PDF ledger rows...");
        const text = await extractPdfText(file);
        const rows = parseBankLedgerText(text);
        if (rows.length === 0) {
          throw new Error("Could not find transaction rows in this PDF. Try an HDFC/Tally ledger PDF with Date, Cr/Dr, Particulars and Amount columns.");
        }
        setPdfRows(rows);
        setShowForm(false);
        setScanMessage(`Found ${rows.length} transactions in ${file.name}. Review and import.`);
        return;
      }

      const payload = file.type.startsWith("image/")
        ? await resizeImage(file)
        : await fileToDataUrl(file);
      const data = await api.transactions.scan(payload.dataUrl, payload.mimeType);
      if (data.success === false) throw new Error(data.error || "AI could not read this file");
      const extracted = data.data || data.extracted || {};
      const nextType = extracted.type === "in" ? "in" : "out";
      setForm({
        type: nextType,
        category: extracted.category || (nextType === "in" ? "Customer Payment" : "Supplier Payment"),
        amount: numericAmount(extracted.amount),
        party_name: extracted.party_name || "",
        description: extracted.description || "",
        transaction_date: toInputDate(extracted.transaction_date),
        payment_method: extracted.payment_method || "UPI",
        reference: extracted.reference || "",
      });
      setShowForm(true);
      setScanMessage(`AI filled transaction from ${file.name}. Review and save.`);
    } catch (err: any) {
      setError(err?.message || "AI scan failed. Try a clearer photo or enter manually.");
      setScanMessage("");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const importPdfRows = async () => {
    if (!pdfRows.length || !userId) return;
    setImportingPdf(true);
    setError("");
    try {
      await migrate();
      for (const row of pdfRows) {
        await createTransaction({ ...row, user_id: userId });
      }
      setScanMessage(`Imported ${pdfRows.length} bank ledger transactions.`);
      setPdfRows([]);
      await fetchData(userId);
    } catch (err: any) {
      setError(err?.message || "Could not import PDF transactions. Please try again.");
    } finally {
      setImportingPdf(false);
    }
  };

  const filtered = transactions.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    return true;
  });

  const allCats = Array.from(new Set(transactions.map(t => t.category))).sort();

  // Summary card data
  const cards = [
    {
      label: "Net Balance",
      value: fmt(Math.abs(summary.balance)),
      sub: summary.balance >= 0 ? "Net positive" : "Net negative",
      color: summary.balance >= 0 ? "#10D98A" : "#F5424D",
      icon: FiTrendingUp,
    },
    {
      label: "Total Received",
      value: fmt(summary.totalIn),
      sub: `This month: ${fmt(summary.monthIn)}`,
      color: "#10D98A",
      icon: FiArrowDown,
    },
    {
      label: "Total Paid Out",
      value: fmt(summary.totalOut),
      sub: `This month: ${fmt(summary.monthOut)}`,
      color: "#F5424D",
      icon: FiArrowUp,
    },
    {
      label: "This Month Net",
      value: fmt(Math.abs(summary.monthBalance)),
      sub: summary.monthBalance >= 0 ? "Surplus this month" : "Deficit this month",
      color: summary.monthBalance >= 0 ? "#10D98A" : "#F5424D",
      icon: FiActivity,
    },
  ];

  return (
    <DashboardLayout pageTitle="Bank Ledger">
      <div className="space-y-6 page-enter">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Bank Ledger</h2>
            <p className="text-sm text-secondary mt-0.5">Track all money in and out — AI monitors your cash health</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Vault badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-dim border border-success/20 text-success text-xs font-semibold">
              <FiShield size={11} />
              Private to {bizName}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleScanFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-dim border border-accent/25 text-accent text-sm font-semibold hover:bg-accent hover:text-white disabled:opacity-60 transition-all"
            >
              {scanning ? <><FiActivity size={14} /> Scanning</> : <><FiCamera size={14} /> AI Scan</>}
            </button>
            <button
              onClick={() => { setShowForm(f => !f); setError(""); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all shadow-button-accent"
            >
              {showForm ? <><FiX size={14} /> Cancel</> : <><FiPlus size={14} /> Add Transaction</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-danger-dim border border-danger/20 text-danger text-sm">
            <FiAlertTriangle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {scanMessage && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-success-dim border border-success/20 text-success text-sm">
            <FiUpload size={15} className="shrink-0" />
            {scanMessage}
          </div>
        )}

        {pdfRows.length > 0 && (
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-primary">PDF Ledger Import Preview</p>
                <p className="text-xs text-muted mt-0.5">{pdfRows.length} transactions found. Opening/closing balances are skipped.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPdfRows([])}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-2 border border-border text-muted hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={importPdfRows}
                  disabled={importingPdf}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 disabled:opacity-60"
                >
                  {importingPdf ? "Importing..." : `Import ${pdfRows.length}`}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-premium">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50">
                    <th className="text-left px-5 py-3 section-label">Date</th>
                    <th className="text-left px-5 py-3 section-label">Type</th>
                    <th className="text-left px-5 py-3 section-label">Party</th>
                    <th className="text-left px-5 py-3 section-label hidden md:table-cell">Reference</th>
                    <th className="text-right px-5 py-3 section-label">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfRows.slice(0, 12).map((row, index) => (
                    <tr key={`${row.reference}-${index}`}>
                      <td className="px-5 py-3 text-xs text-secondary whitespace-nowrap">{fmtDate(row.transaction_date)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-2xs font-bold ${row.type === "in" ? "bg-success-dim text-success" : "bg-danger-dim text-danger"}`}>
                          {row.type === "in" ? "Money In" : "Money Out"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-primary">{row.party_name}</td>
                      <td className="px-5 py-3 text-xs text-muted hidden md:table-cell">{row.reference}</td>
                      <td className={`px-5 py-3 text-right text-xs font-bold ${row.type === "in" ? "text-success" : "text-danger"}`}>
                        {row.type === "in" ? "+" : "-"} {fmtFull(Number(row.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pdfRows.length > 12 && (
              <p className="px-5 py-3 border-t border-border text-xs text-muted">
                Showing first 12 rows. All {pdfRows.length} rows will be imported.
              </p>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
          {cards.map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="card-metric p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={15} style={{ color }} />
                </div>
              </div>
              <p className="metric-lg mb-1" style={{ color }}>{value}</p>
              <p className="text-2xs text-muted">{sub}</p>
            </div>
          ))}
        </div>

        {/* Add Transaction Form */}
        {showForm && (
          <div className="card-premium p-5">
            <p className="text-sm font-bold text-primary mb-4">New Transaction</p>
            <form onSubmit={handleSave}>
              {/* Type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: "in", category: "Customer Payment" }))}
                  className={[
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                    form.type === "in"
                      ? "bg-success-dim border-success/30 text-success"
                      : "bg-surface-2 border-border text-muted hover:text-primary",
                  ].join(" ")}
                >
                  Money In (Received)
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: "out", category: "Supplier Payment" }))}
                  className={[
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                    form.type === "out"
                      ? "bg-danger-dim border-danger/30 text-danger"
                      : "bg-surface-2 border-border text-muted hover:text-primary",
                  ].join(" ")}
                >
                  Money Out (Paid)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="section-label block mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                    required
                  >
                    {(form.type === "in" ? CATEGORIES_IN : CATEGORIES_OUT).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="section-label block mb-1.5">Amount (₹)</label>
                  <input
                    type="number" min="1" step="0.01" placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                    required
                  />
                </div>

                {/* Party name */}
                <div>
                  <label className="section-label block mb-1.5">
                    {form.type === "in" ? "Received From" : "Paid To"}
                  </label>
                  <input
                    type="text"
                    placeholder={form.type === "in" ? "Customer / Party name" : "Supplier / Employee name"}
                    value={form.party_name}
                    onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="section-label block mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                    required
                  />
                </div>

                {/* Payment method */}
                <div>
                  <label className="section-label block mb-1.5">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="section-label block mb-1.5">Reference / Invoice No.</label>
                  <input
                    type="text"
                    placeholder="UTR / Invoice number (optional)"
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="section-label block mb-1.5">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="Short description (optional)"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-primary bg-surface-2 border border-border transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-60 transition-all shadow-button-accent"
                >
                  {saving ? "Saving…" : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Monitor */}
        {userId && <AIMonitor userId={userId} />}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-surface-2 border border-border rounded-xl p-1 gap-1">
            {(["all", "in", "out"] as const).map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  typeFilter === f
                    ? f === "in"  ? "bg-success-dim text-success"
                      : f === "out" ? "bg-danger-dim text-danger"
                      : "bg-accent-dim text-accent"
                    : "text-muted hover:text-primary",
                ].join(" ")}
              >
                {f === "all" ? "All" : f === "in" ? "Money In" : "Money Out"}
              </button>
            ))}
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
          >
            <option value="all">All Categories</option>
            {allCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p className="text-xs text-muted ml-auto">{filtered.length} transactions</p>
        </div>

        {/* Transaction Table */}
        <div className="card-premium overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted">Loading transactions…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-surface-2 border border-border rounded-2xl flex items-center justify-center mb-4">
                <FiActivity size={24} className="text-muted" />
              </div>
              <p className="text-sm font-semibold text-primary mb-1">No transactions yet</p>
              <p className="text-xs text-muted">Click "Add Transaction" to log your first entry</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-premium">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50">
                    <th className="text-left px-5 py-3 section-label">Date</th>
                    <th className="text-left px-5 py-3 section-label">Category</th>
                    <th className="text-left px-5 py-3 section-label hidden sm:table-cell">Party</th>
                    <th className="text-left px-5 py-3 section-label hidden md:table-cell">Description</th>
                    <th className="text-left px-5 py-3 section-label hidden lg:table-cell">Method</th>
                    <th className="text-right px-5 py-3 section-label">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.id || i} className="animate-row-in" style={{ animationDelay: `${i * 25}ms` }}>
                      <td className="px-5 py-3.5 text-xs text-secondary whitespace-nowrap">{fmtDate(t.transaction_date)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={[
                            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                            t.type === "in" ? "bg-success-dim" : "bg-danger-dim",
                          ].join(" ")}>
                            {t.type === "in"
                              ? <FiArrowDown size={11} className="text-success" />
                              : <FiArrowUp size={11} className="text-danger" />
                            }
                          </div>
                          <span className="text-xs font-medium text-primary">{t.category}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-secondary hidden sm:table-cell">{t.party_name || "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-muted max-w-xs truncate hidden md:table-cell">{t.description || t.notes || "—"}</td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {t.payment_method && (
                          <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-2xs text-muted font-mono">
                            {t.payment_method}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`metric-value text-sm font-bold ${t.type === "in" ? "text-success" : "text-danger"}`}>
                          {t.type === "in" ? "+" : "−"} {fmtFull(Number(t.amount))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}

"use client";
import { authHeaders } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiRefreshCw, FiCheck, FiX, FiArrowDown, FiArrowUp,
  FiZap, FiTrash2, FiUpload, FiLink, FiCheckCircle,
  FiCreditCard, FiAlertCircle, FiEye, FiEyeOff,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const BANKS = [
  "HDFC Bank", "SBI", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India",
  "IndusInd Bank", "Yes Bank", "IDFC First Bank", "Federal Bank",
  "Bank of India", "Indian Bank", "UCO Bank", "Other",
];

const BANK_COLORS: Record<string, string> = {
  "HDFC Bank": "#004C8F", "SBI": "#22409A", "ICICI Bank": "#F58220",
  "Axis Bank": "#800000", "Kotak Mahindra Bank": "#E21F26", "Other": "#0066FF",
};

type BankAccount = {
  id: number; bank_name: string; account_last4: string;
  account_type: string; nickname: string; ifsc: string; is_active: boolean;
};
type Txn = {
  id: number; txn_date: string; description: string; amount: number;
  type: "credit" | "debit"; status: "unmatched" | "matched" | "ignored";
  matched_to?: string; account_id?: number;
};
type PendingInvoice = { id: number; customer_name: string; total: number; bill_number: string; bill_date: string; };
type ParsedRow = { date: string; description: string; amount: number; type: "credit" | "debit"; selected: boolean; };

const fmtINR  = (n: number) => "₹" + Math.abs(Number(n)).toLocaleString("en-IN");
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); } catch { return d; } };

// ── CSV parser — handles HDFC, SBI, ICICI, Axis, Kotak, most Indian banks ──
function parseAmount(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[₹,\s]/g, "").replace(/[()]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = ""; let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parseIndianDate(s: string): string {
  if (!s) return new Date().toISOString().split("T")[0];
  // dd/mm/yyyy or dd-mm-yyyy or dd MMM yyyy
  const dmySlash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmySlash) {
    const [, d, m, y] = dmySlash;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    // could be mm/dd/yyyy — guess based on month value
    const [, a, b, y] = mdy;
    if (parseInt(a) > 12) return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }
  try { const d = new Date(s); if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]; } catch {}
  return new Date().toISOString().split("T")[0];
}

function parseBankCSV(csv: string): ParsedRow[] {
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if ((lower.includes("date") || lower.includes("txn")) &&
        (lower.includes("debit") || lower.includes("credit") || lower.includes("amount") || lower.includes("withdrawal") || lower.includes("deposit"))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().replace(/['"]/g, "").trim());

  const find = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

  const dateCol   = find("date");
  const descCol   = find("narration", "description", "particular", "details", "remarks", "remark", "transaction");
  const debitCol  = find("debit", "withdrawal", "dr amount", "withdrawl");
  const creditCol = find("credit", "deposit", "cr amount");
  const amtCol    = find("amount", "transaction amount");

  if (dateCol === -1) return [];

  const rows: ParsedRow[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("Opening") || line.startsWith("Closing") || line.startsWith("Statement")) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;

    const rawDate = cols[dateCol]?.replace(/['"]/g, "") || "";
    if (!rawDate || rawDate.toLowerCase().includes("date") || rawDate.toLowerCase().includes("balance")) continue;

    const date = parseIndianDate(rawDate);
    const desc = (cols[descCol] || cols[1] || "Transaction").replace(/['"]/g, "").trim();

    let amount = 0;
    let type: "credit" | "debit" = "credit";

    if (debitCol >= 0 && creditCol >= 0) {
      const debit  = parseAmount(cols[debitCol]  || "0");
      const credit = parseAmount(cols[creditCol] || "0");
      if (credit > 0)      { amount = credit; type = "credit"; }
      else if (debit > 0)  { amount = debit;  type = "debit";  }
      else continue;
    } else if (amtCol >= 0) {
      const raw = cols[amtCol] || "";
      const isDebit = raw.includes("(") || raw.includes("-") || raw.toLowerCase().includes("dr");
      amount = parseAmount(raw);
      type = isDebit ? "debit" : "credit";
    } else continue;

    if (amount <= 0 || !date || date === "Invalid Date") continue;
    rows.push({ date, description: desc, amount, type, selected: type === "credit" });
  }

  return rows;
}

export default function BankPage() {
  const [accounts, setAccounts]         = useState<BankAccount[]>([]);
  const [txns, setTxns]                 = useState<Txn[]>([]);
  const [pendingInvoices, setPendInv]   = useState<PendingInvoice[]>([]);
  const [loading, setLoading]           = useState(true);
  const [matchModal, setMatchModal]     = useState<Txn | null>(null);
  const [saving, setSaving]             = useState(false);
  const [autoMatches, setAutoMatches]   = useState<{ txn: Txn; invoice: PendingInvoice }[]>([]);

  // Add account modal
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [acctForm, setAcctForm] = useState({
    bank_name: "HDFC Bank", account_last4: "", account_type: "current", nickname: "", ifsc: "",
  });
  const [addingAcct, setAddingAcct] = useState(false);

  // CSV import
  const [importAcct, setImportAcct]   = useState<BankAccount | null>(null);
  const [parsedRows, setParsedRows]   = useState<ParsedRow[]>([]);
  const [importing, setImporting]     = useState(false);
  const [importDone, setImportDone]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual add
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ date: new Date().toISOString().split("T")[0], description: "", amount: "", type: "credit" as "credit" | "debit" });

  const hdr = () => ({ ...authHeaders(), "Content-Type": "application/json" });

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, tRes, bRes] = await Promise.all([
        fetch(`${API}/api/bank/accounts`, { headers: hdr(), credentials: "include" as RequestCredentials }),
        fetch(`${API}/api/bank/transactions`, { headers: hdr(), credentials: "include" as RequestCredentials }),
        fetch(`${API}/api/bills`, { headers: hdr(), credentials: "include" as RequestCredentials }),
      ]);
      const [aD, tD, bD] = await Promise.all([aRes.json(), tRes.json(), bRes.json()]);
      setAccounts(aD.accounts || []);
      const transactions = tD.transactions || [];
      const invoices = (bD.bills || []).filter((b: any) => b.status !== "paid");
      setTxns(transactions);
      setPendInv(invoices);

      const unmatched = transactions.filter((t: Txn) => t.type === "credit" && t.status === "unmatched");
      const matches: { txn: Txn; invoice: PendingInvoice }[] = [];
      unmatched.forEach((t: Txn) => {
        const match = invoices.find((inv: PendingInvoice) => Math.abs(Number(inv.total) - t.amount) < 1);
        if (match) matches.push({ txn: t, invoice: match });
      });
      setAutoMatches(matches);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAcct(true);
    try {
      const r = await fetch(`${API}/api/bank/accounts`, { method: "POST", headers: hdr(), credentials: "include" as RequestCredentials, body: JSON.stringify(acctForm) });
      const d = await r.json();
      if (d.success) {
        setAccounts(a => [...a, d.account]);
        setShowAddAccount(false);
        setAcctForm({ bank_name: "HDFC Bank", account_last4: "", account_type: "current", nickname: "", ifsc: "" });
      }
    } finally { setAddingAcct(false); }
  };

  const deleteAccount = async (id: number) => {
    if (!confirm("Remove this bank account?")) return;
    await fetch(`${API}/api/bank/accounts/${id}`, { method: "DELETE", headers: hdr(), credentials: "include" as RequestCredentials });
    setAccounts(a => a.filter(x => x.id !== id));
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const rows = parseBankCSV(text);
      setParsedRows(rows);
      setImportDone(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleRow = (i: number) => setParsedRows(r => r.map((x, j) => j === i ? { ...x, selected: !x.selected } : x));
  const selectAllRows = () => setParsedRows(r => r.map(x => ({ ...x, selected: true })));
  const deselectAllRows = () => setParsedRows(r => r.map(x => ({ ...x, selected: false })));

  const importRows = async () => {
    const selected = parsedRows.filter(r => r.selected);
    if (!selected.length) return;
    setImporting(true);
    try {
      for (const row of selected) {
        await fetch(`${API}/api/bank/transactions`, {
          method: "POST", headers: hdr(), credentials: "include" as RequestCredentials,
          body: JSON.stringify({ txn_date: row.date, description: row.description, amount: row.amount, type: row.type, account_id: importAcct?.id }),
        });
      }
      setImportDone(true);
      setParsedRows([]);
      setImportAcct(null);
      load();
    } finally { setImporting(false); }
  };

  const addManualTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/bank/transactions`, {
        method: "POST", headers: hdr(), credentials: "include" as RequestCredentials,
        body: JSON.stringify({ ...addForm, txn_date: addForm.date, amount: parseFloat(addForm.amount) }),
      });
      const d = await r.json();
      if (d.success) { setShowAdd(false); setAddForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", type: "credit" }); load(); }
    } finally { setSaving(false); }
  };

  const markMatched = async (txnId: number, matchId: number, type: "invoice" | "khata") => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/bank/match`, {
        method: "POST", headers: hdr(), credentials: "include" as RequestCredentials,
        body: JSON.stringify({ transaction_id: txnId, match_type: type, match_id: matchId }),
      });
      const d = await r.json();
      if (d.success) { setMatchModal(null); load(); }
    } finally { setSaving(false); }
  };

  const ignoreTxn  = async (id: number) => { await fetch(`${API}/api/bank/transactions/${id}/ignore`, { method: "PATCH", headers: hdr(), credentials: "include" as RequestCredentials }); load(); };
  const deleteTxn  = async (id: number) => { await fetch(`${API}/api/bank/transactions/${id}`, { method: "DELETE", headers: hdr(), credentials: "include" as RequestCredentials }); load(); };

  const creditTotal = txns.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const unmatched   = txns.filter(t => t.status === "unmatched" && t.type === "credit").length;

  return (
    <DashboardLayout pageTitle="Bank Monitor">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Bank Monitor</h2>
            <p className="text-sm text-muted">Connect accounts · import statements · auto-match payments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 bg-surface-2 border border-white/10 text-secondary px-3 py-2.5 rounded-xl text-sm font-semibold hover:text-primary transition-colors">
              <FiPlus size={14} /> Add Transaction
            </button>
            <button onClick={() => setShowAddAccount(true)}
              className="flex items-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold shadow-button-accent hover:bg-white/90 transition-colors">
              <FiLink size={14} /> Connect Account
            </button>
          </div>
        </div>

        {/* ── Connected Accounts ── */}
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Connected Accounts</p>
          {accounts.length === 0 ? (
            <button onClick={() => setShowAddAccount(true)}
              className="w-full card p-5 border-dashed border-white/15 flex items-center gap-3 text-left hover:border-accent/40 hover:bg-accent/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-surface-2 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                <FiPlus size={18} className="text-muted group-hover:text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors">Connect your bank account</p>
                <p className="text-xs text-muted">HDFC, SBI, ICICI, Axis, Kotak and all other banks</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map(acct => (
                <div key={acct.id} className="card p-4 relative group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: BANK_COLORS[acct.bank_name] || "#0066FF" }}>
                      {acct.bank_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary text-sm truncate">{acct.nickname || acct.bank_name}</p>
                      <p className="text-2xs text-muted capitalize">{acct.account_type} · ••••{acct.account_last4 || "XXXX"}</p>
                    </div>
                    <span className="flex items-center gap-1 text-2xs text-success font-semibold">
                      <FiCheckCircle size={10} /> Linked
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setImportAcct(acct); setParsedRows([]); setImportDone(false); fileRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 text-accent text-xs font-bold hover:bg-accent/20 transition-colors">
                      <FiUpload size={12} /> Import Statement
                    </button>
                    <button onClick={() => deleteAccount(acct.id)}
                      className="p-2 rounded-xl bg-surface-2 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add another account */}
              <button onClick={() => setShowAddAccount(true)}
                className="card p-4 border-dashed border-white/10 flex items-center gap-3 hover:border-accent/30 hover:bg-accent/5 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center">
                  <FiPlus size={16} className="text-muted group-hover:text-accent transition-colors" />
                </div>
                <p className="text-sm text-muted group-hover:text-secondary transition-colors">Add another account</p>
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleCSVFile} className="hidden" />

        {/* ── CSV Preview ── */}
        {parsedRows.length > 0 && (
          <div className="card overflow-hidden border border-accent/20">
            <div className="px-4 py-3 border-b border-white/5 bg-accent/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-primary">Import Preview — {importAcct?.bank_name}</p>
                <p className="text-xs text-muted">{parsedRows.filter(r => r.selected).length} of {parsedRows.length} transactions selected</p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAllRows} className="text-xs text-accent font-semibold hover:underline">All</button>
                <span className="text-muted text-xs">·</span>
                <button onClick={deselectAllRows} className="text-xs text-muted font-semibold hover:underline">None</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {parsedRows.map((row, i) => (
                <div key={i} onClick={() => toggleRow(i)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-2/50 transition-colors ${!row.selected ? "opacity-40" : ""}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${row.selected ? "bg-accent border-accent" : "border-white/20"}`}>
                    {row.selected && <FiCheck size={10} className="text-white" />}
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${row.type === "credit" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {row.type === "credit" ? <FiArrowDown size={13} /> : <FiArrowUp size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{row.description}</p>
                    <p className="text-2xs text-muted">{fmtDate(row.date)}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${row.type === "credit" ? "text-success" : "text-danger"}`}>
                    {row.type === "credit" ? "+" : "-"}{fmtINR(row.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-white/5 flex gap-3">
              <button onClick={() => { setParsedRows([]); setImportAcct(null); }}
                className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
              <button onClick={importRows} disabled={importing || parsedRows.filter(r => r.selected).length === 0}
                className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {importing ? <><FiRefreshCw size={13} className="animate-spin" /> Importing...</> : <><FiUpload size={13} /> Import {parsedRows.filter(r => r.selected).length} Transactions</>}
              </button>
            </div>
          </div>
        )}

        {importDone && (
          <div className="card p-4 border border-success/20 bg-success/5 flex items-center gap-3">
            <FiCheckCircle size={18} className="text-success shrink-0" />
            <div>
              <p className="text-sm font-bold text-success">Import complete!</p>
              <p className="text-xs text-muted">Transactions added. AI is auto-matching payments to invoices below.</p>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Total Received</p>
            <p className="text-lg font-black text-success">{fmtINR(creditTotal)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Unmatched</p>
            <p className="text-lg font-black text-yellow-400">{unmatched}</p>
            <p className="text-2xs text-muted">transactions</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Pending Invoices</p>
            <p className="text-lg font-black text-danger">{pendingInvoices.length}</p>
          </div>
        </div>

        {/* ── Auto-match banner ── */}
        {autoMatches.length > 0 && (
          <div className="card p-4 border border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <FiZap size={15} className="text-accent" />
              <p className="font-bold text-primary text-sm">⚡ AI Auto-Matches ({autoMatches.length})</p>
            </div>
            <p className="text-xs text-muted mb-3">Yeh payments exactly match kar rahi hain pending invoices se:</p>
            <div className="space-y-2">
              {autoMatches.map(({ txn, invoice }) => (
                <div key={txn.id} className="flex items-center gap-3 bg-surface-2/50 rounded-xl p-3 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-success">{fmtINR(txn.amount)}</span>
                      <span className="text-muted text-xs">↔</span>
                      <span className="text-sm font-semibold text-primary">{invoice.customer_name}</span>
                    </div>
                    <p className="text-2xs text-muted">{fmtDate(txn.txn_date)} · {invoice.bill_number}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => markMatched(txn.id, invoice.id, "invoice")} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-bold hover:bg-success/30 transition-colors">
                      <FiCheck size={11} /> Mark Paid
                    </button>
                    <button onClick={() => ignoreTxn(txn.id)}
                      className="p-1.5 text-muted hover:text-danger rounded-lg bg-surface-2 transition-colors">
                      <FiX size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transactions ── */}
        {loading ? (
          <div className="flex justify-center py-12"><FiRefreshCw className="animate-spin text-muted" size={20} /></div>
        ) : txns.length === 0 ? (
          <div className="card p-10 text-center">
            <FiCreditCard size={36} className="mx-auto mb-3 text-muted opacity-30" />
            <p className="font-semibold text-primary mb-1">Koi transaction nahi abhi tak</p>
            <p className="text-sm text-muted mb-4">Bank account connect karo aur statement import karo — ya manually add karo</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowAddAccount(true)} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">
                <FiLink size={13} className="inline mr-1" /> Connect Account
              </button>
              <button onClick={() => setShowAdd(true)} className="bg-surface-2 text-secondary px-4 py-2 rounded-xl text-sm font-semibold">
                <FiPlus size={13} className="inline mr-1" /> Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-sm font-bold text-primary">All Transactions</p>
              <p className="text-xs text-muted">{txns.length} entries</p>
            </div>
            <div className="divide-y divide-white/5">
              {txns.map(txn => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/30 group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${txn.type === "credit" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {txn.type === "credit" ? <FiArrowDown size={14} /> : <FiArrowUp size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{txn.description || "Transaction"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-2xs text-muted">{fmtDate(txn.txn_date)}</p>
                      {txn.status === "matched" && (
                        <span className="text-2xs bg-success/10 text-success px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <FiCheckCircle size={9} /> Matched
                        </span>
                      )}
                      {txn.status === "ignored" && (
                        <span className="text-2xs bg-white/5 text-muted px-1.5 py-0.5 rounded-full">Ignored</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold text-sm ${txn.type === "credit" ? "text-success" : "text-danger"}`}>
                      {txn.type === "credit" ? "+" : "-"}{fmtINR(txn.amount)}
                    </span>
                    {txn.type === "credit" && txn.status === "unmatched" && (
                      <button onClick={() => setMatchModal(txn)}
                        className="text-2xs bg-accent/10 text-accent px-2 py-1 rounded-lg font-semibold hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100">
                        Match
                      </button>
                    )}
                    <button onClick={() => deleteTxn(txn.id)}
                      className="p-1 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Account Modal ── */}
      {showAddAccount && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary">Connect Bank Account</h3>
                <p className="text-xs text-muted mt-0.5">Sirf details store karta hai — securely</p>
              </div>
              <button onClick={() => setShowAddAccount(false)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <form onSubmit={addAccount} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted mb-1 block">Bank *</label>
                <select value={acctForm.bank_name} onChange={e => setAcctForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50">
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Last 4 digits</label>
                  <input value={acctForm.account_last4} onChange={e => setAcctForm(f => ({ ...f, account_last4: e.target.value.slice(0, 4) }))}
                    placeholder="4321" maxLength={4} type="tel"
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Account Type</label>
                  <select value={acctForm.account_type} onChange={e => setAcctForm(f => ({ ...f, account_type: e.target.value }))}
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50">
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                    <option value="od">OD/CC</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Nickname (optional)</label>
                <input value={acctForm.nickname} onChange={e => setAcctForm(f => ({ ...f, nickname: e.target.value }))}
                  placeholder="Main Account, GST Account..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">IFSC (optional)</label>
                <input value={acctForm.ifsc} onChange={e => setAcctForm(f => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                  placeholder="HDFC0001234"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary font-mono focus:outline-none focus:border-accent/50" />
              </div>
              <div className="p-3 bg-surface-2 rounded-xl flex items-start gap-2">
                <FiAlertCircle size={13} className="text-muted shrink-0 mt-0.5" />
                <p className="text-2xs text-muted">
                  Hum sirf aapke bank ka naam aur last 4 digits store karte hain. Poora account number, password ya OTP kabhi nahi maangenge.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddAccount(false)} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={addingAcct || !acctForm.bank_name}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors">
                  {addingAcct ? "Saving..." : "Connect Account"}
                </button>
              </div>
            </form>

            {/* How to import */}
            <div className="px-5 pb-5">
              <p className="text-2xs text-muted text-center">
                Account add karne ke baad → <span className="text-accent font-semibold">Import Statement</span> click karo → bank se CSV download karo → upload karo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-primary">Add Transaction</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <form onSubmit={addManualTxn} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Date</label>
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["credit", "debit"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setAddForm(f => ({ ...f, type: t }))}
                        className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-colors ${addForm.type === t ? (t === "credit" ? "bg-success/20 text-success border border-success/30" : "bg-danger/20 text-danger border border-danger/30") : "bg-surface-2 text-muted"}`}>
                        {t === "credit" ? "💰 In" : "💸 Out"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Amount (₹) *</label>
                <input required type="number" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="50000" autoFocus
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Description</label>
                <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="UPI from Sharma ji, NEFT..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={saving || !addForm.amount}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manual Match Modal ── */}
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary">Match to Invoice</h3>
                <p className="text-xs text-muted">Payment: <span className="text-success font-bold">{fmtINR(matchModal.amount)}</span></p>
              </div>
              <button onClick={() => setMatchModal(null)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <div className="p-5 space-y-2 max-h-96 overflow-y-auto">
              {pendingInvoices.length === 0 ? (
                <p className="text-center text-sm text-muted py-4">No pending invoices</p>
              ) : pendingInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-white/5 hover:border-accent/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-primary">{inv.customer_name}</p>
                    <p className="text-2xs text-muted">{inv.bill_number} · {fmtDate(inv.bill_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${Math.abs(Number(inv.total) - matchModal.amount) < 1 ? "text-success" : "text-primary"}`}>
                      {fmtINR(Number(inv.total))}
                    </span>
                    {Math.abs(Number(inv.total) - matchModal.amount) < 1 && (
                      <span className="text-2xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">Exact!</span>
                    )}
                    <button onClick={() => markMatched(matchModal.id, inv.id, "invoice")} disabled={saving}
                      className="px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-bold hover:bg-success/30 transition-colors">
                      {saving ? "..." : "Mark Paid"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

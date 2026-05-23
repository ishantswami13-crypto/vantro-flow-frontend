"use client";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiRefreshCw, FiCheck, FiX, FiLink, FiArrowDown,
  FiAlertCircle, FiCheckCircle, FiClock, FiSearch, FiUpload,
  FiZap, FiTrash2,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Txn = {
  id: number; date: string; description: string; amount: number;
  type: "credit" | "debit"; matched_to?: string; matched_id?: number;
  matched_type?: "invoice" | "khata"; status: "unmatched" | "matched" | "ignored";
};
type PendingInvoice = { id: number; customer_name: string; total: number; bill_number: string; bill_date: string; };
type PendingKhata   = { customer_name: string; balance: number; };

const fmtINR  = (n: number) => "₹" + Math.abs(Number(n)).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function BankPage() {
  const [txns, setTxns]                 = useState<Txn[]>([]);
  const [pendingInvoices, setPendInv]   = useState<PendingInvoice[]>([]);
  const [pendingKhata, setPendKhata]    = useState<PendingKhata[]>([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<"monitor" | "add">("monitor");
  const [matchModal, setMatchModal]     = useState<Txn | null>(null);
  const [saving, setSaving]             = useState(false);
  const [autoMatches, setAutoMatches]   = useState<{ txn: Txn; invoice: PendingInvoice }[]>([]);

  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "", amount: "", type: "credit" as "credit" | "debit",
  });

  const tok = () => typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";
  const hdr = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tok()}` });

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, bRes, kRes] = await Promise.all([
        fetch(`${API}/api/bank/transactions`, { headers: hdr() }),
        fetch(`${API}/api/bills`, { headers: hdr() }),
        fetch(`${API}/api/khata`, { headers: hdr() }),
      ]);
      const [tD, bD, kD] = await Promise.all([tRes.json(), bRes.json(), kRes.json()]);
      const transactions = tD.transactions || [];
      const invoices = (bD.bills || []).filter((b: any) => b.status !== "paid");
      const khata = (kD.customers || []).filter((c: any) => c.balance > 0);
      setTxns(transactions);
      setPendInv(invoices);
      setPendKhata(khata);

      // Auto-match: find credit transactions that match a pending invoice amount exactly
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

  const addTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/bank/transactions`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ ...addForm, amount: parseFloat(addForm.amount) }),
      });
      const d = await r.json();
      if (d.success) { setAddForm({ date: new Date().toISOString().split("T")[0], description: "", amount: "", type: "credit" }); load(); setTab("monitor"); }
    } finally { setSaving(false); }
  };

  const markMatched = async (txnId: number, invoiceId: number, type: "invoice" | "khata") => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/bank/match`, {
        method: "POST", headers: hdr(),
        body: JSON.stringify({ transaction_id: txnId, invoice_id: invoiceId, match_type: type }),
      });
      const d = await r.json();
      if (d.success) { setMatchModal(null); load(); }
    } finally { setSaving(false); }
  };

  const ignoreAuto = async (txnId: number) => {
    await fetch(`${API}/api/bank/transactions/${txnId}/ignore`, { method: "PATCH", headers: hdr() });
    load();
  };

  const deleteTxn = async (id: number) => {
    await fetch(`${API}/api/bank/transactions/${id}`, { method: "DELETE", headers: hdr() });
    load();
  };

  const creditTotal = txns.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const unmatched   = txns.filter(t => t.status === "unmatched" && t.type === "credit").length;

  return (
    <DashboardLayout pageTitle="Bank Monitor">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Bank Monitor</h2>
            <p className="text-sm text-muted">Incoming payments → auto-match to pending invoices</p>
          </div>
          <button onClick={() => setTab(tab === "add" ? "monitor" : "add")}
            className="flex items-center gap-1.5 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-button-accent hover:bg-accent/90 transition-colors">
            <FiPlus size={15} /> Add Transaction
          </button>
        </div>

        {/* Stats */}
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

        {/* Auto-match suggestions */}
        {autoMatches.length > 0 && (
          <div className="card p-4 border border-accent/20 bg-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <FiZap size={15} className="text-accent" />
              <p className="font-bold text-primary text-sm">⚡ AI Auto-Matches Found ({autoMatches.length})</p>
            </div>
            <p className="text-xs text-muted mb-3">Yeh payments exactly match kar rahi hain pending invoices se. Ek click mein done karo:</p>
            <div className="space-y-2">
              {autoMatches.map(({ txn, invoice }) => (
                <div key={txn.id} className="flex items-center gap-3 bg-surface-2/50 rounded-xl p-3 border border-white/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-success">{fmtINR(txn.amount)}</span>
                      <span className="text-muted text-xs">↔</span>
                      <span className="text-sm font-semibold text-primary">{invoice.customer_name}</span>
                    </div>
                    <p className="text-2xs text-muted">{fmtDate(txn.date)} · {txn.description} · Invoice {invoice.bill_number}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => markMatched(txn.id, invoice.id, "invoice")} disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-bold hover:bg-success/30 transition-colors">
                      <FiCheck size={11} /> Mark Paid
                    </button>
                    <button onClick={() => ignoreAuto(txn.id)}
                      className="p-1.5 text-muted hover:text-danger rounded-lg bg-surface-2 transition-colors">
                      <FiX size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Transaction form */}
        {tab === "add" && (
          <div className="card p-4">
            <h3 className="font-bold text-primary mb-4">Add Bank Transaction</h3>
            <form onSubmit={addTxn} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Date</label>
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["credit", "debit"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setAddForm(f => ({ ...f, type: t }))}
                        className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-colors ${addForm.type === t ? (t === "credit" ? "bg-success/20 text-success border border-success/30" : "bg-danger/20 text-danger border border-danger/30") : "bg-surface-2 text-muted"}`}>
                        {t === "credit" ? "💰 Credit" : "💸 Debit"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Amount (₹) *</label>
                <input required type="number" value={addForm.amount} onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="50000"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Description</label>
                <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="UPI from Sharma ji, NEFT transfer..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setTab("monitor")} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={saving || !addForm.amount}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Add Transaction"}
                </button>
              </div>
            </form>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted flex items-center gap-1.5 mb-2"><FiUpload size={12} /> Import bank statement CSV (coming soon)</p>
              <p className="text-2xs text-muted">Ya apna bank SMS forward karo — AI parse karega automatically</p>
            </div>
          </div>
        )}

        {/* Transaction list */}
        {tab === "monitor" && (
          loading ? <div className="flex justify-center py-12"><FiRefreshCw className="animate-spin text-muted" size={20} /></div> :
          txns.length === 0 ? (
            <div className="card p-10 text-center">
              <FiArrowDown size={36} className="mx-auto mb-3 text-muted opacity-30" />
              <p className="font-semibold text-primary mb-1">Koi transaction nahi</p>
              <p className="text-sm text-muted mb-4">Jab koi payment aaye, yahan add karo — system automatically invoice se match kar dega</p>
              <button onClick={() => setTab("add")} className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-bold">
                <FiPlus size={14} className="inline mr-1" /> Add Transaction
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-white/5">
                {txns.map(txn => (
                  <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2/30 group">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${txn.type === "credit" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      <FiArrowDown size={15} className={txn.type === "debit" ? "rotate-180" : ""} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{txn.description || "Transaction"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-2xs text-muted">{fmtDate(txn.date)}</p>
                        {txn.status === "matched" && txn.matched_to && (
                          <span className="text-2xs bg-success/10 text-success px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <FiCheckCircle size={9} /> Matched: {txn.matched_to}
                          </span>
                        )}
                        {txn.status === "ignored" && (
                          <span className="text-2xs bg-muted/10 text-muted px-1.5 py-0.5 rounded-full">Ignored</span>
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
          )
        )}
      </div>

      {/* Manual Match Modal */}
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary">Match Transaction</h3>
                <p className="text-xs text-muted">Amount: <span className="text-success font-bold">{fmtINR(matchModal.amount)}</span> · {fmtDate(matchModal.date)}</p>
              </div>
              <button onClick={() => setMatchModal(null)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {pendingInvoices.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Pending Invoices</p>
                  <div className="space-y-2">
                    {pendingInvoices.map(inv => (
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
                            <span className="text-2xs bg-success/10 text-success px-1.5 py-0.5 rounded-full">Exact match!</span>
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
              )}
              {pendingKhata.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Khata Receivables</p>
                  <div className="space-y-2">
                    {pendingKhata.map(k => (
                      <div key={k.customer_name} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-white/5 hover:border-accent/30 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-primary">{k.customer_name}</p>
                          <p className="text-2xs text-muted">Khata balance</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-danger">{fmtINR(k.balance)}</span>
                          <button onClick={() => markMatched(matchModal.id, 0, "khata")} disabled={saving}
                            className="px-3 py-1.5 bg-success/20 text-success rounded-lg text-xs font-bold hover:bg-success/30 transition-colors">
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingInvoices.length === 0 && pendingKhata.length === 0 && (
                <p className="text-center text-sm text-muted py-4">No pending invoices or khata entries found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

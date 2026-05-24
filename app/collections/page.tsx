"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type Invoice } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { Badge } from "@/components/ui/Badge";
import { isDemoMode } from "@/lib/demo";
import { generateWhatsAppPaymentLink } from "@/lib/paymentLink";
import {
  FiSearch, FiMessageSquare, FiCheckSquare,
  FiDownload, FiArrowUp, FiArrowDown, FiPhone,
  FiUpload, FiX, FiCopy, FiMessageCircle,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface Customer {
  id: number; name: string; contact: string; industry: string;
  outstanding: number; daysOverdue: number; score: number;
  lastContact: string; lastPayment: string; status: "overdue" | "due" | "promised";
}

interface ReplyLog {
  intent: "promised" | "uncertain" | "paid" | "no_response";
  label: string;
  color: string;
  text: string;
  date: string;
}

interface PromiseRecord {
  date: string;
  amount: number;
  name: string;
}

const DATA: Customer[] = [
  { id:  1, name: "Mehta Fabrics Pvt Ltd",      contact: "9876543210", industry: "Manufacturing", outstanding: 840000, daysOverdue: 62, score: 82, lastContact: "10 May", lastPayment: "12 Jan", status: "overdue"  },
  { id:  2, name: "Sharma Steel Works",          contact: "9765432109", industry: "Trading",       outstanding: 520000, daysOverdue: 45, score: 67, lastContact: "12 May", lastPayment: "28 Jan", status: "overdue"  },
  { id:  3, name: "Patel Agro Industries",       contact: "9654321098", industry: "Manufacturing", outstanding: 315000, daysOverdue: 38, score: 54, lastContact: "8 May",  lastPayment: "5 Feb",  status: "overdue"  },
  { id:  4, name: "Gupta Construction Co",       contact: "9543210987", industry: "Construction",  outstanding: 280000, daysOverdue: 29, score: 71, lastContact: "13 May", lastPayment: "15 Feb", status: "promised" },
  { id:  5, name: "Verma Chemicals Ltd",         contact: "9432109876", industry: "Services",      outstanding: 195000, daysOverdue: 18, score: 45, lastContact: "14 May", lastPayment: "22 Feb", status: "due"      },
  { id:  6, name: "Singh Logistics Pvt Ltd",     contact: "9321098765", industry: "Services",      outstanding: 175000, daysOverdue: 55, score: 61, lastContact: "5 May",  lastPayment: "3 Jan",  status: "overdue"  },
  { id:  7, name: "Joshi Electronics",           contact: "9210987654", industry: "Retail",        outstanding: 142000, daysOverdue: 14, score: 88, lastContact: "15 May", lastPayment: "1 Mar",  status: "due"      },
  { id:  8, name: "Agarwal Textiles",            contact: "9109876543", industry: "Manufacturing", outstanding: 128000, daysOverdue: 70, score: 32, lastContact: "28 Apr", lastPayment: "10 Jan", status: "overdue"  },
  { id:  9, name: "Kapoor Real Estate",          contact: "9098765432", industry: "Construction",  outstanding: 115000, daysOverdue: 22, score: 74, lastContact: "11 May", lastPayment: "25 Feb", status: "due"      },
  { id: 10, name: "Pandey Pharma Distributors",  contact: "8987654321", industry: "Trading",       outstanding: 98000,  daysOverdue: 33, score: 59, lastContact: "9 May",  lastPayment: "18 Feb", status: "overdue"  },
  { id: 11, name: "Mishra Auto Parts",           contact: "8876543210", industry: "Retail",        outstanding: 87000,  daysOverdue: 11, score: 90, lastContact: "15 May", lastPayment: "5 Mar",  status: "due"      },
  { id: 12, name: "Yadav Hardware Suppliers",    contact: "8765432109", industry: "Trading",       outstanding: 74000,  daysOverdue: 48, score: 41, lastContact: "2 May",  lastPayment: "20 Jan", status: "overdue"  },
];

function fmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

// ── Intent Classifier (client-side) ──────────────────────────────────────────
function classifyIntent(text: string): ReplyLog {
  const t = text.toLowerCase();
  if (!t.trim()) return { intent: "no_response", label: "⚫ No Reply", color: "#6B7280", text, date: new Date().toISOString() };

  const paidKw = ["paid", "kar diya", "bhej diya", "done", "ho gaya", "send kar", "transferred", "upi kar", "payment kiya", "de diya", "diya"];
  const promisedKw = ["kal", "parso", "pakka", "promise", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next week", "agli", "agle", "de dunga", "dunga", "sure", "zaroor", "confirm", "by", "tak", "shaam tak", "dopahar", "subah"];
  const uncertainKw = ["dekhunga", "dekhta", "pata nahi", "maybe", "try", "mushkil", "problem", "baad mein", "later", "soch", "nahi pata", "abhi nahi", "thodi der", "wait"];

  if (paidKw.some(k => t.includes(k))) return { intent: "paid", label: "🟢 Paid", color: "#10D98A", text, date: new Date().toISOString() };
  if (promisedKw.some(k => t.includes(k))) return { intent: "promised", label: "🟡 Promised", color: "#F5A524", text, date: new Date().toISOString() };
  if (uncertainKw.some(k => t.includes(k))) return { intent: "uncertain", label: "🔴 Uncertain", color: "#F5424D", text, date: new Date().toISOString() };
  return { intent: "uncertain", label: "🔴 Uncertain", color: "#F5424D", text, date: new Date().toISOString() };
}

type SortKey = "outstanding" | "daysOverdue" | "score";

const SCORE_COLOR = (s: number) => s >= 70 ? "#10D98A" : s >= 40 ? "#F5A524" : "#F5424D";
const STATUS_VARIANT: Record<string, "danger" | "warning" | "default"> = {
  overdue: "danger", promised: "warning", due: "default",
};

export default function CollectionsPage() {
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState<SortKey>("daysOverdue");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilter]     = useState("all");
  const [filterIndustry, setIndustry] = useState("all");
  const [selected, setSelected]       = useState<number[]>([]);
  const [liveData, setLiveData]       = useState<Customer[] | null>(null);
  const [invoiceIds, setInvoiceIds]   = useState<Record<number, string>>({});
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadMsg, setUploadMsg]     = useState("");
  const fileRef                       = useRef<HTMLInputElement>(null);
  const [logModal, setLogModal]       = useState<Customer | null>(null);
  const [callForm, setCallForm]       = useState({ did_pick_up: true, promised_date: "", notes: "" });
  const [loggingCall, setLoggingCall] = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importMsg, setImportMsg]     = useState("");
  const [showImport, setShowImport]   = useState(false);
  const [showTallyGuide, setShowTallyGuide] = useState(false);
  const [payLinkMsg, setPayLinkMsg]   = useState<{text: string; phone?: string} | null>(null);
  const [payLinkLoading, setPayLinkLoading] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Feature 2: Reply logger
  const [replyModal, setReplyModal]   = useState<Customer | null>(null);
  const [replyText, setReplyText]     = useState("");
  const [replyLogs, setReplyLogs]     = useState<Record<number, ReplyLog>>({});

  // Feature 3: Promise tracker
  const [promises, setPromises]       = useState<Record<number, PromiseRecord>>({});

  // Feature 4: Payment toast
  const [paidToast, setPaidToast]     = useState<{name: string; amount: number} | null>(null);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!paidToast) return;
    const t = setTimeout(() => setPaidToast(null), 3500);
    return () => clearTimeout(t);
  }, [paidToast]);

  const loadInvoices = (userId: string) => {
    api.invoices.list(userId).then(d => {
      const ids: Record<number, string> = {};
      const mapped: Customer[] = d.invoices.map((inv: Invoice, i: number) => {
        ids[i + 1] = inv.id;
        return {
          id: i + 1,
          name: inv.customer_name,
          contact: inv.customer_phone || "",
          industry: "Business",
          outstanding: inv.invoice_amount,
          daysOverdue: inv.days_overdue,
          score: Math.max(10, Math.min(99, 90 - inv.days_overdue)),
          lastContact: inv.invoice_date,
          lastPayment: inv.payment_date || "—",
          status: inv.days_overdue > 30 ? "overdue" : inv.days_overdue > 0 ? "due" : "promised",
        };
      });
      setLiveData(mapped);
      setInvoiceIds(ids);
    }).catch(() => {});
  };

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;
    loadInvoices(user.id);
  }, []);

  // Feature 4: Mark paid with celebration toast
  const handleMarkPaid = async (c: Customer) => {
    const invoiceId = invoiceIds[c.id];
    if (!invoiceId) return;
    setMarkingPaid(c.id);
    try {
      await api.invoices.markPaid(invoiceId, {
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "manual",
      });
      posthog.capture("invoice_marked_paid");
      // Show celebration toast
      setPaidToast({ name: c.name.split(" ")[0], amount: c.outstanding });
      const user = getUser();
      if (user?.id) loadInvoices(user.id);
    } catch {
      // silently fail
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleUpload = async (file: File) => {
    const user = getUser();
    if (!user?.id) return;
    setUploading(true); setUploadMsg("");
    try {
      const res = await api.invoices.upload(user.id, file);
      if (res.error) throw new Error(res.error);
      setUploadMsg(`${res.count} invoices uploaded successfully`);
      posthog.capture("csv_uploaded", { invoice_count: res.count });
      loadInvoices(user.id);
    } catch (err: any) {
      setUploadMsg(`${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLogCall = async () => {
    const user = getUser();
    if (!user?.id || !logModal) return;
    setLoggingCall(true);
    try {
      await api.calls.log({
        user_id: user.id,
        customer_name: logModal.name,
        customer_phone: logModal.contact,
        amount: logModal.outstanding,
        did_pick_up: callForm.did_pick_up,
        promised_payment_date: callForm.promised_date || null,
        notes: callForm.notes || null,
        invoice_id: invoiceIds[logModal.id] || null,
      });
      posthog.capture("call_logged", {
        did_pick_up: callForm.did_pick_up,
        has_promise: !!callForm.promised_date,
      });
      // Save promise record if promised date given
      if (callForm.promised_date && logModal) {
        setPromises(prev => ({
          ...prev,
          [logModal.id]: { date: callForm.promised_date, amount: logModal.outstanding, name: logModal.name },
        }));
      }
      setLogModal(null);
      setCallForm({ did_pick_up: true, promised_date: "", notes: "" });
    } catch {
      // fail silently
    } finally {
      setLoggingCall(false);
    }
  };

  // Feature 2: Log reply with AI intent
  const handleLogReply = useCallback(() => {
    if (!replyModal || !replyText.trim()) return;
    const log = classifyIntent(replyText);
    setReplyLogs(prev => ({ ...prev, [replyModal.id]: log }));
    posthog.capture("reply_logged", { intent: log.intent });
    setReplyModal(null);
    setReplyText("");
  }, [replyModal, replyText]);

  // Feature 3: Generate promise-broken WA nudge
  const getPromiseNudgeMsg = (c: Customer) => {
    const p = promises[c.id];
    if (!p) return "";
    const name = c.name.split(" ")[0];
    return `${name} bhai, aapne ${p.date} ko payment ka promise kiya tha — ₹${p.amount.toLocaleString("en-IN")} abhi tak nahi aaya. Kya aaj settle kar sakte hain? 🙏`;
  };

  const isPromiseBroken = (id: number) => {
    const p = promises[id];
    if (!p) return false;
    return new Date(p.date) < new Date(new Date().toDateString());
  };

  const fetchInvoices = () => {
    const user = getUser();
    if (user?.id) loadInvoices(user.id);
  };

  const handleImportFile = async (file: File) => {
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${BASE}/api/import/excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const d = await r.json();
      if (d.success) {
        setImportMsg(`${d.imported} invoices imported successfully!`);
        setTimeout(() => { setShowImport(false); setImportMsg(""); fetchInvoices(); }, 2000);
      } else {
        setImportMsg(`${d.error || "Import failed"}${d.hint ? " — " + d.hint : ""}`);
      }
    } catch { setImportMsg("Upload failed. Please try again."); }
    finally { setImporting(false); }
  };

  const handlePayLink = async (c: Customer) => {
    if (isDemoMode()) {
      const user = (() => { try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; } })();
      const upiId = user.upi_id || "demo@upi";
      const bizName = user.business_name || "Demo Business";
      const text = generateWhatsAppPaymentLink({
        upiId,
        payeeName: bizName,
        amount: c.outstanding,
        note: `Invoice from ${bizName}`,
        customerPhone: c.contact,
        customerName: c.name.split(" ")[0],
      });
      const msgMatch = text.match(/\?text=(.+)/);
      const msg = msgMatch ? decodeURIComponent(msgMatch[1]) : text;
      setPayLinkMsg({ text: msg, phone: c.contact });
      return;
    }

    const invoiceId = invoiceIds[c.id];
    if (!invoiceId) return;
    setPayLinkLoading(invoiceId);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${BASE}/api/payments/create-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invoice_id: invoiceId,
          customer_name: c.name,
          amount: c.outstanding,
          description: `Invoice payment — ${c.name}`,
        }),
      });
      const d = await r.json();
      if (d.success) setPayLinkMsg({ text: d.whatsapp_text, phone: c.contact });
    } catch { /* noop */ }
    finally { setPayLinkLoading(null); }
  };

  const tableData = liveData ?? DATA;
  const industries = useMemo(() => ["all", ...Array.from(new Set(tableData.map((c) => c.industry)))], [tableData]);

  const rows = useMemo(() => {
    let r = tableData;
    if (search)                r = r.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.includes(search));
    if (filterStatus !== "all") r = r.filter((c) => c.status === filterStatus);
    if (filterIndustry !== "all") r = r.filter((c) => c.industry === filterIndustry);
    return [...r].sort((a, b) => {
      const d = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -d : d;
    });
  }, [search, sortKey, sortDir, filterStatus, filterIndustry, tableData]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-primary transition-colors">
      {label}
      {sortKey === col ? (
        sortDir === "desc" ? <FiArrowDown size={10} className="text-accent" /> : <FiArrowUp size={10} className="text-accent" />
      ) : null}
    </button>
  );

  const totalSelected = selected.length;
  const allSelected   = totalSelected === rows.length && rows.length > 0;

  return (
    <DashboardLayout pageTitle="Collections">
      <div className="space-y-4 page-enter">

        {/* ── Feature 4: Payment celebration toast ── */}
        {paidToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-success rounded-2xl shadow-2xl text-white font-bold text-sm">
              <span className="text-xl">🎉</span>
              <div>
                <p>{paidToast.name} ne payment kiya!</p>
                <p className="text-xs font-normal opacity-90">₹{paidToast.amount.toLocaleString("en-IN")} received</p>
              </div>
              <button onClick={() => setPaidToast(null)} className="ml-2 opacity-70 hover:opacity-100">
                <FiX size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Feature 2: Log Reply Modal ── */}
        {replyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => { setReplyModal(null); setReplyText(""); }}>
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-primary text-sm">Log Customer Reply</p>
                  <p className="text-2xs text-muted mt-0.5">{replyModal.name}</p>
                </div>
                <button onClick={() => { setReplyModal(null); setReplyText(""); }}><FiX size={16} className="text-muted hover:text-primary" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1.5">What did they say? (paste their exact reply)</label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder={'e.g. "Kal pakka de dunga bhai" or "Abhi mushkil hai, next week try karunga"'}
                    className="w-full bg-surface-2 border border-border rounded-lg text-sm text-primary px-3 py-2 focus:outline-none focus:border-accent resize-none placeholder-muted/50"
                  />
                </div>

                {/* Live intent preview */}
                {replyText.trim() && (() => {
                  const preview = classifyIntent(replyText);
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: `${preview.color}10`, borderColor: `${preview.color}30` }}>
                      <span className="text-sm">{preview.label.split(" ")[0]}</span>
                      <div>
                        <p className="text-xs font-bold" style={{ color: preview.color }}>{preview.label.slice(2)}</p>
                        <p className="text-2xs text-muted">AI classified intent</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2 text-2xs text-muted">
                  <div>🟢 "Kal pakka dunga" → Promised</div>
                  <div>🟡 "Try karunga" → Uncertain</div>
                  <div>🔴 "Mushkil hai" → Uncertain</div>
                  <div>⚫ No reply → No Response</div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setReplyLogs(prev => ({ ...prev, [replyModal.id]: { intent: "no_response", label: "⚫ No Reply", color: "#6B7280", text: "", date: new Date().toISOString() } })); setReplyModal(null); setReplyText(""); }}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-surface-2 border border-border text-secondary hover:text-primary transition-all">
                    ⚫ No Response
                  </button>
                  <button onClick={handleLogReply} disabled={!replyText.trim()}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50">
                    Save Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Existing Log Call Modal ── */}
        {logModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setLogModal(null)}>
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-primary text-sm">Log Call — {logModal.name}</p>
                <button onClick={() => setLogModal(null)}><FiX size={16} className="text-muted hover:text-primary" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-secondary mb-2">Did they pick up?</p>
                  <div className="flex gap-2">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => setCallForm(f => ({ ...f, did_pick_up: v }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${callForm.did_pick_up === v ? "bg-accent text-white border-accent" : "bg-surface-2 text-secondary border-border"}`}>
                        {v ? "Yes ✓" : "No ✗"}
                      </button>
                    ))}
                  </div>
                </div>
                {callForm.did_pick_up && (
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">Promised payment date</label>
                    <input type="date" value={callForm.promised_date}
                      onChange={e => setCallForm(f => ({ ...f, promised_date: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-lg text-sm text-primary px-3 py-2 focus:outline-none focus:border-accent" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Notes</label>
                  <textarea value={callForm.notes} onChange={e => setCallForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3} placeholder="What did they say..."
                    className="w-full bg-surface-2 border border-border rounded-lg text-sm text-primary px-3 py-2 focus:outline-none focus:border-accent resize-none" />
                </div>
                <button onClick={handleLogCall} disabled={loggingCall}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-60">
                  {loggingCall ? "Saving..." : "Save Call Log"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Collections</h2>
            <p className="text-sm text-secondary mt-0.5">
              {rows.length} customers &mdash; outstanding receivables
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {totalSelected > 0 && (
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-success-dim text-success border border-success/25 hover:bg-success hover:text-white transition-all">
                <FiMessageSquare size={13} />
                Message ({totalSelected})
              </button>
            )}
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-secondary text-xs font-semibold hover:text-primary hover:border-accent/30 transition-all">
              <FiUpload size={13} /> Import Excel
            </button>
            <div className="relative">
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-60">
                <FiUpload size={13} />
                {uploading ? "Uploading..." : "Upload CSV"}
              </button>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
              <FiDownload size={13} />
              Export
            </button>
          </div>
        </div>

        {uploadMsg && (
          <div className={`px-4 py-2.5 rounded-lg text-xs font-medium ${uploadMsg.startsWith("✓") ? "bg-success-dim text-success border border-success/20" : "bg-danger-dim text-danger border border-danger/20"}`}>
            {uploadMsg}
            {" "}<button onClick={() => setUploadMsg("")} className="underline ml-2">Dismiss</button>
          </div>
        )}

        {!liveData && (
          <div className="bg-surface-2 border border-border rounded-lg px-4 py-3 text-xs text-secondary">
            <span className="font-semibold text-primary">CSV format:</span> customer_name, invoice_amount, invoice_date, payment_status
            {" "}—{" "}
            <a href="data:text/csv;charset=utf-8,customer_name%2Cinvoice_amount%2Cinvoice_date%2Cpayment_status%0AMehta%20Fabrics%2C840000%2C2025-03-01%2CPending"
              download="vantro-sample.csv" className="text-accent underline">Download sample</a>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search customer or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-lg text-sm text-primary placeholder-muted pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {[
              { val: filterStatus,   set: setFilter,   opts: ["all", "overdue", "due", "promised"], prefix: "Status: " },
              { val: filterIndustry, set: setIndustry, opts: industries,                             prefix: "Sector: " },
            ].map(({ val, set, opts, prefix }, i) => (
              <select
                key={i}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="bg-surface-1 border border-border rounded-lg text-xs text-secondary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors capitalize"
              >
                {opts.map((o) => (
                  <option key={o} value={o} className="bg-surface capitalize">
                    {o === "all" ? prefix + "All" : o}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-premium">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  <th className="w-10 px-5 py-3">
                    <input type="checkbox" className="accent-accent" checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))} />
                  </th>
                  <th className="text-left px-4 py-3 section-label">Customer</th>
                  <th className="text-right px-4 py-3 section-label cursor-pointer">
                    <SortBtn col="outstanding" label="Outstanding" />
                  </th>
                  <th className="text-right px-4 py-3 section-label hidden sm:table-cell cursor-pointer">
                    <SortBtn col="daysOverdue" label="Days Overdue" />
                  </th>
                  <th className="px-4 py-3 section-label hidden md:table-cell cursor-pointer">
                    <SortBtn col="score" label="AI Score" />
                  </th>
                  <th className="text-center px-4 py-3 section-label hidden lg:table-cell">Status</th>
                  <th className="text-right px-4 py-3 section-label hidden xl:table-cell">Last Contact</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const reply = replyLogs[c.id];
                  const broken = isPromiseBroken(c.id);
                  const nudgeMsg = broken ? getPromiseNudgeMsg(c) : "";
                  return (
                    <tr key={c.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-row-in">
                      <td className="px-5 py-3.5">
                        <input type="checkbox" className="accent-accent"
                          checked={selected.includes(c.id)}
                          onChange={() => setSelected((s) => s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-primary text-xs">{c.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <p className="text-2xs text-muted">{c.industry} · {c.contact}</p>
                              {/* Feature 2: Reply intent badge */}
                              {reply && (
                                <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${reply.color}20`, color: reply.color }}>
                                  {reply.label}
                                </span>
                              )}
                              {/* Feature 3: Promise broken badge */}
                              {broken && (
                                <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-danger/15 text-danger">
                                  ⚠️ Promise Broken
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="metric-value text-sm text-primary">{fmt(c.outstanding)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                        <Badge variant={c.daysOverdue > 45 ? "danger" : c.daysOverdue > 30 ? "warning" : "default"}>
                          {c.daysOverdue}d
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${c.score}%`, background: SCORE_COLOR(c.score) }} />
                          </div>
                          <span className="metric-value text-xs font-semibold" style={{ color: SCORE_COLOR(c.score) }}>
                            {c.score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                        <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-muted hidden xl:table-cell">{c.lastContact}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          {/* Feature 3: Promise broken → WA nudge button */}
                          {broken ? (
                            <a
                              href={`https://wa.me/91${c.contact}?text=${encodeURIComponent(nudgeMsg)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-2xs font-bold rounded-lg bg-danger/15 text-danger border border-danger/30 hover:bg-danger hover:text-white transition-all">
                              ⚠️ Nudge
                            </a>
                          ) : (
                            <a href={`https://wa.me/91${c.contact}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold rounded-lg bg-success-dim text-success border border-success/25 hover:bg-success hover:text-white transition-all">
                              <FiMessageSquare size={11} />
                              <span className="hidden sm:inline">WA</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleMarkPaid(c)}
                            disabled={markingPaid === c.id}
                            title="Mark as Paid"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-success hover:text-white hover:border-success transition-all disabled:opacity-50">
                            {markingPaid === c.id ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <FiCheckSquare size={11} />}
                          </button>
                          <button
                            onClick={() => { setLogModal(c); setCallForm({ did_pick_up: true, promised_date: "", notes: "" }); }}
                            title="Log Call"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-accent hover:text-white hover:border-accent transition-all">
                            <FiPhone size={11} />
                          </button>
                          {/* Feature 2: Log Reply button */}
                          <button
                            onClick={() => { setReplyModal(c); setReplyText(""); }}
                            title="Log customer reply"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
                            <FiMessageCircle size={11} />
                          </button>
                          <button onClick={() => handlePayLink(c)}
                            disabled={payLinkLoading === (invoiceIds[c.id] ?? `demo-${c.id}`)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success-dim border border-success/20 text-success text-2xs font-bold hover:bg-success hover:text-white transition-all disabled:opacity-50">
                            {payLinkLoading === (invoiceIds[c.id] ?? `demo-${c.id}`) ? <span className="w-3 h-3 border border-success border-t-transparent rounded-full animate-spin" /> : "₹"} Pay Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="py-16 text-center">
              <FiSearch size={28} className="mx-auto mb-3 text-muted opacity-50" />
              <p className="text-sm text-secondary">No customers match your filters.</p>
              <button onClick={() => { setSearch(""); setFilter("all"); setIndustry("all"); }}
                className="mt-3 text-xs text-accent hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Feature 5: Import modal with Tally guide ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-1 border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-primary">Import Excel / CSV</p>
              <button onClick={() => { setShowImport(false); setImportMsg(""); setShowTallyGuide(false); }} className="text-muted hover:text-primary">
                <FiX size={16} />
              </button>
            </div>
            <div
              onClick={() => importFileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 hover:bg-surface-2 transition-all">
              {importing
                ? <><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-muted">Importing...</p></>
                : <><FiUpload size={22} className="mx-auto mb-2 text-muted" /><p className="text-sm font-semibold text-primary mb-1">Drop Excel or CSV here</p><p className="text-xs text-muted">Columns: Customer Name, Amount, Date, Phone</p></>
              }
              <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
            </div>

            {/* Tally Guide toggle */}
            <button onClick={() => setShowTallyGuide(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-border hover:border-accent/30 transition-all text-left">
              <div className="flex items-center gap-2">
                <span className="text-base">🏦</span>
                <div>
                  <p className="text-xs font-bold text-primary">Using Tally? Export in 3 steps</p>
                  <p className="text-2xs text-muted">Tally Prime / ERP 9 → Outstanding Reports</p>
                </div>
              </div>
              <span className="text-muted text-xs">{showTallyGuide ? "▲" : "▼"}</span>
            </button>

            {showTallyGuide && (
              <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-3">
                <p className="text-xs font-bold text-accent uppercase tracking-wider">Tally Export Guide</p>
                {[
                  { step: "1", icon: "📂", title: "Go to Reports", desc: "Gateway → Display → Statements of Accounts → Outstandings → Receivables" },
                  { step: "2", icon: "📊", title: "Export to Excel", desc: "Set date range to current. Press Alt+E or click Export button. Choose Excel format." },
                  { step: "3", icon: "⬆️", title: "Upload above", desc: "Drop that Excel file in the box above. Vantro auto-detects columns — no formatting needed." },
                ].map(({ step, icon, title, desc }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-2xs font-black text-accent">{step}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">{icon} {title}</p>
                      <p className="text-2xs text-muted mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
                <div className="p-2.5 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-2xs text-warning font-medium">💡 Tip: "Ledger Outstanding" report works best. Any format is accepted — Vantro reads it all.</p>
                </div>
              </div>
            )}

            {importMsg && (
              <p className={`text-sm text-center font-medium ${importMsg.includes("success") ? "text-success" : "text-danger"}`}>{importMsg}</p>
            )}
            <p className="text-2xs text-muted text-center">Works with Tally exports, Excel sheets, any CSV format</p>
          </div>
        </div>
      )}

      {/* Pay Link modal */}
      {payLinkMsg && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-1 border border-border rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-primary">WhatsApp Payment Request</p>
              <button onClick={() => setPayLinkMsg(null)} className="text-muted hover:text-primary"><FiX size={16} /></button>
            </div>
            <div className="p-3 bg-[#128C7E]/10 border border-[#128C7E]/30 rounded-xl">
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{payLinkMsg.text}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(payLinkMsg.text).then(() => setPayLinkMsg(null))}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-surface-2 border border-border text-secondary text-xs font-bold hover:text-primary transition-all">
                <FiCopy size={12} /> Copy Message
              </button>
              {payLinkMsg.phone && (
                <a href={`https://wa.me/91${payLinkMsg.phone}?text=${encodeURIComponent(payLinkMsg.text)}`}
                  target="_blank" rel="noopener noreferrer" onClick={() => setPayLinkMsg(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-all">
                  <FiMessageSquare size={12} /> Send on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

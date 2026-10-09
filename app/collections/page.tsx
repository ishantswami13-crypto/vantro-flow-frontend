"use client";

// Collections: every unpaid invoice, oldest first, with the next step for
// each one (remind, log a call, log a reply, mark paid). Reminders keep the
// server's own gating: when WhatsApp is not set up for this workspace the
// server says so and the message opens for the owner to send by hand.

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type Invoice, authHeaders } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { generateWhatsAppPaymentLink } from "@/lib/paymentLink";
import { inrWhole, formatDate, formatRelative, formatCount } from "@/lib/format";
import { PageHeader, Subnav, SearchField, SkeletonRows } from "@/components/v32/ui";
import { IconInfo, IconRupee, IconUpload } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { MorePage, FigureRow, GridTable, SortHeader, RowMenu, Field, OFFLINE_TEXT, moreStyles as s, type Column } from "@/components/more/ui";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const CACHE_KEY = "vantro_collections_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface Row {
  id: number;
  name: string;
  contact: string;
  outstanding: number;
  daysOverdue: number;
  invoiceDate?: string;
  dueDate?: string;
  invoiceNumber?: string;
  invoiceId?: string;
  paymentLink?: string;
  lastReminderSent?: string;
  reminderCount?: number;
}

type Intent = "promised" | "uncertain" | "paid" | "no_response";
interface ReplyLog { intent: Intent; label: string; text: string; date: string }
interface PromiseRecord { date: string; amount: number; name: string }

const INTENT_TONE: Record<Intent, StatusTone> = { paid: "positive", promised: "attention", uncertain: "critical", no_response: "unknown" };

function classifyIntent(text: string): ReplyLog {
  const t = text.toLowerCase();
  const date = new Date().toISOString();
  if (!t.trim()) return { intent: "no_response", label: "No reply", text, date };
  const paidKw = ["paid", "kar diya", "bhej diya", "done", "ho gaya", "send kar", "transferred", "upi kar", "payment kiya", "de diya", "diya"];
  const promisedKw = ["kal", "parso", "pakka", "promise", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "next week", "agli", "agle", "de dunga", "dunga", "sure", "zaroor", "confirm", "by", "tak", "shaam tak", "dopahar", "subah"];
  if (paidKw.some(k => t.includes(k))) return { intent: "paid", label: "Says paid", text, date };
  if (promisedKw.some(k => t.includes(k))) return { intent: "promised", label: "Promised", text, date };
  return { intent: "uncertain", label: "Uncertain", text, date };
}

const RISK: Record<string, { label: string; tone: StatusTone }> = {
  HIGH_RISK: { label: "High risk", tone: "critical" },
  MEDIUM: { label: "Medium risk", tone: "attention" },
  LOW: { label: "Low risk", tone: "neutral" },
};

type Bucket = "all" | "today" | "d1_7" | "d8_30" | "d31_60" | "d60";
const BUCKETS: { key: Bucket; label: string; test: (d: number) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "today", label: "Not overdue", test: d => d <= 0 },
  { key: "d1_7", label: "1–7 days", test: d => d >= 1 && d <= 7 },
  { key: "d8_30", label: "8–30 days", test: d => d >= 8 && d <= 30 },
  { key: "d31_60", label: "31–60 days", test: d => d >= 31 && d <= 60 },
  { key: "d60", label: "Over 60 days", test: d => d > 60 },
];

type SortKey = "outstanding" | "daysOverdue";

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function lateText(d: number): string {
  if (d <= 0) return "Not overdue";
  return `${formatCount(d)} day${d === 1 ? "" : "s"} late`;
}

const today = () => new Date().toISOString().split("T")[0];
const emptyAdd = () => ({ customer_name: "", customer_phone: "", invoice_amount: "", invoice_date: today(), invoice_number: "", notes: "" });

export default function CollectionsPage() {
  const router = useRouter();
  const notify = useToast();
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState<SortKey>("daysOverdue");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [bucket, setBucket]           = useState<Bucket>("all");
  const [liveData, setLiveData]       = useState<Row[] | null>(null);
  const [loadError, setLoadError]     = useState(false);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [uploading, setUploading]     = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);
  const [logModal, setLogModal]       = useState<Row | null>(null);
  const [callForm, setCallForm]       = useState({ did_pick_up: true, promised_date: "", notes: "" });
  const [loggingCall, setLoggingCall] = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importMsg, setImportMsg]     = useState<{ ok: boolean; text: string } | null>(null);
  const [showImport, setShowImport]   = useState(false);
  // Deep link from Sources/onboarding: /collections?import=1 opens the importer.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("import") === "1") setShowImport(true);
  }, []);
  const [showTallyGuide, setShowTallyGuide] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Reply logger
  const [replyModal, setReplyModal]   = useState<Row | null>(null);
  const [replyText, setReplyText]     = useState("");
  const [replyLogs, setReplyLogs]     = useState<Record<number, ReplyLog>>({});
  const [savingReply, setSavingReply] = useState(false);

  // Promise tracker
  const [promises, setPromises]       = useState<Record<number, PromiseRecord>>({});

  // One-click reminder state
  const [reminderState, setReminderState] = useState<Record<string, "loading" | "sent">>({});
  const [manualModal, setManualModal] = useState<{ text: string; phone?: string } | null>(null);

  // Bulk remind
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Cortex customer risk scores
  const [scoreMap, setScoreMap] = useState<Record<string, { customer_id: string; score: number; tier: string; overdue_amount: number }>>({});
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // Add invoice
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [addForm, setAddForm] = useState(emptyAdd);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError]   = useState("");
  const [agingSummary, setAgingSummary] = useState<{
    total_outstanding: number;
    total_customers: number;
    most_overdue_days: number;
    buckets: { due_today: number; overdue_1_7: number; overdue_8_30: number; overdue_31_60: number; overdue_60_plus: number };
  } | null>(null);

  const mapInvoices = (invoices: Invoice[]): Row[] =>
    invoices.map((inv, i) => ({
      id: i + 1,
      name: inv.customer_name,
      contact: inv.customer_phone || "",
      outstanding: inv.invoice_amount,
      daysOverdue: inv.days_overdue,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      invoiceNumber: inv.invoice_number,
      invoiceId: inv.id,
      paymentLink: inv.payment_link,
      lastReminderSent: inv.last_reminder_sent,
      reminderCount: inv.reminder_count,
    }));

  const loadInvoices = useCallback((userId: string) => {
    // Seed from cache immediately so the list appears instantly
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setLiveData(data);
          setCacheAge(Math.round((Date.now() - ts) / 60000));
        }
      }
    } catch {}

    api.invoices.list(userId).then(d => {
      const pending = (d.invoices || []).filter((inv: Invoice) => inv.payment_status === "Pending");
      const mapped = mapInvoices(pending);
      setLiveData(mapped);
      setLoadError(false);
      setCacheAge(null);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: mapped, ts: Date.now() })); } catch {}
    }).catch(() => {
      // Offline: the cache above (if any) stays on screen; otherwise say so.
      setLoadError(true);
    });
  }, []);

  const refreshSummary = useCallback((userId: string) => {
    api.collections.summary(userId).then(d => {
      if (d.success && d.summary) setAgingSummary(d.summary);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user?.id) return;
    loadInvoices(user.id);
    refreshSummary(user.id);
    // Auto-poll every 30s: picks up Razorpay webhook-triggered status changes
    const interval = setInterval(() => {
      loadInvoices(user.id);
      refreshSummary(user.id);
    }, 30_000);

    fetch(`${BASE}/api/customer-scores`, { headers: { ...authHeaders() }, credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.scores) return;
        const map: Record<string, { customer_id: string; score: number; tier: string; overdue_amount: number }> = {};
        d.scores.forEach((sc: { customer_name: string; customer_id: string; score: number; tier: string; overdue_amount: number }) => { map[sc.customer_name] = sc; });
        setScoreMap(map);
      }).catch(() => {});

    return () => clearInterval(interval);
  }, [loadInvoices, refreshSummary]);

  const retry = () => {
    const user = getUser();
    if (!user?.id) return;
    setLoadError(false);
    loadInvoices(user.id);
    refreshSummary(user.id);
  };

  // One-click send reminder
  const handleSendReminder = async (c: Row) => {
    if (!c.invoiceId) {
      // No invoice id (cached demo row): open the message for the owner to send.
      const user = (() => { try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; } })();
      const text = generateWhatsAppPaymentLink({
        upiId: user.upi_id || "demo@upi",
        payeeName: user.business_name || "Demo",
        amount: c.outstanding,
        note: `Invoice from ${user.business_name || "Demo"}`,
        customerPhone: c.contact,
        customerName: c.name.split(" ")[0],
      });
      const msgMatch = text.match(/\?text=(.+)/);
      setManualModal({ text: msgMatch ? decodeURIComponent(msgMatch[1]) : text, phone: c.contact });
      return;
    }

    const key = c.invoiceId;
    setReminderState(st => ({ ...st, [key]: "loading" }));
    try {
      const result = await api.collections.sendReminder(c.invoiceId);
      if (result.auto_sent) {
        setReminderState(st => ({ ...st, [key]: "sent" }));
        posthog.capture("reminder_auto_sent", { provider: result.provider });
        notify(`Reminder sent to ${c.name}`, "positive");
        const user = getUser();
        if (user?.id) { loadInvoices(user.id); refreshSummary(user.id); }
        setTimeout(() => setReminderState(st => { const n = { ...st }; delete n[key]; return n; }), 4000);
      } else {
        // WhatsApp not configured: the owner sends the prepared message by hand.
        setReminderState(st => { const n = { ...st }; delete n[key]; return n; });
        setManualModal({ text: result.whatsapp_text, phone: result.phone || c.contact });
        posthog.capture("reminder_manual_fallback");
      }
    } catch {
      setReminderState(st => { const n = { ...st }; delete n[key]; return n; });
      notify("Couldn't send the reminder. Check your connection and try again.", "critical");
    }
  };

  const handleBulkRemind = async () => {
    setBulkLoading(true);
    try {
      const result = await api.collections.bulkRemind(1, "friendly");
      posthog.capture("bulk_remind", { sent: result.sent, total: result.total });
      notify(`${formatCount(result.sent)} of ${formatCount(result.total)} reminders sent`, "positive");
      setBulkConfirm(false);
      const user = getUser();
      if (user?.id) loadInvoices(user.id);
    } catch {
      notify("Couldn't send reminders. Check your connection and try again.", "critical");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMarkPaid = async (c: Row) => {
    if (!c.invoiceId) return;
    setMarkingPaid(c.id);
    try {
      await api.invoices.markPaid(c.invoiceId, { payment_date: today(), payment_method: "manual" });
      posthog.capture("invoice_marked_paid");
      notify(<span><b style={{ fontWeight: 500 }}>{c.name}</b> paid {inrWhole(c.outstanding)}. Marked as received.</span>, "positive");
      const user = getUser();
      if (user?.id) { loadInvoices(user.id); refreshSummary(user.id); }
    } catch {
      notify("Couldn't mark this invoice as paid. Try again.", "critical");
    } finally { setMarkingPaid(null); }
  };

  const handleUpload = async (file: File) => {
    const user = getUser();
    if (!user?.id) return;
    setUploading(true);
    try {
      const res = await api.invoices.upload(user.id, file);
      if (res.error) throw new Error(res.error);
      notify(`${formatCount(res.count)} invoices uploaded`, "positive");
      posthog.capture("csv_uploaded", { invoice_count: res.count });
      setShowImport(false);
      loadInvoices(user.id);
      refreshSummary(user.id);
    } catch {
      notify("That CSV couldn't be read. Check the columns and try again.", "critical");
    } finally { setUploading(false); }
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
        invoice_id: logModal.invoiceId || null,
      });
      posthog.capture("call_logged", { did_pick_up: callForm.did_pick_up, has_promise: !!callForm.promised_date });
      if (callForm.promised_date && logModal) {
        setPromises(prev => ({ ...prev, [logModal.id]: { date: callForm.promised_date, amount: logModal.outstanding, name: logModal.name } }));
        // Also save to Cortex promises table if customer is scored
        const cortexCustomer = scoreMap[logModal.name];
        if (cortexCustomer?.customer_id) {
          fetch(`${BASE}/api/promises`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({
              customer_id:    cortexCustomer.customer_id,
              receivable_id:  logModal.invoiceId || null,
              promised_amount: logModal.outstanding,
              promised_date:  callForm.promised_date,
              promise_note:   callForm.notes || "Logged via call",
            }),
          }).catch(() => {});
        }
      }
      notify("Call logged", "positive");
      setLogModal(null);
      setCallForm({ did_pick_up: true, promised_date: "", notes: "" });
    } catch {
      notify("Couldn't save the call. Try again.", "critical");
    } finally { setLoggingCall(false); }
  };

  // Persists a classified reply the same way a call is logged (api.calls.log),
  // so it survives a refresh. did_pick_up is true: the customer did respond.
  const persistReply = useCallback(async (customer: Row, log: ReplyLog) => {
    const user = getUser();
    setReplyLogs(prev => ({ ...prev, [customer.id]: log }));
    posthog.capture("reply_logged", { intent: log.intent });
    if (user?.id) {
      try {
        await api.calls.log({
          user_id: user.id,
          customer_name: customer.name,
          customer_phone: customer.contact,
          amount: customer.outstanding,
          did_pick_up: true,
          promised_payment_date: null,
          notes: log.text ? `[${log.label}] ${log.text}` : `[${log.label}]`,
          invoice_id: customer.invoiceId || null,
        });
      } catch { /* the chip is already shown; a retry isn't worth blocking on */ }
    }
    setReplyModal(null);
    setReplyText("");
  }, []);

  const handleLogReply = useCallback(async () => {
    if (!replyModal || !replyText.trim()) return;
    setSavingReply(true);
    try { await persistReply(replyModal, classifyIntent(replyText)); }
    finally { setSavingReply(false); }
  }, [replyModal, replyText, persistReply]);

  const getPromiseNudgeMsg = (c: Row) => {
    const p = promises[c.id];
    if (!p) return "";
    return `${c.name.split(" ")[0]} bhai, aapne ${formatDate(p.date)} ko payment ka promise kiya tha — ${inrWhole(p.amount)} abhi tak nahi aaya. Kya aaj settle kar sakte hain?`;
  };
  const isPromiseBroken = (id: number) => {
    const p = promises[id];
    return p ? new Date(p.date) < new Date(new Date().toDateString()) : false;
  };

  const handleImportFile = async (file: File) => {
    if (!file) return;
    setImporting(true); setImportMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${BASE}/api/import/excel`, { method: "POST", headers: { ...authHeaders() }, credentials: "include", body: form });
      const d = await r.json();
      if (d.success) {
        setImportMsg({ ok: true, text: `${formatCount(d.imported)} invoices imported.` });
        const user = getUser(); if (user?.id) { loadInvoices(user.id); refreshSummary(user.id); }
        setTimeout(() => { setShowImport(false); setImportMsg(null); }, 1600);
      } else {
        setImportMsg({ ok: false, text: d.hint ? `That file couldn't be imported. ${d.hint}` : "That file couldn't be imported. Check that it has customer, amount and date columns." });
      }
    } catch { setImportMsg({ ok: false, text: OFFLINE_TEXT }); }
    finally { setImporting(false); }
  };

  const handleAddInvoice = async () => {
    const user = getUser();
    if (!user?.id) return;
    if (!addForm.customer_name.trim()) { setAddError("Enter the customer's name."); return; }
    const amount = parseFloat(addForm.invoice_amount);
    if (isNaN(amount) || amount <= 0) { setAddError("Enter an amount above zero."); return; }
    setAddSaving(true); setAddError("");
    try {
      await api.invoices.create({
        customer_name: addForm.customer_name.trim(),
        customer_phone: addForm.customer_phone.trim() || undefined,
        invoice_amount: amount,
        invoice_date: addForm.invoice_date,
        invoice_number: addForm.invoice_number.trim() || undefined,
        notes: addForm.notes.trim() || undefined,
      });
      posthog.capture("invoice_added_manually");
      notify(`Invoice for ${inrWhole(amount)} added`, "positive");
      setShowAddInvoice(false);
      setAddForm(emptyAdd());
      loadInvoices(user.id);
      refreshSummary(user.id);
    } catch {
      setAddError("Couldn't save the invoice. Check your connection and try again.");
    } finally {
      setAddSaving(false);
    }
  };

  const tableData = useMemo(() => liveData ?? [], [liveData]);
  const counts = useMemo(() => {
    const m = {} as Record<Bucket, number>;
    BUCKETS.forEach(b => { m[b.key] = tableData.filter(c => b.test(c.daysOverdue)).length; });
    return m;
  }, [tableData]);
  const rows = useMemo(() => {
    const test = BUCKETS.find(b => b.key === bucket)!.test;
    const q = search.trim().toLowerCase();
    let r = tableData.filter(c => test(c.daysOverdue));
    if (q) r = r.filter(c => c.name.toLowerCase().includes(q) || c.contact.includes(q) || (c.invoiceNumber || "").toLowerCase().includes(q));
    return [...r].sort((a, b) => {
      const d = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -d : d;
    });
  }, [search, sortKey, sortDir, bucket, tableData]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  // Headline figures: the backend's aging summary when it has answered,
  // otherwise the same sums from the invoices on screen.
  const figures = useMemo(() => {
    const sum = (f: (c: Row) => boolean) => tableData.filter(f).reduce((a, c) => a + c.outstanding, 0);
    const overdueRows = tableData.filter(c => c.daysOverdue > 0);
    const over60Rows = tableData.filter(c => c.daysOverdue > 60);
    const b = agingSummary?.buckets;
    return {
      total: agingSummary ? agingSummary.total_outstanding : sum(() => true),
      overdue: b ? b.overdue_1_7 + b.overdue_8_30 + b.overdue_31_60 + b.overdue_60_plus : sum(c => c.daysOverdue > 0),
      overdueCount: overdueRows.length,
      over60: b ? b.overdue_60_plus : sum(c => c.daysOverdue > 60),
      over60Count: over60Rows.length,
      dueToday: b ? b.due_today : sum(c => c.daysOverdue <= 0),
      dueTodayCount: tableData.filter(c => c.daysOverdue <= 0).length,
    };
  }, [tableData, agingSummary]);

  const overdueCount = figures.overdueCount;

  const columns: Column<Row>[] = [
    {
      key: "customer", header: "Customer", width: "minmax(0, 1.7fr)",
      render: c => {
        const reply = replyLogs[c.id];
        const promise = promises[c.id];
        const broken = isPromiseBroken(c.id);
        return (
          <div className="min-w-0">
            <div className={s.name} title={c.name}>{c.name}</div>
            <div className={s.sub}>
              <span className={s.smOnly}>{lateText(c.daysOverdue)}</span>
              <span className={s.mdUp}>{c.invoiceNumber || c.contact || (c.invoiceDate ? `Raised ${formatDate(c.invoiceDate)}` : "")}</span>
              {reply && <StatusChip tone={INTENT_TONE[reply.intent]}>{reply.label}</StatusChip>}
              {broken
                ? <StatusChip tone="critical">Promise broken</StatusChip>
                : promise && <StatusChip tone="attention">Promised {formatDate(promise.date)}</StatusChip>}
            </div>
          </div>
        );
      },
    },
    {
      key: "amount", header: <SortHeader label="Outstanding" active={sortKey === "outstanding"} dir={sortDir} onClick={() => toggleSort("outstanding")} />,
      width: "130px", widthSm: "auto", align: "right",
      render: c => <span className={s.amount}>{inrWhole(c.outstanding)}</span>,
    },
    {
      key: "late", header: <SortHeader label="Days late" active={sortKey === "daysOverdue"} dir={sortDir} onClick={() => toggleSort("daysOverdue")} />,
      width: "96px", align: "right", hide: "sm",
      render: c => c.daysOverdue <= 0
        ? <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--ink-2)" }}>Not overdue</span>
        : <span style={{ color: c.daysOverdue > 60 ? "var(--ink)" : "var(--body)" }}>{formatCount(c.daysOverdue)}</span>,
    },
    {
      key: "risk", header: "Risk", width: "118px", hide: "sm",
      render: c => {
        const r = scoreMap[c.name] && RISK[scoreMap[c.name].tier];
        return r ? <StatusChip tone={r.tone} className="chip-quiet" title={`Risk score ${scoreMap[c.name].score} of 100`}>{r.label}</StatusChip> : <span className={s.muted}>Not scored</span>;
      },
    },
    {
      key: "reminded", header: "Last reminder", width: "112px", hide: "md",
      render: c => {
        const rState = reminderState[c.invoiceId || ""];
        if (rState === "sent") return <span style={{ color: "var(--positive)" }}>Just now</span>;
        return c.lastReminderSent ? <span>{cap(formatRelative(c.lastReminderSent))}</span> : <span className={s.muted}>Never</span>;
      },
    },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, width: "128px", widthSm: "36px", align: "right",
      render: c => {
        const rState = reminderState[c.invoiceId || ""];
        const broken = isPromiseBroken(c.id);
        const phone = c.contact.replace(/\D/g, "");
        return (
          <div className={s.actions}>
            <span className={`${s.mdUp} ${s.hoverAction}`} data-busy={rState ? "" : undefined}>
              <Button variant="ghost" size="sm" loading={rState === "loading"} disabled={rState === "sent"} onClick={() => handleSendReminder(c)}
                title={c.lastReminderSent ? `Last reminded ${formatRelative(c.lastReminderSent)}` : "Send a payment reminder with a payment link"}>
                {rState === "sent" ? "Sent" : "Send reminder"}
              </Button>
            </span>
            <RowMenu label={`More actions for ${c.name}`} items={[
              { label: rState === "sent" ? "Reminder sent" : "Send reminder", onSelect: () => handleSendReminder(c), disabled: rState === "sent" || rState === "loading" },
              { label: "Log a call", onSelect: () => { setLogModal(c); setCallForm({ did_pick_up: true, promised_date: "", notes: "" }); } },
              { label: "Log their reply", onSelect: () => { setReplyModal(c); setReplyText(""); } },
              ...(broken && phone ? [{ label: "Nudge about broken promise", href: `https://wa.me/91${phone}?text=${encodeURIComponent(getPromiseNudgeMsg(c))}`, external: true }] : []),
              ...(phone ? [{ label: "Open WhatsApp chat", href: `https://wa.me/91${phone}`, external: true }] : []),
              ...(c.invoiceId ? [{ label: "View invoice", onSelect: () => router.push(`/invoice/${c.invoiceId}`) }] : []),
              ...(c.invoiceId ? [{ label: markingPaid === c.id ? "Marking as paid…" : "Mark as paid", onSelect: () => handleMarkPaid(c), disabled: markingPaid === c.id, separatorBefore: true }] : []),
            ]} />
          </div>
        );
      },
    },
  ];

  const openAdd = () => { setShowAddInvoice(true); setAddError(""); };
  const loading = liveData === null && !loadError;

  return (
    <DashboardLayout pageTitle="Collections">
      <MorePage>
        <PageHeader
          title="Collections"
          subtitle="Who owes you, how late they are, and the next step for each."
          right={
            <>
              <Button variant="ghost" icon={<IconUpload size={14} />} onClick={() => setShowImport(true)}>Import</Button>
              {overdueCount > 0 && <Button variant="secondary" onClick={() => setBulkConfirm(true)}>Remind all overdue</Button>}
              <Button variant="primary" onClick={openAdd}>Add invoice</Button>
            </>
          }
        />

        {cacheAge !== null && (
          <div className={s.notice} role="status">
            <IconInfo size={15} />
            <span>You&apos;re offline. Showing invoices saved {cacheAge === 0 ? "just now" : `${cacheAge} min ago`}; they refresh when you reconnect.</span>
          </div>
        )}

        {loading && (
          <>
            <div className="flex" style={{ gap: 48 }} aria-hidden="true">
              {[0, 1, 2, 3].map(i => <div key={i}><div className="skeleton" style={{ height: 26, width: 120, marginBottom: 8 }} /><div className="skeleton" style={{ height: 10, width: 80 }} /></div>)}
            </div>
            <div className={s.panel}><SkeletonRows rows={6} height={50} /></div>
          </>
        )}

        {liveData === null && loadError && (
          <div className={s.panel}>
            <ErrorState title="Couldn't load your invoices" message={OFFLINE_TEXT} onRetry={retry} />
          </div>
        )}

        {liveData !== null && tableData.length === 0 && (
          <div className={s.panel}>
            <EmptyState
              icon={<IconRupee size={17} />}
              title="No unpaid invoices"
              message="Nobody owes you money right now. When they do, they show up here, most overdue first. Add an invoice or import your Tally outstanding report."
              action={<div className="flex gap-2 justify-center flex-wrap"><Button variant="primary" onClick={openAdd}>Add invoice</Button><Button variant="secondary" onClick={() => setShowImport(true)}>Import</Button></div>}
            />
          </div>
        )}

        {tableData.length > 0 && (
          <>
            <FigureRow lead={0} items={[
              { label: "Outstanding", value: inrWhole(figures.total), note: `${formatCount(tableData.length)} unpaid invoice${tableData.length === 1 ? "" : "s"}` },
              { label: "Overdue", value: inrWhole(figures.overdue), note: `${formatCount(figures.overdueCount)} past due date` },
              { label: "Over 60 days late", value: inrWhole(figures.over60), note: figures.over60Count ? `${formatCount(figures.over60Count)} to chase first` : "None" },
              { label: "Not overdue yet", value: inrWhole(figures.dueToday), note: `${formatCount(figures.dueTodayCount)} invoice${figures.dueTodayCount === 1 ? "" : "s"}` },
            ]} />

            <div className={s.stack}>
              <Subnav
                label="Filter by how late"
                active={bucket}
                onChange={k => setBucket(k as Bucket)}
                items={BUCKETS.map(b => ({ key: b.key, label: b.label, count: counts[b.key] }))}
              />
              <div className={s.toolbar} style={{ marginTop: 8 }}>
                <SearchField id="collections-search" value={search} onChange={setSearch} placeholder="Search customer, phone or invoice" />
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {formatCount(rows.length)} shown · {sortKey === "daysOverdue" ? (sortDir === "desc" ? "most late first" : "least late first") : (sortDir === "desc" ? "largest first" : "smallest first")}
                </span>
              </div>
            </div>

            <div className={s.panel}>
              {rows.length > 0 ? (
                <GridTable label="Unpaid invoices" columns={columns} rows={rows} rowKey={c => c.invoiceId || `row-${c.id}`} />
              ) : (
                <EmptyState
                  title="No invoices match"
                  message={search ? `Nothing matches “${search}” in this view.` : "No invoices fall in this range."}
                  action={<Button variant="secondary" size="sm" onClick={() => { setSearch(""); setBucket("all"); }}>Show all invoices</Button>}
                />
              )}
            </div>
          </>
        )}
      </MorePage>

      {/* Bulk remind confirmation */}
      <Modal
        open={bulkConfirm}
        onClose={() => !bulkLoading && setBulkConfirm(false)}
        title="Remind every overdue customer?"
        description={`A friendly payment reminder goes to the ${formatCount(overdueCount)} customer${overdueCount === 1 ? "" : "s"} with an overdue invoice, using the reminder settings for this workspace.`}
        footer={<>
          <Button variant="ghost" onClick={() => setBulkConfirm(false)} disabled={bulkLoading}>Cancel</Button>
          <Button variant="primary" loading={bulkLoading} onClick={handleBulkRemind}>Send {formatCount(overdueCount)} reminder{overdueCount === 1 ? "" : "s"}</Button>
        </>}
      />

      {/* Log reply */}
      <Modal
        open={!!replyModal}
        onClose={() => { setReplyModal(null); setReplyText(""); }}
        title="Log their reply"
        description={replyModal?.name}
        footer={<>
          <Button variant="ghost" disabled={savingReply}
            onClick={() => replyModal && persistReply(replyModal, { intent: "no_response", label: "No reply", text: "", date: new Date().toISOString() })}>
            They didn&apos;t reply
          </Button>
          <Button variant="primary" onClick={handleLogReply} disabled={!replyText.trim()} loading={savingReply}>Save reply</Button>
        </>}
      >
        <div className={s.form}>
          <Field label="What did they say?" htmlFor="reply-text">
            <textarea id="reply-text" className="ui-input" rows={3} value={replyText} onChange={e => setReplyText(e.target.value)}
              placeholder={'e.g. "Kal pakka de dunga bhai"'} />
          </Field>
          {replyText.trim() && (() => {
            const preview = classifyIntent(replyText);
            return (
              <div className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: "var(--ink-2)" }}>
                Reads as <StatusChip tone={INTENT_TONE[preview.intent]}>{preview.label}</StatusChip>
                <span style={{ color: "var(--ink-3)" }}>from keywords in the reply</span>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Log call */}
      <Modal
        open={!!logModal}
        onClose={() => setLogModal(null)}
        title="Log a call"
        description={logModal ? `${logModal.name} · ${inrWhole(logModal.outstanding)} outstanding` : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => setLogModal(null)}>Cancel</Button>
          <Button variant="primary" loading={loggingCall} onClick={handleLogCall}>Save call</Button>
        </>}
      >
        <div className={s.form}>
          <div className={s.field}>
            <span className={s.fieldLabel} id="pickup-label">Did they pick up?</span>
            <div className={s.segmented} role="group" aria-labelledby="pickup-label" style={{ alignSelf: "flex-start" }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" aria-pressed={callForm.did_pick_up === v} onClick={() => setCallForm(f => ({ ...f, did_pick_up: v }))}>
                  {v ? "Picked up" : "No answer"}
                </button>
              ))}
            </div>
          </div>
          {callForm.did_pick_up && (
            <Field label="Promised payment date" htmlFor="promise-date">
              <input id="promise-date" type="date" className="ui-input" value={callForm.promised_date} onChange={e => setCallForm(f => ({ ...f, promised_date: e.target.value }))} />
              <div className={s.segmented} role="group" aria-label="Quick dates" style={{ alignSelf: "flex-start", marginTop: 2 }}>
                {[{ label: "Kal", days: 1 }, { label: "Parso", days: 2 }, { label: "Is hafte", days: 5 }].map(({ label, days }) => {
                  const d = new Date();
                  d.setDate(d.getDate() + days);
                  const val = d.toISOString().split("T")[0];
                  return <button key={label} type="button" aria-pressed={callForm.promised_date === val} onClick={() => setCallForm(f => ({ ...f, promised_date: val }))}>{label}</button>;
                })}
              </div>
            </Field>
          )}
          <Field label="Notes" htmlFor="call-notes">
            <textarea id="call-notes" className="ui-input" rows={3} value={callForm.notes} onChange={e => setCallForm(f => ({ ...f, notes: e.target.value }))} placeholder="What did they say?" />
          </Field>
        </div>
      </Modal>

      {/* Manual WhatsApp: shown when automatic sending is not set up */}
      <Modal
        open={!!manualModal}
        onClose={() => setManualModal(null)}
        title="Send this reminder on WhatsApp"
        description="Automatic sending isn't set up for this workspace, so the message is ready for you to send."
        footer={<>
          <Button variant={manualModal?.phone ? "secondary" : "primary"} onClick={() => manualModal && navigator.clipboard.writeText(manualModal.text).then(() => { notify("Message copied"); setManualModal(null); })}>Copy message</Button>
          {manualModal?.phone && (
            <a className="ui-btn ui-btn-primary" href={`https://wa.me/91${manualModal.phone}?text=${encodeURIComponent(manualModal.text)}`} target="_blank" rel="noopener noreferrer" onClick={() => setManualModal(null)}>
              Open WhatsApp
            </a>
          )}
        </>}
      >
        <div style={{ padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--body)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {manualModal?.text}
        </div>
      </Modal>

      {/* Add invoice */}
      <Modal
        open={showAddInvoice}
        onClose={() => setShowAddInvoice(false)}
        title="Add invoice"
        description="One invoice, entered by hand. It joins the list straight away."
        width={480}
        footer={<>
          <Button variant="ghost" onClick={() => setShowAddInvoice(false)}>Cancel</Button>
          <Button variant="primary" loading={addSaving} onClick={handleAddInvoice}>Add invoice</Button>
        </>}
      >
        <div className={s.form}>
          <Field label="Customer name" htmlFor="add-name" required>
            <input id="add-name" className="ui-input" data-autofocus value={addForm.customer_name} onChange={e => setAddForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Mehta Fabrics Pvt Ltd" />
          </Field>
          <div className={s.formGrid}>
            <Field label="Amount (₹)" htmlFor="add-amount" required>
              <input id="add-amount" className="ui-input tabular" type="number" min="1" inputMode="decimal" value={addForm.invoice_amount} onChange={e => setAddForm(f => ({ ...f, invoice_amount: e.target.value }))} placeholder="50000" />
            </Field>
            <Field label="Phone" htmlFor="add-phone">
              <input id="add-phone" className="ui-input" type="tel" value={addForm.customer_phone} onChange={e => setAddForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="10-digit mobile" />
            </Field>
            <Field label="Invoice date" htmlFor="add-date" required>
              <input id="add-date" className="ui-input" type="date" value={addForm.invoice_date} onChange={e => setAddForm(f => ({ ...f, invoice_date: e.target.value }))} />
            </Field>
            <Field label="Invoice number" htmlFor="add-number">
              <input id="add-number" className="ui-input" value={addForm.invoice_number} onChange={e => setAddForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" />
            </Field>
          </div>
          <Field label="Notes" htmlFor="add-notes">
            <textarea id="add-notes" className="ui-input" rows={2} value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="What was sold, any context" />
          </Field>
          {addError && <p className={s.formError} role="alert">{addError}</p>}
        </div>
      </Modal>

      {/* Import */}
      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportMsg(null); setShowTallyGuide(false); }}
        title="Import invoices"
        description="An Excel or CSV export from Tally or any sheet. Starlane reads the columns for you."
        footer={<Button variant="ghost" onClick={() => { setShowImport(false); setImportMsg(null); setShowTallyGuide(false); }}>Close</Button>}
      >
        <div className={s.form}>
          <button type="button" className={s.dropzone} onClick={() => importFileRef.current?.click()} disabled={importing}>
            <IconUpload size={18} style={{ color: "var(--ink-2)" }} />
            <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{importing ? "Importing…" : "Choose an Excel or CSV file"}</span>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Customer name, amount, date and phone columns</span>
          </button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />
          {importMsg && <p role="status" style={{ margin: 0, fontSize: 12.5, color: importMsg.ok ? "var(--positive)" : "var(--critical)" }}>{importMsg.text}</p>}

          <div>
            <button type="button" className={s.linkBtn} aria-expanded={showTallyGuide} onClick={() => setShowTallyGuide(v => !v)}>
              Using Tally? Export in three steps
            </button>
            {showTallyGuide && (
              <ol className={s.steps} style={{ marginTop: 10 }}>
                <li><b>Open the report.</b> Gateway, Display, Statements of Accounts, Outstandings, Receivables.</li>
                <li><b>Export to Excel.</b> Set the date range to today, press Alt+E and choose Excel.</li>
                <li><b>Upload it above.</b> The Ledger Outstanding report works best; any layout is accepted.</li>
              </ol>
            )}
          </div>

          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            Or upload a plain CSV with <span style={{ color: "var(--ink)" }}>customer_name, invoice_amount, invoice_date, payment_status</span>.{" "}
            <button type="button" className={s.linkBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "Uploading…" : "Upload CSV"}</button>
            {" · "}
            <a className={s.linkBtn} href="data:text/csv;charset=utf-8,customer_name%2Cinvoice_amount%2Cinvoice_date%2Cpayment_status%0AMehta%20Fabrics%2C840000%2C2025-03-01%2CPending" download="starlane-sample.csv">Sample file</a>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

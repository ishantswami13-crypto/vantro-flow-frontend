"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiCheckCircle, FiClock,
  FiCamera, FiX, FiZap, FiUpload, FiTrendingUp, FiPackage,
} from "react-icons/fi";
import { getToken, getUser } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Sale = {
  id: number;
  customer_name: string;
  customer_phone?: string;
  customer_gstin?: string;
  invoice_number?: string;
  sale_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  status: "paid" | "partial" | "unpaid";
  notes?: string;
  gst_type?: string;
  gst_rate?: number;
  gst_amount?: number;
};

type SaleItem = {
  description: string;
  hsn_sac?: string;
  qty?: number;
  unit?: string;
  price?: number;
  amount?: number;
};

type ScanGst = {
  amount: number;
  rate: string;
  type: string; // "IGST" | "CGST+SGST" | "GST"
  cgst?: number;
  sgst?: number;
  igst?: number;
};

const fmtINR = (n: number) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const statusConfig = {
  paid:    { label: "Paid",    color: "text-success",    bg: "bg-success/10",    icon: FiCheckCircle },
  partial: { label: "Partial", color: "text-yellow-400", bg: "bg-yellow-400/10", icon: FiClock },
  unpaid:  { label: "Unpaid",  color: "text-danger",     bg: "bg-danger/10",     icon: FiAlertCircle },
};

function resizeImage(file: File, maxWidth = 512): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.src = url;
  });
}

export default function SalesPage() {
  const [sales, setSales]               = useState<Sale[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [payModal, setPayModal]         = useState<Sale | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [saving, setSaving]             = useState(false);
  const [mounted, setMounted]           = useState(false);
  const [myGstin, setMyGstin]           = useState("");
  useEffect(() => {
    setMounted(true);
    const u = getUser();
    if (u?.gstin) setMyGstin(u.gstin);
  }, []);

  // Scan / camera states
  const [scanning, setScanning]         = useState(false);
  const [scanPreview, setScanPreview]   = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<SaleItem[]>([]);
  const [scannedGst, setScannedGst]     = useState<ScanGst | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [scanCountdown, setScanCountdown] = useState<number | null>(null);
  const [showCamera, setShowCamera]     = useState(false);
  const [cameraReady, setCameraReady]   = useState(false);

  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Bulk scan states
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkTotal,    setBulkTotal]    = useState(0);
  const [bulkDone,     setBulkDone]     = useState(0);
  const [bulkCurrent,  setBulkCurrent]  = useState("");
  const [bulkResults,  setBulkResults]  = useState<{ added: number; skipped: number; failed: number } | null>(null);
  const [bulkWaiting,  setBulkWaiting]  = useState(false);

  const emptyForm = {
    customer_name: "", customer_phone: "", customer_gstin: "", invoice_number: "",
    sale_date: new Date().toISOString().split("T")[0],
    due_date: "", total_amount: "", paid_amount: "0", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setCameraReady(false);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/sales`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (d.success) setSales(d.sales);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.customer_name || !form.total_amount) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        total_amount:    parseFloat(form.total_amount),
        paid_amount:     parseFloat(form.paid_amount || "0"),
        customer_gstin:  form.customer_gstin || null,
      };
      if (scannedGst) {
        body.gst_type   = scannedGst.type;
        body.gst_rate   = scannedGst.rate;
        body.gst_amount = scannedGst.amount;
        body.cgst_amount = scannedGst.cgst || null;
        body.sgst_amount = scannedGst.sgst || null;
        body.igst_amount = scannedGst.igst || null;
      }
      if (scannedItems.length > 0) body.items = scannedItems;
      const url    = editId ? `${API}/api/sales/${editId}` : `${API}/api/sales`;
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setShowAdd(false); setEditId(null); setForm(emptyForm);
        setScanPreview(null); setScannedItems([]); setScannedGst(null);
        load();
      }
    } finally { setSaving(false); }
  };

  const deleteSale = async (id: number) => {
    if (!confirm("Delete this sale?")) return;
    await fetch(`${API}/api/sales/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
    });
    load();
  };

  const recordPayment = async () => {
    if (!payModal || !payAmount) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/sales/${payModal.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ paid_amount: payModal.paid_amount + parseFloat(payAmount) }),
      });
      if (r.ok) { setPayModal(null); setPayAmount(""); load(); }
    } finally { setSaving(false); }
  };

  const openEdit = (s: Sale) => {
    setForm({
      customer_name: s.customer_name, customer_phone: s.customer_phone || "",
      customer_gstin: s.customer_gstin || "",
      invoice_number: s.invoice_number || "", sale_date: s.sale_date.split("T")[0],
      due_date: s.due_date?.split("T")[0] || "", total_amount: String(s.total_amount),
      paid_amount: String(s.paid_amount), notes: s.notes || "",
    });
    setEditId(s.id); setScanPreview(null); setScannedItems([]); setScannedGst(null);
    setShowAdd(true);
  };

  const closeModal = () => {
    setShowAdd(false); setEditId(null); setForm(emptyForm);
    setScanPreview(null); setScannedItems([]); setScannedGst(null); setScanning(false); setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Bulk Scan ─────────────────────────────────────────────────────
  const bulkCancelRef = useRef(false);

  const handleBulkScan = async (files: FileList) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    bulkCancelRef.current = false;
    setBulkTotal(fileArray.length);
    setBulkDone(0);
    setBulkCurrent("");
    setBulkResults(null);
    setBulkScanning(true);

    let added = 0, skipped = 0, failed = 0;
    const existingNums = new Set(sales.map(s => s.invoice_number).filter(Boolean) as string[]);
    const batchNums    = new Set<string>();

    for (let i = 0; i < fileArray.length; i++) {
      if (bulkCancelRef.current) break;
      setBulkDone(i);
      setBulkCurrent(fileArray[i].name);

      // GROQ free tier: ~3 scans/min with 512px images — 22s gap keeps us safe
      if (i > 0) {
        setBulkWaiting(true);
        await new Promise(r => setTimeout(r, 22000));
        setBulkWaiting(false);
      }
      if (bulkCancelRef.current) break;

      try {
        const { base64, mimeType } = await resizeImage(fileArray[i]);
        const r = await fetch(`${API}/api/sales/scan`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });

        if (r.status === 429) { failed += (fileArray.length - i); break; }  // Stop on rate limit
        if (!r.ok) { failed++; continue; }
        const d = await r.json();
        if (d.error === 'rate_limit') { failed += (fileArray.length - i); break; }
        if (!d.success || !d.data) { failed++; continue; }

        const ex = d.data;
        // Need at least total_amount or invoice_number to be useful
        if (!ex.total_amount && !ex.invoice_number) { failed++; continue; }

        const invNum      = ex.invoice_number || null;
        const customerName = ex.customer_name || ex.party_name || (invNum ? `Invoice ${invNum}` : `Sale ${i + 1}`);

        // Duplicate by invoice_number
        if (invNum && (existingNums.has(invNum) || batchNums.has(invNum))) { skipped++; continue; }

        // Duplicate by amount + date (when no invoice_number)
        if (!invNum && ex.total_amount) {
          const isDupe = sales.some(s =>
            Math.abs(s.total_amount - Number(ex.total_amount)) < 1 &&
            s.sale_date?.slice(0, 10) === (ex.sale_date || "").slice(0, 10)
          );
          if (isDupe) { skipped++; continue; }
        }

        const gstType = ex.cgst_amount ? "CGST+SGST" : ex.igst_amount ? "IGST" : (ex.gst_amount ? "GST" : null);
        const saveR = await fetch(`${API}/api/sales`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name:  customerName,
            customer_gstin: ex.customer_gstin || null,
            invoice_number: invNum,
            sale_date:      ex.sale_date || new Date().toISOString().split("T")[0],
            total_amount:   Number(ex.total_amount) || 0,
            paid_amount:    0,
            notes:          ex.notes || null,
            items:          ex.items?.length > 0 ? ex.items : null,
            gst_type:       gstType,
            gst_rate:       ex.gst_rate || null,
            gst_amount:     ex.gst_amount || null,
            cgst_amount:    ex.cgst_amount || null,
            sgst_amount:    ex.sgst_amount || null,
            igst_amount:    ex.igst_amount || null,
            subtotal:       ex.subtotal || null,
          }),
        });
        if (saveR.ok) {
          added++;
          if (invNum) { existingNums.add(invNum); batchNums.add(invNum); }
        } else { failed++; }
      } catch { failed++; }
    }

    setBulkDone(fileArray.length);
    setBulkScanning(false);
    setBulkResults({ added, skipped, failed });
    if (bulkInputRef.current) bulkInputRef.current.value = "";
    await load();
  };

  // ── Camera ──────────────────────────────────────────────────────
  const isMobile = () => typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

  const openCamera = async () => {
    // On mobile: use native camera app via file input (always fullscreen, most reliable)
    if (isMobile()) {
      if (fileInputRef.current) {
        fileInputRef.current.setAttribute("capture", "environment");
        fileInputRef.current.accept = "image/*";
        fileInputRef.current.click();
      }
      return;
    }
    // Desktop: use in-browser getUserMedia viewfinder
    setShowCamera(true); setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      // Request fullscreen to hide browser chrome
      try {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } catch { /* fullscreen denied — continue without it */ }
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setCameraReady(true)).catch(() => setCameraReady(true));
        }
      }, 80);
    } catch {
      setShowCamera(false);
      fileInputRef.current?.click();
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const video  = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    canvas.toBlob(blob => {
      if (blob) processFile(new File([blob], "invoice-capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.88);
  };

  // ── AI Extraction ────────────────────────────────────────────────
  const processFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    setScannedItems([]); setScannedGst(null); setScanError(null);
    setForm(emptyForm); setEditId(null);
    setScanning(true); setShowAdd(true);

    try {
      const { base64, mimeType } = await resizeImage(file);
      const fetchOpts = {
        method: "POST" as const,
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      };
      let r = await fetch(`${API}/api/sales/scan`, fetchOpts);

      // Auto-retry once on rate limit — 22s countdown then retry
      if (r.status === 429) {
        for (let cd = 22; cd > 0; cd--) {
          setScanCountdown(cd);
          await new Promise(res => setTimeout(res, 1000));
        }
        setScanCountdown(null);
        r = await fetch(`${API}/api/sales/scan`, fetchOpts);
      }

      const d = await r.json();
      console.log('[SCAN DEBUG]', { status: r.status, success: d.success, keys: Object.keys(d.data || {}), _debug: d._debug, error: d.error, details: d.details });

      if (r.status === 429 || d.error === 'rate_limit') {
        setScanError("⚡ AI scan busy. Please wait 1 minute and try again.");
        setScanning(false);
        return;
      }
      if (!r.ok || !d.success) {
        setScanError("AI scan failed. Please fill in manually.");
        setScanning(false);
        return;
      }
      if (d.success && d.data) {
        const ex = d.data;
        const items: SaleItem[] = ex.items || [];

        // Detect GST type
        let gstInfo: ScanGst | null = null;
        if (ex.gst_amount && ex.gst_amount > 0) {
          const igst = ex.igst_amount || (ex.igst_rate ? ex.gst_amount : 0);
          const cgst = ex.cgst_amount || 0;
          const sgst = ex.sgst_amount || 0;
          const gstType = (igst > 0 || ex.igst_rate) ? "IGST"
                        : (cgst > 0 || sgst > 0)      ? "CGST + SGST"
                        : "GST";
          gstInfo = {
            amount: ex.gst_amount,
            rate: ex.gst_rate ? String(ex.gst_rate) : "",
            type: gstType,
            igst: igst || undefined,
            cgst: cgst || undefined,
            sgst: sgst || undefined,
          };
        }
        setScannedGst(gstInfo);

        const itemNotes = items.length > 0
          ? items.map((it: SaleItem) =>
              `${it.qty || 1}${it.unit ? " " + it.unit : ""} ${it.description}${it.price ? " @₹" + Number(it.price).toLocaleString("en-IN") : ""}`
            ).join("; ")
          : (ex.notes || "");
        const gstNote = gstInfo
          ? ` | ${gstInfo.type}${gstInfo.rate ? " @" + gstInfo.rate + "%" : ""}: ₹${Number(gstInfo.amount).toLocaleString("en-IN")}`
          : "";

        // If scan found seller GSTIN and user hasn't set one in settings, use it
        if (ex.seller_gstin && !myGstin) setMyGstin(ex.seller_gstin);

        setScannedItems(items);
        setForm(f => ({
          ...f,
          customer_name:  ex.customer_name  || "",
          customer_gstin: ex.customer_gstin || "",
          invoice_number: ex.invoice_number || "",
          sale_date:      ex.sale_date      || new Date().toISOString().split("T")[0],
          due_date:       ex.due_date       || "",
          total_amount:   ex.total_amount   ? String(ex.total_amount) : "",
          notes:          itemNotes + gstNote,
          paid_amount:    "0",
        }));
      }
    } catch (err) {
      console.error("Sale scan failed:", err);
      setScanError("AI scan failed. Please fill in manually.");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Derived stats ────────────────────────────────────────────────
  const filtered       = filterStatus === "all" ? sales : sales.filter(s => s.status === filterStatus);
  const totalReceivable = sales.filter(s => s.status !== "paid").reduce((sum, s) => sum + (s.total_amount - s.paid_amount), 0);
  const totalRevenue   = sales.reduce((sum, s) => sum + s.total_amount, 0);
  const paidCount      = sales.filter(s => s.status === "paid").length;

  // Top items analysis from notes
  const itemFreq: Record<string, number> = {};
  sales.forEach(s => {
    if (s.notes) {
      const parts = s.notes.split(";");
      parts.forEach(p => {
        const m = p.trim().match(/\d+[\w\s]* (.+?) @/);
        if (m) itemFreq[m[1].trim()] = (itemFreq[m[1].trim()] || 0) + 1;
      });
    }
  });
  const topItems = Object.entries(itemFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <DashboardLayout pageTitle="Sales">
      <div className="p-4 max-w-4xl mx-auto pb-24">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {/* ══════════ BULK SCAN — PROGRESS ══════════ */}
        {mounted && bulkScanning && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.75)" }}
               className="flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 p-6 text-center">
              <div className="w-10 h-10 border-2 border-white/15 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="font-bold text-primary text-lg mb-1">Scanning Invoices…</p>
              <p className="text-3xl font-bold text-accent my-3">{bulkDone} <span className="text-lg text-muted font-normal">/ {bulkTotal}</span></p>
              {bulkWaiting
                ? <p className="text-xs text-yellow-400 truncate mb-3">Cooling down between scans…</p>
                : bulkCurrent && <p className="text-xs text-muted truncate mb-3">{bulkCurrent}</p>}
              <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-300"
                     style={{ width: `${bulkTotal > 0 ? (bulkDone / bulkTotal) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-muted mt-3">22s gap per scan — GROQ free tier limit</p>
              <button
                onClick={() => { bulkCancelRef.current = true; }}
                className="mt-4 text-xs text-muted hover:text-danger transition-colors underline">
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* ══════════ BULK SCAN — RESULTS ══════════ */}
        {mounted && bulkResults && !bulkScanning && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.75)" }}
               className="flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 p-6">
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-success/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FiCheckCircle size={22} className="text-success" />
                </div>
                <h3 className="font-bold text-primary text-xl">Bulk Scan Done!</h3>
                <p className="text-xs text-muted mt-1">{bulkTotal} files processed</p>
              </div>
              <div className="space-y-2 mb-5">
                <div className="flex items-center justify-between p-3.5 bg-success/10 rounded-xl border border-success/15">
                  <span className="text-sm font-semibold text-success">✓ Added</span>
                  <span className="text-2xl font-bold text-success">{bulkResults.added}</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-yellow-400/10 rounded-xl border border-yellow-400/15">
                  <span className="text-sm font-semibold text-yellow-400">⟳ Duplicates Skipped</span>
                  <span className="text-2xl font-bold text-yellow-400">{bulkResults.skipped}</span>
                </div>
                {bulkResults.failed > 0 && (
                  <div className="flex items-center justify-between p-3.5 bg-danger/10 rounded-xl border border-danger/15">
                    <span className="text-sm font-semibold text-danger">✗ Failed / Unreadable</span>
                    <span className="text-2xl font-bold text-danger">{bulkResults.failed}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setBulkResults(null)}
                className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors">
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* ══════════ CAMERA MODAL — FULLSCREEN (portaled to body) ══════════ */}
        {mounted && showCamera && createPortal(
          <div style={{
            position: "fixed", top: 0, left: 0,
            width: "100vw", height: "100dvh",
            zIndex: 99999, background: "#000",
            minHeight: "-webkit-fill-available",
          }}>
            {/* Video fills entire screen */}
            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover" />

            {/* Loading spinner */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Frame guide */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                   style={{ paddingBottom: "20%" }}>
                <div className="rounded-2xl" style={{
                  width: "88%", height: "55%",
                  border: "2px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                }} />
              </div>
            )}

            {/* Top hint + close */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-4"
                 style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
              <p className="text-white/80 text-sm font-medium">Invoice ko frame ke andar rakho</p>
              <button onClick={stopCamera}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20">
                <FiX size={18} />
              </button>
            </div>

            {/* Bottom shutter + upload */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-4 pb-16 pt-8"
                 style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
              <button onClick={captureFromCamera} disabled={!cameraReady}
                className="flex items-center justify-center disabled:opacity-30 transition-transform active:scale-95"
                style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 0 0 5px rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.5)",
                }}>
                <FiCamera size={32} className="text-black" />
              </button>
              <button onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 text-white/50 text-xs mt-1">
                <FiUpload size={12} /> Upload photo instead
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* ══════════ PAGE HEADER ══════════ */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-primary">Sales / Receivables</h1>
            <p className="text-xs text-muted">Customer se kya lena hai</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden bulk file input */}
            <input
              ref={bulkInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleBulkScan(e.target.files); }}
            />
            <button onClick={() => bulkInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-white/10 text-white/70 px-3 py-2.5 rounded-xl text-sm font-semibold hover:border-white/25 hover:text-white transition-colors">
              <FiUpload size={14} /> Bulk Upload
            </button>
            <button onClick={openCamera}
              className="flex items-center gap-1.5 border border-white/10 text-white/70 px-3 py-2.5 rounded-xl text-sm font-semibold hover:border-white/25 hover:text-white transition-colors">
              <FiCamera size={14} /> Scan
            </button>
            <button
              onClick={() => { setForm(emptyForm); setEditId(null); setScanPreview(null); setScannedItems([]); setScannedGst(null); setShowAdd(true); }}
              className="flex items-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
              <FiPlus size={15} /> Add
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-success">{fmtINR(totalRevenue)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Receivable</p>
            <p className="text-xl font-bold text-yellow-400">{fmtINR(totalReceivable)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Total Sales</p>
            <p className="text-xl font-bold text-primary">{sales.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted mb-1">Paid</p>
            <p className="text-xl font-bold text-success">{paidCount}</p>
            <p className="text-2xs text-muted">{sales.length > 0 ? Math.round((paidCount / sales.length) * 100) : 0}% collection</p>
          </div>
        </div>

        {/* Top selling items */}
        {topItems.length > 0 && (
          <div className="mb-4 p-3 bg-accent/5 border border-accent/15 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FiTrendingUp size={13} className="text-accent" />
              <p className="text-xs font-semibold text-accent">Top Selling Items</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topItems.map(([item, count]) => (
                <span key={item} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-surface-2 text-primary">
                  <FiPackage size={10} className="text-muted" />
                  {item} <span className="text-muted">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {["all", "unpaid", "partial", "paid"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${filterStatus === s ? "bg-white text-black" : "bg-surface-2 text-muted hover:text-primary"}`}>
              {s === "all" ? "All" : statusConfig[s as keyof typeof statusConfig]?.label}
              {s !== "all" && <span className="ml-1 opacity-60">({sales.filter(x => x.status === s).length})</span>}
            </button>
          ))}
        </div>

        {/* Sales list */}
        {loading ? (
          <div className="text-center py-12 text-muted">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FiAlertCircle size={36} className="mx-auto mb-3 text-muted opacity-30" />
            <p className="text-muted text-sm">Koi sale nahi mili</p>
            <p className="text-xs text-muted mt-1">Scan karo ya manually add karo customer ka invoice</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => {
              const cfg = statusConfig[s.status];
              const StatusIcon = cfg.icon;
              const pending = s.total_amount - s.paid_amount;
              const isOverdue = s.status !== "paid" && s.due_date && new Date(s.due_date) < new Date();
              return (
                <div key={s.id} className={`card p-4 border ${isOverdue ? "border-yellow-400/20" : "border-transparent"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-primary">{s.customer_name}</p>
                        <span className={`inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon size={10} /> {cfg.label}
                        </span>
                        {isOverdue && <span className="text-2xs text-yellow-400 font-semibold">OVERDUE</span>}
                      </div>
                      {s.invoice_number && <p className="text-xs text-muted">Invoice #{s.invoice_number}</p>}
                      {(myGstin || s.customer_gstin) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {myGstin && <p className="text-xs text-muted font-mono">Seller: {myGstin}</p>}
                          {s.customer_gstin && <p className="text-xs text-muted font-mono">Buyer: {s.customer_gstin}</p>}
                        </div>
                      )}
                      {s.gst_type && s.gst_amount && (
                        <p className="text-xs mt-0.5" style={{ color: "#F5A524" }}>
                          {s.gst_type}{s.gst_rate ? ` @${s.gst_rate}%` : ""}: {fmtINR(s.gst_amount)}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1">
                        <p className="text-xs text-muted">Sale: {fmtDate(s.sale_date)}</p>
                        {s.due_date && (
                          <p className={`text-xs font-semibold ${isOverdue ? "text-yellow-400" : "text-muted"}`}>
                            Due: {fmtDate(s.due_date)}
                          </p>
                        )}
                      </div>
                      {s.status !== "paid" && (
                        <div className="mt-2">
                          <div className="flex justify-between text-2xs text-muted mb-0.5">
                            <span>Received: {fmtINR(s.paid_amount)}</span>
                            <span>Pending: {fmtINR(pending)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full transition-all"
                              style={{ width: `${Math.min(100, (s.paid_amount / s.total_amount) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                      {s.notes && <p className="text-xs text-muted mt-1.5 italic line-clamp-2">{s.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-lg text-success">{fmtINR(s.total_amount)}</p>
                      {s.status !== "paid" && <p className="text-xs text-yellow-400 font-semibold">{fmtINR(pending)} lena</p>}
                      <div className="flex gap-1.5 mt-2 justify-end">
                        {s.status !== "paid" && (
                          <button onClick={() => { setPayModal(s); setPayAmount(""); }}
                            className="px-2.5 py-1.5 bg-success/10 text-success rounded-lg text-xs font-semibold hover:bg-success/20 transition-colors">
                            Collect
                          </button>
                        )}
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 bg-surface-2 text-muted rounded-lg hover:text-primary transition-colors">
                          <FiEdit2 size={12} />
                        </button>
                        <button onClick={() => deleteSale(s.id)}
                          className="p-1.5 bg-surface-2 text-muted rounded-lg hover:text-danger transition-colors">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ ADD / EDIT / SCAN MODAL (portaled) ══════════ */}
        {mounted && showAdd && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99998 }}
               className="flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="w-full max-w-lg bg-surface-1 rounded-2xl border border-white/10 overflow-hidden"
                 style={{ maxHeight: "92vh", overflowY: "auto" }}>

              {/* Modal header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-surface-1 z-10">
                <div>
                  <h3 className="font-bold text-primary">
                    {scanning ? "Reading Invoice…" : editId ? "Edit Sale" : scanPreview ? "Confirm Scanned Invoice" : "Add Sale"}
                  </h3>
                  <p className="text-xs text-muted">
                    {scanning ? "AI is extracting details from your photo" : "Customer ka invoice add karo"}
                  </p>
                </div>
                <button onClick={closeModal} className="p-1.5 text-muted hover:text-primary"><FiX size={16} /></button>
              </div>

              {/* Bill preview */}
              {scanPreview && (
                <div className="px-5 pt-4">
                  <div className="relative rounded-xl overflow-hidden border border-white/8" style={{ maxHeight: 170 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scanPreview} alt="Invoice" className="w-full object-cover object-top" style={{ maxHeight: 170 }} />
                    {scanning && (
                      <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <p className="text-xs text-white font-semibold">
                          {scanCountdown !== null
                            ? `Rate limit hit — retrying in ${scanCountdown}s…`
                            : "AI reading invoice…"}
                        </p>
                      </div>
                    )}
                    {!scanning && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-1 text-2xs font-semibold px-2 py-1 rounded-full bg-success text-white">
                          <FiZap size={9} /> Auto-filled
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scanning skeleton */}
              {scanning && (
                <div className="p-5 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-9 bg-white/5 rounded-xl animate-pulse"
                         style={{ width: i % 2 === 0 ? "75%" : "100%" }} />
                  ))}
                </div>
              )}

              {/* Scan error banner */}
              {!scanning && scanError && (
                <div className="mx-5 mt-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(245,66,77,0.12)", border: "1px solid rgba(245,66,77,0.25)", color: "rgba(255,120,128,1)" }}>
                  {scanError}
                </div>
              )}

              {/* ── Extracted items table ── */}
              {!scanning && scannedItems.length > 0 && (
                <div className="px-5 pt-4">
                  <p className="text-2xs font-semibold text-muted uppercase tracking-widest mb-2">
                    Items Extracted ({scannedItems.length})
                  </p>
                  <div className="rounded-xl border border-white/8 overflow-x-auto">
                    <table className="w-full" style={{ minWidth: 420 }}>
                      <thead>
                        <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <th className="text-left px-3 py-2 text-2xs font-semibold text-muted uppercase tracking-wide">Description</th>
                          <th className="text-center px-2 py-2 text-2xs font-semibold text-muted uppercase tracking-wide">HSN/SAC</th>
                          <th className="text-center px-2 py-2 text-2xs font-semibold text-muted uppercase tracking-wide">Qty</th>
                          <th className="text-right px-2 py-2 text-2xs font-semibold text-muted uppercase tracking-wide">Rate</th>
                          <th className="text-right px-3 py-2 text-2xs font-semibold text-muted uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedItems.map((item, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                            <td className="px-3 py-2.5" style={{ maxWidth: 200 }}>
                              <p className="text-xs text-primary font-medium leading-snug">{item.description}</p>
                            </td>
                            <td className="px-2 py-2.5 text-center text-xs text-muted">{item.hsn_sac || "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs text-primary font-semibold">
                              {item.qty ?? 1} <span className="text-muted font-normal">{item.unit || ""}</span>
                            </td>
                            <td className="px-2 py-2.5 text-right text-xs text-muted">
                              {item.price ? fmtINR(item.price) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs text-primary font-bold">
                              {item.amount ? fmtINR(item.amount) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* GST + Grand Total rows */}
                      {form.total_amount && (
                        <tfoot>
                          {scannedGst && (
                            <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                              <td colSpan={3} className="px-3 py-2 text-xs text-muted text-right">
                                {scannedGst.type}{scannedGst.rate ? ` @ ${scannedGst.rate}%` : ""}
                              </td>
                              <td />
                              <td className="px-3 py-2 text-right text-xs font-semibold" style={{ color: "#F5A524" }}>
                                +{fmtINR(scannedGst.amount)}
                              </td>
                            </tr>
                          )}
                          <tr style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
                            <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-muted text-right">Grand Total</td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-success">
                              {fmtINR(parseFloat(form.total_amount))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <p className="text-2xs text-muted mt-1.5 mb-1">Check fields below and save</p>
                </div>
              )}

              {/* ── Form fields ── */}
              {!scanning && (
                <>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1 block">Customer Name *</label>
                        <input
                          value={form.customer_name}
                          onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                          placeholder="Mehta Fabrics…"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1 block">Phone</label>
                        <input
                          value={form.customer_phone}
                          onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                          placeholder="9876543210" type="tel"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1 block">Seller GSTIN (Yours)</label>
                        <div className="w-full bg-surface-2/60 border border-white/5 rounded-xl px-3 py-2.5 text-sm font-mono tracking-wide"
                          style={{ color: myGstin ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>
                          {myGstin || <span className="text-xs not-italic" style={{ fontFamily: "inherit", letterSpacing: 0 }}>Set in Settings</span>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1 block">Buyer GSTIN</label>
                        <input
                          value={form.customer_gstin}
                          onChange={e => setForm(f => ({ ...f, customer_gstin: e.target.value.toUpperCase() }))}
                          placeholder="22AAAAA0000A1Z5"
                          maxLength={15}
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50 font-mono tracking-wide"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1 block">Invoice Number</label>
                        <input
                          value={form.invoice_number}
                          onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                          placeholder="INV-001"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1 block">Sale Date *</label>
                        <input
                          value={form.sale_date}
                          onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
                          type="date"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted mb-1 block">Total Amount (₹) *</label>
                        <input
                          value={form.total_amount}
                          onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))}
                          placeholder="50000" type="number"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted mb-1 block">Already Received (₹)</label>
                        <input
                          value={form.paid_amount}
                          onChange={e => setForm(f => ({ ...f, paid_amount: e.target.value }))}
                          placeholder="0" type="number"
                          className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Due Date</label>
                      <input
                        value={form.due_date}
                        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                        type="date"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Notes / Items Summary</label>
                      <textarea
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="TMT rod, cement, fabric…"
                        rows={scannedItems.length > 0 ? 3 : 2}
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex gap-3">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">
                      Cancel
                    </button>
                    <button
                      onClick={save}
                      disabled={saving || !form.customer_name || !form.total_amount}
                      className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors">
                      {saving ? "Saving…" : editId ? "Update" : "Add Sale"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Quick Collect Modal (portaled) */}
        {mounted && payModal && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 99998 }}
               className="flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 p-5">
              <h3 className="font-bold text-primary mb-1">Collect Payment</h3>
              <p className="text-xs text-muted mb-4">
                {payModal.customer_name} · Pending: {fmtINR(payModal.total_amount - payModal.paid_amount)}
              </p>
              <div className="mb-4">
                <label className="text-xs text-muted mb-1 block">Amount Received (₹)</label>
                <input
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder={String(payModal.total_amount - payModal.paid_amount)}
                  type="number" autoFocus
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPayModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={recordPayment} disabled={saving || !payAmount}
                  className="flex-1 py-2.5 rounded-xl bg-success text-white text-sm font-bold hover:bg-success/80 disabled:opacity-50 transition-colors">
                  {saving ? "Saving…" : "Mark Collected"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}

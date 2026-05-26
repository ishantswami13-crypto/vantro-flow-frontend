"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiCheckCircle, FiClock,
  FiCamera, FiX, FiZap, FiUpload,
} from "react-icons/fi";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Purchase = {
  id: number;
  supplier_name: string;
  supplier_phone?: string;
  bill_number?: string;
  purchase_date: string;
  due_date?: string;
  total_amount: number;
  paid_amount: number;
  status: "paid" | "partial" | "unpaid";
  notes?: string;
};

type BillItem = {
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

function resizeImage(file: File, maxWidth = 1400): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.src = url;
  });
}

export default function PurchasesPage() {
  const [purchases, setPurchases]       = useState<Purchase[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [payModal, setPayModal]         = useState<Purchase | null>(null);
  const [payAmount, setPayAmount]       = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [saving, setSaving]             = useState(false);

  // Scan / camera states
  const [scanning, setScanning]         = useState(false);
  const [scanPreview, setScanPreview]   = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<BillItem[]>([]);
  const [scannedGst, setScannedGst]     = useState<ScanGst | null>(null);
  const [showCamera, setShowCamera]     = useState(false);
  const [cameraReady, setCameraReady]   = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    supplier_name: "", supplier_phone: "", bill_number: "",
    purchase_date: new Date().toISOString().split("T")[0],
    due_date: "", total_amount: "", paid_amount: "0", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Stop camera stream + cleanup
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/purchases`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await r.json();
      if (d.success) setPurchases(d.purchases);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.supplier_name || !form.total_amount) return;
    setSaving(true);
    try {
      const url    = editId ? `${API}/api/purchases/${editId}` : `${API}/api/purchases`;
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_amount: parseFloat(form.total_amount),
          paid_amount:  parseFloat(form.paid_amount || "0"),
        }),
      });
      if (r.ok) {
        setShowAdd(false); setEditId(null); setForm(emptyForm);
        setScanPreview(null); setScannedItems([]);
        load();
      }
    } finally { setSaving(false); }
  };

  const deletePurchase = async (id: number) => {
    if (!confirm("Delete this purchase?")) return;
    await fetch(`${API}/api/purchases/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
    });
    load();
  };

  const recordPayment = async () => {
    if (!payModal || !payAmount) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/purchases/${payModal.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ paid_amount: payModal.paid_amount + parseFloat(payAmount) }),
      });
      if (r.ok) { setPayModal(null); setPayAmount(""); load(); }
    } finally { setSaving(false); }
  };

  const openEdit = (p: Purchase) => {
    setForm({
      supplier_name: p.supplier_name, supplier_phone: p.supplier_phone || "",
      bill_number: p.bill_number || "", purchase_date: p.purchase_date.split("T")[0],
      due_date: p.due_date?.split("T")[0] || "", total_amount: String(p.total_amount),
      paid_amount: String(p.paid_amount), notes: p.notes || "",
    });
    setEditId(p.id); setScanPreview(null); setScannedItems([]);
    setShowAdd(true);
  };

  const closeModal = () => {
    setShowAdd(false); setEditId(null); setForm(emptyForm);
    setScanPreview(null); setScannedItems([]); setScannedGst(null); setScanning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Camera ──────────────────────────────────────────────────────
  const openCamera = async () => {
    setShowCamera(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      // slight delay so the modal renders first
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => setCameraReady(true))
            .catch(() => setCameraReady(true));
        }
      }, 80);
    } catch {
      // Camera not available — fall back to file picker
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
      if (blob) processFile(new File([blob], "bill-capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.88);
  };

  // ── AI Extraction ────────────────────────────────────────────────
  const processFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setScanPreview(previewUrl);
    setScannedItems([]);
    setForm(emptyForm);
    setEditId(null);
    setScanning(true);
    setShowAdd(true);

    try {
      const { base64, mimeType } = await resizeImage(file, 1400);
      const r = await fetch(`${API}/api/purchases/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const d = await r.json();
      if (d.success && d.data) {
        const ex        = d.data;
        const items: BillItem[] = ex.items || [];

        // Detect GST type from bill (IGST = interstate, CGST+SGST = intrastate)
        let gstInfo: ScanGst | null = null;
        if (ex.gst_amount && ex.gst_amount > 0) {
          const igst  = ex.igst_amount  || (ex.igst_rate  ? ex.gst_amount : 0);
          const cgst  = ex.cgst_amount  || 0;
          const sgst  = ex.sgst_amount  || 0;
          const gstType = (igst > 0 || ex.igst_rate)  ? "IGST"
                        : (cgst > 0 || sgst > 0)        ? "CGST + SGST"
                        : "GST";
          gstInfo = { amount: ex.gst_amount, rate: ex.gst_rate || "", type: gstType };
        }
        setScannedGst(gstInfo);

        // Build notes with items + GST
        const itemNotes = items.length > 0
          ? items.map((it: BillItem) =>
              `${it.qty || 1}${it.unit ? " " + it.unit : ""} ${it.description}${it.price ? " @₹" + Number(it.price).toLocaleString("en-IN") : ""}`
            ).join("; ")
          : (ex.notes || "");
        const gstNote = gstInfo ? ` | ${gstInfo.type} ${gstInfo.rate}: ₹${Number(gstInfo.amount).toLocaleString("en-IN")}` : "";

        setScannedItems(items);
        setForm(f => ({
          ...f,
          supplier_name:  ex.supplier_name  || "",
          bill_number:    ex.bill_number    || "",
          purchase_date:  ex.purchase_date  || new Date().toISOString().split("T")[0],
          due_date:       ex.due_date       || "",
          total_amount:   ex.total_amount   ? String(ex.total_amount) : "",
          notes:          itemNotes + gstNote,
          paid_amount:    "0",
        }));
      }
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Derived ──────────────────────────────────────────────────────
  const filtered  = filterStatus === "all" ? purchases : purchases.filter(p => p.status === filterStatus);
  const totalDue  = purchases.filter(p => p.status !== "paid").reduce((s, p) => s + (p.total_amount - p.paid_amount), 0);
  const overdue   = purchases.filter(p => p.status !== "paid" && p.due_date && new Date(p.due_date) < new Date());

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-4xl mx-auto pb-24">
      {/* Hidden file input — fallback / desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* ══════════ CAMERA MODAL — FULLSCREEN ══════════ */}
      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black">
          {/* Video fills entire screen */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Loading spinner overlay */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Frame guide overlay */}
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

          {/* Top hint + close — overlaid */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-12 pb-4"
               style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
            <p className="text-white/80 text-sm font-medium">Bill ko frame ke andar rakho</p>
            <button onClick={stopCamera}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20">
              <FiX size={18} />
            </button>
          </div>

          {/* Bottom controls — overlaid */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center gap-4 pb-16 pt-8"
               style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
            <button
              onClick={captureFromCamera}
              disabled={!cameraReady}
              className="flex items-center justify-center disabled:opacity-30 transition-transform active:scale-95"
              style={{
                width: 80, height: 80,
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 0 0 5px rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <FiCamera size={32} className="text-black" />
            </button>
            <button
              onClick={() => { stopCamera(); fileInputRef.current?.click(); }}
              className="flex items-center gap-1.5 text-white/50 text-xs mt-1"
            >
              <FiUpload size={12} /> Upload photo instead
            </button>
          </div>
        </div>
      )}

      {/* ══════════ PAGE HEADER ══════════ */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Purchases / Payables</h1>
          <p className="text-xs text-muted">Supplier ko kya dena hai</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCamera}
            className="flex items-center gap-1.5 border border-white/10 text-white/70 px-3 py-2.5 rounded-xl text-sm font-semibold hover:border-white/25 hover:text-white transition-colors"
          >
            <FiCamera size={14} /> Scan Bill
          </button>
          <button
            onClick={() => { setForm(emptyForm); setEditId(null); setScanPreview(null); setScannedItems([]); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
          >
            <FiPlus size={15} /> Add
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Total Dena</p>
          <p className="text-xl font-bold text-danger">{fmtINR(totalDue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Overdue</p>
          <p className="text-xl font-bold text-yellow-400">{overdue.length}</p>
          <p className="text-2xs text-muted">bills overdue</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Total Purchases</p>
          <p className="text-xl font-bold text-primary">{purchases.length}</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl flex items-start gap-2.5">
          <FiAlertCircle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">⚠ {overdue.length} overdue {overdue.length === 1 ? "bill" : "bills"}</p>
            <p className="text-xs text-muted">{overdue.map(p => p.supplier_name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {["all", "unpaid", "partial", "paid"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${filterStatus === s ? "bg-white text-black" : "bg-surface-2 text-muted hover:text-primary"}`}>
            {s === "all" ? "All" : statusConfig[s as keyof typeof statusConfig]?.label}
            {s !== "all" && (
              <span className="ml-1 opacity-60">({purchases.filter(p => p.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Purchase list */}
      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FiAlertCircle size={36} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-muted text-sm">Koi purchase nahi mila</p>
          <p className="text-xs text-muted mt-1">Scan karo ya add karo supplier ka bill</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cfg      = statusConfig[p.status];
            const StatusIcon = cfg.icon;
            const pending  = p.total_amount - p.paid_amount;
            const isOverdue = p.status !== "paid" && p.due_date && new Date(p.due_date) < new Date();
            return (
              <div key={p.id} className={`card p-4 border ${isOverdue ? "border-yellow-400/20" : "border-transparent"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-primary">{p.supplier_name}</p>
                      <span className={`inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        <StatusIcon size={10} /> {cfg.label}
                      </span>
                      {isOverdue && <span className="text-2xs text-yellow-400 font-semibold">OVERDUE</span>}
                    </div>
                    {p.bill_number && <p className="text-xs text-muted">Bill #{p.bill_number}</p>}
                    <div className="flex gap-3 mt-1">
                      <p className="text-xs text-muted">Purchase: {fmtDate(p.purchase_date)}</p>
                      {p.due_date && (
                        <p className={`text-xs font-semibold ${isOverdue ? "text-yellow-400" : "text-muted"}`}>
                          Due: {fmtDate(p.due_date)}
                        </p>
                      )}
                    </div>
                    {p.status !== "paid" && (
                      <div className="mt-2">
                        <div className="flex justify-between text-2xs text-muted mb-0.5">
                          <span>Paid: {fmtINR(p.paid_amount)}</span>
                          <span>Remaining: {fmtINR(pending)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${Math.min(100, (p.paid_amount / p.total_amount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {p.notes && <p className="text-xs text-muted mt-1.5 italic line-clamp-2">{p.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-primary">{fmtINR(p.total_amount)}</p>
                    {p.status !== "paid" && <p className="text-xs text-danger font-semibold">{fmtINR(pending)} baki</p>}
                    <div className="flex gap-1.5 mt-2 justify-end">
                      {p.status !== "paid" && (
                        <button
                          onClick={() => { setPayModal(p); setPayAmount(""); }}
                          className="px-2.5 py-1.5 bg-success/10 text-success rounded-lg text-xs font-semibold hover:bg-success/20 transition-colors"
                        >
                          Pay
                        </button>
                      )}
                      <button onClick={() => openEdit(p)}
                        className="p-1.5 bg-surface-2 text-muted rounded-lg hover:text-primary transition-colors">
                        <FiEdit2 size={12} />
                      </button>
                      <button onClick={() => deletePurchase(p.id)}
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

      {/* ══════════ ADD / EDIT / SCAN MODAL ══════════ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg bg-surface-1 rounded-2xl border border-white/10 overflow-hidden"
               style={{ maxHeight: "92vh", overflowY: "auto" }}>

            {/* Modal header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-surface-1 z-10">
              <div>
                <h3 className="font-bold text-primary">
                  {scanning
                    ? "Reading Bill…"
                    : editId
                    ? "Edit Purchase"
                    : scanPreview
                    ? "Confirm Scanned Bill"
                    : "Add Purchase"}
                </h3>
                <p className="text-xs text-muted">
                  {scanning ? "AI is extracting all details from your photo" : "Supplier ka bill add karo"}
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 text-muted hover:text-primary">
                <FiX size={16} />
              </button>
            </div>

            {/* Bill preview thumbnail */}
            {scanPreview && (
              <div className="px-5 pt-4">
                <div className="relative rounded-xl overflow-hidden border border-white/8" style={{ maxHeight: 170 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={scanPreview} alt="Bill" className="w-full object-cover object-top" style={{ maxHeight: 170 }} />
                  {scanning && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <p className="text-xs text-white font-semibold">AI reading bill…</p>
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
                    {/* GST + Total rows */}
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
                          <td className="px-3 py-2 text-right text-sm font-bold text-primary">
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
                      <label className="text-xs text-muted mb-1 block">Supplier Name *</label>
                      <input
                        value={form.supplier_name}
                        onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))}
                        placeholder="Ram Traders…"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Phone</label>
                      <input
                        value={form.supplier_phone}
                        onChange={e => setForm(f => ({ ...f, supplier_phone: e.target.value }))}
                        placeholder="9876543210" type="tel"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted mb-1 block">Bill Number</label>
                      <input
                        value={form.bill_number}
                        onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))}
                        placeholder="INV-001"
                        className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Purchase Date *</label>
                      <input
                        value={form.purchase_date}
                        onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))}
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
                      <label className="text-xs text-muted mb-1 block">Already Paid (₹)</label>
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
                      placeholder="Cement, rod, sand…"
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
                    disabled={saving || !form.supplier_name || !form.total_amount}
                    className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving…" : editId ? "Update" : "Add Purchase"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/10 p-5">
            <h3 className="font-bold text-primary mb-1">Record Payment</h3>
            <p className="text-xs text-muted mb-4">
              {payModal.supplier_name} · Remaining: {fmtINR(payModal.total_amount - payModal.paid_amount)}
            </p>
            <div className="mb-4">
              <label className="text-xs text-muted mb-1 block">Payment Amount (₹)</label>
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
                {saving ? "Saving…" : "Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

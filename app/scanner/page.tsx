"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { FiCamera, FiUpload, FiZap, FiCheck, FiFileText, FiRefreshCw } from "react-icons/fi";

interface Extracted {
  customerName: string;
  gstin: string;
  invoiceNo: string;
  amount: string;
  date: string;
  dueDate: string;
  items: { desc: string; qty: number; rate: number; total: number }[];
}

const DEMO_RESULT: Extracted = {
  customerName: "Mehta Fabrics Pvt Ltd",
  gstin:        "27AABCM1234F1Z5",
  invoiceNo:    "INV-2025-0847",
  amount:       "8,40,000",
  date:         "01 May 2025",
  dueDate:      "31 May 2025",
  items: [
    { desc: "Cotton Fabric Roll (Grade A)", qty: 200, rate: 3500,  total: 700000 },
    { desc: "Processing Charges",           qty: 1,   rate: 75000, total: 75000  },
    { desc: "GST 18%",                      qty: 1,   rate: 63000, total: 63000  },
  ],
};

type Stage = "idle" | "uploading" | "scanning" | "done";

export default function ScannerPage() {
  const [stage, setStage]       = useState<Stage>("idle");
  const [result, setResult]     = useState<Extracted | null>(null);
  const [preview, setPreview]   = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage("uploading");
    await new Promise(r => setTimeout(r, 800));
    setStage("scanning");
    await new Promise(r => setTimeout(r, 2000));
    setResult(DEMO_RESULT);
    setStage("done");
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const reset = () => { setStage("idle"); setResult(null); setPreview(null); setSaved(false); };

  const saveInvoice = async () => {
    await new Promise(r => setTimeout(r, 600));
    setSaved(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-primary">GST Invoice Scanner</h1>
          <p className="text-sm text-muted mt-0.5">Photo a paper invoice — AI extracts all details in seconds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Zone */}
          <div className="space-y-4">
            <div
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              className={["card-premium border-2 border-dashed flex flex-col items-center justify-center p-10 text-center cursor-pointer transition-all min-h-[280px]",
                stage === "idle" ? "border-border hover:border-accent/50 hover:bg-accent-dim/20" : "border-accent/30 bg-accent-dim/10",
              ].join(" ")}
              onClick={() => stage === "idle" && fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFileChange} />

              {stage === "idle" && (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
                    <FiCamera size={24} className="text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-1">Drop invoice image here</p>
                  <p className="text-xs text-muted mb-4">or click to browse · JPG, PNG, PDF supported</p>
                  <Button size="sm" icon={<FiUpload size={13}/>} variant="secondary">Choose File</Button>
                </>
              )}

              {stage === "uploading" && (
                <>
                  {preview && <img src={preview} alt="Invoice" className="max-h-48 rounded-xl mb-3 object-contain" />}
                  <p className="text-xs text-muted animate-pulse">Uploading...</p>
                </>
              )}

              {stage === "scanning" && (
                <>
                  {preview && <img src={preview} alt="Invoice" className="max-h-48 rounded-xl mb-3 object-contain opacity-60" />}
                  <div className="flex items-center gap-2">
                    <FiZap size={14} className="text-accent animate-pulse" />
                    <p className="text-xs text-accent font-semibold animate-pulse">AI scanning invoice...</p>
                  </div>
                  <p className="text-2xs text-muted mt-1">Extracting customer, amount, GSTIN, line items</p>
                </>
              )}

              {stage === "done" && (
                <>
                  {preview && <img src={preview} alt="Invoice" className="max-h-48 rounded-xl mb-3 object-contain" />}
                  <div className="flex items-center gap-2 text-success">
                    <FiCheck size={14} />
                    <p className="text-xs font-semibold">Scan complete!</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset(); }} className="mt-2 text-2xs text-muted hover:text-primary underline flex items-center gap-1">
                    <FiRefreshCw size={10}/> Scan another
                  </button>
                </>
              )}
            </div>

            {/* How it works */}
            <div className="card-premium p-4">
              <p className="text-xs font-bold text-primary mb-3">How it works</p>
              <div className="space-y-2.5">
                {[
                  { step: "1", text: "Take a photo of any GST invoice or upload PDF" },
                  { step: "2", text: "Groq AI reads and extracts all invoice details" },
                  { step: "3", text: "Review extracted data and save to collections" },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-accent-dim text-accent text-2xs font-bold flex items-center justify-center shrink-0">{s.step}</span>
                    <p className="text-xs text-secondary">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted Data */}
          <div>
            {!result ? (
              <div className="card-premium p-8 flex flex-col items-center justify-center text-center min-h-[280px]">
                <FiFileText size={32} className="text-muted mb-3" />
                <p className="text-sm text-muted">Extracted invoice data will appear here</p>
              </div>
            ) : (
              <div className="card-premium overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiZap size={13} className="text-accent" />
                    <p className="text-sm font-bold text-primary">Extracted Data</p>
                  </div>
                  <Badge variant="success">AI Verified</Badge>
                </div>

                <div className="p-4 space-y-3">
                  {[
                    { label: "Customer Name", value: result.customerName },
                    { label: "GSTIN",         value: result.gstin },
                    { label: "Invoice No",    value: result.invoiceNo },
                    { label: "Amount",        value: `₹${result.amount}` },
                    { label: "Invoice Date",  value: result.date },
                    { label: "Due Date",      value: result.dueDate },
                  ].map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted shrink-0">{f.label}</p>
                      <p className="text-xs font-semibold text-primary text-right truncate">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* Line Items */}
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-surface-2">
                    <p className="text-2xs font-bold text-muted uppercase tracking-wider">Line Items</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {result.items.map((item, i) => (
                      <div key={i} className="px-4 py-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-secondary truncate flex-1">{item.desc}</p>
                        <p className="text-xs font-mono font-semibold text-primary shrink-0">
                          ₹{item.total.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-border flex gap-2">
                  {saved ? (
                    <div className="flex items-center gap-2 text-success">
                      <FiCheck size={14}/> <p className="text-sm font-semibold">Saved to Collections!</p>
                    </div>
                  ) : (
                    <>
                      <Button fullWidth onClick={saveInvoice} icon={<FiCheck size={13}/>}>Save to Collections</Button>
                      <Button variant="secondary" size="md" icon={<FiRefreshCw size={13}/>} onClick={reset} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

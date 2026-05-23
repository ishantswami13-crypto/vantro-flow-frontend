"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiX, FiMic, FiMicOff, FiZap, FiPlus, FiCheck } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

interface SaleItem { name: string; qty: number; unit: string; price: number; }

// Simple parser: "10 bags cement 350" or "cement 10 bags 350" or "cement ₹350 x 5"
function parseQuickSale(text: string): SaleItem[] {
  const cleaned = text.replace(/₹|rs\.?|rupees?/gi, "").trim();
  const lines = cleaned.split(/[,;\n]+/).filter(Boolean);
  const items: SaleItem[] = [];

  for (const line of lines) {
    const nums = line.match(/\d+(?:\.\d+)?/g) || [];
    if (nums.length === 0) continue;

    const unitMatch = line.match(/\b(bags?|pcs?|kg|kgs?|ltr?|litr?|nos?|pieces?|units?|meters?|feet|boxes?|bundles?|sheets?|rolls?|pairs?)\b/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : "pcs";

    // Extract numbers
    let qty = 1, price = 0;
    if (nums.length === 1) { price = parseFloat(nums[0]); qty = 1; }
    else if (nums.length >= 2) { qty = parseFloat(nums[0]); price = parseFloat(nums[nums.length - 1]); }

    // Extract item name — remove numbers and units
    const namePart = line
      .replace(/\d+(?:\.\d+)?/g, " ")
      .replace(new RegExp(`\\b${unit}\\b`, "gi"), " ")
      .replace(/\b(bag|pc|kg|ltr|no|piece|unit|meter|feet|box|bundle|sheet|roll|pair|each|@|at|x|times)\b/gi, " ")
      .replace(/\s+/g, " ").trim();

    if (!namePart && !price) continue;
    items.push({ name: namePart || "Item", qty: qty || 1, unit, price: price || 0 });
  }
  return items;
}

interface QuickSaleProps { onClose: () => void; onSaved?: () => void; }

export default function QuickSale({ onClose, onSaved }: QuickSaleProps) {
  const [text, setText]           = useState("");
  const [items, setItems]         = useState<SaleItem[]>([]);
  const [listening, setListening] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [customer, setCustomer]   = useState("");
  const [note, setNote]           = useState("");
  const [voiceSupport]            = useState(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
  const recogRef = useRef<any>(null);
  const textRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  // Parse text into items whenever it changes
  useEffect(() => {
    if (text.trim()) setItems(parseQuickSale(text));
    else setItems([]);
  }, [text]);

  const startListening = useCallback(() => {
    if (!voiceSupport) return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = "hi-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setText(prev => prev ? prev + "\n" + transcript : transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recogRef.current = rec;
    rec.start();
    setListening(true);
  }, [voiceSupport]);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  const updateItem = (i: number, field: keyof SaleItem, val: string | number) => {
    setItems(items => items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const removeItem = (i: number) => setItems(items => items.filter((_, idx) => idx !== i));

  const addBlankItem = () => setItems(items => [...items, { name: "", qty: 1, unit: "pcs", price: 0 }]);

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  const saveSale = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("vantro_token") || "";
      const r = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: customer || "Walk-in",
          source: "quick_sale",
          items: items.map(it => ({ description: it.name, quantity: it.qty, unit: it.unit, rate: it.price, amount: it.qty * it.price })),
          total_amount: total,
          notes: note,
          status: "delivered",
        }),
      });
      const d = await r.json();
      if (d.success || d.order) {
        setSaved(true);
        onSaved?.();
        setTimeout(() => onClose(), 1200);
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface-1 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-accent/10 to-success/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
              <FiZap size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-sm">Quick Sale</h3>
              <p className="text-2xs text-muted">Type ya bolo — sale instant save ho jaayegi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-2 transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Input + Voice */}
          <div>
            <div className="flex items-start gap-2">
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"10 bags cement 350\n5 rods sariya 1200 each\n..."}
                rows={3}
                className="flex-1 bg-surface-2 border border-white/8 rounded-xl px-3.5 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none transition-colors"
              />
              {voiceSupport && (
                <button
                  onPointerDown={startListening}
                  onPointerUp={stopListening}
                  onPointerLeave={stopListening}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-col gap-0.5 transition-all mt-0 shrink-0 ${listening ? "bg-danger text-white scale-110 shadow-lg animate-pulse" : "bg-surface-2 text-muted hover:bg-accent/10 hover:text-accent border border-white/8"}`}
                  title="Hold to speak">
                  {listening ? <FiMicOff size={18} /> : <FiMic size={18} />}
                  <span className="text-2xs leading-none">{listening ? "Stop" : "Hold"}</span>
                </button>
              )}
            </div>
            <p className="text-2xs text-muted mt-1.5">
              Format: <span className="text-secondary font-mono">qty item price</span> — e.g. "10 bags cement 350" ya voice mein bolo
            </p>
          </div>

          {/* Parsed items table */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Items ({items.length})</p>
                <button onClick={addBlankItem} className="text-xs text-accent flex items-center gap-1 hover:opacity-80">
                  <FiPlus size={11} /> Add row
                </button>
              </div>
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                    <input value={item.name} onChange={e => updateItem(i, "name", e.target.value)}
                      placeholder="Item name" className="col-span-4 bg-surface-2 border border-white/8 rounded-lg px-2.5 py-2 text-xs text-primary focus:outline-none focus:border-accent/50" />
                    <input value={item.qty} onChange={e => updateItem(i, "qty", parseFloat(e.target.value) || 0)}
                      type="number" min="0" placeholder="Qty" className="col-span-2 bg-surface-2 border border-white/8 rounded-lg px-2 py-2 text-xs text-primary focus:outline-none focus:border-accent/50 text-center" />
                    <input value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)}
                      placeholder="Unit" className="col-span-2 bg-surface-2 border border-white/8 rounded-lg px-2 py-2 text-xs text-muted focus:outline-none focus:border-accent/50 text-center" />
                    <input value={item.price} onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                      type="number" min="0" placeholder="₹ Rate" className="col-span-3 bg-surface-2 border border-white/8 rounded-lg px-2 py-2 text-xs text-primary focus:outline-none focus:border-accent/50" />
                    <button onClick={() => removeItem(i)} className="col-span-1 text-muted hover:text-danger transition-colors text-center">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="mt-3 flex justify-end">
                <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-2 text-right">
                  <p className="text-2xs text-muted">Total</p>
                  <p className="text-lg font-black text-accent">₹{total.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer + Note */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs text-muted mb-1 block">Customer (optional)</label>
                <input value={customer} onChange={e => setCustomer(e.target.value)}
                  placeholder="Sharma ji, Walk-in..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-2xs text-muted mb-1 block">Note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Cash paid, advance..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
            </div>
          )}

          {/* Save button */}
          <button onClick={saveSale}
            disabled={saving || items.length === 0 || saved}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${saved ? "bg-success/20 text-success border border-success/30" : "bg-accent text-white shadow-button-accent hover:bg-accent/90 disabled:opacity-40"}`}>
            {saved ? (
              <><FiCheck size={15} /> Sale saved! ✓</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><FiZap size={14} /> Save Sale — ₹{total.toLocaleString("en-IN")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

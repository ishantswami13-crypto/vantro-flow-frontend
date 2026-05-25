"use client";
import { useEffect, useState } from "react";
import { FiPlus, FiUser, FiArrowUp, FiArrowDown, FiMessageSquare, FiSearch, FiTrash2, FiChevronRight } from "react-icons/fi";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Customer = {
  customer_name: string;
  customer_phone?: string;
  total_debit: number;
  total_credit: number;
  balance: number;
  last_entry: string;
  entry_count: number;
};

type Entry = {
  id: number;
  type: "debit" | "credit";
  amount: number;
  note: string;
  payment_mode: string;
  created_at: string;
  running_balance: number;
};

const fmtINR = (n: number) => "₹" + Math.abs(Number(n)).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function KhataPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"debit" | "credit">("debit");
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", amount: "", note: "", payment_mode: "cash" });
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/khata`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.success) setCustomers(d.customers);
    } finally { setLoading(false); }
  };

  const loadEntries = async (name: string) => {
    setLoadingEntries(true);
    try {
      const r = await fetch(`${API}/api/khata/${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await r.json();
      if (d.success) setEntries(d.entries);
    } finally { setLoadingEntries(false); }
  };

  useEffect(() => { loadCustomers(); }, []);

  const selectCustomer = (name: string) => {
    setSelected(name);
    loadEntries(name);
  };

  const addEntry = async () => {
    if (!form.customer_name || !form.amount) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/khata/entry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: addType, amount: parseFloat(form.amount) }),
      });
      const d = await r.json();
      if (d.success) {
        setShowAdd(false);
        setForm({ customer_name: "", customer_phone: "", amount: "", note: "", payment_mode: "cash" });
        await loadCustomers();
        if (selected === form.customer_name) loadEntries(form.customer_name);
      }
    } finally { setSaving(false); }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    await fetch(`${API}/api/khata/entry/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
    if (selected) loadEntries(selected);
    loadCustomers();
  };

  const whatsappStatement = (c: Customer) => {
    const bal = c.balance;
    const msg = bal > 0
      ? `Namaste ${c.customer_name} ji 🙏\n\nAapka hamare yahan ₹${bal.toLocaleString("en-IN")} baaki hai.\n\nKripya jaldi settle karein.\n\n- Vantro Flow`
      : bal < 0
      ? `Namaste ${c.customer_name} ji 🙏\n\nHumne aapka ₹${Math.abs(bal).toLocaleString("en-IN")} advance liya hua hai. Agle purchase mein adjust ho jayega.\n\n- Vantro Flow`
      : `Namaste ${c.customer_name} ji 🙏\n\nAapka account clear hai. Koi baaki nahi.\n\n- Vantro Flow`;
    if (c.customer_phone) {
      window.open(`https://wa.me/91${c.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      alert("Message copied! Paste in WhatsApp.");
    }
  };

  const filtered = customers.filter(c => c.customer_name.toLowerCase().includes(search.toLowerCase()));
  const totalReceivable = customers.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
  const totalPayable = customers.reduce((s, c) => s + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);
  const selectedCustomer = customers.find(c => c.customer_name === selected);

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Customer Khata</h1>
          <p className="text-xs text-muted">Udhaar aur bhugtan ka hisab</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAddType("debit"); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-danger/20 text-danger px-3 py-2 rounded-xl text-sm font-semibold border border-danger/30 hover:bg-danger/30 transition-colors">
            <FiArrowUp size={14} /> Udhaar Diya
          </button>
          <button onClick={() => { setAddType("credit"); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-success/20 text-success px-3 py-2 rounded-xl text-sm font-semibold border border-success/30 hover:bg-success/30 transition-colors">
            <FiArrowDown size={14} /> Payment Mila
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Total Lena Hai</p>
          <p className="text-xl font-bold text-danger">{fmtINR(totalReceivable)}</p>
          <p className="text-2xs text-muted">{customers.filter(c => c.balance > 0).length} customers</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Total Dena Hai</p>
          <p className="text-xl font-bold text-success">{fmtINR(totalPayable)}</p>
          <p className="text-2xs text-muted">{customers.filter(c => c.balance < 0).length} customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer List */}
        <div>
          <div className="relative mb-3">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Customer dhundo..."
              className="w-full bg-surface-2 border border-white/8 rounded-xl pl-8 pr-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              <FiUser size={32} className="mx-auto mb-2 opacity-30" />
              <p>Koi customer nahi</p>
              <p className="text-xs mt-1">Udhaar ya payment add karein</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => (
                <div key={c.customer_name}
                  onClick={() => selectCustomer(c.customer_name)}
                  className={`card p-3.5 cursor-pointer transition-all border ${selected === c.customer_name ? "border-accent/50 bg-accent-dim" : "border-transparent hover:border-white/10"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {c.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-primary">{c.customer_name}</p>
                          <p className="text-2xs text-muted">{c.entry_count} entries · {fmtDate(c.last_entry)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-bold text-sm ${c.balance > 0 ? "text-danger" : c.balance < 0 ? "text-success" : "text-muted"}`}>
                          {c.balance > 0 ? "+" : ""}{fmtINR(c.balance)}
                        </p>
                        <p className="text-2xs text-muted">{c.balance > 0 ? "lena hai" : c.balance < 0 ? "dena hai" : "clear"}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={e => { e.stopPropagation(); whatsappStatement(c); }}
                          className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
                          <FiMessageSquare size={12} />
                        </button>
                        <FiChevronRight size={12} className="text-muted mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entry Detail */}
        <div>
          {!selected ? (
            <div className="card p-8 text-center">
              <FiUser size={36} className="mx-auto mb-3 text-muted opacity-40" />
              <p className="text-secondary text-sm">Customer select karein</p>
              <p className="text-muted text-xs mt-1">Transaction history dekhne ke liye</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {/* Customer header */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary">{selectedCustomer?.customer_name}</p>
                    <p className="text-xs text-muted">{entries.length} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${(selectedCustomer?.balance ?? 0) > 0 ? "text-danger" : (selectedCustomer?.balance ?? 0) < 0 ? "text-success" : "text-muted"}`}>
                      {fmtINR(selectedCustomer?.balance ?? 0)}
                    </p>
                    <p className="text-2xs text-muted">
                      {(selectedCustomer?.balance ?? 0) > 0 ? "⬆ Lena Hai" : (selectedCustomer?.balance ?? 0) < 0 ? "⬇ Dena Hai" : "✓ Clear"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Entries */}
              <div className="max-h-96 overflow-y-auto">
                {loadingEntries ? (
                  <div className="text-center py-6 text-muted text-sm">Loading...</div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-6 text-muted text-sm">No entries yet</div>
                ) : (
                  entries.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-surface-2/50 group">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${entry.type === "debit" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
                        {entry.type === "debit" ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary font-medium truncate">{entry.note || (entry.type === "debit" ? "Udhaar diya" : "Payment mila")}</p>
                        <p className="text-2xs text-muted">{fmtDate(entry.created_at)} · {entry.payment_mode}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${entry.type === "debit" ? "text-danger" : "text-success"}`}>
                          {entry.type === "debit" ? "+" : "-"}{fmtINR(entry.amount)}
                        </p>
                        <p className="text-2xs text-muted">Bal: {fmtINR(entry.running_balance)}</p>
                      </div>
                      <button onClick={() => deleteEntry(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger transition-all">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Quick add for selected customer */}
              <div className="p-3 border-t border-white/5 flex gap-2">
                <button onClick={() => { setForm(f => ({ ...f, customer_name: selected || "" })); setAddType("debit"); setShowAdd(true); }}
                  className="flex-1 py-2 rounded-xl bg-danger/10 text-danger text-xs font-semibold hover:bg-danger/20 transition-colors">
                  + Udhaar Diya
                </button>
                <button onClick={() => { setForm(f => ({ ...f, customer_name: selected || "" })); setAddType("credit"); setShowAdd(true); }}
                  className="flex-1 py-2 rounded-xl bg-success/10 text-success text-xs font-semibold hover:bg-success/20 transition-colors">
                  + Payment Mila
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface-1 rounded-2xl border border-white/10 overflow-hidden">
            <div className={`px-5 py-4 border-b border-white/5 ${addType === "debit" ? "bg-danger/5" : "bg-success/5"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${addType === "debit" ? "bg-danger/20 text-danger" : "bg-success/20 text-success"}`}>
                    {addType === "debit" ? <FiArrowUp size={16} /> : <FiArrowDown size={16} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">{addType === "debit" ? "Udhaar Diya" : "Payment Mila"}</h3>
                    <p className="text-xs text-muted">{addType === "debit" ? "Customer ko credit diya" : "Customer se paisa mila"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAddType(addType === "debit" ? "credit" : "debit")}
                    className="text-xs text-accent bg-accent-dim px-2 py-1 rounded-lg">Switch</button>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted mb-1 block">Customer Name *</label>
                  <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Sharma ji..." list="customer-names"
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                  <datalist id="customer-names">
                    {customers.map(c => <option key={c.customer_name} value={c.customer_name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-muted mb-1 block">Phone (optional)</label>
                  <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                    placeholder="9876543210" type="tel"
                    className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Amount (₹) *</label>
                <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="5000" type="number"
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Note (optional)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Kya diya / kya liya..."
                  className="w-full bg-surface-2 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1 block">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {["cash", "upi", "bank", "cheque"].map(m => (
                    <button key={m} onClick={() => setForm(f => ({ ...f, payment_mode: m }))}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${form.payment_mode === m ? "bg-white text-black" : "bg-surface-2 text-muted hover:text-primary"}`}>
                      {m === "upi" ? "UPI" : m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl bg-surface-2 text-secondary text-sm font-semibold">Cancel</button>
              <button onClick={addEntry} disabled={saving || !form.customer_name || !form.amount}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-50 ${addType === "debit" ? "bg-danger hover:bg-danger/80" : "bg-success hover:bg-success/80"}`}>
                {saving ? "Saving..." : addType === "debit" ? "Udhaar Add Karo" : "Payment Add Karo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiSend, FiZap, FiPlus, FiTrash2, FiRefreshCw,
  FiBook, FiCpu, FiAlertCircle, FiCheckCircle,
  FiUser, FiMessageSquare,
} from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const RULE_CATEGORIES = ["pricing", "customer", "product", "operations", "credit", "general"];
const STARTER_PROMPTS = [
  "Aaj kitna kamaya aur kitna kharch hua?",
  "Sabse bada outstanding kaun sa hai?",
  "Kal ke liye kya karna chahiye?",
  "Pichhle hafte ki summary do",
  "Sabse pehle kise call karna chahiye?",
  "Aaj ke orders ka status kya hai?",
  "Mera net profit is mahine kitna hai?",
  "Kaun sa maal sabse zyada bika aaj?",
];
const TOOL_LABELS: Record<string,string> = {
  get_invoices: "📋 invoices dekhe",
  get_orders_by_date: "📦 orders check kiye",
  get_expenses_summary: "💸 expenses dekhe",
  search_customer: "🔍 customer khoja",
  add_expense: "✅ expense add kiya",
  get_top_customers: "👑 top customers dekhe",
};

interface Message { role:"user"|"assistant"; content: string; tools_used?: string[]; }
interface Rule { id: string; rule: string; category: string; }

export default function BrainPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [ruleForm, setRuleForm] = useState({ rule:"", category:"general" });
  const [addingRule, setAddingRule] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const token = () => localStorage.getItem("vantro_token") || "";

  const loadRules = async () => {
    const res = await fetch(`${API}/api/ai/brain/rules`, { headers: { Authorization: `Bearer ${token()}` } });
    const d = await res.json();
    setRules(d.rules || []);
  };

  useEffect(() => {
    loadRules();
    // Welcome message
    setMessages([{
      role: "assistant",
      content: "Namaste! Main Vantro Brain hoon — aapka business intelligence AI. Mujhe apne aapke business ke baare mein poochho: sales, outstanding, orders, expenses, kuch bhi. Main live data dekh sakta hoon aur aapko best action suggest karunga. 🧠\n\nAaj ka update lene ke liye kaho: *\"Aaj ki summary do\"*",
    }]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ai/brain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          tools_used: data.tools_used || [],
        }]);
        // Reload rules if an expense was added
        if ((data.tools_used || []).includes("add_expense")) loadRules();
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "Kuch error aa gaya: " + (data.error || "Unknown error") }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error — please try again." }]);
    } finally { setLoading(false); }
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingRule(true);
    try {
      const res = await fetch(`${API}/api/ai/brain/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(ruleForm),
      });
      const d = await res.json();
      if (d.rule) { setRules(r => [...r, d.rule]); setRuleForm({ rule:"", category:"general" }); }
    } finally { setAddingRule(false); }
  };

  const deleteRule = async (id: string) => {
    await fetch(`${API}/api/ai/brain/rules/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
    setRules(r => r.filter(x => x.id !== id));
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Chat clear ho gaya! Kya poochhhna hai?",
    }]);
    setHistory([]);
  };

  return (
    <DashboardLayout pageTitle="Vantro Brain">
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-primary to-accent flex items-center justify-center shadow-button-accent">
              <FiCpu size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm">Vantro Brain v1</p>
              <p className="text-2xs text-muted">Live data · Vocabulary aware · Learns your rules</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRules(!showRules)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all flex items-center gap-1.5 ${showRules ? "bg-brand-primary/15 text-brand-primary border-brand-primary/30" : "border-border text-muted hover:text-primary"}`}>
              <FiBook size={12} /> Rules ({rules.length})
            </button>
            <button onClick={clearChat} className="text-xs px-2 py-1.5 rounded-xl border border-border text-muted hover:text-primary">
              Clear
            </button>
          </div>
        </div>

        {/* Rules panel */}
        {showRules && (
          <div className="card-base p-4 mb-3 shrink-0 max-h-56 overflow-y-auto">
            <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <FiBook size={12} /> Brain Rules — AI always follows these
            </p>
            <form onSubmit={addRule} className="flex gap-2 mb-3">
              <input required value={ruleForm.rule} onChange={e => setRuleForm(f=>({...f, rule:e.target.value}))}
                className="input-base text-xs flex-1" placeholder="e.g. Ramesh ko 60 din credit dena hai, Suresh ko nahi" />
              <select value={ruleForm.category} onChange={e => setRuleForm(f=>({...f, category:e.target.value}))}
                className="input-base text-xs w-24">
                {RULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" disabled={addingRule}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                {addingRule ? <FiRefreshCw className="animate-spin" size={11} /> : <FiPlus size={11} />}
              </button>
            </form>
            {rules.length === 0 ? (
              <p className="text-2xs text-muted text-center py-2">Koi rule nahi — add karo taaki AI aapke business rules follow kare</p>
            ) : (
              <div className="space-y-1.5">
                {rules.map(r => (
                  <div key={r.id} className="flex items-start gap-2 group">
                    <span className="text-2xs text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded-full shrink-0 capitalize">{r.category}</span>
                    <p className="text-xs text-secondary flex-1">{r.rule}</p>
                    <button onClick={() => deleteRule(r.id)} className="text-danger/40 hover:text-danger opacity-0 group-hover:opacity-100 p-0.5">
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-brand-primary/20" : "bg-gradient-to-br from-brand-primary to-accent"}`}>
                {msg.role === "user"
                  ? <FiUser size={13} className="text-brand-primary" />
                  : <FiCpu size={13} className="text-white" />
                }
              </div>
              {/* Bubble */}
              <div className={`max-w-[80%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-primary/20 text-primary rounded-tr-sm"
                    : "bg-surface-2 text-secondary rounded-tl-sm"
                }`}>
                  {msg.content.split("\n").map((line, li) => (
                    <p key={li} className={line === "" ? "h-2" : ""}>{line}</p>
                  ))}
                </div>
                {/* Tool calls used */}
                {msg.tools_used && msg.tools_used.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {msg.tools_used.map((t, ti) => (
                      <span key={ti} className="text-2xs text-muted bg-surface px-1.5 py-0.5 rounded-full border border-border">
                        {TOOL_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-primary to-accent flex items-center justify-center shrink-0">
                <FiCpu size={13} className="text-white animate-pulse" />
              </div>
              <div className="bg-surface-2 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay:"0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay:"150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay:"300ms" }} />
                  <span className="text-2xs text-muted ml-1">Soch raha hoon…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Starter prompts */}
        {messages.length <= 1 && (
          <div className="shrink-0 flex flex-wrap gap-1.5 mb-2">
            {STARTER_PROMPTS.slice(0, 4).map(p => (
              <button key={p} onClick={() => send(p)}
                className="text-2xs text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-1.5 rounded-full hover:bg-brand-primary/20 transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 flex gap-2 pt-2 border-t border-border">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Poochho kuch bhi — aaj ki sale, outstanding, orders…"
            className="input-base flex-1 text-sm px-4 py-3"
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="btn-primary px-4 py-3 rounded-xl flex items-center gap-2 disabled:opacity-40">
            {loading ? <FiRefreshCw className="animate-spin" size={16} /> : <FiSend size={16} />}
          </button>
        </div>

        {/* Live data badge */}
        <p className="text-center text-2xs text-muted mt-1.5 shrink-0">
          🟢 Live — orders, invoices, expenses, vocabulary sab connected hai
        </p>
      </div>
    </DashboardLayout>
  );
}

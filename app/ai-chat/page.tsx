"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { api, getUser, type ChatMessage } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import {
  FiSend, FiZap, FiUser, FiCpu, FiTrendingUp,
  FiPhone, FiAlertTriangle, FiCheckCircle, FiActivity,
  FiTarget, FiClock, FiRefreshCw,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Debtor {
  customer_name: string;
  customer_phone?: string;
  invoice_amount: number;
  days_overdue: number;
  score: number;
  paymentProb: number;
  tier: "high" | "medium" | "low";
  action: string;
  callCount: number;
  hasPromise: boolean;
  daysSinceContact: number;
}

interface MLBriefing {
  briefing: string;
  health_score: number;
  total_outstanding: number;
  expected_inflow_7d: number;
  avg_payment_probability: number;
  debtors: Debtor[];
  stats: { total: number; high_priority: number; medium_priority: number; low_priority: number };
}

type Message = { role: "user" | "assistant"; content: string };

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K`
    : `₹${n}`;
}

function formatMsg(text: string) {
  return text.split("\n").map((line, i) => {
    const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p key={i} className={`text-sm leading-relaxed ${line === "" ? "mt-2" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }} />
    );
  });
}

const tierColor: Record<string, string> = {
  high: "#10D98A", medium: "#F5A524", low: "#F5424D",
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "Namaste! Main aapka AI Founder hoon — aapka business data dekh sakta hoon, invoices mark kar sakta hoon, WhatsApp messages likh sakta hoon, aur strategic advice de sakta hoon.\n\nKya poochna hai?",
  },
];

const QUICK_PROMPTS = [
  "Aaj kisko call karoon?",
  "Mere top overdue customers kaun hain?",
  "Mehta Fabrics ke liye WhatsApp message likho",
  "Mera cash flow kaisa hai?",
  "Kaunse invoices 60+ days overdue hain?",
];

// ─── Health Ring ─────────────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 65 ? "#10D98A" : score >= 40 ? "#F5A524" : "#F5424D";
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1E2D4A" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-black" style={{ color }}>{score}</p>
        <p className="text-2xs text-muted">Health</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIFounderPage() {
  const [briefing, setBriefing]   = useState<MLBriefing | null>(null);
  const [mlLoading, setMlLoading] = useState(true);
  const [messages, setMessages]   = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tab, setTab]             = useState<"briefing" | "chat">("briefing");
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  // Fetch ML briefing on mount
  useEffect(() => {
    if (!user?.id) { setMlLoading(false); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : "";
    fetch(`${BASE}/api/ml/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setBriefing(d); })
      .catch(() => {})
      .finally(() => setMlLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendChat = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chatLoading) return;
    setInput("");
    setTab("chat");

    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: msg });
      posthog.capture("ai_founder_message", { length: msg.length });
      const data = await api.aiChat(user?.id || "", history, user?.business_name || "");
      let reply = data.message || "Dobara try karein.";
      if (data.actions?.length) reply += "\n\n" + data.actions.join("\n");
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Backend se connect nahi ho pa raha. Internet check karein.",
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="AI Founder">
      <div className="max-w-5xl mx-auto space-y-4 page-enter">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
                <FiCpu size={15} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-primary tracking-tight">AI Founder</h2>
              <span className="text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
                LLaMA 70B Neural Network
              </span>
            </div>
            <p className="text-sm text-muted">Your AI co-founder — sees your data, predicts payments, advises strategy.</p>
          </div>
          <button onClick={() => {
            setMlLoading(true);
            const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : "";
            fetch(`${BASE}/api/ml/briefing`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json()).then(d => { if (d.success) setBriefing(d); }).catch(() => {}).finally(() => setMlLoading(false));
          }}
            className="p-2 rounded-xl bg-surface-2 border border-border text-muted hover:text-primary hover:border-accent/30 transition-all">
            <FiRefreshCw size={14} className={mlLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
          {[
            { key: "briefing", label: "ML Dashboard", icon: FiActivity },
            { key: "chat",     label: "Chat",         icon: FiZap },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as "briefing" | "chat")}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === key ? "bg-accent text-white shadow-button-accent" : "text-secondary hover:text-primary",
              ].join(" ")}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* ── ML DASHBOARD TAB ─────────────────────────── */}
        {tab === "briefing" && (
          <div className="space-y-4">
            {mlLoading ? (
              <div className="card-premium p-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent-dim border border-accent/20 flex items-center justify-center">
                  <FiCpu size={20} className="text-accent animate-pulse" />
                </div>
                <p className="text-sm text-muted animate-pulse">Neural network is analyzing your business...</p>
              </div>
            ) : !briefing ? (
              <div className="card-premium p-8 text-center">
                <p className="text-sm text-secondary mb-2">No invoice data found.</p>
                <p className="text-xs text-muted">Upload invoices from the Collections page to activate AI Founder.</p>
              </div>
            ) : (
              <>
                {/* Business Health + Briefing */}
                <div className="card-premium p-5">
                  <div className="flex items-start gap-5">
                    <HealthRing score={briefing.health_score} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCpu size={13} className="text-accent" />
                        <p className="text-xs font-bold text-accent uppercase tracking-wider">AI Morning Briefing</p>
                      </div>
                      <p className="text-sm text-secondary leading-relaxed">{briefing.briefing}</p>
                    </div>
                  </div>
                </div>

                {/* ML Metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Total Outstanding",    value: fmt(briefing.total_outstanding),       icon: FiAlertTriangle, color: "#F5424D" },
                    { label: "Expected This Week",   value: fmt(briefing.expected_inflow_7d),       icon: FiTrendingUp,    color: "#10D98A" },
                    { label: "Avg Pay Probability",  value: `${briefing.avg_payment_probability}%`, icon: FiTarget,        color: "#0066FF" },
                    { label: "High-Priority Leads",  value: String(briefing.stats.high_priority),   icon: FiActivity,      color: "#9B6DFF" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card-premium p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                          <Icon size={11} style={{ color }} />
                        </div>
                        <p className="text-2xs text-muted">{label}</p>
                      </div>
                      <p className="text-xl font-black text-primary">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Neural Network Priority List */}
                <div className="card-premium overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <p className="text-sm font-bold text-primary">Neural Network Priority Ranking</p>
                    <p className="text-xs text-muted mt-0.5">ML-scored by payment probability · Features: days overdue, engagement, amount, contact history</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {briefing.debtors.slice(0, 10).map((d, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/50 transition-colors">
                        {/* Rank */}
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-black shrink-0"
                          style={{ background: `${tierColor[d.tier]}18`, color: tierColor[d.tier], border: `1px solid ${tierColor[d.tier]}30` }}>
                          {i + 1}
                        </div>

                        {/* Name + action */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{d.customer_name}</p>
                          <p className="text-2xs text-muted truncate">{d.action}</p>
                        </div>

                        {/* Amount + days */}
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-primary">{fmt(d.invoice_amount)}</p>
                          <p className="text-2xs text-muted">{d.days_overdue}d overdue</p>
                        </div>

                        {/* ML Probability bar */}
                        <div className="w-24 shrink-0 hidden md:block">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-2xs text-muted">Pay prob.</p>
                            <p className="text-2xs font-bold" style={{ color: tierColor[d.tier] }}>{d.paymentProb}%</p>
                          </div>
                          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${d.paymentProb}%`, background: tierColor[d.tier] }} />
                          </div>
                        </div>

                        {/* ML Score chip */}
                        <div className="shrink-0 hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg"
                          style={{ background: `${tierColor[d.tier]}12`, border: `1px solid ${tierColor[d.tier]}25` }}>
                          <FiActivity size={10} style={{ color: tierColor[d.tier] }} />
                          <span className="text-2xs font-black" style={{ color: tierColor[d.tier] }}>{d.score}</span>
                        </div>

                        {/* Call button */}
                        {d.customer_phone && (
                          <a href={`tel:+91${d.customer_phone}`}
                            className="shrink-0 w-7 h-7 rounded-lg bg-success-dim border border-success/20 flex items-center justify-center hover:bg-success hover:text-white transition-all text-success">
                            <FiPhone size={11} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {briefing.debtors.length > 10 && (
                    <div className="px-5 py-3 border-t border-border">
                      <p className="text-xs text-muted text-center">{briefing.debtors.length - 10} more debtors scored · Ask AI Founder for full list</p>
                    </div>
                  )}
                </div>

                {/* Priority breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "High Priority",   count: briefing.stats.high_priority,   desc: "Likely to pay",    color: "#10D98A" },
                    { label: "Medium Priority", count: briefing.stats.medium_priority, desc: "Need follow-up",   color: "#F5A524" },
                    { label: "Low Priority",    count: briefing.stats.low_priority,    desc: "At risk / stuck",  color: "#F5424D" },
                  ].map(({ label, count, desc, color }) => (
                    <div key={label} className="card-premium p-4 text-center">
                      <p className="text-2xl font-black" style={{ color }}>{count}</p>
                      <p className="text-xs font-semibold text-primary mt-0.5">{label}</p>
                      <p className="text-2xs text-muted">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Quick prompts */}
                <div className="card-premium p-4">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">Ask AI Founder</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map(p => (
                      <button key={p} onClick={() => sendChat(p)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2 text-secondary hover:text-accent hover:border-accent/40 transition-all">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CHAT TAB ─────────────────────────────────── */}
        {tab === "chat" && (
          <div className="card-premium overflow-hidden flex flex-col" style={{ height: "calc(100vh - 260px)", minHeight: "500px" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={[
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    m.role === "user" ? "bg-accent text-white" : "bg-gradient-accent shadow-button-accent",
                  ].join(" ")}>
                    {m.role === "user"
                      ? <FiUser size={13} className="text-white" />
                      : <FiCpu size={13} className="text-white" />}
                  </div>
                  <div className={[
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    m.role === "user"
                      ? "bg-accent text-white rounded-tr-sm"
                      : "card-premium rounded-tl-sm",
                  ].join(" ")}>
                    {m.role === "user"
                      ? <p className="text-sm">{m.content}</p>
                      : <div className="text-secondary space-y-0.5">{formatMsg(m.content)}</div>}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-accent shadow-button-accent flex items-center justify-center shrink-0">
                    <FiCpu size={13} className="text-white" />
                  </div>
                  <div className="card-premium rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts inside chat */}
            {messages.length <= 1 && (
              <div className="px-5 pb-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => sendChat(p)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2 text-secondary hover:text-accent hover:border-accent/40 transition-all">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-4 border-t border-border shrink-0">
              <div className="flex gap-3">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Apna sawal poochein... (Ask anything about your business)"
                  className="flex-1 bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                />
                <Button onClick={() => sendChat()} loading={chatLoading} icon={<FiSend size={14} />} size="md">
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

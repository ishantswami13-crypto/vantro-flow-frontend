"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { api, getUser, type ChatMessage } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import {
  FiSend, FiZap, FiUser, FiCpu, FiTrendingUp,
  FiPhone, FiAlertTriangle, FiCheckCircle, FiActivity,
  FiTarget, FiRefreshCw, FiMic, FiMicOff,
  FiMessageSquare, FiCopy, FiPlay, FiX, FiSettings,
  FiShield, FiBarChart2, FiInfo,
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

interface CallScript {
  opening: string;
  main_ask: string;
  objection_handler: string;
  closing: string;
  whatsapp_followup: string;
  key_phrases: string[];
  tone_rating: string;
}

interface BulkMsg { name: string; message: string; urgency: string; phone?: string }

type Message = { role: "user" | "assistant"; content: string };
type TabKey = "briefing" | "chat" | "callcenter";

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K`
    : `₹${n}`;
}

function formatMsg(text: string) {
  // Render **bold** safely without dangerouslySetInnerHTML — split on bold markers
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className={`text-sm leading-relaxed ${line === "" ? "mt-2" : ""}`}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
      </p>
    );
  });
}

const tierColor: Record<string, string> = {
  high: "#10D98A", medium: "#F5A524", low: "#F5424D",
};

const INITIAL_MESSAGES: Message[] = [{
  role: "assistant",
  content: "Namaste! Main aapka AI Founder hoon — aapka business data dekh sakta hoon, invoices mark kar sakta hoon, WhatsApp messages likh sakta hoon, call scripts generate kar sakta hoon, aur strategic advice de sakta hoon.\n\nKya poochna hai? Aap bolke bhi pooch sakte hain — mic button press karein.",
}];

const QUICK_PROMPTS = [
  "Aaj kisko call karoon?",
  "Mere top overdue customers kaun hain?",
  "Mera cash flow kaisa hai?",
  "Kaunse invoices 60+ days overdue hain?",
  "Iss hafte kitna paisa aayega?",
];

// ─── Health Ring ─────────────────────────────────────────────────────────────
function HealthRing({ score }: { score: number }) {
  const r = 38; const circ = 2 * Math.PI * r;
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

// ─── Call Script Modal ───────────────────────────────────────────────────────
function CallScriptModal({ debtor, script, onClose }: {
  debtor: Debtor;
  script: CallScript;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copy(text, id)}
      className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-muted hover:text-accent transition-colors">
      {copied === id ? <FiCheckCircle size={12} className="text-success" /> : <FiCopy size={12} />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-1 border border-border rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-bold text-primary">AI Call Script</p>
            <p className="text-xs text-muted">{debtor.customer_name} · {fmt(debtor.invoice_amount)} · {debtor.days_overdue}d overdue</p>
          </div>
          <div className="flex items-center gap-2">
            {debtor.customer_phone && (
              <a href={`tel:+91${debtor.customer_phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-dim border border-success/30 text-success text-xs font-bold hover:bg-success hover:text-white transition-all">
                <FiPhone size={11} /> Call Now
              </a>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-primary">
              <FiX size={14} />
            </button>
          </div>
        </div>

        {/* Script sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {[
            { key: "opening",           label: "Opening (Greeting)", Icon: FiPhone,       text: script.opening,           color: "#0066FF" },
            { key: "main_ask",          label: "Main Ask",           Icon: FiMessageSquare, text: script.main_ask,        color: "#9B6DFF" },
            { key: "objection_handler", label: "If They Hesitate",   Icon: FiShield,      text: script.objection_handler, color: "#F5A524" },
            { key: "closing",           label: "Closing",            Icon: FiCheckCircle, text: script.closing,           color: "#10D98A" },
          ].map(({ key, label, Icon, text, color }) => (
            <div key={key} className="bg-surface-2 rounded-xl p-3.5 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon size={13} style={{ color }} />
                  <p className="text-xs font-bold" style={{ color }}>{label}</p>
                </div>
                <CopyBtn text={text} id={key} />
              </div>
              <p className="text-sm text-secondary leading-relaxed">{text}</p>
            </div>
          ))}

          {/* WhatsApp follow-up */}
          <div className="bg-[#128C7E]/10 rounded-xl p-3.5 border border-[#128C7E]/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <FiMessageSquare size={12} className="text-[#25D366]" />
                <p className="text-xs font-bold text-[#25D366]">WhatsApp Follow-Up</p>
              </div>
              <div className="flex items-center gap-1">
                <CopyBtn text={script.whatsapp_followup} id="wa" />
                {debtor.customer_phone && (
                  <a href={`https://wa.me/91${debtor.customer_phone}?text=${encodeURIComponent(script.whatsapp_followup)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-2xs px-2 py-0.5 rounded-full bg-[#25D366] text-white font-bold hover:opacity-90 transition-opacity">
                    Send
                  </a>
                )}
              </div>
            </div>
            <p className="text-sm text-secondary leading-relaxed">{script.whatsapp_followup}</p>
          </div>

          {/* Key phrases */}
          <div>
            <p className="text-2xs font-bold text-muted uppercase tracking-wider mb-2">Key Phrases to Use</p>
            <div className="flex flex-wrap gap-2">
              {script.key_phrases?.map((p, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-accent-dim border border-accent/20 text-accent font-medium">
                  "{p}"
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Debtor Call Card ─────────────────────────────────────────────────────────
function DebtorCallCard({ d, rank, token, twilioReady }: { d: Debtor; rank: number; token: string; twilioReady: boolean }) {
  const [script, setScript]       = useState<CallScript | null>(null);
  const [loading, setLoading]     = useState(false);
  const [calling, setCalling]     = useState(false);
  const [callDone, setCallDone]   = useState(false);
  const [tone, setTone]           = useState<"soft" | "firm" | "urgent">("soft");
  const [showModal, setShowModal] = useState(false);

  const generateScript = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ai/call-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_name: d.customer_name, invoice_amount: d.invoice_amount,
          days_overdue: d.days_overdue, call_count: d.callCount, has_promise: d.hasPromise, tone }),
      });
      const data = await r.json();
      if (data.success) { setScript(data.script); setShowModal(true); }
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  const initiateAICall = async () => {
    if (!d.customer_phone) return;
    setCalling(true);
    try {
      const r = await fetch(`${BASE}/api/voice/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customer_name: d.customer_name, customer_phone: d.customer_phone,
          invoice_amount: d.invoice_amount, days_overdue: d.days_overdue, tone }),
      });
      const data = await r.json();
      if (data.success) setCallDone(true);
    } catch { /* noop */ }
    finally { setCalling(false); }
  };

  const color = tierColor[d.tier];

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-xl border border-border hover:border-border/70 transition-all">
        {/* Rank */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-2xs font-black shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
          {rank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{d.customer_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xs text-muted">{fmt(d.invoice_amount)}</span>
            <span className="text-2xs text-muted">·</span>
            <span className="text-2xs font-semibold" style={{ color }}>{d.paymentProb}% pay prob</span>
            <span className="text-2xs text-muted">·</span>
            <span className="text-2xs text-muted">{d.days_overdue}d overdue</span>
          </div>
        </div>

        {/* Tone selector + generate */}
        <div className="flex items-center gap-2 shrink-0">
          <select value={tone} onChange={e => setTone(e.target.value as "soft" | "firm" | "urgent")}
            className="text-2xs bg-surface-3 border border-border rounded-lg px-2 py-1 text-secondary focus:outline-none focus:border-accent cursor-pointer">
            <option value="soft">Soft</option>
            <option value="firm">Firm</option>
            <option value="urgent">Urgent</option>
          </select>

          <button onClick={generateScript} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-dim border border-accent/30 text-accent text-2xs font-bold hover:bg-accent hover:text-white transition-all disabled:opacity-50">
            {loading ? <FiRefreshCw size={10} className="animate-spin" /> : <FiPlay size={10} />}
            {loading ? "AI..." : "Script"}
          </button>

          {/* AI Call button — uses Twilio if configured, else manual dial */}
          {d.customer_phone && (
            twilioReady ? (
              <button onClick={initiateAICall} disabled={calling || callDone}
                title="AI calls this debtor automatically"
                className={["w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs font-black",
                  callDone ? "bg-success text-white" : calling ? "bg-surface-2 border border-border text-muted" : "bg-success-dim border border-success/20 text-success hover:bg-success hover:text-white",
                ].join(" ")}>
                {callDone ? <FiCheckCircle size={11} /> : calling ? <FiRefreshCw size={10} className="animate-spin" /> : <FiPhone size={11} />}
              </button>
            ) : (
              <a href={`tel:+91${d.customer_phone}`}
                className="w-7 h-7 rounded-lg bg-success-dim border border-success/20 flex items-center justify-center hover:bg-success hover:text-white transition-all text-success">
                <FiPhone size={11} />
              </a>
            )
          )}
        </div>
      </div>

      {showModal && script && (
        <CallScriptModal debtor={d} script={script} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIFounderPage() {
  const [briefing, setBriefing]       = useState<MLBriefing | null>(null);
  const [mlLoading, setMlLoading]     = useState(true);
  const [messages, setMessages]       = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput]             = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [tab, setTab]                 = useState<TabKey>("briefing");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [bulkMsgs, setBulkMsgs]       = useState<BulkMsg[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [copiedBulk, setCopiedBulk]   = useState<number | null>(null);
  const [ownerVoiceActive, setOwnerVoiceActive] = useState(false);
  const [ownerName, setOwnerName]     = useState("");
  const [twilioReady, setTwilioReady] = useState(false);
  const [twilioMissing, setTwilioMissing] = useState<string[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const recogRef   = useRef<SpeechRecognition | null>(null);
  const user = getUser();
  const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") || "" : "";

  // Voice support check
  useEffect(() => {
    const SR = (window as Window & typeof globalThis).SpeechRecognition
      || (window as Window & typeof globalThis).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const fetchBriefing = useCallback(() => {
    if (!user?.id) { setMlLoading(false); return; }
    setMlLoading(true);
    fetch(`${BASE}/api/ml/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setBriefing(d); })
      .catch(() => {})
      .finally(() => setMlLoading(false));
  }, [user?.id, token]);

  useEffect(() => { fetchBriefing(); }, [fetchBriefing]);

  // Load voice profile + Twilio config
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (d.settings?.owner_name) { setOwnerName(d.settings.owner_name); setOwnerVoiceActive(!!(d.settings.owner_name && d.settings.ai_persona)); }
      }).catch(() => {});
    fetch(`${BASE}/api/voice/config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        setTwilioReady(d.configured || false);
        setTwilioMissing(d.missing || []);
      }).catch(() => {});
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Voice input ──────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = (window as Window & typeof globalThis).SpeechRecognition
      || (window as Window & typeof globalThis).webkitSpeechRecognition;
    if (!SR) return;
    const recog = new SR();
    recog.lang = "hi-IN";
    recog.continuous = false;
    recog.interimResults = true;

    recog.onstart  = () => setIsListening(true);
    recog.onend    = () => setIsListening(false);
    recog.onerror  = () => setIsListening(false);
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[e.resultIndex];
      const text   = result[0].transcript;
      setInput(text);
      if (result.isFinal) {
        setIsListening(false);
        // Auto-send after 800ms
        setTimeout(() => {
          if (text.trim()) sendChat(text.trim());
        }, 800);
      }
    };

    recogRef.current = recog;
    recog.start();
    setTab("chat");
  };

  const stopVoice = () => {
    recogRef.current?.stop();
    setIsListening(false);
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const sendChat = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || chatLoading) return;
    setInput("");
    setTab("chat");

    setMessages(prev => [...prev, { role: "user", content: msg }]);
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
      setMessages(prev => [...prev, { role: "assistant", content: "Backend se connect nahi ho pa raha. Internet check karein." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Bulk WhatsApp ────────────────────────────────────────────────────────
  const generateBulkWA = async () => {
    setBulkLoading(true);
    try {
      const r = await fetch(`${BASE}/api/ai/bulk-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (data.success) setBulkMsgs(data.messages);
    } catch { /* noop */ }
    finally { setBulkLoading(false); }
  };

  const copyBulk = (text: string, i: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedBulk(i);
      setTimeout(() => setCopiedBulk(null), 2000);
    });
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "briefing",   label: "ML Dashboard", icon: FiActivity },
    { key: "chat",       label: "Chat",          icon: FiZap },
    { key: "callcenter", label: "Call Center",   icon: FiPhone },
  ];

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
                LLaMA 70B
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-muted">Sees your data · generates scripts · advises strategy</p>
              {ownerVoiceActive ? (
                <span className="flex items-center gap-1 text-2xs font-bold text-success bg-success-dim border border-success/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
                  Speaking as {ownerName}
                </span>
              ) : (
                <a href="/settings" className="text-2xs text-accent underline underline-offset-2 hover:no-underline">
                  Set up voice profile →
                </a>
              )}
            </div>
          </div>
          <button onClick={fetchBriefing}
            className="p-2 rounded-xl bg-surface-2 border border-border text-muted hover:text-primary hover:border-accent/30 transition-all">
            <FiRefreshCw size={14} className={mlLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === key ? "bg-accent text-white shadow-button-accent" : "text-secondary hover:text-primary",
              ].join(" ")}>
              <Icon size={12} /> {label}
              {key === "callcenter" && (
                <span className="ml-0.5 text-2xs px-1 py-0 rounded-full bg-white/20 font-mono">
                  AI
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ML DASHBOARD ──────────────────────────────── */}
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
                {/* Health + Briefing */}
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

                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Total Outstanding", value: fmt(briefing.total_outstanding), icon: FiAlertTriangle, color: "#F5424D" },
                    { label: "Expected This Week", value: fmt(briefing.expected_inflow_7d), icon: FiTrendingUp, color: "#10D98A" },
                    { label: "Avg Pay Probability", value: `${briefing.avg_payment_probability}%`, icon: FiTarget, color: "#0066FF" },
                    { label: "High-Priority Leads", value: String(briefing.stats.high_priority), icon: FiActivity, color: "#9B6DFF" },
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

                {/* Neural Priority List */}
                <div className="card-premium overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <p className="text-sm font-bold text-primary">Neural Network Priority Ranking</p>
                    <p className="text-xs text-muted mt-0.5">ML-scored · click "Call Center" tab to generate call scripts</p>
                  </div>
                  <div className="divide-y divide-border/50">
                    {briefing.debtors.slice(0, 8).map((d, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/50 transition-colors">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-2xs font-black shrink-0"
                          style={{ background: `${tierColor[d.tier]}18`, color: tierColor[d.tier], border: `1px solid ${tierColor[d.tier]}30` }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary truncate">{d.customer_name}</p>
                          <p className="text-2xs text-muted truncate">{d.action}</p>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-primary">{fmt(d.invoice_amount)}</p>
                          <p className="text-2xs text-muted">{d.days_overdue}d overdue</p>
                        </div>
                        <div className="w-20 shrink-0 hidden md:block">
                          <div className="flex justify-between mb-1">
                            <p className="text-2xs text-muted">Pay prob.</p>
                            <p className="text-2xs font-bold" style={{ color: tierColor[d.tier] }}>{d.paymentProb}%</p>
                          </div>
                          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${d.paymentProb}%`, background: tierColor[d.tier] }} />
                          </div>
                        </div>
                        <button onClick={() => setTab("callcenter")}
                          className="shrink-0 text-2xs px-2.5 py-1 rounded-lg bg-accent-dim border border-accent/20 text-accent font-bold hover:bg-accent hover:text-white transition-all">
                          Script
                        </button>
                      </div>
                    ))}
                  </div>
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

        {/* ── CHAT TAB ──────────────────────────────────── */}
        {tab === "chat" && (
          <div className="card-premium overflow-hidden flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: "480px" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={[
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    m.role === "user" ? "bg-accent text-white" : "bg-gradient-accent shadow-button-accent",
                  ].join(" ")}>
                    {m.role === "user" ? <FiUser size={13} className="text-white" /> : <FiCpu size={13} className="text-white" />}
                  </div>
                  <div className={[
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    m.role === "user" ? "bg-accent text-white rounded-tr-sm" : "card-premium rounded-tl-sm",
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
                    <FiCpu size={13} className="text-white animate-pulse" />
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

            {/* Quick prompts if fresh */}
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

            {/* Input + mic */}
            <div className="px-5 py-4 border-t border-border shrink-0">
              {isListening && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-xs text-red-400 font-semibold">Listening... bolein aur ruk jayein</p>
                  <p className="text-xs text-secondary ml-2 flex-1 truncate italic">{input || "..."}</p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Kuch bhi poochein... ya mic button dabayein"
                  className="flex-1 bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-4 py-3 focus:outline-none focus:border-accent transition-colors"
                />

                {/* Mic button */}
                {voiceSupported && (
                  <button
                    onMouseDown={startVoice}
                    onMouseUp={stopVoice}
                    onTouchStart={startVoice}
                    onTouchEnd={stopVoice}
                    className={[
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 select-none",
                      isListening
                        ? "bg-red-500 text-white shadow-lg scale-110"
                        : "bg-surface-2 border border-border text-muted hover:text-accent hover:border-accent/40",
                    ].join(" ")}
                    title="Hold to speak (Hindi/Hinglish)">
                    {isListening ? <FiMicOff size={16} /> : <FiMic size={16} />}
                  </button>
                )}

                <Button onClick={() => sendChat()} loading={chatLoading} icon={<FiSend size={14} />} size="md">
                  Send
                </Button>
              </div>
              {voiceSupported && (
                <p className="text-2xs text-muted mt-1.5 text-center">Mic button dabakar Hindi/Hinglish mein bolein — AI samajh lega</p>
              )}
            </div>
          </div>
        )}

        {/* ── CALL CENTER TAB ───────────────────────────── */}
        {tab === "callcenter" && (
          <div className="space-y-4">
            {/* Intro banner */}
            <div className="card-premium p-5 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-success/5 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-success-dim border border-success/20 flex items-center justify-center shrink-0">
                  <FiPhone size={16} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary mb-1">AI Call Center</p>
                  <p className="text-xs text-secondary leading-relaxed">
                    AI generates a personalized Hinglish call script for each debtor — opening, main ask, objection handler, and WhatsApp follow-up.
                    Select tone (Soft / Firm / Urgent) based on the relationship and click Generate.
                  </p>
                </div>
              </div>
            </div>

            {/* Priority debtors */}
            {mlLoading ? (
              <div className="card-premium p-8 text-center">
                <FiCpu size={20} className="text-accent animate-pulse mx-auto mb-2" />
                <p className="text-sm text-muted">Loading debtors...</p>
              </div>
            ) : !briefing?.debtors?.length ? (
              <div className="card-premium p-8 text-center">
                <p className="text-sm text-secondary mb-1">No overdue debtors found.</p>
                <p className="text-xs text-muted">Add invoices from Collections to use Call Center.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Priority Debtors — {briefing.debtors.length} total
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-2xs text-success font-semibold">ML Scored</span>
                  </div>
                </div>
                {/* Twilio setup nudge */}
                {!twilioReady && twilioMissing.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                    <span className="text-lg shrink-0">📞</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-primary">Activate AI Calling</p>
                      <p className="text-2xs text-muted">Add Twilio keys to Railway → AI will auto-call debtors in your voice</p>
                    </div>
                    <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-2xs px-2.5 py-1.5 rounded-lg bg-accent-dim border border-accent/20 text-accent font-bold hover:bg-accent hover:text-white transition-all">
                      <FiSettings size={10} /> Setup
                    </a>
                  </div>
                )}

                {twilioReady && (
                  <div className="flex items-center gap-2 p-2.5 bg-success/5 border border-success/20 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
                    <p className="text-2xs text-success font-semibold">AI Calling active — phone button will auto-call debtors in your voice</p>
                  </div>
                )}

                {briefing.debtors.slice(0, 12).map((d, i) => (
                  <DebtorCallCard key={i} d={d} rank={i + 1} token={token} twilioReady={twilioReady} />
                ))}
              </div>
            )}

            {/* Bulk WhatsApp */}
            <div className="card-premium overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FiMessageSquare size={14} className="text-[#25D366]" />
                    <p className="text-sm font-bold text-primary">Bulk WhatsApp Generator</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5">AI drafts personalized messages for all high-priority debtors at once</p>
                </div>
                <button onClick={generateBulkWA} disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all disabled:opacity-50">
                  {bulkLoading ? <FiRefreshCw size={12} className="animate-spin" /> : <FiZap size={12} />}
                  {bulkLoading ? "Generating..." : "Generate All"}
                </button>
              </div>

              {bulkMsgs.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {bulkMsgs.map((m, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-xs font-bold text-primary">{m.name}</p>
                            <span className="text-2xs px-1.5 py-0.5 rounded-full font-bold"
                              style={{
                                background: m.urgency === "high" ? "#F5424D15" : m.urgency === "medium" ? "#F5A52415" : "#10D98A15",
                                color: m.urgency === "high" ? "#F5424D" : m.urgency === "medium" ? "#F5A524" : "#10D98A",
                                border: `1px solid ${m.urgency === "high" ? "#F5424D25" : m.urgency === "medium" ? "#F5A52425" : "#10D98A25"}`,
                              }}>
                              {m.urgency}
                            </span>
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">{m.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-1">
                          <button onClick={() => copyBulk(m.message, i)}
                            className="w-7 h-7 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted hover:text-accent transition-all">
                            {copiedBulk === i ? <FiCheckCircle size={12} className="text-success" /> : <FiCopy size={12} />}
                          </button>
                          {m.phone && (
                            <a href={`https://wa.me/91${m.phone}?text=${encodeURIComponent(m.message)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all">
                              <FiMessageSquare size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !bulkLoading ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-muted">Click "Generate All" to draft Hinglish WhatsApp messages for all overdue debtors</p>
                </div>
              ) : null}
            </div>

            {/* Capabilities */}
            <div className="card-premium p-5">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">What AI Founder Can Do</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { Icon: FiTarget,       label: "Priority Scoring", desc: "ML ranks debtors by pay probability",  color: "#0066FF" },
                  { Icon: FiPhone,        label: "Call Scripts",     desc: "Hinglish scripts per debtor, any tone", color: "#10D98A" },
                  { Icon: FiMessageSquare,label: "WhatsApp Drafts",  desc: "Personalized messages in seconds",      color: "#9B6DFF" },
                  { Icon: FiBarChart2,    label: "Cash Forecasting", desc: "Predict inflow for next 7/30 days",     color: "#F5A524" },
                  { Icon: FiMic,          label: "Voice Input",      desc: "Ask questions by speaking in Hindi",    color: "#F5424D" },
                  { Icon: FiCpu,          label: "Business Strategy",desc: "LLaMA 70B — your AI co-founder",        color: "#10D98A" },
                ].map(({ Icon, label, desc, color }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 bg-surface-2 rounded-xl border border-border">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary">{label}</p>
                      <p className="text-2xs text-muted mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

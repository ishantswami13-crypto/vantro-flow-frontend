"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { FiSend, FiZap, FiUser, FiMessageSquare } from "react-icons/fi";

type Message = { role: "user" | "assistant"; content: string; time: string };

const SUGGESTIONS = [
  "Who should I call first today?",
  "Generate a WhatsApp message for Mehta Fabrics",
  "What is my total outstanding amount?",
  "Show me customers overdue more than 30 days",
  "What's my cash runway?",
  "Which customers are most likely to pay?",
];

const INITIAL: Message[] = [
  {
    role: "assistant",
    content: "Namaste! I'm your Vantro AI Assistant. I can help you with:\n\n• **Collections** — who to call, payment follow-ups\n• **Cash flow** — runway, forecasts, urgent collections\n• **Customer insights** — who's likely to pay, risk analysis\n• **WhatsApp messages** — Hinglish collection messages\n• **Data queries** — outstanding amounts, overdue lists\n\nAap kya jaanna chahte hain?",
    time: "Now",
  },
];

const MOCK_RESPONSES: Record<string, string> = {
  call: "**Top 3 customers to call today:**\n\n1. 🔴 **Mehta Fabrics Pvt Ltd** — ₹8.4L, 62 days overdue, AI score 82% (high probability of payment)\n2. 🟡 **Sharma Steel Works** — ₹5.2L, 45 days overdue, AI score 67%\n3. 🟡 **Patel Agro Industries** — ₹3.1L, 38 days overdue, AI score 54%\n\nMehta Fabrics se shuru karein — unka payment score sabse zyada hai.",
  whatsapp: "**WhatsApp message for Mehta Fabrics:**\n\n---\nNamaste Mehta ji 🙏\n\nUmeed hai aap theek hain. Hamare records mein aapka ₹8,40,000 ka payment 62 din se pending hai.\n\nKya aap is hafte payment arrange kar sakte hain? Aur koi problem ho toh batayein — hum milke solution nikaalte hain.\n\nDhanyawad\nVantro Team\n---\n\n*Message copied to clipboard!*",
  outstanding: "**Your Outstanding Summary:**\n\n• Total Outstanding: **₹45.2L** (42 customers)\n• Overdue > 30 days: **₹28.7L** (18 customers)\n• Overdue > 60 days: **₹12.1L** (7 customers) ⚠️\n• Expected this week: **₹8.4L** (promises made)\n\nSabse urgent: Mehta Fabrics ₹8.4L, Sharma Steel ₹5.2L",
  cash: "**Cash Flow Analysis:**\n\n• Current Cash Runway: **12 days** 🚨 Critical\n• Pessimistic Forecast: Runs out in 12 days\n• Expected Forecast: Stabilises at 28 days if ₹8L collected\n• Optimistic Forecast: 45 days runway\n\n**Action needed:** Collect at least ₹8L this week. Call Mehta Fabrics and Sharma Steel first.",
};

function getResponse(input: string): string {
  const l = input.toLowerCase();
  if (l.includes("call") || l.includes("priority") || l.includes("first")) return MOCK_RESPONSES.call;
  if (l.includes("whatsapp") || l.includes("message") || l.includes("sms")) return MOCK_RESPONSES.whatsapp;
  if (l.includes("outstanding") || l.includes("total") || l.includes("amount")) return MOCK_RESPONSES.outstanding;
  if (l.includes("cash") || l.includes("runway") || l.includes("forecast")) return MOCK_RESPONSES.cash;
  return "Main samajh gaya. Yeh feature abhi AI backend se connect ho raha hai. Abhi ke liye, aap in topics pe pooch sakte hain:\n\n• Who to call today\n• Outstanding amounts\n• WhatsApp message generate\n• Cash runway status";
}

function formatMessage(text: string) {
  return text.split("\n").map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} className={["text-sm leading-relaxed", line === "" ? "mt-2" : ""].join(" ")}
      dangerouslySetInnerHTML={{ __html: bold }} />;
  });
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg, time: "Now" };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    await new Promise(r => setTimeout(r, 900));
    const reply = getResponse(msg);
    setMessages(prev => [...prev, { role: "assistant", content: reply, time: "Now" }]);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
              <FiZap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Vantro AI Assistant</p>
              <p className="text-xs text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Online · Powered by Groq AI
              </p>
            </div>
          </div>
          <FiMessageSquare size={16} className="text-muted" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={["flex gap-3", m.role === "user" ? "flex-row-reverse" : ""].join(" ")}>
              <div className={["w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-gradient-accent shadow-button-accent",
              ].join(" ")}>
                {m.role === "user" ? <FiUser size={14} className="text-white" /> : <FiZap size={14} className="text-white" />}
              </div>
              <div className={["max-w-[80%] rounded-2xl px-4 py-3 space-y-0.5",
                m.role === "user"
                  ? "bg-accent text-white rounded-tr-sm"
                  : "card-premium rounded-tl-sm",
              ].join(" ")}>
                {m.role === "user"
                  ? <p className="text-sm">{m.content}</p>
                  : <div className="text-secondary space-y-0.5">{formatMessage(m.content)}</div>
                }
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-accent shadow-button-accent flex items-center justify-center shrink-0">
                <FiZap size={14} className="text-white" />
              </div>
              <div className="card-premium rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-6 pb-3 flex flex-wrap gap-2 shrink-0">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-surface-2 text-secondary hover:text-accent hover:border-accent/40 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-border bg-surface shrink-0">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Collections ke baare mein poochein... (Ask about collections)"
              className="flex-1 bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted px-4 py-3 focus:outline-none focus:border-accent transition-colors"
            />
            <Button onClick={() => send()} loading={loading} icon={<FiSend size={14}/>} size="md">
              Send
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

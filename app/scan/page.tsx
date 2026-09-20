"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser } from "@/lib/api";
import { saveScanResult } from "@/lib/scanStore";
import { FiArrowRight } from "react-icons/fi";

// Scan — STARLANE_FRONTEND_HANDOFF.md §5/§1. Real backend audit found that
// the only real AI-answer path today is POST /api/ai-chat (server.js:6259) —
// a tool-calling chat endpoint that fetches real Supabase rows (invoices,
// prospects, products, suppliers, call_logs) through deterministic JS tool
// handlers and only asks the model to phrase the explanation from those
// results. It has no query-id, no threading beyond the message array the
// caller sends back each turn, no typed numeric fields, no entity IDs, and
// no evidence/citation path. Scan is built directly on top of this endpoint
// rather than inventing a new AI architecture (see /scan/[queryId] for how
// the response is rendered honestly given those limits).
//
// Quick-action pills below are generic capability prompts only — none of
// them assert a specific fact that may not be true for this account (unlike
// the dashboard's existing "Why is cash falling this week?" example prompts,
// which this turn intentionally does not touch or copy).
const QUICK_ACTIONS = [
  "Who owes us money right now?",
  "What's overdue and by how much?",
  "What does my cash flow look like this month?",
  "Which customers should I follow up with first?",
];

export default function ScanPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = getUser();
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; }
      })();
      const businessName = stored.business_name || user?.business_name || "";
      const result = await api.aiChat(user?.id || "", [{ role: "user", content: trimmed }], businessName);
      const queryId = saveScanResult({
        question: trimmed,
        messages: [{ role: "user", content: trimmed }],
        response: result,
        askedAt: new Date().toISOString(),
      });
      router.push(`/scan/${queryId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Starlane to answer that.");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div style={{ maxWidth: 680, margin: "48px auto 0" }}>
        <h1 className="v32-page-title mb-1" style={{ textAlign: "center" }}>Ask Starlane</h1>
        <p className="v32-body mb-6" style={{ textAlign: "center", color: "#63635F" }}>
          Ask a question over your connected business data. Starlane answers only from what it can
          actually verify — it says so plainly when it can't.
        </p>

        <form
          onSubmit={e => { e.preventDefault(); submit(question); }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ border: "1px solid rgba(25,25,23,0.14)", background: "#fff" }}
        >
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about receivables, customers, cash flow, inventory…"
            className="flex-1 outline-none"
            style={{ fontSize: 14, color: "#191917", background: "transparent" }}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !question.trim()}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 32, height: 32, background: "#191917", color: "#fff", opacity: submitting || !question.trim() ? 0.4 : 1 }}
            aria-label="Ask"
          >
            <FiArrowRight size={15} />
          </button>
        </form>

        {error && <p className="v32-meta mt-2" style={{ color: "#A64F4B" }}>{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {QUICK_ACTIONS.map(q => (
            <button
              key={q}
              onClick={() => submit(q)}
              disabled={submitting}
              className="v32-meta px-3 py-1.5 rounded-full"
              style={{ border: "1px solid rgba(25,25,23,0.14)", color: "#63635F", opacity: submitting ? 0.5 : 1 }}
            >
              {q}
            </button>
          ))}
        </div>

        {submitting && (
          <p className="v32-meta mt-4" style={{ textAlign: "center" }}>Checking your connected data…</p>
        )}
      </div>
    </DashboardLayout>
  );
}

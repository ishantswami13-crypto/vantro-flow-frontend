"use client";

// Memory on the web — the same records as the desktop and phone apps
// (GET /api/client/memory): what Starlane learned about how the business
// gets paid and how missions went, where each thing came from, and the
// owner's say: confirm, correct in their own words, or forget (never
// re-inferred). Every change is also kept in the audit log.
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import type { MemoryRecord } from "../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const STATUS: Record<MemoryRecord["status"], [string, string]> = {
  inferred: ["Inferred", "#4B5170"], confirmed: ["Confirmed by you", "#2F6B4F"], corrected: ["Corrected by you", "#2F6B4F"], removed: ["Removed", GRAPHITE],
};
const SOURCE: Record<string, string> = { your_books: "Worked out from your books", mission: "From a mission’s result", you: "Written by you" };
const btn: React.CSSProperties = { fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "#fff", cursor: "pointer" };

function Item({ m, onChange }: { m: MemoryRecord; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.statement);
  const [err, setErr] = useState<string | null>(null);
  async function decide(verb: "confirm" | "correct" | "remove") {
    setErr(null);
    try {
      await request(`/api/client/memory/${m.id}/${verb}`, { method: "POST", body: JSON.stringify(verb === "correct" ? { statement: text } : {}) });
      setEditing(false); onChange();
    } catch (e) { setErr((e as Error).message); }
  }
  const [label, color] = STATUS[m.status];
  return (
    <article style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "14px 18px", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: "uppercase", color: GRAPHITE }}>{m.subject.label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color, background: "#F1F0EC", borderRadius: 999, padding: "2px 8px" }}>{label}</span>
        {m.freshness === "stale" ? <span style={{ fontSize: 12, color: "#8A5A12" }}>Not rechecked in 30 days</span> : null}
        {m.freshness === "changed_since_confirmed" ? <span style={{ fontSize: 12, color: "#8A5A12" }}>Your books have changed since you confirmed this</span> : null}
      </div>
      {editing ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input aria-label="Corrected statement" value={text} onChange={(e) => setText(e.target.value)} maxLength={400}
            style={{ flex: "1 1 300px", padding: "7px 10px", border: `1px solid ${RULE}`, borderRadius: 6, font: "inherit" }} />
          <button style={{ ...btn, background: "#191917", color: "#fff" }} disabled={text.trim().length < 3} onClick={() => void decide("correct")}>Save</button>
          <button style={btn} onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : <p style={{ margin: 0, fontSize: 15 }}>{m.statement}</p>}
      <p style={{ margin: 0, fontSize: 13, color: GRAPHITE }}>
        {SOURCE[m.provenance.source] || m.provenance.source}{m.provenance.method ? ` · ${m.provenance.method}` : ""}{m.provenance.sampleSize ? ` · ${m.provenance.sampleSize} invoices` : ""}
        {m.provenance.correctedFrom ? ` · Starlane had said: “${m.provenance.correctedFrom}”` : ""}
      </p>
      {m.status !== "removed" && !editing ? (
        <div style={{ display: "flex", gap: 8 }}>
          {m.status === "inferred" ? <button style={btn} onClick={() => void decide("confirm")}>That’s right</button> : null}
          <button style={btn} onClick={() => setEditing(true)}>Correct</button>
          <button style={btn} onClick={() => void decide("remove")}>Forget this</button>
        </div>
      ) : null}
      {err ? <p role="alert" style={{ color: "#A23B3B", margin: 0 }}>{err}</p> : null}
    </article>
  );
}

export default function MemoryPage() {
  const [removed, setRemoved] = useState(false);
  const [records, setRecords] = useState<MemoryRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const load = useCallback(() => {
    request<{ records: MemoryRecord[] }>(`/api/client/memory${removed ? "?status=removed" : ""}`)
      .then((r) => { setRecords(r.records); setError(null); }).catch((e: Error) => setError(e.message || "Could not load Memory"));
  }, [removed]);
  useEffect(() => { load(); }, [load]);
  async function add() {
    try { await request("/api/client/memory", { method: "POST", body: JSON.stringify({ statement: note, subject: subject || undefined }) }); setNote(""); setSubject(""); load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <DashboardLayout pageTitle="Memory">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 18 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: 0 }}>Memory</h1>
          <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "66ch", marginTop: 8 }}>
            What Starlane knows about how your customers pay and how your missions went. Inferred things are Starlane’s reading of your books — confirm them, correct them in your words, or forget them.
          </p>
        </div>
        <div role="tablist" style={{ display: "flex", gap: 4 }}>
          {[false, true].map((r) => (
            <button key={String(r)} role="tab" aria-selected={removed === r} onClick={() => setRemoved(r)}
              style={{ ...btn, background: removed === r ? "#191917" : "#fff", color: removed === r ? "#fff" : "#191917" }}>{r ? "Removed" : "Remembered"}</button>
          ))}
        </div>
        {error ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!records && !error ? <p style={{ color: GRAPHITE }}>Loading…</p> : null}
        {records && records.length === 0 ? (
          <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "18px 20px" }}>
            <strong style={{ fontWeight: 500 }}>{removed ? "Nothing removed." : "Nothing remembered yet."}</strong>
            {!removed ? <p style={{ color: GRAPHITE, fontSize: 13.5, margin: "4px 0 0" }}>Starlane learns a customer’s payment timing once it has at least three paid invoices with due and payment dates. You can also write things down below.</p> : null}
          </div>
        ) : null}
        {records?.map((m) => <Item key={m.id} m={m} onChange={load} />)}
        {!removed ? (
          <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, padding: "16px 18px", display: "grid", gap: 10 }}>
            <strong style={{ fontWeight: 500 }}>Tell Starlane something</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input aria-label="About (customer, optional)" placeholder="About (customer, optional)" value={subject} onChange={(e) => setSubject(e.target.value)}
                style={{ flex: "0 1 220px", padding: "7px 10px", border: `1px solid ${RULE}`, borderRadius: 6, font: "inherit" }} />
              <input aria-label="What to remember" placeholder="e.g. Call the accountant, not the owner" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400}
                style={{ flex: "1 1 300px", padding: "7px 10px", border: `1px solid ${RULE}`, borderRadius: 6, font: "inherit" }} />
              <button style={btn} disabled={note.trim().length < 3} onClick={() => void add()}>Remember</button>
            </div>
          </div>
        ) : null}
        <p style={{ fontSize: 13, color: GRAPHITE }}>Every change to your records and every decision is also kept, with before and after, in the audit log.</p>
      </div>
    </DashboardLayout>
  );
}

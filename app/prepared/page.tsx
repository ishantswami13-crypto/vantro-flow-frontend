"use client";

// Prepared on the web — the same horizons as the desktop and phone apps
// (GET /api/client/prepared): what is coming in the next 24 hours, 7 days and
// 30 days, worked out from dates in the company's books. Every item says why
// it is there and which records it came from; a horizon the data cannot
// support says so instead of showing an empty "all clear".
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import type { PreparedHorizon } from "../../packages/contracts/src/features";

const RULE = "rgba(25,25,23,0.10)", GRAPHITE = "#63635F";
const KIND: Record<string, string> = {
  invoices_due: "Falling due", crossing_band: "About to slip", promise_due: "Promise due", mission_ending: "Mission ends", decisions_waiting: "Waiting on you",
};
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export default function PreparedPage() {
  const [horizons, setHorizons] = useState<PreparedHorizon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    request<{ horizons: PreparedHorizon[] }>("/api/client/prepared").then((r) => setHorizons(r.horizons)).catch((e: Error) => setError(e.message || "Could not load Prepared"));
  }, []);

  return (
    <DashboardLayout pageTitle="Prepared">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 22 }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 400, color: "#191917", margin: 0 }}>Prepared</h1>
          <p className="v32-body" style={{ color: GRAPHITE, maxWidth: "66ch", marginTop: 8 }}>
            Starlane looks ahead so nothing arrives as a surprise: what falls due, who is about to slip into a worse overdue band, promises coming due, missions ending.
          </p>
        </div>
        {error ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!horizons && !error ? <p style={{ color: GRAPHITE }}>Loading…</p> : null}
        {horizons?.map((h) => (
          <section key={h.horizon} aria-labelledby={`h-${h.horizon}`}>
            <h2 id={`h-${h.horizon}`} style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{h.label}{h.items.length ? <span style={{ color: GRAPHITE, fontWeight: 400 }}> · {h.items.length}</span> : null}</h2>
            <div style={{ background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden" }}>
              {h.items.length === 0 ? (
                <div style={{ padding: "16px 18px" }}>
                  <strong style={{ fontWeight: 500 }}>{h.status === "insufficient_data" ? "Not enough data to prepare this." : "Nothing due in this window."}</strong>
                  {h.note ? <p style={{ color: GRAPHITE, fontSize: 13.5, margin: "4px 0 0" }}>{h.note}</p> : null}
                </div>
              ) : h.items.map((i, n) => (
                <div key={i.id} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "12px 18px", borderTop: n ? `1px solid ${RULE}` : 0, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: "uppercase", color: GRAPHITE, width: 110 }}>{KIND[i.kind] || i.kind}</span>
                  <span style={{ flex: "1 1 280px", minWidth: 0 }}>
                    <strong style={{ fontWeight: 500 }}>{i.title}</strong>
                    <br /><span style={{ fontSize: 13, color: GRAPHITE }}>{i.reason}{i.customers?.length ? ` · ${i.customers.join(", ")}` : ""}</span>
                  </span>
                  {i.amount != null ? <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inr(i.amount)}</span> : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}

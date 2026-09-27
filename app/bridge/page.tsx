"use client";

// The Bridge on the web — the same view as the desktop and phone apps, from
// GET /api/client/bridge: the business's position from its own books (with
// how current they are), what needs a decision, what Watch raised, missions
// and what is coming. No sample data: an empty company sees how to connect.
import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import type { BridgeView } from "../../packages/contracts/src/features";

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const INK = "#191917", GRAPHITE = "#63635F", FAINT = "#6E6D67", RULE = "rgba(25,25,23,0.10)";
const FRESH: Record<BridgeView["freshness"], [string, string]> = {
  fresh: ["Up to date", "#2F6B4F"], delayed: ["A few hours behind", "#8A5A12"], stale: ["More than a day behind", "#A23B3B"], none: ["No books synced yet", GRAPHITE],
};
const SEV: Record<string, string> = { critical: "#A23B3B", high: "#A23B3B", normal: "#C7962F", low: "#D9D7D0" };

function ago(iso: string | null) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

function sentenceFor(b: BridgeView): string {
  if (!b.hasData || !b.state) return "Starlane has no books to read yet.";
  const s = b.state;
  let out = `You are owed ${inr(s.openReceivables)}${s.overdueReceivables > 0 ? `, and ${inr(s.overdueReceivables)} of it is overdue.` : ", none of it overdue."}`;
  const n = b.attention.decisions, w = b.attention.watch.open;
  if (n || w) out += ` ${n ? `${n} decision${n > 1 ? "s" : ""} wait${n > 1 ? "" : "s"} for you` : ""}${n && w ? " and " : ""}${w ? `Watch has ${w} new thing${w > 1 ? "s" : ""}` : ""}.`;
  else out += " Nothing needs you right now.";
  return out;
}

const card: React.CSSProperties = { background: "#fff", border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: `1px solid ${RULE}` };
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: INK, margin: "0 0 8px" };

function Bar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <span style={{ display: "block", height: 6, borderRadius: 3, background: "rgba(25,25,23,0.07)", overflow: "hidden", flex: 1 }}>
      <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, background: color }} />
    </span>
  );
}

export default function BridgePage() {
  const [b, setB] = useState<BridgeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const load = () => request<BridgeView>("/api/client/bridge").then(setB).catch((e: Error) => setError(e.message || "Could not load the Bridge"));
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  // Set after mount: server and browser can disagree on the date (time zone), which would break hydration.
  const [today, setToday] = useState("");
  useEffect(() => { setToday(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })); }, []);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 48px", display: "grid", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase", color: GRAPHITE }}>The Bridge{today ? ` · ${today}` : ""}</span>
          {b ? <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: FRESH[b.freshness][1], background: "#F1F0EC", borderRadius: 999, padding: "3px 9px" }} title={b.dataAsOf ? `Books last synced ${ago(b.dataAsOf)}` : undefined}>{FRESH[b.freshness][0]}</span> : null}
        </div>
        {error ? <p role="alert" style={{ color: "#A23B3B" }}>{error}</p> : null}
        {!b && !error ? <p style={{ color: GRAPHITE }}>Loading…</p> : null}
        {b ? (
          <>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 34px)", lineHeight: 1.25, color: INK, margin: 0, maxWidth: "30ch" }}>{sentenceFor(b)}</h1>
            {!b.hasData ? (
              <div style={{ ...card, padding: "20px 22px", maxWidth: 640 }}>
                <p style={{ fontWeight: 600, margin: "0 0 6px" }}>Connect your books to start.</p>
                <p className="v32-body" style={{ color: GRAPHITE, margin: "0 0 12px" }}>Starlane works from your company’s own records. Install Starlane for Windows on the computer that runs Tally, or import a sheet from Busy, Marg, Zoho Books, QuickBooks, Xero or any other system. Nothing here is sample data.</p>
                <Link href="/sources" style={{ fontWeight: 600, color: INK }}>Sources ›</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
                <section style={{ display: "grid", gap: 22 }}>
                  <div>
                    <h2 style={h2}>Needs you · {b.attention.decisions}</h2>
                    <div style={card}>
                      {b.attention.topDecisions.length === 0 ? <p style={{ padding: 16, margin: 0 }}>Nothing is waiting for your decision.</p>
                        : b.attention.topDecisions.map((a, i) => (
                          <div key={a.id} style={{ ...row, borderTop: i ? row.borderTop : 0 }}>
                            <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: a.riskLevel === "high" ? "#A23B3B" : a.riskLevel === "medium" ? "#C7962F" : "#D9D7D0" }} />
                            <span style={{ minWidth: 0, flex: 1 }}><strong style={{ fontWeight: 500 }}>{a.title}</strong><br /><span style={{ color: GRAPHITE, fontSize: 13 }}>{a.description}</span></span>
                          </div>
                        ))}
                    </div>
                    {b.attention.decisions ? <p style={{ fontSize: 13, color: FAINT, marginTop: 8 }}>Approve in Starlane for Windows or on your phone, where each decision shows its evidence.</p> : null}
                  </div>
                  <div>
                    <h2 style={h2}>Watch · {b.attention.watch.open} new · {b.attention.watch.urgent} urgent</h2>
                    <div style={card}>
                      {b.attention.watch.latest.length === 0 ? <p style={{ padding: 16, margin: 0 }}>Nothing needs watching right now.</p>
                        : b.attention.watch.latest.map((e, i) => (
                          <div key={e.id} style={{ ...row, borderTop: i ? row.borderTop : 0 }}>
                            <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: SEV[e.severity] }} />
                            <span style={{ minWidth: 0, flex: 1 }}><strong style={{ fontWeight: 500 }}>{e.title}</strong><br /><span style={{ color: GRAPHITE, fontSize: 13 }}>{e.detail} · {ago(e.firstSeenAt)}</span></span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h2 style={h2}>Missions</h2>
                    <div style={card}>
                      {b.missions.length === 0 ? <p style={{ padding: 16, margin: 0 }}>No mission is running.</p>
                        : b.missions.map((m, i) => (
                          <Link key={m.id} href="/missions" style={{ ...row, borderTop: i ? row.borderTop : 0, color: INK, textDecoration: "none", display: "grid", gap: 6 }}>
                            <strong style={{ fontWeight: 500 }}>{m.title}</strong>
                            <Bar ratio={m.progress?.ratio || 0} color="#2F6B4F" />
                            <span style={{ color: GRAPHITE, fontSize: 13 }}>{inr(m.progress?.collected || 0)} of {inr(m.target.amount)}{m.status === "active" && m.progress?.daysLeft != null ? ` · ${m.progress.daysLeft} days left` : ` · ${m.status}`}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                </section>
                <section style={{ display: "grid", gap: 22 }}>
                  {b.state ? (
                    <div>
                      <h2 style={h2}>Receivables</h2>
                      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        {[["Owed to you", b.state.openReceivables, `${b.state.openInvoiceCount} open invoices`], ["Overdue", b.state.overdueReceivables, `${b.state.overdueInvoiceCount} invoices`]].map(([l, v, s], i) => (
                          <div key={String(l)} style={{ padding: "14px 16px", borderLeft: i ? `1px solid ${RULE}` : 0 }}>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, textTransform: "uppercase", color: GRAPHITE }}>{l}</div>
                            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>{inr(Number(v))}</div>
                            <div style={{ fontSize: 13, color: GRAPHITE }}>{s}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gap: 8, marginTop: 14 }} aria-label="Ageing">
                        {b.state.ageing.filter((a) => a.count).map((a) => {
                          const max = Math.max(...b.state!.ageing.map((x) => x.amount), 1);
                          return (
                            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: GRAPHITE }}>
                              <span style={{ width: 96 }}>{a.label}</span>
                              <Bar ratio={a.amount / max} color={a.id === "current" ? "#D9D7D0" : a.id === "31_90" || a.id === "90_plus" ? "#A23B3B" : "#C7962F"} />
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>{inr(a.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p style={{ fontSize: 13, color: FAINT, marginTop: 8 }}>{b.dataAsOf ? `From your books, last synced ${ago(b.dataAsOf)}.` : "From invoices in Starlane; no sync has been recorded."}</p>
                    </div>
                  ) : null}
                  {b.state?.topOverdue.length ? (
                    <div>
                      <h2 style={h2}>Who owes the most overdue</h2>
                      <div style={card}>
                        {b.state.topOverdue.map((c, i) => (
                          <div key={c.key} style={{ ...row, borderTop: i ? row.borderTop : 0 }}>
                            <span style={{ minWidth: 0, flex: 1 }}><strong style={{ fontWeight: 500 }}>{c.name}</strong><br /><span style={{ color: GRAPHITE, fontSize: 13 }}>{c.count} invoice{c.count > 1 ? "s" : ""} · oldest {c.oldestDays} days</span></span>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{inr(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {b.prepared ? (
                    <div>
                      <h2 style={h2}>Coming up</h2>
                      <div style={card}>
                        {b.prepared.map((h, i) => (
                          <Link key={h.horizon} href="/prepared" style={{ ...row, borderTop: i ? row.borderTop : 0, color: INK, textDecoration: "none" }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: GRAPHITE, width: 34 }}>{h.horizon}</span>
                            <span style={{ flex: 1 }}>{h.first ? h.first.title : h.status === "insufficient_data" ? "Not enough data to prepare" : "Nothing due"}{h.count > 1 ? <span style={{ color: GRAPHITE, fontSize: 13 }}> · and {h.count - 1} more</span> : null}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            )}
            {b.partial ? <p style={{ fontSize: 13, color: GRAPHITE }}>Part of this could not be loaded just now; what is shown is real.</p> : null}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

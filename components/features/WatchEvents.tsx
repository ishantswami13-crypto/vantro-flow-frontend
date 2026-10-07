"use client";

// What Watch raised, on the web — the same events as the desktop and phone
// apps (GET /api/client/watch): each raised once with its evidence, closed by
// Starlane when it stops being true, or dismissed by the owner here.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import type { WatchEvent, WatchList } from "../../packages/contracts/src/features";

const SEV: Record<string, string> = { critical: "var(--status-danger)", high: "var(--status-danger)", normal: "#C7962F", low: "#D9D7D0" };
const RESOLUTION: Record<string, string> = {
  paid_or_removed: "Paid or no longer in your books", moved_to_next_band: "Moved to a later overdue band", sync_recovered: "Sync recovered",
  promise_closed: "Promise closed", dismissed_by_owner: "Dismissed by you", cleared: "Condition cleared",
};
const RULE = "rgb(var(--c-ink) / 0.10)";

function show(v: unknown, unit?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return unit === "INR" ? `₹${Math.round(v).toLocaleString("en-IN")}` : v.toLocaleString("en-IN");
  return String(v);
}

export default function WatchEvents() {
  const [state, setState] = useState<"active" | "closed">("active");
  const [data, setData] = useState<WatchList | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    request<WatchList>(`/api/client/watch?state=${state}`).then((d) => { setData(d); setError(null); }).catch((e: Error) => setError(e.message));
  }, [state]);
  useEffect(() => { load(); }, [load]);

  async function move(e: WatchEvent, to: "acknowledged" | "dismissed") {
    try { await request(`/api/client/watch/${e.id}/state`, { method: "POST", body: JSON.stringify({ state: to }) }); load(); }
    catch (err) { setError((err as Error).message); }
  }

  return (
    <section aria-labelledby="watch-events-h" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 id="watch-events-h" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>What Watch raised</h2>
        <div role="tablist" style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {(["active", "closed"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={state === k} onClick={() => setState(k)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: `1px solid ${RULE}`, background: state === k ? "var(--bg-inverse)" : "var(--bg-elevated)", color: state === k ? "var(--text-on-inverse)" : "var(--text-primary)", cursor: "pointer" }}>
              {k === "active" ? "Needs attention" : "Resolved"}
            </button>
          ))}
        </div>
      </div>
      {error ? <p role="alert" style={{ color: "var(--status-danger)", margin: 0 }}>{error}</p> : null}
      <div style={{ background: "var(--bg-elevated)", border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden" }}>
        {!data ? <p style={{ padding: 16, margin: 0, color: "var(--text-secondary)" }}>Loading…</p>
          : data.events.length === 0 ? (
            <p style={{ padding: 16, margin: 0, color: "var(--text-secondary)" }}>{state === "active" ? "Nothing needs watching right now. Invoices slipping into worse overdue bands, missed promises and sync problems appear here." : "Nothing has been resolved yet."}</p>
          ) : data.events.map((e, i) => (
            <div key={e.id} style={{ borderTop: i ? `1px solid ${RULE}` : 0 }}>
              <button onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}
                style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "flex", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
                <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: SEV[e.severity] }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontWeight: 500 }}>{e.title}</strong><br />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{e.detail}{e.resolution ? ` · ${RESOLUTION[e.resolution] || e.resolution}` : ""}</span>
                </span>
                <span aria-hidden style={{ color: "#6E6D67" }}>{open === e.id ? "▾" : "▸"}</span>
              </button>
              {open === e.id ? (
                <div style={{ padding: "0 16px 14px 31px", display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{e.evidence.summary}</div>
                  <dl style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: "6px 12px", margin: 0, fontSize: 13 }}>
                    {e.evidence.facts.map((f, j) => (
                      <div key={j} style={{ display: "contents" }}>
                        <dt>{f.label}</dt>
                        <dd style={{ margin: 0, fontFamily: "var(--font-sans)" }}>{show(f.value, f.unit)}</dd>
                        <dd style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-secondary)" }}>{f.kind}</dd>
                      </div>
                    ))}
                  </dl>
                  {e.entity?.type === "invoice" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/scan?invoice=${encodeURIComponent(e.entity.id)}`} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "var(--bg-elevated)", color: "var(--text-primary)", textDecoration: "none" }}>Why — open in Scan</Link>
                      {e.missionId ? (
                        <Link href={`/missions/${e.missionId}`} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "var(--bg-elevated)", color: "var(--text-primary)", textDecoration: "none" }}>Open its mission</Link>
                      ) : e.state === "open" || e.state === "acknowledged" ? (
                        <Link href={`/missions/new?invoice=${encodeURIComponent(e.entity.id)}`} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, background: "var(--bg-inverse)", color: "var(--text-on-inverse)", textDecoration: "none" }}>Start a mission to collect</Link>
                      ) : null}
                    </div>
                  ) : null}
                  {e.state === "open" || e.state === "acknowledged" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {e.state === "open" ? <button onClick={() => void move(e, "acknowledged")} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "var(--bg-elevated)", cursor: "pointer" }}>Mark as seen</button> : null}
                      <button onClick={() => void move(e, "dismissed")} style={{ fontSize: 12.5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${RULE}`, background: "var(--bg-elevated)", cursor: "pointer" }}>Dismiss</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
      </div>
    </section>
  );
}

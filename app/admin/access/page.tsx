"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type AccessApplicationDetail, type AccessApplicationRow } from "@/lib/api";

// Access review — admins (ADMIN_EMAILS on the backend) work the rollout queue.
// The eligibility shown is what the deterministic rules produced at
// submission; the decision is always a person's (or, only if explicitly
// enabled, the rules' auto-approval, recorded as such in the history).

type Status = AccessApplicationRow["status"];
const FILTERS: { key: Status | ""; label: string }[] = [
  { key: "submitted", label: "Submitted" }, { key: "reviewing", label: "In review" }, { key: "approved", label: "Approved" },
  { key: "waitlisted", label: "Waitlisted" }, { key: "rejected", label: "Rejected" }, { key: "expired", label: "Expired" }, { key: "", label: "All" },
];
// Mirrors lib/access/service.js TRANSITIONS; the server enforces it.
const NEXT: Record<Status, Status[]> = {
  submitted: ["reviewing", "approved", "waitlisted", "rejected"], reviewing: ["approved", "waitlisted", "rejected"],
  waitlisted: ["reviewing", "approved", "rejected"], rejected: ["reviewing"], approved: ["expired"], expired: ["reviewing", "approved"],
};
const VERB: Record<Status, string> = { submitted: "Submit", reviewing: "Start review", approved: "Approve", waitlisted: "Waitlist", rejected: "Reject", expired: "Expire access" };
const TIER_COLOR = { ready: "#477054", review: "#8A5A12", unsupported: "#A64F4B", waitlist: "#63635F" } as const;
const INK = "#191917", SOFT = "#63635F", FAINT = "#8A8A86", LINE = "#EBEAE6";
const fmt = (d: string) => new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AccessReviewPage() {
  const [filter, setFilter] = useState<Status | "">("submitted");
  const [rows, setRows] = useState<AccessApplicationRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AccessApplicationDetail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ url: string; emailed: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.adminAccess.list(filter || undefined);
      setRows(res.applications); setCounts(res.counts);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? (/forbidden/i.test(e.message) ? "Access review is limited to Starlane admins." : e.message) : "Could not load applications");
    }
  }, [filter]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const open = async (id: string) => {
    setIssued(null); setNote("");
    try { setSelected((await api.adminAccess.get(id)).application); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load application"); }
  };

  const decide = async (status: Status) => {
    if (!selected) return;
    if ((status === "rejected" || status === "expired") && !window.confirm(`${VERB[status]} ${selected.company}?`)) return;
    setBusy(status); setError(null);
    try {
      const r = await api.adminAccess.decide(selected.id, status, note.trim() || undefined);
      await Promise.all([open(selected.id), load()]); // open() clears any previously shown link
      if (r.downloadUrl) setIssued({ url: r.downloadUrl, emailed: r.emailed });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update"); }
    finally { setBusy(null); }
  };

  const reissue = async () => {
    if (!selected) return;
    setBusy("reissue"); setError(null);
    try {
      const r = await api.adminAccess.reissue(selected.id);
      await open(selected.id);
      setIssued({ url: r.downloadUrl, emailed: r.emailed });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not issue a link"); }
    finally { setBusy(null); }
  };

  return (
    <DashboardLayout pageTitle="Access review">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
        <h1 className="v32-page-title" style={{ margin: 0 }}>Access review</h1>
        <p style={{ fontSize: 13.5, color: SOFT, margin: 0, maxWidth: 680 }}>Applications to the private rollout. Compatibility is assessed by fixed rules at submission; the decision is yours.</p>
        {error && <p role="alert" style={{ fontSize: 13, color: "#A64F4B", margin: 0 }}>{error}</p>}

        <nav aria-label="Filter by status" style={{ display: "flex", gap: 20, borderBottom: `1px solid ${LINE}`, overflowX: "auto" }}>
          {FILTERS.map((f) => (
            <button key={f.label} onClick={() => { setFilter(f.key); setSelected(null); }} aria-current={filter === f.key ? "page" : undefined} className="hover-dim"
              style={{ padding: "8px 2px", fontSize: 13, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", color: filter === f.key ? INK : SOFT, fontWeight: filter === f.key ? 500 : 400,
                borderBottom: `2px solid ${filter === f.key ? "#696D86" : "transparent"}` }}>
              {f.label}{f.key && counts[f.key] ? <span style={{ color: FAINT, marginLeft: 6 }}>{counts[f.key]}</span> : null}
            </button>
          ))}
        </nav>

        <div className="access-review-grid" data-open={selected ? "1" : "0"} style={{ minWidth: 0 }}>
          <style>{`.access-review-grid{display:grid;gap:18px;align-items:start;grid-template-columns:minmax(0,1fr)}
            .access-review-grid[data-open="1"]{grid-template-columns:minmax(0,380px) minmax(0,1fr)}
            .access-review-grid > *{min-width:0}
            @media (max-width:1100px){.access-review-grid[data-open="1"]{grid-template-columns:minmax(0,1fr)}}`}</style>
          <div style={{ background: "#fff", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden" }}>
            {rows === null && <div aria-busy="true" style={{ padding: 20 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 44, background: "#F3F2EE", borderRadius: 6, margin: "8px 0" }} />)}</div>}
            {rows && rows.length === 0 && !error && <p style={{ padding: "36px 20px", textAlign: "center", color: SOFT, fontSize: 13.5 }}>No applications here.</p>}
            {rows && rows.length > 0 && (
              <table className="v32-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ textAlign: "left", color: FAINT, fontSize: 11.5 }}>
                  <th style={{ padding: "10px 16px", fontWeight: 500 }}>Company</th><th style={{ padding: "10px 8px", fontWeight: 500 }}>Assessment</th><th style={{ padding: "10px 16px", fontWeight: 500 }}>Applied</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="row-hover" onClick={() => open(r.id)} style={{ borderTop: `1px solid ${LINE}`, cursor: "pointer", background: selected?.id === r.id ? "#F6F5F2" : undefined }}>
                      <td style={{ padding: "12px 16px" }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); open(r.id); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: INK, fontWeight: 500 }}>{r.company}</button>
                        <div style={{ color: FAINT, fontSize: 12 }}>{r.name} · {r.role} · {r.company_size} · {r.country}</div>
                      </td>
                      <td style={{ padding: "12px 8px", color: TIER_COLOR[r.eligibility.tier], whiteSpace: "nowrap" }}>{r.eligibility.tier}{filter === "" && <span style={{ color: FAINT }}> · {r.status}</span>}</td>
                      <td style={{ padding: "12px 16px", color: SOFT, whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <section aria-label={`Application from ${selected.company}`} style={{ background: "#fff", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 20, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, overflowWrap: "anywhere" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 21, color: INK }}>{selected.company}</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: SOFT }}>{selected.name} · {selected.role} · <a href={`mailto:${selected.email}`} style={{ color: SOFT }}>{selected.email}</a>{selected.website ? <> · <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ color: SOFT }}>{selected.website.replace(/^https?:\/\//, "")}</a></> : null}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close" style={{ background: "none", border: "none", fontSize: 20, color: SOFT, cursor: "pointer" }}>×</button>
              </div>

              <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "6px 12px", margin: 0, fontSize: 13 }}>
                <dt style={{ color: FAINT }}>Status</dt><dd style={{ margin: 0, color: INK }}>{selected.status}</dd>
                <dt style={{ color: FAINT }}>Size · industry</dt><dd style={{ margin: 0 }}>{selected.company_size} · {selected.industry} · {selected.country}</dd>
                <dt style={{ color: FAINT }}>Systems</dt><dd style={{ margin: 0 }}>{[...selected.systems, selected.other_systems].filter(Boolean).join(", ") || "—"}</dd>
                <dt style={{ color: FAINT }}>Will connect</dt><dd style={{ margin: 0 }}>{selected.will_connect_systems ? "Yes" : "Not yet"}</dd>
              </dl>

              <div>
                <p style={{ margin: "0 0 6px", fontSize: 12, color: FAINT }}>Problem</p>
                <p style={{ margin: 0, fontSize: 13.5, color: INK, lineHeight: 1.55 }}>{selected.problem}</p>
                <p style={{ margin: "12px 0 6px", fontSize: 12, color: FAINT }}>Desired outcome (60 days)</p>
                <p style={{ margin: 0, fontSize: 13.5, color: INK, lineHeight: 1.55 }}>{selected.desired_outcome}</p>
                {selected.notes && <><p style={{ margin: "12px 0 6px", fontSize: 12, color: FAINT }}>Notes</p><p style={{ margin: 0, fontSize: 13.5, color: INK }}>{selected.notes}</p></>}
              </div>

              <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: TIER_COLOR[selected.eligibility.tier], fontWeight: 500 }}>{selected.eligibility.label}</p>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5, color: SOFT, lineHeight: 1.55 }}>{selected.eligibility.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <p style={{ margin: "6px 0 0", fontSize: 11.5, color: FAINT }}>{selected.eligibility.rules_version}</p>
              </div>

              <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
                <label htmlFor="review-note" style={{ fontSize: 12, color: FAINT }}>Note to the applicant (shown on their status page)</label>
                <textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2}
                  style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${LINE}`, borderRadius: 6, padding: 10, font: "inherit", fontSize: 13, resize: "vertical" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {NEXT[selected.status].map((s) => (
                    <button key={s} type="button" disabled={!!busy} onClick={() => decide(s)}
                      style={{ borderRadius: 7, padding: "7px 13px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                        background: s === "approved" ? INK : "#fff", color: s === "approved" ? "#fff" : INK, border: `1px solid ${s === "approved" ? INK : "#D2D0CA"}` }}>
                      {busy === s ? "Saving…" : VERB[s]}
                    </button>
                  ))}
                  {selected.status === "approved" && (
                    <button type="button" disabled={!!busy} onClick={reissue} style={{ borderRadius: 7, padding: "7px 13px", fontSize: 13, background: "#fff", border: "1px solid #D2D0CA", cursor: "pointer" }}>
                      {busy === "reissue" ? "Issuing…" : "New download link"}
                    </button>
                  )}
                </div>
                {issued && (
                  <div role="status" style={{ border: "1px solid #BFD6C9", background: "#F2F7F4", borderRadius: 6, padding: 12, fontSize: 12.5 }}>
                    <p style={{ margin: "0 0 6px", color: INK }}>{issued.emailed ? "Emailed to the applicant. " : "Email is not configured — send this link yourself. "}It is shown only once; issuing a new one revokes it.</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <code style={{ flex: 1, minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4, padding: "6px 8px" }}>{issued.url}</code>
                      <button type="button" onClick={() => navigator.clipboard?.writeText(issued.url)} style={{ border: `1px solid ${LINE}`, background: "#fff", borderRadius: 4, padding: "0 10px", cursor: "pointer" }}>Copy</button>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: FAINT }}>History</p>
                <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 12.5 }}>
                  {selected.events.map((ev, i) => (
                    <li key={i} style={{ color: SOFT }}><span style={{ color: INK }}>{ev.to_status}</span> · {ev.actor} · {fmt(ev.created_at)}{ev.note ? ` — ${ev.note}` : ""}</li>
                  ))}
                  {selected.entitlements.map((en) => (
                    <li key={en.id} style={{ color: SOFT }}>Download link · {en.revoked_at ? "revoked" : new Date(en.expires_at) < new Date() ? "expired" : `valid until ${fmt(en.expires_at)}`} · {en.downloads} download{en.downloads === 1 ? "" : "s"}</li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

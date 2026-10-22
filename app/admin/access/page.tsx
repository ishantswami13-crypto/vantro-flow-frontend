"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Subnav, SkeletonRows } from "@/components/v32/ui";
import { IconCopy, IconX } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
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
const TIER: Record<AccessApplicationRow["eligibility"]["tier"], { label: string; tone: StatusTone }> = {
  ready: { label: "Ready", tone: "positive" }, review: { label: "Needs review", tone: "attention" },
  unsupported: { label: "Unsupported", tone: "critical" }, waitlist: { label: "Waitlist", tone: "neutral" },
};
const STATUS_TONE: Record<Status, StatusTone> = { submitted: "info", reviewing: "attention", approved: "positive", waitlisted: "neutral", rejected: "critical", expired: "unknown" };
const STATUS_LABEL: Record<Status, string> = { submitted: "Submitted", reviewing: "In review", approved: "Approved", waitlisted: "Waitlisted", rejected: "Rejected", expired: "Expired" };
const INK = "var(--ink)", SOFT = "var(--ink-2)", FAINT = "var(--ink-3)", LINE = "var(--line)";
const fmt = (d: string) => formatDateTime(d);
const OFFLINE = "Couldn't reach Starlane. Check your connection and try again.";

export default function AccessReviewPage() {
  const [filter, setFilter] = useState<Status | "">("submitted");
  const [rows, setRows] = useState<AccessApplicationRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [confirm, setConfirm] = useState<Status | null>(null);
  const notify = useToast();
  const [selected, setSelected] = useState<AccessApplicationDetail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ url: string; emailed: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null); setForbidden(false);
    try {
      const res = await api.adminAccess.list(filter || undefined);
      setRows(res.applications); setCounts(res.counts);
    } catch (e) {
      setRows([]);
      if (e instanceof Error && /forbidden|admin/i.test(e.message)) setForbidden(true);
      else setError(OFFLINE);
    }
  }, [filter]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const open = async (id: string) => {
    setIssued(null); setNote("");
    try { setSelected((await api.adminAccess.get(id)).application); }
    catch { notify(`That application didn't open. ${OFFLINE}`, "critical"); }
  };

  const decide = async (status: Status) => {
    if (!selected) return;
    setBusy(status); setConfirm(null);
    try {
      const r = await api.adminAccess.decide(selected.id, status, note.trim() || undefined);
      await Promise.all([open(selected.id), load()]); // open() clears any previously shown link
      if (r.downloadUrl) setIssued({ url: r.downloadUrl, emailed: r.emailed });
    } catch { notify(`The status wasn't changed. ${OFFLINE}`, "critical"); }
    finally { setBusy(null); }
  };
  const ask = (status: Status) => (status === "rejected" || status === "expired" ? setConfirm(status) : decide(status));

  const reissue = async () => {
    if (!selected) return;
    setBusy("reissue");
    try {
      const r = await api.adminAccess.reissue(selected.id);
      await open(selected.id);
      setIssued({ url: r.downloadUrl, emailed: r.emailed });
    } catch { notify(`No new link was issued. ${OFFLINE}`, "critical"); }
    finally { setBusy(null); }
  };

  const tabs = FILTERS.map((f) => ({ key: f.key || "all", label: f.label, count: f.key ? counts[f.key] ?? null : null }));

  return (
    <DashboardLayout pageTitle="Access review">
      <style>{`.access-review-grid{display:grid;gap:24px;align-items:start;grid-template-columns:minmax(0,1fr)}
        .access-review-grid[data-open="1"]{grid-template-columns:minmax(0,1fr) minmax(0,460px)}
        .access-review-grid > *{min-width:0}
        @media (max-width:1100px){.access-review-grid[data-open="1"]{grid-template-columns:minmax(0,1fr)}}
        .acc-row{display:grid;align-items:center;gap:4px 16px;padding:10px 0;min-height:52px;cursor:pointer;grid-template-columns:minmax(0,1fr) auto}
        .acc-row[aria-current="true"],.acc-row[aria-current="true"]:hover{background:rgb(var(--tk-ink) / 0.05);box-shadow:-10px 0 0 rgb(var(--tk-ink) / 0.05),10px 0 0 rgb(var(--tk-ink) / 0.05)}
        .acc-date,.acc-head{display:none}
        @media (min-width:760px){.acc-row{grid-template-columns:minmax(0,1fr) 180px 120px}.acc-date{display:block}.acc-head{display:grid;min-height:0;padding:0 0 8px;cursor:default}}
        .acc-dl{display:grid;grid-template-columns:130px minmax(0,1fr);gap:8px 12px;margin:0;font-size:13px}
        @media (max-width:480px){.acc-dl{grid-template-columns:minmax(0,1fr);gap:2px}}`}</style>
      <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        <PageHeader title="Access review" subtitle="Applications to the private rollout. Fixed rules assess compatibility at submission; the decision is yours." />

        <Subnav label="Filter by status" items={tabs} active={filter || "all"} onChange={(k) => { setFilter((k === "all" ? "" : k) as Status | ""); setSelected(null); }} />

        {forbidden && <ErrorState title="Admins only" message="Access review is limited to Starlane admins." />}
        {error && <ErrorState title="Couldn't load applications" message={error} onRetry={load} />}

        {!forbidden && !error && (
          <div className="access-review-grid" data-open={selected ? "1" : "0"} style={{ minWidth: 0 }}>
            <div>
              {rows === null && <SkeletonRows rows={4} height={56} />}
              {rows && rows.length === 0 && <p className="ops-list" style={{ margin: 0, padding: "12px 0", fontSize: 13, color: "var(--ink-2)", borderBottom: "1px solid var(--line)" }}>No applications with this status.</p>}
              {rows && rows.length > 0 && (
                <div role="list">
                  <div className="acc-row acc-head ops-head" aria-hidden="true"><span>Company</span><span>Assessment</span><span style={{ textAlign: "right" }}>Submitted</span></div>
                  {rows.map((r) => (
                    <div key={r.id} role="listitem" className="acc-row ops-row" aria-current={selected?.id === r.id ? "true" : undefined} onClick={() => open(r.id)}>
                      <div className="min-w-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); open(r.id); }} className="truncate" style={{ display: "block", maxWidth: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", fontSize: 13.5, color: INK, fontWeight: 500 }}>{r.company}</button>
                        <div className="truncate" style={{ color: FAINT, fontSize: 12.5, marginTop: 2 }}>{r.name} · {r.role} · {r.company_size} · {r.country}</div>
                      </div>
                      <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
                        <StatusChip tone={TIER[r.eligibility.tier].tone}>{TIER[r.eligibility.tier].label}</StatusChip>
                        {filter === "" && <StatusChip tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusChip>}
                      </div>
                      <div className="acc-date tabular-nums" style={{ color: SOFT, fontSize: 12.5, textAlign: "right" }}>{fmt(r.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected && (
              <section aria-label={`Application from ${selected.company}`} className="ui-panel" style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18, overflowWrap: "anywhere" }}>
                <div className="flex items-start justify-between" style={{ gap: 12 }}>
                  <div className="min-w-0">
                    <div className="section-label" style={{ marginBottom: 4 }}>Application</div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: INK }}>{selected.company}</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: SOFT, lineHeight: 1.55 }}>{selected.name} · {selected.role} · <a href={`mailto:${selected.email}`} style={{ color: SOFT }}>{selected.email}</a>{selected.website ? <> · <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ color: SOFT }}>{selected.website.replace(/^https?:\/\//, "")}</a></> : null}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="icon-btn"><IconX size={15} /></button>
                </div>

                <dl className="acc-dl">
                  <dt style={{ color: FAINT }}>Status</dt><dd style={{ margin: 0 }}><StatusChip tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</StatusChip></dd>
                  <dt style={{ color: FAINT }}>Size and industry</dt><dd style={{ margin: 0, color: INK }}>{selected.company_size} · {selected.industry} · {selected.country}</dd>
                  <dt style={{ color: FAINT }}>Systems</dt><dd style={{ margin: 0, color: INK }}>{[...selected.systems, selected.other_systems].filter(Boolean).join(", ") || "—"}</dd>
                  <dt style={{ color: FAINT }}>Will connect</dt><dd style={{ margin: 0, color: INK }}>{selected.will_connect_systems ? "Yes" : "Not yet"}</dd>
                </dl>

                <div>
                  <p className="section-label" style={{ margin: "0 0 4px" }}>Problem</p>
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{selected.problem}</p>
                  <p className="section-label" style={{ margin: "16px 0 4px" }}>Desired outcome in 60 days</p>
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{selected.desired_outcome}</p>
                  {selected.notes && <><p className="section-label" style={{ margin: "16px 0 4px" }}>Notes</p><p style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{selected.notes}</p></>}
                </div>

                <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
                  <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                    <StatusChip tone={TIER[selected.eligibility.tier].tone}>{TIER[selected.eligibility.tier].label}</StatusChip>
                    {selected.eligibility.label !== TIER[selected.eligibility.tier].label && <span style={{ fontSize: 13, color: INK }}>{selected.eligibility.label}</span>}
                  </div>
                  <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4, fontSize: 12.5, color: SOFT, lineHeight: 1.55 }}>{selected.eligibility.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: FAINT }}>Rules <span className="num" style={{ fontSize: 11.5 }}>{selected.eligibility.rules_version}</span></p>
                </div>

                <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 10 }}>
                  <label htmlFor="review-note" style={{ fontSize: 12.5, color: SOFT }}>Note to the applicant (shown on their status page)</label>
                  <textarea id="review-note" className="ui-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} style={{ resize: "vertical" }} />
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {NEXT[selected.status].map((st) => (
                      <Button key={st} variant={st === "approved" ? "primary" : st === "rejected" || st === "expired" ? "danger" : "secondary"} size="sm"
                        disabled={!!busy && busy !== st} loading={busy === st} onClick={() => ask(st)}>
                        {VERB[st]}
                      </Button>
                    ))}
                    {selected.status === "approved" && (
                      <Button variant="secondary" size="sm" disabled={!!busy && busy !== "reissue"} loading={busy === "reissue"} onClick={reissue}>New download link</Button>
                    )}
                  </div>
                  {issued && (
                    <div role="status" style={{ padding: "2px 0 2px 12px", boxShadow: "inset 2px 0 0 var(--positive)", fontSize: 12.5 }}>
                      <p style={{ margin: "0 0 8px", color: INK, lineHeight: 1.5 }}>{issued.emailed ? "Emailed to the applicant. " : "Email is not configured, so send this link yourself. "}It is shown only once; issuing a new one revokes it.</p>
                      <div className="flex" style={{ gap: 8 }}>
                        <code style={{ flex: 1, minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--surface-2)", border: `1px solid ${LINE}`, borderRadius: 6, padding: "5px 8px", color: INK }}>{issued.url}</code>
                        <Button variant="secondary" size="sm" icon={<IconCopy size={13} />} onClick={() => { navigator.clipboard?.writeText(issued.url); notify("Link copied", "positive"); }}>Copy</Button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 16 }}>
                  <p className="section-label" style={{ margin: "0 0 8px" }}>History</p>
                  <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: 12.5 }}>
                    {selected.events.map((ev, i) => (
                      <li key={i} style={{ color: SOFT, lineHeight: 1.5 }}><span style={{ color: INK }}>{STATUS_LABEL[ev.to_status as Status] || ev.to_status}</span> · {ev.actor} · <span className="tabular-nums">{fmt(ev.created_at)}</span>{ev.note ? `: ${ev.note}` : ""}</li>
                    ))}
                    {selected.entitlements.map((en) => (
                      <li key={en.id} style={{ color: SOFT, lineHeight: 1.5 }}>Download link · {en.revoked_at ? "revoked" : new Date(en.expires_at) < new Date() ? "expired" : `valid until ${fmt(en.expires_at)}`} · {en.downloads} download{en.downloads === 1 ? "" : "s"}</li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!confirm && !!selected}
        onClose={() => setConfirm(null)}
        title={confirm && selected ? `${VERB[confirm]} ${selected.company}?` : ""}
        description={confirm === "rejected" ? "The applicant sees this on their status page. You can move it back to review later." : "Their access stops. You can approve them again later."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirm && decide(confirm)}>{confirm ? VERB[confirm] : "Confirm"}</Button>
          </>
        }
      />
    </DashboardLayout>
  );
}

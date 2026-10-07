"use client";

// Outreach panels. Display and buttons only: eligibility, limits, timing,
// validation and whether START is allowed are all decided by the backend
// (lib/domain/outbound). Nothing here sends anything by itself.

import React, { useCallback, useEffect, useState } from "react";
import { C, Pill } from "@/components/decisions/ui";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, isNotReady } from "@/components/os/shared";
import {
  outreachApi, parseTargetsCsv,
  type OutreachStatus, type Preflight, type SendMode, type ProviderAccount, type ReviewMessage, type Reply, type CampaignRow,
} from "@/lib/outreach";

type Tone = "good" | "warn" | "bad" | "neutral";
const checkTone = (s: string): Tone => (s === "PASS" ? "good" : s === "FAIL" ? "bad" : s === "BLOCKED" || s === "WARN" ? "warn" : "neutral");
const accountTone = (s: string): Tone => (s === "HEALTHY" ? "good" : s === "THROTTLED" ? "warn" : s === "PAUSED" ? "neutral" : "bad");
const fmt = (ts: string | null | undefined) => {
  if (!ts) return "never";
  try { return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ts; }
};

// ── Status + START / STOP ALL OUTBOUND ─────────────────────────────────

export function OutreachControl({ status, onChange }: { status: OutreachStatus | null; onChange: () => void }) {
  const [mode, setMode] = useState<SendMode>("SHADOW");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Preflight | null>(null);
  const running = status?.engine.status === "RUNNING";

  const start = async () => {
    setBusy(true); setError(null); setRefusal(null);
    try {
      const r = await outreachApi.start(mode, mode === "LIVE" ? confirm : undefined);
      if (!r.started) setRefusal(r.preflight);
      onChange();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  // STOP never waits on START: it has its own in-flight flag, so it stays
  // pressable while a start (or anything else) is still running.
  const [stopping, setStopping] = useState(false);
  const stopAll = async () => {
    setStopping(true); setError(null);
    try { await outreachApi.stopAll("STOP ALL OUTBOUND pressed"); onChange(); } catch (err) { setError(`Stop did not go through: ${errorText(err)} Press it again.`); } finally { setStopping(false); }
  };

  const headlineTone: Tone = !status ? "neutral" : status.globalStop.stopped || status.engine.status === "STOPPED_AUTOMATICALLY" ? "bad" : running ? "good" : "neutral";
  return (
    <Panel
      title={status ? status.headline : "Outreach"}
      subtitle={status
        ? running
          ? `Running in ${status.engine.mode}. ${status.engine.mode === "SHADOW" ? "The whole pipeline runs, but nothing leaves: messages go to a sink." : status.engine.mode === "TEST" ? "Real sends, only to your internal test addresses." : "Real email to prospects, within every limit."}`
          : status.engine.reason ? `Stopped: ${status.engine.reason}` : "Not running. Review the campaign, then press START."
        : "Loading…"}
      right={<Pill tone={headlineTone}>{status?.engine.status?.replace(/_/g, " ") || "…"}</Pill>}
    >
      {status && (
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
          {[
            ["Eligible targets", status.eligibleTargets],
            ["Waiting for review", status.awaitingReview],
            ["Queued", status.queued],
            ["Sent", status.sent],
            ["Sent last hour", status.sendRatePerHour],
            ["Left today", status.dailyRemaining ?? "–"],
            ["Replies to read", status.repliesNeedingAttention],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <div className="text-[11px]" style={{ color: C.faint }}>{k}</div>
              <div className="text-[20px]" style={{ color: C.ink, fontFamily: "var(--font-sans)" , fontWeight: 600, letterSpacing: "-0.015em"}}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {status && (
        <Muted>
          {status.market.activeNow ? `Sending window open now: ${status.market.activeNow}.` : "No recipient is inside their sending window right now."}
          {status.market.next ? ` Next: ${status.market.next.market} at ${fmt(status.market.next.at)}.` : ""}
          {` Last successful send: ${fmt(status.lastSuccessfulSend)}.`}
        </Muted>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <label className="text-[12.5px]" style={{ color: C.body }}>
          Mode{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as SendMode)} className="rounded-md px-2 py-[5px] text-[12.5px]" style={{ border: `1px solid ${C.line}` }}>
            <option value="SHADOW">Shadow (nothing leaves)</option>
            <option value="TEST">Test (internal addresses only)</option>
            <option value="LIVE">Live (real prospects)</option>
          </select>
        </label>
        {mode === "LIVE" && (
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type SEND TO REAL PROSPECTS"
            className="rounded-md px-2 py-[5px] text-[12.5px]"
            style={{ border: `1px solid ${C.line}`, minWidth: 230 }}
            aria-label="Type SEND TO REAL PROSPECTS to confirm live sending"
          />
        )}
        <Btn primary onClick={start} disabled={busy || (mode === "LIVE" && confirm !== "SEND TO REAL PROSPECTS")}>
          {running ? `Switch to ${mode}` : "START"}
        </Btn>
        <Btn danger onClick={stopAll} disabled={stopping}>{stopping ? "Stopping…" : "STOP ALL OUTBOUND"}</Btn>
      </div>
      <ErrorLine error={error} />
      {refusal && (
        <div className="mt-3">
          <p className="text-[12.5px]" role="alert" style={{ color: C.bad }}>START was refused. Fix these first:</p>
          <ul className="mt-1">
            {refusal.checks.filter((c) => c.critical && c.status !== "PASS").map((c) => (
              <li key={c.name} className="text-[12.5px] mt-1" style={{ color: C.body }}>
                <Pill tone={checkTone(c.status)}>{c.name}</Pill> {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {status?.alerts?.length ? (
        <div className="mt-4">
          {status.alerts.map((a, i) => (
            <p key={i} className="text-[12.5px] mt-1" style={{ color: a.severity === "CRITICAL" ? C.bad : C.warn }}>
              {a.severity === "CRITICAL" ? "Stopped: " : ""}{a.message}
            </p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

// ── Preflight ──────────────────────────────────────────────────────────

export function PreflightPanel({ refreshKey }: { refreshKey: number }) {
  const [pre, setPre] = useState<Preflight | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { outreachApi.preflight().then(setPre).catch((e) => setError(errorText(e))); }, [refreshKey]);
  return (
    <Panel title="Readiness" subtitle="The same checks START runs. A check is green only when it was verified.">
      <ErrorLine error={error} />
      {pre && (
        <>
          <p className="text-[13px] mb-2" style={{ color: pre.ready ? C.good : C.warn, fontWeight: 500 }}>{pre.verdict}</p>
          {pre.checks.map((c) => (
            <div key={c.name} className="flex items-start gap-3 py-[6px]" style={{ borderTop: `1px solid ${C.line}` }}>
              <div style={{ width: 130, flexShrink: 0 }}><Pill tone={checkTone(c.status)}>{c.status}</Pill></div>
              <div className="text-[12.5px]" style={{ color: C.body }}>
                <span style={{ color: C.ink, fontWeight: 500 }}>{c.name}</span> {c.detail}
              </div>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

// ── Sending accounts ───────────────────────────────────────────────────

export function AccountsPanel({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<{ accounts: ProviderAccount[]; gmailOAuthConfigured: boolean; credentialsKeyConfigured: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { outreachApi.providers().then(setData).catch((e) => setError(errorText(e))); }, []);
  useEffect(load, [load]);

  const connectGmail = async () => {
    setBusy(true); setError(null);
    try { const r = await outreachApi.gmailConnectUrl(); window.location.href = r.url; } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); load(); onChange(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return (
    <Panel
      title="Sending account"
      subtitle="Gmail sends from your own mailbox and reads replies and bounces from it. The shadow sink is for rehearsals: it delivers nowhere."
      right={
        <div className="flex gap-2">
          <Btn primary onClick={connectGmail} disabled={busy || (data ? !data.gmailOAuthConfigured || !data.credentialsKeyConfigured : true)}
            title={data && !data.gmailOAuthConfigured ? "Gmail is not configured on the backend yet" : data && !data.credentialsKeyConfigured ? "OUTBOUND_CREDENTIALS_KEY is not set on the backend" : undefined}>
            Connect Gmail
          </Btn>
          <Btn onClick={() => act(() => outreachApi.addSink())} disabled={busy}>Add shadow sink</Btn>
        </div>
      }
    >
      {data && !data.gmailOAuthConfigured && <Muted>Gmail cannot be connected until the backend has its Google OAuth settings.</Muted>}
      {data?.accounts.length === 0 && <Muted>No sending account yet.</Muted>}
      {data?.accounts.map((a) => (
        <Row key={a.id}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[13px]" style={{ color: C.ink }}>{a.provider === "sink" ? "Shadow sink" : "Gmail"} · {a.fromAddress}</div>
              <div className="text-[12px]" style={{ color: C.muted }}>
                {a.dailyMax}/day max{a.throttleFactor < 1 ? `, slowed to ${Math.round(a.throttleFactor * 100)}%` : ""} · last send {fmt(a.lastSuccessAt)}{a.provider === "gmail" ? ` · inbox read ${fmt(a.lastPollAt)}` : ""}
                {(a.statusReason || a.reason) ? ` · ${a.statusReason || a.reason}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={accountTone(a.status)}>{a.status.replace(/_/g, " ")}</Pill>
              {a.status === "PAUSED" ? <Btn onClick={() => act(() => outreachApi.providerAction(a.id, "resume"))} disabled={busy}>Resume</Btn>
                : a.status === "AUTH_REQUIRED" ? <Btn onClick={connectGmail} disabled={busy}>Reconnect</Btn>
                  : <Btn onClick={() => act(() => outreachApi.providerAction(a.id, "pause"))} disabled={busy}>Pause</Btn>}
            </div>
          </div>
        </Row>
      ))}
      <ErrorLine error={error} />
    </Panel>
  );
}

// ── Campaigns + target import ──────────────────────────────────────────

const CSV_EXAMPLE = "company,domain,country,industry,full_name,role,email,timezone,verification_source,verification_method,verified_at,fact,fact_source,fact_date";

export function CampaignsPanel({ campaigns, accounts, onChange }: { campaigns: CampaignRow[]; accounts: ProviderAccount[]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", goal: "Book pilot conversations", cta: "Would a 15-minute working session be useful?", countries: "IN", topic: "" });
  const [csv, setCsv] = useState("");
  const [target, setTarget] = useState<string>("");
  const usable = accounts.filter((a) => a.status !== "FAILED");
  const selected = target || campaigns[0]?.id || "";

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true); setError(null); setNote(null);
    try { await fn(); if (done) setNote(done); onChange(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const create = () => act(() => outreachApi.createCampaign({
    name: form.name || "Outreach", goal: form.goal, cta: form.cta,
    allowedCountries: form.countries.split(/[,\s]+/).filter(Boolean).map((c) => c.toUpperCase()),
    providerAccountId: usable[0]?.id || null,
    messageStrategy: form.topic ? { topic: form.topic } : {},
  }), "Campaign created as a draft.");
  const importAndDraft = () => act(async () => {
    const { rows, problems } = parseTargetsCsv(csv);
    if (!rows.length) throw new Error(problems.join(" ") || "Nothing to import.");
    const imp = await outreachApi.importTargets(rows);
    const ids = imp.results.filter((r) => r.contactId).map((r) => r.contactId as string);
    const rejected = imp.results.filter((r) => r.status === "REJECTED").map((r) => `row ${r.row + 2}: ${r.error}`);
    let drafted = 0; let excluded = 0; let blocked = 0;
    if (selected && ids.length) {
      await outreachApi.enroll(selected, ids);
      const d = await outreachApi.drafts(selected);
      drafted = d.drafted; excluded = d.excluded.length; blocked = d.blockedByValidation;
    }
    setNote(`Imported ${imp.created} new, ${imp.merged} already known, ${imp.rejected} rejected. ${drafted} draft(s) ready for review, ${blocked} blocked by validation, ${excluded} not eligible.${rejected.length ? ` Rejected: ${rejected.slice(0, 3).join("; ")}` : ""}${problems.length ? ` ${problems.join(" ")}` : ""}`);
    setCsv("");
  });

  const statusTone = (s: string): Tone => (s === "ACTIVE" ? "good" : s === "PAUSED_AUTOMATICALLY" ? "bad" : s === "PAUSED" ? "warn" : "neutral");
  const field = (k: keyof typeof form, label: string, w = 220) => (
    <label className="text-[12px] flex flex-col gap-1" style={{ color: C.muted }}>
      {label}
      <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="rounded-md px-2 py-[5px] text-[12.5px]" style={{ border: `1px solid ${C.line}`, width: w, color: C.ink }} />
    </label>
  );

  return (
    <Panel title="Campaigns" subtitle="A campaign sends only approved messages, only to verified people, only inside their local working hours, and never faster than its limits.">
      {campaigns.length === 0 && <Muted>No campaign yet.</Muted>}
      {campaigns.map((c) => (
        <Row key={c.id}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[13px]" style={{ color: C.ink }}>{c.name}</div>
              <div className="text-[12px]" style={{ color: C.muted }}>{c.goal}{c.goal_target ? ` (target ${c.goal_target})` : ""} · {c.daily_budget}/day{c.status_reason ? ` · ${c.status_reason}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={statusTone(c.status)}>{c.status.replace(/_/g, " ")}</Pill>
              {c.status === "DRAFT" && <Btn onClick={() => act(() => outreachApi.campaignAction(c.id, "start"))} disabled={busy}>Activate</Btn>}
              {c.status === "ACTIVE" && <Btn onClick={() => act(() => outreachApi.campaignAction(c.id, "pause"))} disabled={busy}>Pause</Btn>}
              {(c.status === "PAUSED" || c.status === "PAUSED_AUTOMATICALLY") && <Btn onClick={() => act(() => outreachApi.campaignAction(c.id, "resume"))} disabled={busy}>Resume</Btn>}
              {c.status !== "STOPPED" && c.status !== "COMPLETED" && <Btn danger onClick={() => act(() => outreachApi.campaignAction(c.id, "stop"))} disabled={busy}>Stop</Btn>}
            </div>
          </div>
        </Row>
      ))}

      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
        <p className="text-[13px] mb-2" style={{ color: C.ink, fontWeight: 500 }}>New campaign</p>
        <div className="flex flex-wrap gap-3 items-end">
          {field("name", "Name")}
          {field("goal", "Goal", 260)}
          {field("cta", "Call to action", 320)}
          {field("countries", "Countries (ISO codes)", 150)}
          {field("topic", "Topic (optional)", 220)}
          <Btn primary onClick={create} disabled={busy || !usable.length} title={!usable.length ? "Add a sending account first" : undefined}>Create</Btn>
        </div>
      </div>

      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
        <p className="text-[13px] mb-1" style={{ color: C.ink, fontWeight: 500 }}>Add targets</p>
        <Muted>
          Paste CSV with a header row. Required: company, full_name, email. A person is sendable only with a verification source and method
          (published_by_person, verification_service, prior_correspondence, manual_confirmed, provider_directory). Emails are never guessed; generic inboxes are refused.
        </Muted>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={CSV_EXAMPLE}
          rows={5}
          className="w-full mt-2 rounded-md p-2 text-[12px]"
          style={{ border: `1px solid ${C.line}`, fontFamily: "'IBM Plex Mono', monospace", color: C.ink }}
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <select value={selected} onChange={(e) => setTarget(e.target.value)} className="rounded-md px-2 py-[5px] text-[12.5px]" style={{ border: `1px solid ${C.line}` }}>
            {campaigns.filter((c) => c.status !== "STOPPED").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Btn primary onClick={importAndDraft} disabled={busy || !csv.trim() || !selected}>Import and draft</Btn>
        </div>
      </div>
      {note && <p className="text-[12.5px] mt-2" style={{ color: C.body }}>{note}</p>}
      <ErrorLine error={error} />
    </Panel>
  );
}

// ── Review queue ───────────────────────────────────────────────────────

export function ReviewPanel({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [msgs, setMsgs] = useState<ReviewMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => { outreachApi.messages().then((r) => setMsgs(r.messages)).catch((e) => setError(errorText(e))); }, []);
  useEffect(load, [load, refreshKey]);
  const decide = async (id: string, decision: "APPROVE" | "REJECT") => {
    setBusy(id); setError(null);
    try { await outreachApi.review(id, decision); load(); onChange(); } catch (e) { setError(errorText(e)); } finally { setBusy(null); }
  };
  return (
    <Panel title="Review" subtitle="Nothing is queued until you approve it. Every fact shows its source; unsourced numbers, hype and missing CTAs are blocked before they reach you.">
      {msgs?.length === 0 && <Muted>No drafts waiting.</Muted>}
      {msgs?.map((m) => (
        <Row key={m.id}>
          <div className="text-[12px]" style={{ color: C.muted }}>
            To {m.full_name}{m.role_title ? `, ${m.role_title}` : ""}{m.company ? ` at ${m.company}` : ""} · {m.email}{m.step > 0 ? ` · follow-up ${m.step}` : ""}
          </div>
          <div className="text-[13.5px] mt-1" style={{ color: C.ink, fontWeight: 500 }}>{m.subject}</div>
          <pre className="text-[12.5px] mt-1 whitespace-pre-wrap" style={{ color: C.body, fontFamily: "inherit", margin: 0 }}>{m.body}</pre>
          {m.evidence?.length ? (
            <div className="text-[11.5px] mt-2" style={{ color: C.faint }}>
              Source: {m.evidence.map((e) => `${e.source} (${e.retrievedAt})`).join("; ")}
            </div>
          ) : null}
          {m.validation?.warnings?.length ? <div className="text-[11.5px] mt-1" style={{ color: C.warn }}>{m.validation.warnings.join("; ")}</div> : null}
          <div className="flex gap-2 mt-2">
            <Btn primary onClick={() => decide(m.id, "APPROVE")} disabled={busy === m.id}>Approve</Btn>
            <Btn onClick={() => decide(m.id, "REJECT")} disabled={busy === m.id}>Reject</Btn>
          </div>
        </Row>
      ))}
      <ErrorLine error={error} />
    </Panel>
  );
}

// ── Replies ────────────────────────────────────────────────────────────

const REPLY_LABEL: Record<string, string> = {
  MEETING: "Wants to meet", INTERESTED: "Interested", QUESTION: "Asked a question", ROUTED_TO_OTHER_PERSON: "Pointed to someone else", NOT_NOW: "Not now",
  DECLINED: "Declined", OPT_OUT: "Opted out", AUTO_REPLY: "Auto-reply", OTHER: "Needs a read",
};

export function RepliesPanel({ refreshKey }: { refreshKey: number }) {
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { outreachApi.replies().then((r) => setReplies(r.replies.filter((x) => x.needs_attention))).catch((e) => setError(errorText(e))); }, []);
  useEffect(load, [load, refreshKey]);
  const handled = async (id: string) => { try { await outreachApi.replyHandled(id); load(); } catch (e) { setError(errorText(e)); } };
  return (
    <Panel title="Replies that need you" subtitle="Starlane stops follow-ups on any real reply and never answers for you. Opt-outs are suppressed immediately.">
      {replies?.length === 0 && <Muted>No replies waiting.</Muted>}
      {replies?.map((r) => (
        <Row key={r.id}>
          <div className="flex items-start justify-between gap-3">
            <div style={{ minWidth: 0 }}>
              <div className="text-[13px]" style={{ color: C.ink }}>{r.full_name || r.email}{r.company ? ` · ${r.company}` : ""}</div>
              <div className="text-[12.5px] mt-1" style={{ color: C.body }}>{r.snippet}</div>
              <div className="text-[11.5px] mt-1" style={{ color: C.faint }}>{fmt(r.received_at)} · open it in Gmail to answer</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={r.classification === "MEETING" || r.classification === "INTERESTED" ? "good" : "neutral"}>{REPLY_LABEL[r.classification] || r.classification}</Pill>
              <Btn onClick={() => handled(r.id)}>Done</Btn>
            </div>
          </div>
        </Row>
      ))}
      <ErrorLine error={error} />
    </Panel>
  );
}

// ── Page body ──────────────────────────────────────────────────────────

export function OutreachBody() {
  const [status, setStatus] = useState<OutreachStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => {
    outreachApi.status().then((s) => { setStatus(s); setError(null); }).catch((e) => { if (isNotReady(e)) setNotReady(true); setError(errorText(e)); });
    setKey((k) => k + 1);
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(() => outreachApi.status().then(setStatus).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [refresh]);

  if (notReady) {
    return (
      <Panel title="Outreach is not set up on this server yet" subtitle="The outbound tables (migration 062) are not on this database, so nothing can be queued or sent.">
        <ErrorLine error={error} />
      </Panel>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <OutreachControl status={status} onChange={refresh} />
      <RepliesPanel refreshKey={key} />
      <ReviewPanel refreshKey={key} onChange={refresh} />
      <CampaignsPanel campaigns={status?.campaigns || []} accounts={status?.providers || []} onChange={refresh} />
      <AccountsPanel onChange={refresh} />
      <PreflightPanel refreshKey={key} />
      <ErrorLine error={error} />
    </div>
  );
}

// ── Compact line for Missions and Prepared ─────────────────────────────
// Renders nothing until outreach exists for this business, so pages stay
// quiet for anyone not using it.

export function OutreachSummary({ context }: { context: "missions" | "prepared" }) {
  const [s, setS] = useState<OutreachStatus | null>(null);
  useEffect(() => { outreachApi.status().then(setS).catch(() => setS(null)); }, []);
  if (!s || (!s.campaigns.length && !s.providers.length)) return null;
  const needsYou = s.awaitingReview + s.repliesNeedingAttention;
  if (context === "prepared" && needsYou === 0) return null;
  const running = s.engine.status === "RUNNING";
  return (
    <Panel
      title={context === "prepared" ? "Outreach needs you" : `Outreach: ${running ? `running (${s.engine.mode})` : s.engine.status.replace(/_/g, " ").toLowerCase()}`}
      subtitle={context === "prepared"
        ? `${s.awaitingReview} draft(s) to review, ${s.repliesNeedingAttention} repl${s.repliesNeedingAttention === 1 ? "y" : "ies"} to read.`
        : `${s.queued} queued, ${s.sent} sent, ${s.repliesNeedingAttention} repl${s.repliesNeedingAttention === 1 ? "y" : "ies"} to read${s.alerts.length ? `, ${s.alerts.length} alert(s)` : ""}.`}
      right={<a href="/outreach" className="text-[12.5px] underline" style={{ color: C.accent }}>Open Outreach</a>}
    >
      {null}
    </Panel>
  );
}

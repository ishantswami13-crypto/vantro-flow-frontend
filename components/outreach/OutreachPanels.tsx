"use client";

// Outreach panels. Display and buttons only: eligibility, limits, timing,
// validation and whether Start is allowed are all decided by the backend
// (lib/domain/outbound). Nothing here sends anything by itself.

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isNotReady } from "@/components/os/shared";
import { SectionHead, Panel, Note, humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import Button from "@/components/ui/Button";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconArrowRight } from "@/components/v32/icons";
import { formatDateTime, formatCount, formatRelative } from "@/lib/format";
import {
  outreachApi, parseTargetsCsv,
  type OutreachStatus, type Preflight, type SendMode, type ProviderAccount, type ReviewMessage, type Reply, type CampaignRow,
} from "@/lib/outreach";

// The exact phrase the backend requires before live sending (lib/routes/outreach.js).
const LIVE_CONFIRM = "SEND TO REAL PROSPECTS";

const checkTone = (s: string): StatusTone => (s === "PASS" ? "positive" : s === "FAIL" ? "critical" : s === "BLOCKED" || s === "WARN" ? "attention" : "unknown");
const accountTone = (s: string): StatusTone => (s === "HEALTHY" ? "positive" : s === "THROTTLED" ? "attention" : s === "PAUSED" ? "neutral" : "critical");
const campaignTone = (s: string): StatusTone => (s === "ACTIVE" ? "positive" : s === "PAUSED_AUTOMATICALLY" ? "critical" : s === "PAUSED" ? "attention" : s === "DRAFT" ? "info" : "neutral");
const words = (s: string | null | undefined) => {
  const t = String(s || "").replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const when = (ts: string | null | undefined) => (ts ? formatDateTime(ts) : "never");
const CHECK_LABEL: Record<string, string> = { PASS: "Passed", FAIL: "Failed", BLOCKED: "Blocked", WARN: "Warning", SKIPPED: "Skipped" };

function Section({ title, hint, count, right, children }: { title: string; hint?: React.ReactNode; count?: number | null; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <SectionHead title={title} hint={hint} count={count} right={right} />
      {children}
    </section>
  );
}

function Item({ first, children }: { first?: boolean; children: React.ReactNode }) {
  return <div style={{ padding: "14px 18px", borderTop: first ? 0 : "1px solid var(--line)" }}>{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: "14px 18px", fontSize: 13, color: "var(--ink-2)" }}>{children}</p>;
}

// ── Status + Start / Stop all outbound ─────────────────────────────────

export function OutreachControl({ status, onChange }: { status: OutreachStatus | null; onChange: () => void }) {
  const [mode, setMode] = useState<SendMode>("SHADOW");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Preflight | null>(null);
  const running = status?.engine.status === "RUNNING";
  // Pressing Start for the mode that is already running would change nothing.
  const sameMode = running && status?.engine.mode === mode;

  const start = async () => {
    setBusy(true); setError(null); setRefusal(null);
    try {
      const r = await outreachApi.start(mode, mode === "LIVE" ? confirm : undefined);
      if (!r.started) setRefusal(r.preflight);
      onChange();
    } catch (err) { setError(humaneError(err)); } finally { setBusy(false); }
  };
  // Stop never waits on Start: it has its own in-flight flag, so it stays
  // pressable while a start (or anything else) is still running.
  const [stopping, setStopping] = useState(false);
  const stopAll = async () => {
    setStopping(true); setError(null);
    try { await outreachApi.stopAll("STOP ALL OUTBOUND pressed"); onChange(); } catch (err) { setError(`Stop did not go through. ${humaneError(err, NETWORK_ERROR)} Press it again.`); } finally { setStopping(false); }
  };

  const headTone: StatusTone = !status ? "unknown" : status.globalStop.stopped || status.engine.status === "STOPPED_AUTOMATICALLY" ? "critical" : running ? "positive" : "neutral";
  const stats: [string, number | null][] = status ? [
    ["Eligible targets", status.eligibleTargets],
    ["Waiting for review", status.awaitingReview],
    ["Queued", status.queued],
    ["Sent", status.sent],
    ["Sent last hour", status.sendRatePerHour],
    ["Left today", status.dailyRemaining],
    ["Replies to read", status.repliesNeedingAttention],
  ] : [];

  return (
    <Panel style={{ padding: "20px 22px" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="min-w-0">
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{status ? status.headline : "Outreach"}</div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 680 }}>
            {status
              ? running
                ? `${status.engine.mode === "SHADOW" ? "The whole pipeline runs, but nothing leaves: messages go to a sink." : status.engine.mode === "TEST" ? "Real sends, only to your internal test addresses." : "Real email to prospects, within every limit."}`
                : status.engine.reason ? `Stopped: ${status.engine.reason}` : "Not running. Review the campaign, then press Start."
              : "Reading the outreach status…"}
          </p>
        </div>
        <StatusChip tone={headTone}>{status ? words(status.engine.status) : "Not known yet"}</StatusChip>
      </div>

      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" style={{ gap: "16px 20px", marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          {stats.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <div className="tabular-nums" style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.2 }}>{v == null ? "—" : formatCount(v)}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{k}</div>
            </div>
          ))}
        </div>
      )}
      {status && (
        <p style={{ margin: "16px 0 0", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
          {status.market.activeNow ? `Sending window open now: ${status.market.activeNow}.` : "No recipient is inside their sending window right now."}
          {status.market.next ? ` Next: ${status.market.next.market} at ${when(status.market.next.at)}.` : ""}
          {` Last successful send: ${when(status.lastSuccessfulSend)}.`}
        </p>
      )}

      <div className="flex flex-wrap items-end" style={{ gap: 10, marginTop: 18 }}>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as SendMode)} className="ui-input" style={{ width: 240 }}>
            <option value="SHADOW">Shadow (nothing leaves)</option>
            <option value="TEST">Test (internal addresses only)</option>
            <option value="LIVE">Live (real prospects)</option>
          </select>
        </label>
        {mode === "LIVE" && (
          <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--ink-3)" }}>
            Type {LIVE_CONFIRM} to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={LIVE_CONFIRM} className="ui-input" style={{ width: 250 }} />
          </label>
        )}
        <Button variant="primary" onClick={start} loading={busy} disabled={busy || sameMode || (mode === "LIVE" && confirm !== LIVE_CONFIRM)}>
          {sameMode ? `Running in ${words(mode).toLowerCase()}` : running ? `Switch to ${words(mode).toLowerCase()}` : "Start"}
        </Button>
        <Button variant="danger" onClick={stopAll} loading={stopping} disabled={stopping}>Stop all outbound</Button>
      </div>
      {error && <div style={{ marginTop: 10 }}><Note tone="critical">{error}</Note></div>}
      {refusal && (
        <div role="alert" style={{ marginTop: 14 }}>
          <Note tone="critical">Start was refused. Fix these first:</Note>
          <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
            {refusal.checks.filter((c) => c.critical && c.status !== "PASS").map((c) => (
              <li key={c.name} className="flex items-start flex-wrap" style={{ gap: 8, fontSize: 12.5, color: "var(--body)", padding: "4px 0" }}>
                <StatusChip tone={checkTone(c.status)}>{c.name}</StatusChip> {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
      {status?.alerts?.length ? (
        <div style={{ marginTop: 14, display: "grid", gap: 4 }}>
          {status.alerts.map((a, i) => (
            <Note key={i} tone={a.severity === "CRITICAL" ? "critical" : "attention"}>{a.severity === "CRITICAL" ? "Stopped: " : ""}{a.message}</Note>
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
  useEffect(() => { outreachApi.preflight().then((p) => { setPre(p); setError(null); }).catch((e) => setError(humaneError(e, NETWORK_ERROR))); }, [refreshKey]);
  return (
    <Section title="Readiness" hint="The same checks Start runs. A check passes only when it was verified.">
      <Panel pad={false}>
        {error && <Empty>{error}</Empty>}
        {!pre && !error && <Empty>Checking…</Empty>}
        {pre && (
          <>
            <div style={{ padding: "12px 18px", fontSize: 13, color: pre.ready ? "var(--positive)" : "var(--warning)" }}>{pre.verdict}</div>
            {pre.checks.map((c) => (
              <div key={c.name} className="grid grid-cols-[96px_minmax(0,1fr)]" style={{ gap: 12, padding: "10px 18px", borderTop: "1px solid var(--line)", alignItems: "start" }}>
                <span><StatusChip tone={checkTone(c.status)}>{CHECK_LABEL[c.status] || words(c.status)}</StatusChip></span>
                <span style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--ink)" }}>{c.name}.</span> {c.detail}
                </span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </Section>
  );
}

// ── Sending accounts ───────────────────────────────────────────────────

export function AccountsPanel({ onChange }: { onChange: () => void }) {
  const [data, setData] = useState<{ accounts: ProviderAccount[]; gmailOAuthConfigured: boolean; credentialsKeyConfigured: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { outreachApi.providers().then((d) => { setData(d); setError(null); }).catch((e) => setError(humaneError(e, NETWORK_ERROR))); }, []);
  useEffect(load, [load]);

  const connectGmail = async () => {
    setBusy(true); setError(null);
    try { const r = await outreachApi.gmailConnectUrl(); window.location.href = r.url; } catch (e) { setError(humaneError(e)); setBusy(false); }
  };
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); load(); onChange(); } catch (e) { setError(humaneError(e)); } finally { setBusy(false); }
  };

  return (
    <Section
      title="Sending account"
      hint="Gmail sends from your own mailbox and reads replies and bounces from it. The shadow sink is for rehearsals: it delivers nowhere."
      right={
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={connectGmail} disabled={busy || (data ? !data.gmailOAuthConfigured || !data.credentialsKeyConfigured : true)}
            title={data && !data.gmailOAuthConfigured ? "Gmail is not configured on the backend yet" : data && !data.credentialsKeyConfigured ? "The backend has no key for storing mailbox credentials yet" : undefined}>
            Connect Gmail
          </Button>
          <Button variant="ghost" size="sm" onClick={() => act(() => outreachApi.addSink())} disabled={busy}>Add shadow sink</Button>
        </div>
      }
    >
      <Panel pad={false}>
        {data && !data.gmailOAuthConfigured && <Empty>Gmail cannot be connected until the backend has its Google sign-in settings.</Empty>}
        {data?.accounts.length === 0 && <Empty>No sending account yet.</Empty>}
        {!data && !error && <Empty>Loading…</Empty>}
        {data?.accounts.map((a, i) => (
          <Item key={a.id} first={i === 0 && !!data.gmailOAuthConfigured}>
            <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
              <div className="min-w-0">
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{a.provider === "sink" ? "Shadow sink" : "Gmail"} · {a.fromAddress}</div>
                <div className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}>
                  Up to {a.dailyMax} a day{a.throttleFactor < 1 ? `, slowed to ${Math.round(a.throttleFactor * 100)}%` : ""} · last send {when(a.lastSuccessAt)}{a.provider === "gmail" ? ` · inbox read ${when(a.lastPollAt)}` : ""}
                  {(a.statusReason || a.reason) ? ` · ${a.statusReason || a.reason}` : ""}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <StatusChip tone={accountTone(a.status)}>{words(a.status)}</StatusChip>
                {a.status === "PAUSED" ? <Button variant="secondary" size="sm" onClick={() => act(() => outreachApi.providerAction(a.id, "resume"))} disabled={busy}>Resume</Button>
                  : a.status === "AUTH_REQUIRED" ? <Button variant="secondary" size="sm" onClick={connectGmail} disabled={busy}>Reconnect</Button>
                    : <Button variant="ghost" size="sm" onClick={() => act(() => outreachApi.providerAction(a.id, "pause"))} disabled={busy}>Pause</Button>}
              </div>
            </div>
          </Item>
        ))}
        {error && <Item first={!data}><Note tone="critical">{error}</Note></Item>}
      </Panel>
    </Section>
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
    try { await fn(); if (done) setNote(done); onChange(); } catch (e) { setError(e instanceof Error && !(e as { status?: number }).status && !/fetch|network/i.test(e.message) ? e.message : humaneError(e)); } finally { setBusy(false); }
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

  const field = (k: keyof typeof form, label: string, cls = "") => (
    <label className={cls} style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--ink-3)", minWidth: 0 }}>
      {label}
      <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="ui-input" />
    </label>
  );

  return (
    <Section title="Campaigns" count={campaigns.length} hint="A campaign sends only approved messages, only to verified people, only inside their local working hours, and never faster than its limits.">
      <div className="flex flex-col" style={{ gap: 12 }}>
        <Panel pad={false}>
          {campaigns.length === 0 && <Empty>No campaign yet. Create one below.</Empty>}
          {campaigns.map((c, i) => (
            <Item key={c.id} first={i === 0}>
              <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
                <div className="min-w-0">
                  <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{c.name}</div>
                  <div className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{c.goal}{c.goal_target ? ` (target ${c.goal_target})` : ""} · {c.daily_budget} a day{c.status_reason ? ` · ${c.status_reason}` : ""}</div>
                </div>
                <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                  <StatusChip tone={campaignTone(c.status)}>{words(c.status)}</StatusChip>
                  {c.status === "DRAFT" && <Button variant="secondary" size="sm" onClick={() => act(() => outreachApi.campaignAction(c.id, "start"))} disabled={busy}>Activate</Button>}
                  {c.status === "ACTIVE" && <Button variant="secondary" size="sm" onClick={() => act(() => outreachApi.campaignAction(c.id, "pause"))} disabled={busy}>Pause</Button>}
                  {(c.status === "PAUSED" || c.status === "PAUSED_AUTOMATICALLY") && <Button variant="secondary" size="sm" onClick={() => act(() => outreachApi.campaignAction(c.id, "resume"))} disabled={busy}>Resume</Button>}
                  {c.status !== "STOPPED" && c.status !== "COMPLETED" && <Button variant="danger" size="sm" onClick={() => act(() => outreachApi.campaignAction(c.id, "stop"))} disabled={busy}>Stop</Button>}
                </div>
              </div>
            </Item>
          ))}
        </Panel>

        <div className="grid lg:grid-cols-2" style={{ gap: 12 }}>
          <Panel style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", marginBottom: 12 }}>New campaign</div>
            <div className="grid sm:grid-cols-2" style={{ gap: 12 }}>
              {field("name", "Name")}
              {field("countries", "Countries (ISO codes)")}
              {field("goal", "Goal", "sm:col-span-2")}
              {field("cta", "Call to action", "sm:col-span-2")}
              {field("topic", "Topic (optional)", "sm:col-span-2")}
            </div>
            <div style={{ marginTop: 14 }}>
              <Button variant="secondary" size="sm" onClick={create} disabled={busy || !usable.length} title={!usable.length ? "Add a sending account first" : undefined}>Create campaign</Button>
            </div>
          </Panel>

          <Panel style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Add targets</div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>
              Paste CSV with a header row. Required: company, full_name, email. A person is sendable only with a verification source and method
              (published_by_person, verification_service, prior_correspondence, manual_confirmed, provider_directory). Emails are never guessed; generic inboxes are refused.
            </p>
            <textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={CSV_EXAMPLE} rows={5} className="ui-input" aria-label="Targets as CSV" style={{ marginTop: 10, fontSize: 12 }} />
            <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10 }}>
              <select value={selected} onChange={(e) => setTarget(e.target.value)} className="ui-input" style={{ width: "auto", minWidth: 180, maxWidth: "100%" }} aria-label="Campaign to enrol into">
                {campaigns.filter((c) => c.status !== "STOPPED").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button variant="secondary" size="sm" onClick={importAndDraft} disabled={busy || !csv.trim() || !selected}>Import and draft</Button>
            </div>
          </Panel>
        </div>
        {note && <Note>{note}</Note>}
        {error && <Note tone="critical">{error}</Note>}
      </div>
    </Section>
  );
}

// ── Review queue ───────────────────────────────────────────────────────

export function ReviewPanel({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [msgs, setMsgs] = useState<ReviewMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => { outreachApi.messages().then((r) => { setMsgs(r.messages); setError(null); }).catch((e) => setError(humaneError(e, NETWORK_ERROR))); }, []);
  useEffect(load, [load, refreshKey]);
  const decide = async (id: string, decision: "APPROVE" | "REJECT") => {
    setBusy(id); setError(null);
    try { await outreachApi.review(id, decision); load(); onChange(); } catch (e) { setError(humaneError(e)); } finally { setBusy(null); }
  };
  return (
    <Section title="Review" count={msgs ? msgs.length : null} hint="Nothing is queued until you approve it. Every fact shows its source; unsourced numbers, hype and missing calls to action are blocked before they reach you.">
      <Panel pad={false}>
        {msgs?.length === 0 && <Empty>No drafts waiting.</Empty>}
        {!msgs && !error && <Empty>Loading…</Empty>}
        {msgs?.map((m, i) => (
          <Item key={m.id} first={i === 0}>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              To {m.full_name}{m.role_title ? `, ${m.role_title}` : ""}{m.company ? ` at ${m.company}` : ""} · {m.email}{m.step > 0 ? ` · follow-up ${m.step}` : ""}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500, marginTop: 4 }}>{m.subject}</div>
            <div style={{ fontSize: 13, color: "var(--body)", marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.6, maxWidth: 720 }}>{m.body}</div>
            {m.evidence?.length ? (
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
                Source: {m.evidence.map((e) => `${e.source} (${e.retrievedAt})`).join("; ")}
              </div>
            ) : null}
            {m.validation?.warnings?.length ? <div style={{ marginTop: 6 }}><Note tone="attention">{m.validation.warnings.join("; ")}</Note></div> : null}
            <div className="flex" style={{ gap: 8, marginTop: 12 }}>
              <Button variant="secondary" size="sm" onClick={() => decide(m.id, "APPROVE")} disabled={busy === m.id}>Approve</Button>
              <Button variant="ghost" size="sm" onClick={() => decide(m.id, "REJECT")} disabled={busy === m.id}>Reject</Button>
            </div>
          </Item>
        ))}
        {error && <Item first={!msgs}><Note tone="critical">{error}</Note></Item>}
      </Panel>
    </Section>
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
  const load = useCallback(() => { outreachApi.replies().then((r) => { setReplies(r.replies.filter((x) => x.needs_attention)); setError(null); }).catch((e) => setError(humaneError(e, NETWORK_ERROR))); }, []);
  useEffect(load, [load, refreshKey]);
  const handled = async (id: string) => { try { await outreachApi.replyHandled(id); load(); } catch (e) { setError(humaneError(e)); } };
  return (
    <Section title="Replies that need you" count={replies ? replies.length : null} hint="Starlane stops follow-ups on any real reply and never answers for you. Opt-outs are suppressed immediately.">
      <Panel pad={false}>
        {replies?.length === 0 && <Empty>No replies waiting.</Empty>}
        {!replies && !error && <Empty>Loading…</Empty>}
        {replies?.map((r, i) => (
          <Item key={r.id} first={i === 0}>
            <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
              <div className="min-w-0" style={{ flex: "1 1 260px" }}>
                <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{r.full_name || r.email}{r.company ? ` · ${r.company}` : ""}</div>
                <div style={{ fontSize: 13, color: "var(--body)", marginTop: 4, lineHeight: 1.55 }}>{r.snippet}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{formatRelative(r.received_at)} · open it in Gmail to answer</div>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <StatusChip tone={r.classification === "MEETING" || r.classification === "INTERESTED" ? "positive" : r.classification === "OPT_OUT" || r.classification === "DECLINED" ? "neutral" : "info"}>{REPLY_LABEL[r.classification] || words(r.classification)}</StatusChip>
                <Button variant="secondary" size="sm" onClick={() => handled(r.id)}>Done</Button>
              </div>
            </div>
          </Item>
        ))}
        {error && <Item first={!replies}><Note tone="critical">{error}</Note></Item>}
      </Panel>
    </Section>
  );
}

// ── Page body ──────────────────────────────────────────────────────────

export function OutreachBody() {
  const [status, setStatus] = useState<OutreachStatus | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notReady, setNotReady] = useState(false);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => {
    outreachApi.status().then((s) => { setStatus(s); setError(null); }).catch((e) => { if (isNotReady(e)) setNotReady(true); setError(e || new Error("status")); });
    setKey((k) => k + 1);
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(() => outreachApi.status().then(setStatus).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [refresh]);

  if (notReady) {
    return (
      <Panel>
        <div style={{ fontSize: 14, color: "var(--ink)" }}>Outreach is not set up on this server yet</div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>The outbound tables are not on this database, so nothing can be queued or sent.</p>
      </Panel>
    );
  }
  if (error && !status) {
    return <ErrorState className="ui-panel" title="Outreach didn't load" message={humaneError(error, NETWORK_ERROR)} onRetry={refresh} />;
  }
  return (
    <div className="flex flex-col" style={{ gap: 32 }}>
      <OutreachControl status={status} onChange={refresh} />
      <div className="grid xl:grid-cols-2" style={{ gap: 32, alignItems: "start" }}>
        <RepliesPanel refreshKey={key} />
        <ReviewPanel refreshKey={key} onChange={refresh} />
      </div>
      <CampaignsPanel campaigns={status?.campaigns || []} accounts={status?.providers || []} onChange={refresh} />
      <div className="grid xl:grid-cols-2" style={{ gap: 32, alignItems: "start" }}>
        <AccountsPanel onChange={refresh} />
        <PreflightPanel refreshKey={key} />
      </div>
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
  const replies = `${s.repliesNeedingAttention} repl${s.repliesNeedingAttention === 1 ? "y" : "ies"} to read`;
  return (
    <Link href="/outreach" className="row-hover flex items-center justify-between flex-wrap ui-panel" style={{ gap: 12, padding: "14px 18px", borderRadius: "var(--radius-lg)" }}>
      <div className="min-w-0 flex items-center flex-wrap" style={{ gap: "6px 12px" }}>
        <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{context === "prepared" ? "Outreach needs you" : "Outreach"}</span>
        {context === "missions" && <StatusChip tone={running ? "positive" : "neutral"}>{running ? `Running, ${words(s.engine.mode).toLowerCase()}` : words(s.engine.status)}</StatusChip>}
        <span className="tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
          {context === "prepared"
            ? `${s.awaitingReview} draft${s.awaitingReview === 1 ? "" : "s"} to review, ${replies}.`
            : `${formatCount(s.queued)} queued, ${formatCount(s.sent)} sent, ${replies}${s.alerts.length ? `, ${s.alerts.length} alert${s.alerts.length === 1 ? "" : "s"}` : ""}.`}
        </span>
      </div>
      <span className="inline-flex items-center" style={{ gap: 6, fontSize: 12.5, color: "var(--ink-2)" }}>Open Outreach <IconArrowRight size={13} className="row-chevron" /></span>
    </Link>
  );
}

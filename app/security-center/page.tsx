"use client";

// Security and privacy for an organization.
//   Posture   each technical control with the status the server computed
//             just now, and every framework with what is still needed.
//             Starlane holds no certification; nothing here says otherwise.
//   Audit     verify the tamper-evident hash chain and export the log.
//   Retention how long call logs, webhook payloads and run traces are kept.
//   Sign-in   your own two-step sign-in; admins also set the org's rule.
//   SSO       single sign-on through the organization's identity provider.
//   Your data export everything stored about you, or ask for erasure.
// Admins see every tab. Everyone sees "Sign-in" and "Your data".

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Subnav } from "@/components/v32/ui";
import { platformApi, downloadPlatformFile, type ControlStatus, type RetentionPolicy } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, Loading, Chip, when, Section, Field, useAction, InlineError, StatBand } from "@/components/platform/ui";
import { TwoStepSignIn, Passkeys, SignedInDevices, MfaRule, SessionLength, SingleSignOn } from "@/components/platform/SignInSecurity";

type Tab = "posture" | "audit" | "retention" | "signin" | "sso" | "privacy";
const MEMBER_TABS: Tab[] = ["signin", "privacy"];
const CONTROL: Record<ControlStatus, { label: string; tone?: "good" | "warn" | "bad" }> = {
  in_place: { label: "In place", tone: "good" },
  partial: { label: "Partial", tone: "warn" },
  needs_configuration: { label: "Needs configuration", tone: "warn" },
  not_in_place: { label: "Not built", tone: "bad" },
  outside_the_app: { label: "Outside the app" },
};
const FRAMEWORK_STATUS: Record<string, string> = {
  not_certified: "Not certified",
  not_attested: "No audit report yet",
  not_authorized: "Not authorized",
  designed_to_align: "Designed to align (not independently assessed)",
};

export default function SecurityCenterPage() {
  return <Suspense fallback={null}><SecurityCenter /></Suspense>;
}

function SecurityCenter() {
  const ws = useWorkspace();
  const params = useSearchParams();
  const admin = can(ws.data, "security.view");
  const sso = can(ws.data, "sso.manage");
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "posture");
  useEffect(() => {
    if (!ws.data) return;
    if (!admin && !MEMBER_TABS.includes(tab)) setTab("signin");
    else if (tab === "sso" && !sso) setTab("signin");
  }, [ws.data, admin, sso, tab]);
  const items = [
    ...(admin ? [{ key: "posture", label: "Posture" }, { key: "audit", label: "Audit evidence" }, { key: "retention", label: "Retention" }] : []),
    { key: "signin", label: "Sign-in" },
    ...(sso ? [{ key: "sso", label: "Single sign-on" }] : []),
    { key: "privacy", label: "Your data" },
  ];
  return (
    <DashboardLayout pageTitle="Security and privacy">
      <PageHeader eyebrow={admin ? "Administration" : "Organization"} divider title="Security and privacy" subtitle="What is in place, checked live, and what is not. Starlane holds no security certification today.">
        <Subnav label="Security" active={tab} onChange={(k) => setTab(k as Tab)} items={items} />
      </PageHeader>
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        {tab === "posture" && admin && <PostureTab />}
        {tab === "audit" && admin && <AuditTab />}
        {tab === "retention" && admin && <RetentionTab manage={can(ws.data, "policies.manage")} />}
        {tab === "signin" && <><Passkeys /><TwoStepSignIn /><SignedInDevices />{admin && <><MfaRule manage={can(ws.data, "policies.manage")} /><SessionLength manage={can(ws.data, "policies.manage")} /></>}</>}
        {tab === "sso" && sso && <SingleSignOn flash={{ tested: params.get("sso") === "tested", error: params.get("sso_error") }} />}
        {tab === "privacy" && <PrivacyTab owner={ws.data?.role === "owner"} />}
      </div>
    </DashboardLayout>
  );
}

function PostureTab() {
  const org = useActiveOrg();
  const q = useQuery({ queryKey: ["platform", "posture", org], queryFn: () => platformApi.posture(), retry: false });
  if (q.isLoading) return <Loading rows={6} />;
  if (!q.data) return <PlatformErrorBanner error={q.error} what="Security posture" />;
  const p = q.data;
  const areas = [...new Set(p.controls.map((c) => c.area))];
  return (
    <>
      <StatBand title="Controls" aside={`Checked ${when(p.generatedAt)}`} cells={[
        { label: "In place", value: p.counts.in_place || 0 },
        { label: "Partial or needs setup", value: (p.counts.partial || 0) + (p.counts.needs_configuration || 0) },
        { label: "Not built", value: p.counts.not_in_place || 0 },
        { label: "Outside the app", value: p.counts.outside_the_app || 0 },
      ]} />
      {areas.map((a) => (
        <Section key={a} title={a}>
          <div className="pf-list">
            {p.controls.filter((c) => c.area === a).map((c) => (
              <div key={c.id} className="pf-row" style={{ alignItems: "flex-start" }}>
                <div className="pf-row-main"><div className="pf-row-title">{c.name}</div><div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{c.detail}</div></div>
                <Chip tone={CONTROL[c.status].tone}>{CONTROL[c.status].label}</Chip>
              </div>
            ))}
          </div>
        </Section>
      ))}
      <Section title="Frameworks" description="None of these is held today. Certifications and audit reports come from independent auditors after an observation period; laws such as GDPR have no certificate. Each lists the built controls that count toward it and what is still needed.">
        <div className="pf-list">
          {p.frameworks.map((f) => (
            <details key={f.key} className="pf-row" style={{ display: "block" }}>
              <summary className="flex items-center justify-between" style={{ cursor: "pointer", gap: 12 }}>
                <span className="pf-row-main"><span className="pf-row-title">{f.name}</span><span className="pf-row-sub" style={{ display: "block" }}>{f.controlsInPlace} of {f.controlsTotal} related controls in place</span></span>
                <Chip>{FRAMEWORK_STATUS[f.status] || f.status}</Chip>
              </summary>
              <ul style={{ margin: "10px 0 4px 18px", fontSize: 13, color: "#3F3D39", lineHeight: 1.6, listStyle: "disc" }}>
                {f.stillNeeded.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}

function AuditTab() {
  const act = useAction();
  const [v, setV] = useState<Awaited<ReturnType<typeof platformApi.verifyAudit>>["verification"] | null>(null);
  return (
    <>
      <Section title="Verify the audit log" description="Each event carries a SHA-256 hash of itself and the event before it, and the database refuses edits and deletes. Verifying recomputes every hash and reports any change or gap.">
        <div className="pf-stack" style={{ gap: 10 }}>
          <div><Button primary disabled={act.busy} onClick={() => act.run(async () => setV((await platformApi.verifyAudit()).verification))}>{act.busy ? "Verifying…" : "Verify now"}</Button></div>
          <InlineError error={act.error} />
          {v && (
            <div className={`pf-note ${v.intact ? "" : "is-warn"}`} role="status">
              {v.intact ? `Intact: ${v.checked} events checked.` : `${v.problems.length} problem(s) found in ${v.checked} events.`}
              {v.beforeChain ? ` ${v.beforeChain} older events were written before the chain started and are not covered.` : ""}
              {v.head && <> Keep this record outside Starlane to detect removal of the newest events later: event {v.head.id}, hash <code style={{ wordBreak: "break-all" }}>{v.head.hash}</code>.</>}
            </div>
          )}
          {v && v.problems.length > 0 && (
            <div className="pf-list">{v.problems.map((p, i) => <div key={i} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">Event {p.id}</div><div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{p.problem}</div></div></div>)}</div>
          )}
        </div>
      </Section>
      <ExportAudit />
    </>
  );
}

function ExportAudit() {
  const act = useAction();
  return (
    <Section title="Export for an auditor" description="Every audit event as JSON Lines, oldest first, with its hashes, so the chain can be checked outside Starlane. People are identified by a hash, not their email.">
      <div><Button disabled={act.busy} onClick={() => act.run(() => downloadPlatformFile("/security/audit/export", `starlane-audit-${new Date().toISOString().slice(0, 10)}.jsonl`))}>Download audit log</Button></div>
      <InlineError error={act.error} />
    </Section>
  );
}

function RetentionTab({ manage }: { manage: boolean }) {
  const org = useActiveOrg();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "retention", org], queryFn: () => platformApi.retention(), retry: false });
  const [draft, setDraft] = useState<Partial<RetentionPolicy> | null>(null);
  const act = useAction();
  const [applied, setApplied] = useState<Record<string, number> | null>(null);
  if (q.isLoading) return <Loading rows={3} />;
  if (!q.data) return <PlatformErrorBanner error={q.error} what="Retention" />;
  const p = { ...q.data.policy, ...(draft || {}) };
  const keys = Object.keys(q.data.classes) as (keyof typeof q.data.classes)[];
  return (
    <Section title="How long records are kept" description={q.data.policy.configured ? `Set ${when(q.data.policy.updatedAt)}.` : "Defaults apply until you change them."}>
      <div className="pf-stack" style={{ gap: 12 }}>
        <div className="pf-grid2">
          {keys.map((k) => {
            const c = q.data.classes[k];
            return (
              <Field key={k} label={`${c.label} (days)`} hint={`${c.min} to ${c.max}, default ${c.default}`} htmlFor={`ret-${k}`}>
                <input id={`ret-${k}`} type="number" className="pf-input" min={c.min} max={c.max} disabled={!manage}
                  value={String(p[k as keyof RetentionPolicy] ?? "")} onChange={(e) => setDraft({ ...(draft || {}), [k]: Number(e.target.value) })} />
              </Field>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, color: "#6E6A63", margin: 0 }}>Audit events are never removed by retention. The daily job runs only when the server has FEATURE_RETENTION_JOB_ENABLED on; until then, apply it here.</p>
        {manage && (
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Button primary disabled={act.busy || !draft} onClick={() => act.run(async () => { await platformApi.setRetention(draft || {}); setDraft(null); qc.invalidateQueries({ queryKey: ["platform", "retention"] }); })}>Save</Button>
            <Button disabled={act.busy || !!draft} onClick={() => { if (window.confirm("Delete records older than these periods now? This cannot be undone.")) act.run(async () => setApplied((await platformApi.applyRetention()).removed)); }}>Apply now</Button>
          </div>
        )}
        {applied && <div className="pf-note" role="status">Removed: {Object.entries(applied).map(([k, n]) => `${n} ${k.replace(/_/g, " ")}`).join(", ") || "nothing was old enough"}.</div>}
        <InlineError error={act.error} />
      </div>
    </Section>
  );
}

function PrivacyTab({ owner }: { owner: boolean }) {
  const org = useActiveOrg();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "privacy", org], queryFn: () => platformApi.privacyRequests(), retry: false });
  const act = useAction();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const scheduled = (q.data?.requests || []).find((r) => r.kind === "erasure" && r.status === "scheduled" && r.mine);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PlatformErrorBanner error={q.error} what="Privacy requests" />
      <Section title="Download your data" description="Every row Starlane stores about you, as JSON. Encrypted credentials and password or token hashes are withheld.">
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <Button disabled={act.busy} onClick={() => act.run(async () => { await downloadPlatformFile("/privacy/export?scope=me", `starlane-data-me-${today}.json`); qc.invalidateQueries({ queryKey: ["platform", "privacy"] }); })}>Download my data</Button>
          {owner && <Button disabled={act.busy} onClick={() => act.run(async () => { await downloadPlatformFile("/privacy/export?scope=organization", `starlane-data-organization-${today}.json`); qc.invalidateQueries({ queryKey: ["platform", "privacy"] }); })}>Download the whole organization</Button>}
        </div>
      </Section>
      <Section title="Delete your account" description={`Deletes your account and the organization you own, ${q.data?.erasure.graceDays ?? 7} days after you ask. You can cancel until then. A receipt without personal data is kept.`}>
        <div className="pf-stack" style={{ gap: 10 }}>
          {q.data && !q.data.erasure.enabled && <div className="pf-note is-warn">Erasure is not switched on for this server yet, pending a review of which business records (invoices, tax records) must be kept by law. A request is kept and runs once it is.</div>}
          {scheduled ? (
            <div className="pf-note is-warn" role="status">
              Erasure scheduled for {when(scheduled.scheduled_for)}.{" "}
              <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.cancelErasure(scheduled.id); qc.invalidateQueries({ queryKey: ["platform", "privacy"] }); })}>Cancel erasure</Button>
            </div>
          ) : (
            <>
              <Field label="Type your account email to confirm" htmlFor="erase-email">
                <input id="erase-email" className="pf-input" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 360 }} />
              </Field>
              <div><Button disabled={act.busy || !email.includes("@")} onClick={() => act.run(async () => { const r = await platformApi.requestErasure(email); setNote(r.note); setEmail(""); qc.invalidateQueries({ queryKey: ["platform", "privacy"] }); })}>Schedule erasure</Button></div>
            </>
          )}
          {note && <div className="pf-note">{note}</div>}
          <InlineError error={act.error} />
        </div>
      </Section>
      {q.data && q.data.requests.length > 0 && (
        <Section title="Requests">
          <div className="pf-list">
            {q.data.requests.map((r) => (
              <div key={r.id} className="pf-row">
                <div className="pf-row-main">
                  <div className="pf-row-title">{r.kind === "export" ? `Export (${r.scope === "organization" ? "organization" : "own data"})` : "Account erasure"}{r.mine ? "" : " · another member"}</div>
                  <div className="pf-row-sub">Asked {when(r.created_at)}{r.completed_at ? ` · finished ${when(r.completed_at)}` : r.scheduled_for ? ` · runs ${when(r.scheduled_for)}` : ""}</div>
                </div>
                <Chip tone={r.status === "completed" ? "good" : r.status === "failed" ? "bad" : r.status === "scheduled" ? "warn" : undefined}>{r.status[0].toUpperCase() + r.status.slice(1)}</Chip>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

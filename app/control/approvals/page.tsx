"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, SkeletonRows, Sep } from "@/components/v32/ui";
import { IconCheck } from "@/components/v32/icons";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ControlHeader, ControlPage } from "@/components/control/ControlSubnav";
import { OFFLINE } from "@/components/connectors/health";
import { formatDateTime, formatRelative, inrWhole } from "@/lib/format";
import { api, type RankedAction } from "@/lib/api";

// Control > Approvals. Real pending ai_actions for this business from
// GET /api/ai-actions (tenant-scoped server-side). Approve and Reject use
// the same api.aiActions.updateStatus() -> PATCH /api/ai-actions/:id path as
// the Bridge, so there is no parallel approval system. Approve always asks
// for confirmation first; Reject lives in the detail drawer.

// Backend rule titles can carry ⚠ or 🚨; strip them at render.
const clean = (s: string | null | undefined) =>
  String(s || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "").replace(/\s{2,}/g, " ").trim();

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

function actorLabel(a: RankedAction): string | null {
  return a.customers?.name || a.customer?.name || null;
}

/** The ₹ amount at stake, when the rule that raised the action recorded one. */
function amountOf(a: RankedAction): number | null {
  const v = (a.reason_json as { amount?: unknown } | null | undefined)?.amount;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

const RISK: Record<string, { label: string; tone: StatusTone }> = {
  high: { label: "High risk", tone: "critical" },
  medium: { label: "Medium risk", tone: "attention" },
  low: { label: "Low risk", tone: "neutral" },
};
const riskOf = (a: RankedAction) => (a.risk_level && RISK[a.risk_level]) || { label: "Risk not known", tone: "unknown" as StatusTone };

const PRIORITY: Record<RankedAction["priority"], string> = { urgent: "Urgent", high: "High priority", medium: "Medium priority", low: "Low priority" };

function Meta({ a }: { a: RankedAction }) {
  const who = actorLabel(a);
  return (
    <span className="inline-flex items-center flex-wrap" style={{ gap: 6 }}>
      {who && <>{who}<Sep /></>}
      {humanize(a.action_type)}
      <Sep />
      <span title={formatDateTime(a.created_at)}>{formatRelative(a.created_at)}</span>
    </span>
  );
}

export default function ControlApprovalsPage() {
  const notify = useToast();
  const [actions, setActions] = useState<RankedAction[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);
  const [decisionFailed, setDecisionFailed] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    // ?id=<action id> (from Prepared's Review) opens that action's detail.
    let linkedId: string | null = null;
    try { linkedId = new URLSearchParams(window.location.search).get("id"); } catch { /* no window */ }
    api.aiActions.list("pending")
      .then((res) => {
        const list = res.actions || [];
        setActions(list);
        setOpenId((prev) => {
          if (prev && list.some((a) => a.id === prev)) return prev;
          return linkedId && list.some((a) => a.id === linkedId) ? linkedId : null;
        });
      })
      .catch(() => { setActions(null); setLoadFailed(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const opened = actions?.find((a) => a.id === openId) || null;
  const confirming = actions?.find((a) => a.id === confirmId) || null;

  const decide = async (a: RankedAction, status: "approved" | "rejected") => {
    setPending(status);
    setDecisionFailed(false);
    try {
      await api.aiActions.updateStatus(a.id, status);
      setActions((prev) => (prev || []).filter((x) => x.id !== a.id));
      setConfirmId(null);
      setOpenId(null);
      notify(status === "approved" ? `Approved: ${clean(a.title)}` : `Rejected: ${clean(a.title)}`, status === "approved" ? "positive" : "neutral");
    } catch {
      setDecisionFailed(true);
    } finally {
      setPending(null);
    }
  };

  const count = actions?.length ?? null;
  const total = (actions || []).reduce((s, a) => s + (amountOf(a) || 0), 0);

  return (
    <DashboardLayout pageTitle="Approvals">
      <style>{`
        .ap-grid { display: grid; column-gap: 20px; row-gap: 10px; align-items: center; grid-template-columns: minmax(0, 1fr); }
        .ap-actions { flex-direction: row-reverse; justify-content: flex-end; margin-left: -2px; }
        .ap-head { display: none; }
        .ap-row { padding: 14px 10px; border-bottom: 1px solid var(--line); min-height: 64px; }
        .ap-desk { display: none; }
        .ap-mobile { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
        @media (min-width: 900px) {
          .ap-grid { grid-template-columns: minmax(0, 1fr) 130px 120px 172px; }
          .ap-head { display: grid; padding: 0 10px 8px; font-size: 12px; color: var(--ink-3); border-bottom: 1px solid var(--line); }
          .ap-desk { display: block; }
          .ap-mobile { display: none; }
          .ap-actions { flex-direction: row; justify-content: flex-end; margin-left: 0; }
        }
        .ap-title { font-size: 13.5px; font-weight: 500; color: var(--ink); text-align: left; background: none; border: none; padding: 0; cursor: pointer; }
        .ap-title:hover { text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: 3px; }
      `}</style>
      <ControlPage>
        <ControlHeader
          active="approvals"
          counts={{ approvals: count }}
          subtitle={count ? (
            <>Actions waiting on your decision before Starlane carries them out{total > 0 ? <>. <span className="tabular-nums" style={{ color: "var(--ink)" }}>{inrWhole(total)}</span> at stake.</> : "."}</>
          ) : "Actions waiting on your decision before Starlane carries them out."}
        />

        <div className="fade-once">
          {loadFailed && <ErrorState title="Couldn't load approvals" message={OFFLINE} onRetry={load} />}
          {actions === null && !loadFailed && <SkeletonRows rows={4} height={64} />}

          {actions !== null && actions.length === 0 && (
            <EmptyLine
              icon={<IconCheck size={17} />}
              title="Nothing is waiting for your approval"
              body={<>New decisions Starlane raises wait on <Link className="underline" href="/prepared">Prepared</Link> until they need your sign-off here.</>}
            />
          )}

          {actions !== null && actions.length > 0 && (
            <div role="list" aria-label="Waiting for approval">
              <div className="ap-grid ap-head" aria-hidden="true">
                <span>Action</span><span style={{ textAlign: "right" }}>Amount</span><span>Risk</span><span />
              </div>
              {actions.map((a) => {
                const amt = amountOf(a);
                const risk = riskOf(a);
                return (
                  <div key={a.id} role="listitem" className="ap-grid ap-row row-hover">
                    <div className="min-w-0">
                      <div className="flex items-center" style={{ gap: 8 }}>
                        {(a.priority === "urgent" || a.priority === "high") && <StatusChip tone={a.priority === "urgent" ? "critical" : "attention"}>{PRIORITY[a.priority]}</StatusChip>}
                        <button type="button" className="ap-title truncate" onClick={() => { setDecisionFailed(false); setOpenId(a.id); }}>{clean(a.title)}</button>
                      </div>
                      {a.description && <div className="truncate" style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{clean(a.description)}</div>}
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}><Meta a={a} /></div>
                      <div className="ap-mobile">
                        {amt != null && <span className="tabular-nums" style={{ fontSize: 13, color: "var(--ink)" }}>{inrWhole(amt)}</span>}
                        <StatusChip tone={risk.tone}>{risk.label}</StatusChip>
                      </div>
                    </div>
                    <div className="ap-desk tabular-nums" style={{ textAlign: "right", fontSize: 14, color: amt != null ? "var(--ink)" : "var(--ink-3)" }}>
                      {amt != null ? inrWhole(amt) : "—"}
                    </div>
                    <div className="ap-desk"><StatusChip tone={risk.tone}>{risk.label}</StatusChip></div>
                    <div className="ap-actions flex items-center" style={{ gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => { setDecisionFailed(false); setOpenId(a.id); }}>Review</Button>
                      <Button variant="secondary" size="sm" onClick={() => { setDecisionFailed(false); setConfirmId(a.id); }}>Approve</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ControlPage>

      {opened && !confirming && (
        <Drawer
          titleId="approval-detail"
          title={clean(opened.title)}
          eyebrow={PRIORITY[opened.priority]}
          subtitle={<span style={{ fontSize: 12.5, color: "var(--ink-3)" }}><Meta a={opened} /></span>}
          onClose={() => setOpenId(null)}
          footer={
            <div className="flex items-center justify-end flex-wrap" style={{ gap: 8 }}>
              {decisionFailed && <span role="alert" style={{ fontSize: 12.5, color: "var(--critical)", marginRight: "auto" }}>That decision wasn&apos;t saved. Try again.</span>}
              <Button variant="secondary" loading={pending === "rejected"} disabled={!!pending} onClick={() => decide(opened, "rejected")}>Reject</Button>
              <Button variant="primary" disabled={!!pending} onClick={() => { setDecisionFailed(false); setConfirmId(opened.id); }}>Approve</Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {opened.description && <p style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{clean(opened.description)}</p>}
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", rowGap: 10, columnGap: 12, fontSize: 13 }}>
              <dt style={{ color: "var(--ink-3)" }}>Amount</dt>
              <dd className="tabular-nums" style={{ margin: 0, color: "var(--ink)" }}>{amountOf(opened) != null ? inrWhole(amountOf(opened)) : "Not recorded"}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Risk</dt>
              <dd style={{ margin: 0 }}><StatusChip tone={riskOf(opened).tone}>{riskOf(opened).label}</StatusChip></dd>
              <dt style={{ color: "var(--ink-3)" }}>For</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>{actorLabel(opened) || "Your business"}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Action</dt>
              <dd style={{ margin: 0, color: "var(--ink)" }}>{humanize(opened.action_type)}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Raised</dt>
              <dd className="tabular-nums" style={{ margin: 0, color: "var(--ink)" }}>{formatDateTime(opened.created_at)}{opened.suggested_by ? ` by ${opened.suggested_by === "rule" ? "a rule" : opened.suggested_by === "ai" ? "Starlane" : "the system"}` : ""}</dd>
            </dl>
            {opened.recommended_message && (
              <div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>Message that would be prepared</div>
                <p style={{ margin: 0, padding: "12px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
                  {opened.recommended_message}
                </p>
              </div>
            )}
          </div>
        </Drawer>
      )}

      <Modal
        open={!!confirming}
        onClose={() => { if (!pending) setConfirmId(null); }}
        title="Approve this action?"
        description={confirming ? clean(confirming.title) : undefined}
        footer={
          <>
            <Button variant="ghost" disabled={!!pending} onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="primary" loading={pending === "approved"} onClick={() => confirming && decide(confirming, "approved")}>Approve</Button>
          </>
        }
      >
        {confirming && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              {amountOf(confirming) != null && <span className="tabular-nums" style={{ fontSize: 15, color: "var(--ink)" }}>{inrWhole(amountOf(confirming))}</span>}
              <StatusChip tone={riskOf(confirming).tone}>{riskOf(confirming).label}</StatusChip>
            </div>
            <p style={{ margin: 0 }}>Approving records your decision and adds it to the audit log. Nothing is sent to a customer from this screen.</p>
            {decisionFailed && <p role="alert" style={{ margin: 0, color: "var(--critical)" }}>That decision wasn&apos;t saved. {OFFLINE}</p>}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

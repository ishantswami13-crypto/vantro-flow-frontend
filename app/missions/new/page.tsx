"use client";

// Start a collections mission on the web — the same flow as the apps:
// POST /api/client/missions/preview works out the objective, what is left
// out (disputed, recently contacted) and a simulated estimate while the owner
// edits; POST /api/client/missions saves it, and /activate starts it, which
// proposes one reminder per customer for approval. Nothing is sent from here.
// ?customer=<name> or ?invoice=<id> pre-fills who the mission is about.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { inrWhole, formatCount } from "@/lib/format";
import { PageHeader, SectionTitle, Figure } from "@/components/v32/ui";
import Button from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Badge";
import { PageColumn, BackLink, Note, humaneError, NETWORK_ERROR } from "@/components/os/missions/ui";
import type { Mission, MissionDraft, MissionInput, Simulation } from "../../../packages/contracts/src/features";

type Preview = { errors: string[]; draft: MissionDraft; simulation: Simulation | null };

const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 12.5, color: "var(--ink-2)" };

export default function NewMissionPage() {
  const router = useRouter();
  const [input, setInput] = useState<MissionInput | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"start" | "draft" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const invoice = q.get("invoice"), customer = q.get("customer");
    setInput({ horizonDays: 14, ...(invoice ? { invoiceIds: [invoice] } : {}), ...(customer ? { customer } : {}) });
  }, []);

  useEffect(() => {
    if (!input) return;
    let live = true;
    const t = setTimeout(() => {
      request<Preview>("/api/client/missions/preview", { method: "POST", body: JSON.stringify(input) })
        .then((p) => { if (live) { setPreview(p); setPreviewError(null); } })
        .catch((e: unknown) => { if (live) setPreviewError(humaneError(e, NETWORK_ERROR)); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [input, retry]);

  // Once created, a retry (say activation failed) reuses the same mission
  // instead of creating a second one.
  const createdId = useRef<string | null>(null);
  async function create(activate: boolean) {
    if (!input || busy) return;
    setBusy(activate ? "start" : "draft"); setErr(null);
    try {
      if (!createdId.current) {
        const { mission } = await request<{ mission: Mission }>("/api/client/missions", { method: "POST", body: JSON.stringify({ type: "collections", ...input }) });
        createdId.current = mission.id;
      }
      if (activate) await request(`/api/client/missions/${createdId.current}/activate`, { method: "POST", body: "{}" });
      router.push(`/missions/${createdId.current}`);
    } catch (e) {
      setErr(createdId.current ? `The mission was saved as a draft but not started. ${humaneError(e)}` : humaneError(e));
      setBusy(null);
    }
  }

  const d = preview?.draft, sim = preview?.simulation;
  const owed = sim?.facts[0]?.value as number | undefined;
  const blocked = !!busy || !preview || !!preview.errors.length;
  const reachTone = sim?.target?.reach === "likely" ? "positive" : sim?.target?.reach === "possible" ? "attention" : "critical";

  return (
    <DashboardLayout pageTitle="New mission">
      <PageColumn gap={16}>
        <BackLink href="/missions">Missions</BackLink>
        <PageHeader
          title="New collections mission"
          subtitle="One objective with a deadline, measured against your books. Nothing is sent until you approve it."
        />
        {input ? (
          <div className="grid min-[1000px]:grid-cols-[minmax(0,520px)_minmax(0,1fr)]" style={{ gap: "32px 64px", alignItems: "start", marginTop: 16 }}>
            <section className="min-w-0 mis-form-col">
              <SectionTitle>What to collect</SectionTitle>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                <form className="grid" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); void create(true); }}>
                  <label style={label}>
                    Who
                    <input
                      className="ui-input"
                      placeholder="Everyone overdue"
                      disabled={!!input.invoiceIds}
                      value={input.invoiceIds ? "The invoice you chose" : input.customer || ""}
                      onChange={(e) => setInput((i) => ({ ...i!, customer: e.target.value || undefined }))}
                    />
                    {input.invoiceIds ? (
                      <button type="button" className="hover-dim justify-self-start" style={{ fontSize: 12.5, color: "var(--ink-2)", textDecoration: "underline", background: "none", border: 0, padding: 0, cursor: "pointer", minHeight: 28 }}
                        onClick={() => setInput((i) => { if (!i) return i; const { invoiceIds: _drop, ...rest } = i; return rest; })}>
                        Use everyone overdue instead
                      </button>
                    ) : <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Leave empty for every overdue customer.</span>}
                  </label>
                  <label style={label}>
                    Amount to collect
                    <div className="relative">
                      <span aria-hidden="true" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--ink-3)" }}>₹</span>
                      <input
                        className="ui-input tabular-nums"
                        style={{ paddingLeft: 24 }}
                        inputMode="numeric"
                        placeholder={owed ? `Up to ${formatCount(Math.round(owed))}` : ""}
                        value={input.targetAmount != null ? formatCount(input.targetAmount) : ""}
                        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setInput((i) => ({ ...i!, targetAmount: v ? Number(v) : undefined })); }}
                      />
                    </div>
                  </label>
                  <label style={label}>
                    <span className="flex justify-between"><span>Deadline</span><span style={{ color: "var(--ink)" }}><span className="num">{input.horizonDays}</span> days</span></span>
                    <input type="range" min={3} max={60} value={input.horizonDays} style={{ width: "100%", accentColor: "var(--ink)", minHeight: 28 }} aria-valuetext={`${input.horizonDays} days`}
                      onChange={(e) => setInput((i) => ({ ...i!, horizonDays: Number(e.target.value) }))} />
                    <span className="flex justify-between" style={{ fontSize: 11.5, color: "var(--ink-3)" }}><span>3 days</span><span>60 days</span></span>
                  </label>
                  <label className="flex items-start" style={{ gap: 10, fontSize: 13, color: "var(--body)", lineHeight: 1.5, cursor: "pointer" }}>
                    <input type="checkbox" style={{ marginTop: 3 }} checked={!!input.constraints?.allowEscalation} onChange={(e) => setInput((i) => ({ ...i!, constraints: { ...i!.constraints, allowEscalation: e.target.checked } }))} />
                    <span>Allow escalation beyond a firm reminder<span style={{ display: "block", fontSize: 12, color: "var(--ink-3)" }}>Calls and bad-debt review. Off means reminders only.</span></span>
                  </label>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                    Disputed invoices are always left out. Customers contacted in the last 3 days are not proposed again. Starting proposes one reminder per customer for your approval.
                  </p>
                  {preview?.errors.length ? <Note tone="attention">{preview.errors.join(" ")}</Note> : null}
                  {err ? <Note tone="critical">{err}</Note> : null}
                  <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                    <Button type="submit" variant="primary" disabled={blocked} loading={busy === "start"}>Start mission</Button>
                    <Button variant="ghost" disabled={blocked} loading={busy === "draft"} onClick={() => void create(false)}>Save as draft</Button>
                  </div>
                </form>
              </div>
            </section>

            <section className="min-w-0 flex flex-col mis-brief" style={{ gap: 28 }} aria-label="What this mission will do">
              <div>
                <SectionTitle className="section-label-lead">Objective</SectionTitle>
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  {previewError && !preview ? (
                    <>
                      <Note tone="critical">{previewError}</Note>
                      <div style={{ marginTop: 10 }}><Button variant="secondary" size="sm" onClick={() => setRetry((n) => n + 1)}>Try again</Button></div>
                    </>
                  ) : !d ? (
                    <div role="status" aria-busy="true" aria-label="Working out the objective" className="grid" style={{ gap: 8 }}><div className="skeleton" style={{ height: 11, width: "80%" }} /><div className="skeleton" style={{ height: 11, width: "55%" }} /></div>
                  ) : (
                    <>
                      <p className="prose-measure" style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "var(--ink)" }}>{d.objective}</p>
                      {d.excluded.length ? (
                        <div style={{ marginTop: 16 }}>
                          <div className="meta" style={{ marginBottom: 4 }}>Left out</div>
                          {d.excluded.map((x) => (
                            <div key={x.id} className="flex justify-between" style={{ gap: 12, fontSize: 13, padding: "7px 0", borderTop: "1px solid var(--line)" }}>
                              <span style={{ color: "var(--body)" }}>{x.customer}</span>
                              <span style={{ color: "var(--ink-3)", fontSize: 12.5 }}>{x.reason}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              {sim ? (
                <div>
                  <SectionTitle>Estimate</SectionTitle>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                    <div className="grid grid-cols-2" style={{ gap: 20, maxWidth: 480 }}>
                      <Figure value={inrWhole(sim.estimate.expected.value)} label={`Expected within ${sim.horizonDays} days`} />
                      <Figure value={<span style={{ fontSize: 15, color: "var(--ink-2)" }}>{inrWhole(sim.estimate.range.low)}<span style={{ fontFamily: "var(--font-sans)", color: "var(--ink-3)" }}> to </span>{inrWhole(sim.estimate.range.high)}</span>} label="Likely range" />
                    </div>
                    {sim.target ? (
                      <div className="flex items-baseline flex-wrap" style={{ gap: "4px 10px", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                        <StatusChip tone={reachTone}>{sim.target.reach === "likely" ? "Target likely" : sim.target.reach === "possible" ? "Target possible" : "Target unlikely"}</StatusChip>
                        <span className="tabular-nums" style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.5, flex: "1 1 220px" }}>{sim.target.text}</span>
                      </div>
                    ) : null}
                    <p className="prose-measure" style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
                      Simulated, not a promise.{(sim.caveat || sim.method) ? ` ${[sim.method, sim.caveat].filter(Boolean).join(" ")}` : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </PageColumn>
    </DashboardLayout>
  );
}

// One action with its evidence, whichever feature proposed it (a mission,
// the collections agent, Watch). Approval is a single server-side claim; a
// high-risk action asks for explicit confirmation here and the server
// enforces it again (428 without it). A paused mission's actions are held.
import { useEffect, useState } from 'react';
import { ApiError, ago, type ActionDetail, type DecisionResult } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { DoneCheck, Empty, LifecycleChip, Loaded, Spinner, Stale } from '../ui';

const humanStage = (t: string) => t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ');

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function ActionScreen({ id }: { id: string }) {
  const r = useResource<ActionDetail>(`action:${id}`, () => api().action(id));
  const { back, go } = useRouter();
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const evidenced = !!r.data?.evidence.facts.length;
  useEffect(() => { if (evidenced) track('client.evidence_opened', { screen: 'action' }); }, [id, evidenced]);

  async function decide(decision: 'approve' | 'reject', a: ActionDetail) {
    if (decision === 'approve' && a.riskLevel === 'high' && !confirming) { setConfirming(true); return; }
    setBusy(decision); setErr(null);
    try {
      const out = await api().decide(a.id, decision, decision === 'approve' && a.riskLevel === 'high');
      setResult(out);
      track('client.approval_completed', { screen: 'action' });
      await r.reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'MISSION_NOT_ACTIVE') setErr(e.message);
      else if (e instanceof ApiError && e.status === 409) { setErr(`Already decided elsewhere (${(e.body as { status?: string })?.status || 'updated'}).`); await r.reload(); }
      else setErr((e as Error).message);
    } finally { setBusy(null); setConfirming(false); }
  }

  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>
        {(a) => (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="eyebrow">{a.type.replace(/_/g, ' ')}</span>
              <span className={`chip ${a.riskLevel === 'high' ? 'bad' : a.riskLevel === 'medium' ? 'warn' : ''}`}>{a.riskLevel} risk</span>
              {a.lifecycle ? <LifecycleChip state={a.lifecycle} /> : <span className="chip">{a.status.replace(/_/g, ' ')}</span>}
              {a.missionId ? <button className="btn ghost sm" onClick={() => go(`/missions/${a.missionId}`)}>Part of a mission ›</button> : null}
              <span style={{ marginLeft: 'auto' }}><Stale r={r} /></span>
            </div>
            <h1 className="page-title" style={{ margin: '12px 0 6px', fontSize: 28, lineHeight: '36px', maxWidth: '32ch' }}>{a.title}</h1>
            {a.description ? <p className="muted" style={{ maxWidth: '68ch', margin: '0 0 22px' }}>{a.description}</p> : null}

            <div className="grid-now" style={{ marginTop: 10 }}>
              <section className="stack">
                <div>
                  <h2 className="section">If you approve</h2>
                  {a.proposal.message ? <div className="proposal">{a.proposal.message}</div> : <div className="panel"><Empty title="No message is sent by this action." /></div>}
                  {a.risks.length ? <ul className="small muted" style={{ margin: '10px 0 0', paddingLeft: 18 }}>{a.risks.map((x) => <li key={x}>{x}</li>)}</ul> : null}
                </div>
                <div>
                  <h2 className="section">Why Starlane suggests this</h2>
                  <div className="panel">
                    {a.evidence.facts.length === 0 ? (
                      <Empty title="No structured evidence was recorded for this action.">Treat it as a suggestion to check yourself.</Empty>
                    ) : (
                      <div>
                        {a.evidence.facts.map((f, i) => (
                          <div className="fact" key={i}>
                            <span>{f.label}</span>
                            <span className="fig">{show(f.value)}</span>
                            <span className={`kind ${f.kind}`}>{f.kind}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="small faint" style={{ marginTop: 8 }}>
                    {a.evidence.rule ? <>Rule <span className="fig">{a.evidence.rule}</span>. </> : null}
                    {a.evidence.source ? <>Source: {a.evidence.source.table}. </> : null}
                    {a.evidence.computedAt ? <>Computed {ago(a.evidence.computedAt)}.</> : null}
                  </div>
                </div>
              </section>
              <section className="stack">
                <div className="panel panel-pad">
                  {a.status === 'pending' ? (
                    <>
                      <div className="small muted" style={{ marginBottom: 12 }}>
                        {a.requiresApproval ? 'Nothing happens until you decide.' : 'Suggested — nothing happens until you approve it.'}
                      </div>
                      {confirming ? (
                        <div className="banner bad" style={{ borderRadius: 6, marginBottom: 12, border: '1px solid #EBCFCF' }}>
                          High-risk action. Approve only if you have checked the evidence.
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn primary" disabled={!!busy} onClick={() => void decide('approve', a)}>
                          {busy === 'approve' ? <span className="spin" /> : null}{confirming ? 'Yes, approve' : 'Approve'}
                        </button>
                        <button className="btn" disabled={!!busy} onClick={() => (confirming ? setConfirming(false) : void decide('reject', a))}>
                          {busy === 'reject' ? <span className="spin" /> : null}{confirming ? 'Cancel' : 'Decline'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="small">
                      <div className="t" style={{ fontWeight: 500, marginBottom: 4 }}>{a.lifecycleNote || `Decided — ${a.status.replace(/_/g, ' ')}`}</div>
                      <div className="muted">Updated {ago(a.updatedAt || a.createdAt)}.</div>
                    </div>
                  )}
                  {busy ? <div style={{ marginTop: 10 }}><Spinner label={busy === 'approve' ? 'Approving and running…' : 'Declining…'} /></div> : null}
                  {result && result.status !== 'rejected' ? (
                    <div className={`small ${result.status === 'done' ? '' : 'err'} fade-in`} style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {result.status === 'done' ? <DoneCheck /> : null}<span>{result.message}</span>
                    </div>
                  ) : null}
                  {err ? <div className="err" style={{ marginTop: 10 }}>{err}</div> : null}
                  {a.lastError ? <div className="err" style={{ marginTop: 10 }}>Last run failed: {a.lastError}</div> : null}
                </div>

                {a.evidence.stage ? (
                  <div>
                    <h2 className="section">Collection stage</h2>
                    <div className="panel panel-pad small">
                      <dl className="kv" style={{ gridTemplateColumns: '120px minmax(0,1fr)' }}>
                        <dt>Stage</dt><dd>{humanStage(a.evidence.stage.chosen)}</dd>
                        <dt>Days-overdue band</dt><dd className="fig">{a.evidence.stage.band_days[0]}–{a.evidence.stage.band_days[1] ?? '∞'} days</dd>
                        {a.evidence.stage.by_days !== a.evidence.stage.chosen ? <><dt>Adjusted from</dt><dd>{humanStage(a.evidence.stage.by_days)} (by payment behaviour)</dd></> : null}
                      </dl>
                    </div>
                  </div>
                ) : null}

                {a.outcomes.length ? (
                  <div>
                    <h2 className="section">Result check</h2>
                    <div className="panel">
                      {a.outcomes.map((o, i) => (
                        <div className="fact" key={i}>
                          <span>{o.expected_metric}{o.expected_value !== null ? <> → <span className="fig">{show(o.expected_value)}</span></> : null}</span>
                          <span className="fig">{o.observed_value !== null ? show(o.observed_value) : '—'}</span>
                          <span className="kind">{o.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </>
        )}
      </Loaded>
    </div>
  );
}

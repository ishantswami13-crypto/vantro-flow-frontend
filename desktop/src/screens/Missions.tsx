// MISSIONS — one objective Starlane works towards, with progress you can
// check against your books. Collections first: "collect ₹X from these
// invoices within N days". A mission proposes actions; nothing is sent or
// changed without your approval, and pausing a mission holds its approvals.
// Everything waiting for a decision is listed here too (formerly Decisions).
import { useEffect, useState } from 'react';
import {
  MISSION_STATUS_LABEL, ago, type ActionSummary, type Mission, type MissionDraft, type MissionInput, type Simulation,
} from '@starlane/contracts';
import { api } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { ActionList, Bar, Chevron, EvidencePanel, Empty, LifecycleChip, Loaded, Page, Spinner, Stale, inrShort } from '../ui';

const STATUS_TONE: Record<string, string> = { active: 'accent', paused: 'warn', completed: 'ok', failed: 'bad', cancelled: '', draft: '' };

export function MissionsScreen() {
  const r = useResource<Mission[]>('missions', () => api().missions(), { pollMs: 60_000 });
  const waiting = useResource<ActionSummary[]>('actions:pending', () => api().actions('pending'), { pollMs: 60_000 });
  const { go } = useRouter();
  return (
    <Page title="Missions" aside={<span style={{ display: 'flex', gap: 8 }}><Stale r={r} /><button className="btn primary sm" onClick={() => go('/missions/new')}>New mission</button></span>}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '68ch' }}>A mission gives Starlane one objective and a deadline. It proposes the steps, you approve them, and progress is measured from your books — not from what was sent.</p>

      <h2 className="section" style={{ marginTop: 22 }}>Waiting for your decision <span className="n">{waiting.data?.length ?? ''}</span></h2>
      <div className="panel">
        <Loaded r={waiting}>
          {(list) => list.length === 0 ? <Empty title="Nothing is waiting for you." /> : (
            <ul className="rows">
              {list.map((a) => (
                <li key={a.id}>
                  <button className="row" onClick={() => go(`/actions/${a.id}`)}>
                    <span className={`risk ${a.riskLevel}`} />
                    <span style={{ minWidth: 0 }}><div className="t">{a.title}</div><div className="s">{a.description || a.type.replace(/_/g, ' ')}{a.missionId ? ' · from a mission' : ''}</div></span>
                    {a.lifecycle ? <LifecycleChip state={a.lifecycle} /> : <Chevron />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>

      <h2 className="section" style={{ marginTop: 26 }}>Missions</h2>
      <div className="panel">
        <Loaded r={r}>
          {(list) => list.length === 0 ? (
            <Empty title="No missions yet.">Start one from an overdue invoice in Watch, a customer in Scan, or here.
              <div><button className="btn sm" style={{ marginTop: 10 }} onClick={() => go('/missions/new')}>Start a collections mission</button></div>
            </Empty>
          ) : (
            <ul className="rows">
              {list.map((m) => (
                <li key={m.id}>
                  <button className="row" onClick={() => go(`/missions/${m.id}`)}>
                    <span />
                    <span style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                      <div className="t">{m.title}</div>
                      {m.status !== 'draft' ? <Bar ratio={m.progress?.ratio || 0} tone={m.status === 'failed' ? 'bad' : 'ok'} label={`${Math.round((m.progress?.ratio || 0) * 100)}% collected`} /> : null}
                      <div className="s">{inrShort(m.progress?.collected || 0)} of {inrShort(m.target.amount)}{m.status === 'active' && m.progress?.daysLeft != null ? ` · ${m.progress.daysLeft} days left` : ''}</div>
                    </span>
                    <span className={`chip ${STATUS_TONE[m.status]}`}>{MISSION_STATUS_LABEL[m.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>
    </Page>
  );
}

export function NewMissionScreen({ invoice, customer }: { invoice?: string | null; customer?: string | null }) {
  const { go, back } = useRouter();
  const [input, setInput] = useState<MissionInput>({ horizonDays: 14, ...(invoice ? { invoiceIds: [invoice] } : {}), ...(customer ? { customer } : {}) });
  const [preview, setPreview] = useState<{ errors: string[]; draft: MissionDraft; simulation: Simulation | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true; setLoading(true);
    const t = setTimeout(() => {
      void api().previewMission(input).then((p) => { if (live) { setPreview(p); setErr(null); } }).catch((e) => live && setErr((e as Error).message)).finally(() => live && setLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [input]);

  async function create(activate: boolean) {
    setBusy(true); setErr(null);
    try {
      const { mission } = await api().createMission(input);
      if (activate) await api().missionAction(mission.id, 'activate');
      go(`/missions/${mission.id}`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const d = preview?.draft;
  const owed = preview?.simulation?.facts[0]?.value as number | undefined;
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <div className="eyebrow">New mission · Collections</div>
      <h1 className="page-title" style={{ margin: '10px 0 16px' }}>{d?.title || 'Collect what is overdue'}</h1>
      <div className="grid-now" style={{ marginTop: 0 }}>
        <section className="stack">
          <div className="panel panel-pad" style={{ display: 'grid', gap: 14 }}>
            <div className="field">
              <label htmlFor="who">Who</label>
              <input id="who" className="input" placeholder="Everyone overdue" value={input.invoiceIds ? 'The invoice you chose' : input.customer || ''} disabled={!!input.invoiceIds}
                onChange={(e) => setInput((i) => ({ ...i, customer: e.target.value || undefined }))} />
              {input.invoiceIds ? <button className="btn ghost sm" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => setInput(({ invoiceIds: _drop, ...rest }) => rest)}>Use everyone overdue instead</button> : null}
            </div>
            <div className="field">
              <label htmlFor="amt">Collect (₹)</label>
              <input id="amt" className="input" inputMode="numeric" placeholder={owed ? `Up to ${Math.round(owed).toLocaleString('en-IN')}` : ''} value={input.targetAmount ?? ''}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setInput((i) => ({ ...i, targetAmount: v ? Number(v) : undefined })); }} />
            </div>
            <div className="field">
              <label htmlFor="days">Within {input.horizonDays} days</label>
              <input id="days" type="range" min={3} max={60} value={input.horizonDays} onChange={(e) => setInput((i) => ({ ...i, horizonDays: Number(e.target.value) }))} />
            </div>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={!!input.constraints?.allowEscalation} onChange={(e) => setInput((i) => ({ ...i, constraints: { ...i.constraints, allowEscalation: e.target.checked } }))} />
              Allow escalation beyond a firm reminder (calls, bad-debt review)
            </label>
            <div className="small muted">Disputed invoices are always left out. Customers contacted in the last 3 days are not proposed again.</div>
          </div>
          {preview?.errors.length ? <div className="err">{preview.errors.join(' · ')}</div> : null}
          {err ? <div className="err">{err}</div> : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={busy || loading || !!preview?.errors.length} onClick={() => void create(true)}>{busy ? <span className="spin" /> : null}Start mission</button>
            <button className="btn" disabled={busy || loading || !!preview?.errors.length} onClick={() => void create(false)}>Save as draft</button>
          </div>
          <div className="small faint">Starting proposes one reminder per customer for your approval. Nothing is sent until you approve it.</div>
        </section>
        <section className="stack">
          {loading && !preview ? <div className="panel panel-pad"><Spinner label="Working it out…" /></div> : d ? (
            <>
              <div>
                <h2 className="section">Objective</h2>
                <div className="panel panel-pad">{d.objective}{d.excluded.length ? <div className="small muted" style={{ marginTop: 8 }}>Left out: {d.excluded.map((x) => `${x.customer} (${x.reason})`).join('; ')}</div> : null}</div>
              </div>
              {preview?.simulation ? <SimSummary sim={preview.simulation} /> : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function SimSummary({ sim }: { sim: Simulation }) {
  return (
    <div>
      <h2 className="section">Simulated <span className="n">estimate</span></h2>
      <div className="panel panel-pad small" style={{ display: 'grid', gap: 8 }}>
        <div><span className="fig">{inrShort(sim.estimate.expected.value)}</span> expected within {sim.horizonDays} days <span className="kind estimate">estimate</span></div>
        <div className="muted">Range {inrShort(sim.estimate.range.low)} – {inrShort(sim.estimate.range.high)}</div>
        {sim.target ? <div className={sim.target.reach === 'likely' ? '' : sim.target.reach === 'possible' ? 'muted' : 'err'}>{sim.target.text}</div> : null}
        {sim.caveat ? <div className="faint">{sim.caveat}</div> : null}
      </div>
    </div>
  );
}

export function MissionScreen({ id }: { id: string }) {
  const r = useResource<Mission>(`mission:${id}`, () => api().mission(id), { pollMs: 60_000 });
  const { go, back } = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function act(verb: 'activate' | 'pause' | 'cancel') {
    setBusy(verb); setErr(null); setNote(null);
    try {
      const out = await api().missionAction(id, verb);
      if (out.proposed) setNote(`${out.proposed.created} action${out.proposed.created === 1 ? '' : 's'} proposed for your approval${out.proposed.adopted ? `, ${out.proposed.adopted} existing adopted` : ''}.`);
      await r.reload();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>
        {(m) => {
          const p = m.progress;
          const blockers = Array.isArray(p?.blockers) ? p!.blockers : [];
          return (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="eyebrow">Mission · Collections</span>
                <span className={`chip ${STATUS_TONE[m.status]}`}>{MISSION_STATUS_LABEL[m.status]}</span>
                <span style={{ marginLeft: 'auto' }}><Stale r={r} /></span>
              </div>
              <h1 className="page-title" style={{ margin: '12px 0 6px', fontSize: 28, lineHeight: '36px' }}>{m.title}</h1>
              <p className="muted" style={{ margin: '0 0 18px', maxWidth: '70ch' }}>{m.objective}</p>
              {m.outcome ? <div className={`banner ${m.outcome.result === 'completed' ? 'ok' : 'warn'}`} style={{ borderRadius: 8, marginBottom: 16 }}>{m.outcome.text} Collected {inrShort(m.outcome.collected)} of {inrShort(m.outcome.target)}.</div> : null}
              <div className="grid-now" style={{ marginTop: 0 }}>
                <section className="stack">
                  {p && m.status !== 'draft' ? (
                    <div>
                      <h2 className="section">Progress</h2>
                      <div className="panel panel-pad" style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <span className="fig" style={{ fontSize: 22 }}>{inrShort(p.collected)}</span>
                          <span className="muted">of {inrShort(p.targetAmount)} collected</span>
                          {m.status === 'active' && p.daysLeft != null ? <span className="chip" style={{ marginLeft: 'auto' }}>{p.daysLeft} days left</span> : null}
                        </div>
                        <Bar ratio={p.ratio} tone={m.status === 'failed' ? 'bad' : 'ok'} label={`${Math.round(p.ratio * 100)}% of target`} />
                        {p.byInvoice?.length ? (
                          <div className="compare" style={{ marginTop: 4 }}>
                            {p.byInvoice.map((i) => (
                              <div className="compare-row" key={i.id} style={{ cursor: 'default' }} onClick={() => go(`/scan/invoice/${i.id}`)}>
                                <span>{i.customer}{i.invoiceNumber ? ` · ${i.invoiceNumber}` : ''}</span>
                                <Bar ratio={i.baseline ? i.collected / i.baseline : 0} tone="ok" label={`${inrShort(i.collected)} of ${inrShort(i.baseline)}`} />
                                <span className="fig">{i.status === 'paid_or_removed' ? 'Paid' : `${inrShort(i.now)} left`}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : m.targetInvoices ? (
                    <div>
                      <h2 className="section">Invoices in this mission</h2>
                      <div className="panel">
                        <ul className="rows">{m.targetInvoices.map((i) => (
                          <li key={i.id}><button className="row" onClick={() => go(`/scan/invoice/${i.id}`)}><span /><span style={{ minWidth: 0 }}><div className="t">{i.customer}</div><div className="s">{i.invoiceNumber || 'No number'} · {i.daysOverdue} days overdue</div></span><span className="fig">{inrShort(i.amount)}</span></button></li>
                        ))}</ul>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <h2 className="section">Actions <span className="n">{m.actions?.length || 0}</span></h2>
                    <div className="panel"><ActionList actions={m.actions || []} onOpen={(aid) => go(`/actions/${aid}`)} empty={<Empty title={m.status === 'draft' ? 'Start the mission and Starlane proposes the first steps.' : 'No actions.'} />} /></div>
                  </div>
                  {p?.evidence ? <EvidencePanel ev={p.evidence} title="How progress is measured" /> : null}
                </section>

                <section className="stack">
                  <div className="panel panel-pad" style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: m.allowed?.length ? 'flex' : 'none', gap: 8, flexWrap: 'wrap' }}>
                      {m.allowed?.includes('activate') ? <button className="btn primary" disabled={!!busy} onClick={() => void act('activate')}>{busy === 'activate' ? <span className="spin" /> : null}{m.status === 'paused' ? 'Resume' : 'Start mission'}</button> : null}
                      {m.allowed?.includes('pause') ? <button className="btn" disabled={!!busy} onClick={() => void act('pause')}>Pause</button> : null}
                      {m.allowed?.includes('cancel') ? <button className="btn ghost" disabled={!!busy} onClick={() => void act('cancel')}>Cancel mission</button> : null}
                      {m.status === 'active' || m.status === 'paused' ? <button className="btn ghost" onClick={() => go(`/simulate?mission=${m.id}`)}>Simulate</button> : null}
                    </div>
                    {note ? <div className="small fade-in">{note}</div> : null}
                    {err ? <div className="err">{err}</div> : null}
                    <dl className="kv small">
                      <dt>Horizon</dt><dd>{m.horizonDays} days{m.endsAt ? ` · ends ${new Date(m.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</dd>
                      <dt>Escalation</dt><dd>{m.constraints.allowEscalation ? 'Allowed' : 'Reminders only'}</dd>
                      <dt>Disputed</dt><dd>Always left out</dd>
                    </dl>
                  </div>
                  {blockers.length ? (
                    <div>
                      <h2 className="section">Blockers</h2>
                      <div className="panel">{blockers.map((b) => <div className="fact" key={b.code} style={{ gridTemplateColumns: '1fr' }}><span>{b.text}</span></div>)}</div>
                    </div>
                  ) : null}
                  {m.history?.length ? (
                    <div>
                      <h2 className="section">History</h2>
                      <div className="panel"><ul className="timeline">{m.history.map((h, i) => <li key={i}><span className="at">{new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><span>{MISSION_STATUS_LABEL[h.event as Mission['status']] || h.event} · {ago(h.at)}</span></li>)}</ul></div>
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

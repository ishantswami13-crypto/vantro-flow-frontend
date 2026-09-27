// Watch, Discover and Simulate — thin, honest views over the existing
// intelligence endpoints. Each shows what the backend actually returned and
// says plainly when there is nothing (or not enough data) yet.
import { useState } from 'react';
import { ApiError, ago, inr, type Opportunity, type Watch } from '@starlane/contracts';
import { api } from '../api';
import { useResource } from '../lib/useResource';
import { Empty, Loaded, Page, Spinner, Stale } from '../ui';

export function WatchScreen() {
  const r = useResource<Watch[]>('watches', () => api().watches());
  return (
    <Page title="Watch" aside={<Stale r={r} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '64ch' }}>Conditions Starlane checks against your data, and when they last fired.</p>
      <div className="panel">
        <Loaded r={r}>
          {(list) => list.length === 0 ? (
            <Empty title="No watches yet.">Watches are created from the Starlane website today.</Empty>
          ) : (
            <ul className="rows">
              {list.map((w) => (
                <li key={w.id}>
                  <div className="row">
                    <span className={`risk ${w.severity === 'critical' || w.severity === 'high' ? 'high' : w.severity === 'medium' ? 'medium' : 'low'}`} />
                    <span style={{ minWidth: 0 }}>
                      <div className="t">{w.name}</div>
                      <div className="s">{w.metric_key.replace(/_/g, ' ')} · checked {ago(w.last_evaluated_at)}{w.last_triggered_at ? ` · fired ${ago(w.last_triggered_at)}` : ''}</div>
                    </span>
                    <span className={`chip ${w.status === 'active' ? 'ok' : ''}`}>{w.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>
    </Page>
  );
}

interface Signal { id: string; event_title?: string | null; status?: string; event_type?: string | null; last_updated_at?: string; relevance_score?: number | null }

export function DiscoverScreen() {
  const signals = useResource<Signal[]>('signals', () => api().signals() as unknown as Promise<Signal[]>);
  const opps = useResource<Opportunity[]>('opportunities', () => api().opportunities());
  return (
    <Page title="Discover" aside={<Stale r={signals} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '64ch' }}>Outside events that touch your business, and opportunities found in your own records — each with the evidence behind it.</p>
      <div className="grid-now" style={{ marginTop: 18 }}>
        <section>
          <h2 className="section">Signals</h2>
          <div className="panel">
            <Loaded r={signals}>
              {(list) => list.length === 0 ? <Empty title="No signals affect your business right now." /> : (
                <ul className="rows">
                  {list.map((s) => (
                    <li key={s.id}><div className="row"><span />
                      <span style={{ minWidth: 0 }}><div className="t">{s.event_title || 'Signal'}</div><div className="s">{(s.event_type || '').replace(/_/g, ' ')} · updated {ago(s.last_updated_at)}</div></span>
                      <span className="chip">{(s.status || '').toLowerCase()}</span></div></li>
                  ))}
                </ul>
              )}
            </Loaded>
          </div>
        </section>
        <section>
          <h2 className="section">Opportunities</h2>
          <div className="panel">
            <Loaded r={opps}>
              {(list) => list.length === 0 ? <Empty title="No opportunities found yet.">Starlane looks for rising demand with a stable supplier; it needs supplier and sales history to do that.</Empty> : (
                <ul className="rows">
                  {list.map((o, i) => (
                    <li key={i}><div className="row" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                      <span style={{ minWidth: 0 }}><div className="t" style={{ whiteSpace: 'normal' }}>{o.opportunity || o.title}</div>
                        <div className="s" style={{ whiteSpace: 'normal' }}>{String(o.reasoning || '')}</div></span></div></li>
                  ))}
                </ul>
              )}
            </Loaded>
          </div>
        </section>
      </div>
    </Page>
  );
}

interface Inv { id: string; customer_name: string; invoice_amount: number | string; days_overdue: number | null; due_date: string | null }
interface Delta { baselineTotalOverdue: number; scenarioProjectedTotalOverdue: number; delta: number; direction: string; uncertainty?: unknown; note: string }

export function SimulateScreen() {
  const r = useResource<Inv[]>('sim-invoices', async () => ((await api().simulationInvoices()).invoices || []) as unknown as Inv[]);
  const [invoice, setInvoice] = useState('');
  const [mode, setMode] = useState<'earlier' | 'unpaid'>('earlier');
  const [days, setDays] = useState(15);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Delta | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null); setOut(null);
    try {
      const res = await api().simulate(mode === 'unpaid' ? { targetInvoiceId: invoice, remainsUnpaid: true } : { targetInvoiceId: invoice, daysEarlier: days });
      setOut(res.delta as Delta);
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 422 ? 'Not enough payment history yet to project cash for your company.' : (e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <Page title="Simulate" aside={<Stale r={r} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '64ch' }}>What happens to overdue cash if one invoice is paid earlier — or not at all. Your real numbers are never changed.</p>
      <Loaded r={r}>
        {(invoices) => invoices.length === 0 ? <div className="panel"><Empty title="No open invoices to simulate." /></div> : (
          <div className="grid-now" style={{ marginTop: 10 }}>
            <div className="panel panel-pad" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <div className="field">
                <label htmlFor="inv">Invoice</label>
                <select id="inv" className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)}>
                  <option value="">Choose an open invoice</option>
                  {invoices.map((i) => <option key={i.id} value={i.id}>{i.customer_name} · {inr(Number(i.invoice_amount))}{i.days_overdue ? ` · ${i.days_overdue}d overdue` : ''}</option>)}
                </select>
              </div>
              <div className="tabs" style={{ marginBottom: 0 }}>
                <button className="tab" aria-selected={mode === 'earlier'} onClick={() => setMode('earlier')}>Paid earlier</button>
                <button className="tab" aria-selected={mode === 'unpaid'} onClick={() => setMode('unpaid')}>Stays unpaid</button>
              </div>
              {mode === 'earlier' ? (
                <div className="field"><label htmlFor="days">Days earlier</label><input id="days" className="input" type="number" min={1} max={180} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))} /></div>
              ) : null}
              <div><button className="btn primary" disabled={!invoice || busy} onClick={() => void run()}>{busy ? <span className="spin" /> : null}Run simulation</button></div>
            </div>
            <div>
              {busy ? <Spinner label="Projecting…" /> : null}
              {err ? <div className="panel panel-pad err">{err}</div> : null}
              {out ? (
                <div className="fade-in">
                  <div className="figures">
                    <div className="figure"><div className="eyebrow">Today (real)</div><div className="v">{inr(out.baselineTotalOverdue)}</div></div>
                    <div className="figure"><div className="eyebrow">Scenario</div><div className="v">{inr(out.scenarioProjectedTotalOverdue)}</div></div>
                  </div>
                  <p className="sentence" style={{ fontSize: 22, lineHeight: '30px' }}>
                    Overdue cash would {out.delta < 0 ? 'fall' : out.delta > 0 ? 'rise' : 'not change'}{out.delta ? <> by <span className="fig">{inr(Math.abs(out.delta))}</span></> : null}.
                  </p>
                  <p className="small muted">{out.note}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Loaded>
    </Page>
  );
}

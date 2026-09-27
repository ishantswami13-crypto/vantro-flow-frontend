// THE BRIDGE — the first screen. The state of the business from its own
// books, what needs the owner, what Watch noticed, how missions are going and
// what is coming. Every figure links to where it came from.
import { ago, inr, type BridgeView } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Bar, Chevron, Empty, Figure, Health, LifecycleChip, Loaded, Stale, inrShort } from '../ui';

const FRESH: Record<BridgeView['freshness'], { label: string; tone: string }> = {
  fresh: { label: 'Up to date', tone: 'ok' }, delayed: { label: 'A few hours behind', tone: 'warn' },
  stale: { label: 'More than a day behind', tone: 'bad' }, none: { label: 'No books synced yet', tone: '' },
};
const SEV_RISK: Record<string, string> = { critical: 'high', high: 'high', normal: 'medium', low: 'low' };

export function sentenceFor(b: BridgeView): string {
  if (!b.hasData || !b.state) return 'Starlane has no books to read yet.';
  const s = b.state;
  const parts = [`You are owed ${inrShort(s.openReceivables)}`];
  parts[0] += s.overdueReceivables > 0 ? `, and ${inrShort(s.overdueReceivables)} of it is overdue.` : ', none of it overdue.';
  const need = b.attention.decisions, watch = b.attention.watch.open;
  if (need || watch) parts.push(`${need ? `${need} decision${need > 1 ? 's' : ''} wait${need > 1 ? '' : 's'} for you` : ''}${need && watch ? ' and ' : ''}${watch ? `Watch has ${watch} new thing${watch > 1 ? 's' : ''}` : ''}.`);
  else parts.push('Nothing needs you right now.');
  return parts.join(' ');
}

export function BridgeScreen({ businessName }: { businessName: string | null }) {
  const r = useResource<BridgeView>('bridge', () => api().bridge(), { pollMs: 60_000 });
  const { go } = useRouter();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="eyebrow">The Bridge · {today}{businessName ? ` · ${businessName}` : ''}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {r.data ? <span className={`chip ${FRESH[r.data.freshness].tone}`} title={r.data.dataAsOf ? `Books last synced ${ago(r.data.dataAsOf)}` : undefined}>{FRESH[r.data.freshness].label}</span> : null}
          <Stale r={r} />
        </span>
      </div>
      <Loaded r={r}>
        {(b) => (
          <>
            <h1 className="sentence">{sentenceFor(b)}</h1>
            {b.partial ? <p className="small muted" style={{ marginTop: 8 }}>Part of this could not be loaded just now; what is shown is real.</p> : null}
            {!b.hasData ? (
              <div className="panel panel-pad" style={{ marginTop: 26, maxWidth: 620 }}>
                <div className="t" style={{ fontWeight: 500, marginBottom: 6 }}>Connect your books to start.</div>
                <div className="small muted" style={{ marginBottom: 12 }}>Starlane works from your company’s own records. Connect Tally on this computer, or import a sheet exported from Busy, Marg, Zoho Books, QuickBooks, Xero or any other system. Nothing here is sample data.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" onClick={() => go('/sources/tally')}>Connect Tally</button>
                  <button className="btn" onClick={() => go('/sources')}>Other sources</button>
                </div>
              </div>
            ) : (
              <div className="grid-now">
                <section className="stack">
                  <div>
                    <h2 className="section">Needs you <span className="n">{b.attention.decisions}</span></h2>
                    <div className="panel">
                      {b.attention.topDecisions.length === 0 ? <Empty title="Nothing is waiting for your decision." /> : (
                        <ul className="rows">
                          {b.attention.topDecisions.map((a) => (
                            <li key={a.id}>
                              <button className="row" onClick={() => { track('client.recommendation_opened', { screen: 'bridge' }); go(`/actions/${a.id}`); }}>
                                <span className={`risk ${a.riskLevel}`} />
                                <span style={{ minWidth: 0 }}><div className="t">{a.title}</div><div className="s">{a.description}</div></span>
                                <LifecycleChip state={a.lifecycle} />
                              </button>
                            </li>
                          ))}
                          {b.attention.decisions > b.attention.topDecisions.length ? (
                            <li><button className="row" onClick={() => go('/missions')}><span /><span className="s">All {b.attention.decisions} waiting decisions</span><Chevron /></button></li>
                          ) : null}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="section">Watch <span className="n">{b.attention.watch.open} new · {b.attention.watch.urgent} urgent</span></h2>
                    <div className="panel">
                      {b.attention.watch.latest.length === 0 ? <Empty title="Nothing needs watching right now." /> : (
                        <ul className="rows">
                          {b.attention.watch.latest.map((e) => (
                            <li key={e.id}>
                              <button className="row" onClick={() => go(`/watch/${e.id}`)}>
                                <span className={`risk ${SEV_RISK[e.severity]}`} />
                                <span style={{ minWidth: 0 }}><div className="t">{e.title}</div><div className="s">{e.detail} · {ago(e.firstSeenAt)}</div></span>
                                <Chevron />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div>
                    <h2 className="section">Missions</h2>
                    <div className="panel">
                      {b.missions.length === 0 ? (
                        <Empty title="No mission is running.">A mission gives Starlane one objective — collect a sum within a time — and measures progress against it.
                          <div><button className="btn sm" style={{ marginTop: 10 }} onClick={() => go('/missions/new')}>Start a collections mission</button></div>
                        </Empty>
                      ) : (
                        <ul className="rows">
                          {b.missions.map((m) => (
                            <li key={m.id}>
                              <button className="row" onClick={() => go(`/missions/${m.id}`)}>
                                <span />
                                <span style={{ minWidth: 0, display: 'grid', gap: 6 }}>
                                  <div className="t">{m.title}</div>
                                  <Bar ratio={m.progress?.ratio || 0} tone="ok" label={`${Math.round((m.progress?.ratio || 0) * 100)}% of target collected`} />
                                  <div className="s">{inrShort(m.progress?.collected || 0)} of {inrShort(m.target.amount)} · {m.status === 'active' ? `${m.progress?.daysLeft ?? '—'} days left` : m.status}</div>
                                </span>
                                <Chevron />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>

                <section className="stack">
                  {b.state ? (
                    <div>
                      <h2 className="section">Receivables</h2>
                      <div className="figures">
                        <div className="figure"><div className="eyebrow">Owed to you</div><div className="v"><Figure value={b.state.openReceivables} format={inr} /></div><div className="small muted">{b.state.openInvoiceCount} open invoices</div></div>
                        <div className="figure"><div className="eyebrow">Overdue</div><div className="v"><Figure value={b.state.overdueReceivables} format={inr} /></div><div className="small muted">{b.state.overdueInvoiceCount} invoices</div></div>
                      </div>
                      <div className="compare" aria-label="Ageing">
                        {b.state.ageing.filter((a) => a.count).map((a) => {
                          const max = Math.max(...b.state!.ageing.map((x) => x.amount), 1);
                          return (
                            <div className="compare-row" key={a.id}>
                              <span>{a.label}</span>
                              <Bar ratio={a.amount / max} tone={a.id === 'current' ? 'faint' : a.id === '31_90' || a.id === '90_plus' ? 'bad' : 'warn'} label={`${a.label}: ${inrShort(a.amount)}`} />
                              <span className="fig">{inrShort(a.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="small faint" style={{ marginTop: 8 }}>{b.dataAsOf ? `From your books, last synced ${ago(b.dataAsOf)}.` : 'From invoices in Starlane; no sync has been recorded.'}</div>
                    </div>
                  ) : null}

                  {b.state?.topOverdue.length ? (
                    <div>
                      <h2 className="section">Who owes the most overdue</h2>
                      <div className="panel">
                        <ul className="rows">
                          {b.state.topOverdue.map((c) => (
                            <li key={c.key}>
                              <button className="row" onClick={() => go(`/scan/customer/${encodeURIComponent(c.key)}`)}>
                                <span />
                                <span style={{ minWidth: 0 }}><div className="t">{c.name}</div><div className="s">{c.count} invoice{c.count > 1 ? 's' : ''} · oldest {c.oldestDays} days</div></span>
                                <span className="fig">{inrShort(c.amount)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {b.prepared ? (
                    <div>
                      <h2 className="section">Coming up</h2>
                      <div className="panel">
                        <ul className="rows">
                          {b.prepared.map((h) => (
                            <li key={h.horizon}>
                              <button className="row" onClick={() => go('/prepared')}>
                                <span className="eyebrow" style={{ width: 34 }}>{h.horizon}</span>
                                <span style={{ minWidth: 0 }}>
                                  <div className="t">{h.first ? h.first.title : h.status === 'insufficient_data' ? 'Not enough data to prepare' : 'Nothing due'}</div>
                                  {h.count > 1 ? <div className="s">and {h.count - 1} more</div> : null}
                                </span>
                                <Chevron />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <h2 className="section">Sources</h2>
                    <div className="panel">
                      <ul className="rows">
                        {b.sources.map((c) => (
                          <li key={c.id}>
                            <button className="row" onClick={() => go(`/sources/${c.id}`)}>
                              <span />
                              <span style={{ minWidth: 0 }}><div className="t">{c.name}</div><div className="s">{c.lastSuccessAt ? `Last good sync ${ago(c.lastSuccessAt)}` : 'No successful sync yet'}</div></span>
                              <Health health={c.health} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </Loaded>
    </div>
  );
}

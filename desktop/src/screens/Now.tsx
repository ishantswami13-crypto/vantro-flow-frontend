// Now — the first screen. One sentence built from real data, then the three
// things an owner needs: what needs a decision, what changed, and what is
// working (sources and the receivables position computed from real invoices).
import { ago, greeting, inr, nowSentence, type Now as NowData } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Chevron, Empty, Health, Loaded, Stale } from '../ui';

const KIND_LABEL: Record<string, string> = {
  recommendation: 'Recommendation', watch: 'Watch', signal: 'Signal', outcome: 'Outcome', action_done: 'Done', action_failed: 'Failed',
};

export function NowScreen({ businessName }: { businessName: string | null }) {
  const r = useResource<NowData>('now', () => api().now(), { pollMs: 60_000 });
  const { go } = useRouter();
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="eyebrow">{today}{businessName ? ` · ${businessName}` : ''}</span>
        <span style={{ marginLeft: 'auto' }}><Stale r={r} /></span>
      </div>
      <Loaded r={r}>
        {(now) => {
          const tally = now.working.connectors.find((c) => c.id === 'tally');
          return (
            <>
              <p className="sentence">
                {greeting()}. {nowSentence({ needsYou: now.needsYou.length, changed: now.changed.length, connectorHealth: tally?.health, lastSyncAt: tally?.lastSuccessAt })}
              </p>
              {now.partial ? <p className="small muted" style={{ marginTop: 8 }}>Some parts of this summary could not be computed right now; what is shown is real.</p> : null}

              <div className="grid-now">
                <section>
                  <h2 className="section">Needs you <span className="n">{now.needsYou.length}</span></h2>
                  <div className="panel">
                    {now.needsYou.length === 0 ? (
                      <Empty title="Nothing is waiting for your decision.">When Starlane proposes something that needs your approval, it appears here first.</Empty>
                    ) : (
                      <ul className="rows">
                        {now.needsYou.map((a) => (
                          <li key={a.id}>
                            <button className="row" onClick={() => { track('client.recommendation_opened', { screen: 'now' }); go(`/actions/${a.id}`); }}>
                              <span className={`risk ${a.riskLevel}`} aria-label={`${a.riskLevel} risk`} />
                              <span style={{ minWidth: 0 }}>
                                <div className="t">{a.title}</div>
                                <div className="s">{a.requiresApproval ? 'Needs approval' : 'Suggested'} · {a.riskLevel} risk · {ago(a.createdAt)}</div>
                              </span>
                              <Chevron />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <h2 className="section" style={{ marginTop: 26 }}>What changed <span className="n">since {new Date(now.since).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></h2>
                  <div className="panel">
                    {now.changed.length === 0 ? <Empty title="No changes since you last looked." /> : (
                      <ul className="timeline">
                        {now.changed.slice(0, 12).map((c, i) => (
                          <li key={i} style={{ cursor: 'default' }} onClick={() => go(c.route)}>
                            <span className="at">{new Date(c.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span><span className="faint small">{KIND_LABEL[c.kind] || c.kind} · </span>{c.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="stack">
                  <div>
                    <h2 className="section">Receivables</h2>
                    {now.state && now.state.openInvoiceCount > 0 ? (
                      <div className="figures">
                        <div className="figure"><div className="eyebrow">Open</div><div className="v">{inr(now.state.openReceivables)}</div><div className="small muted">{now.state.openInvoiceCount} invoices</div></div>
                        <div className="figure"><div className="eyebrow">Overdue</div><div className="v">{inr(now.state.overdueReceivables)}</div><div className="small muted">{now.state.over30Count} over 30 days</div></div>
                      </div>
                    ) : (
                      <div className="panel"><Empty title="No open invoices yet.">Connect Tally or import invoices and Starlane will compute this from your records.</Empty></div>
                    )}
                    {now.dataAsOf ? <div className="small faint" style={{ marginTop: 8 }}>From your records, last updated {ago(now.dataAsOf)}.</div> : null}
                  </div>

                  <div>
                    <h2 className="section">What's working</h2>
                    <div className="panel">
                      {now.working.connectors.length === 0 ? (
                        <Empty title="No sources connected.">
                          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => go('/sources')}>Connect a source</button>
                        </Empty>
                      ) : (
                        <ul className="rows">
                          {now.working.connectors.map((c) => (
                            <li key={c.id}>
                              <button className="row" onClick={() => go(`/sources/${c.id}`)}>
                                <span />
                                <span style={{ minWidth: 0 }}>
                                  <div className="t">{c.name}</div>
                                  <div className="s">{c.lastSuccessAt ? `Last good sync ${ago(c.lastSuccessAt)}` : 'No successful sync yet'}</div>
                                </span>
                                <Health health={c.health} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {now.working.syncsSince && now.working.syncsSince.runs > 0 ? (
                      <div className="small faint" style={{ marginTop: 8 }}>{now.working.syncsSince.runs} syncs, {now.working.syncsSince.imported} records imported since you last looked.</div>
                    ) : null}
                  </div>
                </section>
              </div>
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

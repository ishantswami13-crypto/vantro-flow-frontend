// Sources — the connector catalog from the backend registry (real
// availability only) and, for Tally, the connector host running on this
// computer: pairing, company, last run, and what went wrong in plain words.
import { useEffect, useState } from 'react';
import { ago, healthLabel, type Connector } from '@starlane/contracts';
import { api, app, getPrefs } from '../api';
import { tallyHost, type HostState } from '../connector/tallyHost';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Chevron, Empty, Health, Loaded, Page, Spinner, Stale } from '../ui';

export function useHost(): HostState {
  const [s, setS] = useState<HostState>(tallyHost.state);
  useEffect(() => tallyHost.subscribe(setS), []);
  return s;
}

const PHASE: Record<HostState['phase'], { label: string; tone: string }> = {
  unpaired: { label: 'Not set up on this computer', tone: '' },
  idle: { label: 'Running', tone: 'ok' },
  syncing: { label: 'Syncing now', tone: 'accent' },
  tally_unreachable: { label: 'Tally not answering', tone: 'warn' },
  starlane_offline: { label: 'Offline — will retry', tone: 'warn' },
  error: { label: 'Error', tone: 'bad' },
  revoked: { label: 'Disconnected', tone: 'bad' },
};

export function SourcesScreen() {
  const r = useResource<Connector[]>('connectors', () => api().connectors(), { pollMs: 60_000 });
  const { go } = useRouter();
  return (
    <Page title="Sources" aside={<Stale r={r} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '64ch' }}>Where Starlane gets your company's data. Only sources that actually work are offered; the rest say what they are waiting on.</p>
      <Loaded r={r}>
        {(list) => {
          const groups = new Map<string, Connector[]>();
          list.filter((c) => c.authType !== 'public_feed').forEach((c) => groups.set(c.category, [...(groups.get(c.category) || []), c]));
          return [...groups.entries()].map(([cat, items]) => (
            <section key={cat} style={{ marginTop: 22 }}>
              <h2 className="section">{cat}</h2>
              <div className="panel">
                <ul className="rows">
                  {items.map((c) => (
                    <li key={c.id}>
                      <button className="row" onClick={() => go(`/sources/${c.id}`)} disabled={c.availability !== 'available'} style={c.availability !== 'available' ? { opacity: .6 } : undefined}>
                        <span />
                        <span style={{ minWidth: 0 }}>
                          <div className="t">{c.name}</div>
                          <div className="s">{c.availability === 'available' ? c.summary : c.unavailableReason || 'Not available yet'}</div>
                        </span>
                        {c.availability === 'available' ? <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Health health={c.state.health} /><Chevron /></span> : <span className="chip">Not available yet</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ));
        }}
      </Loaded>
    </Page>
  );
}

export function SourceScreen({ id }: { id: string }) {
  const r = useResource<Connector[]>('connectors', () => api().connectors(), { pollMs: 30_000 });
  const { back } = useRouter();
  const c = r.data?.find((x) => x.id === id);
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>
        {() => !c ? <Empty title="This source does not exist." /> : (
          <>
            <div className="page-head">
              <h1 className="page-title">{c.name}</h1>
              <div className="aside" style={{ display: 'flex', gap: 8 }}><Stale r={r} /><Health health={c.state.health} /></div>
            </div>
            {id === 'tally' ? <TallyPanel connector={c} onChange={() => void r.reload()} /> : <GenericSource c={c} />}
          </>
        )}
      </Loaded>
    </div>
  );
}

function GenericSource({ c }: { c: Connector }) {
  return (
    <div className="panel panel-pad">
      <p style={{ marginTop: 0 }}>{c.summary}</p>
      <dl className="kv">
        <dt>Reads</dt><dd>{c.objects.map((o) => o.replace(/_/g, ' ')).join(', ') || '—'}</dd>
        <dt>Access</dt><dd>{c.access.join(', ') || '—'}</dd>
        <dt>Last successful sync</dt><dd>{c.state.lastSuccessAt ? ago(c.state.lastSuccessAt) : 'never'}</dd>
      </dl>
      {c.authType === 'file_import' ? <p className="small muted">File imports are done from the Starlane website for now.</p> : null}
    </div>
  );
}

function TallyPanel({ connector: c, onChange }: { connector: Connector; onChange: () => void }) {
  const host = useHost();
  const [probe, setProbe] = useState<{ reachable: boolean; companies: string[]; message: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const thisDevice = c.state.devices.find((d) => d.id === host.deviceId);
  const others = c.state.devices.filter((d) => d.status === 'ACTIVE' && d.id !== host.deviceId);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setErr(null);
    try { await fn(); onChange(); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  }

  const phase = PHASE[host.phase];
  return (
    <div className="grid-now" style={{ marginTop: 0 }}>
      <section className="stack">
        <div className="panel">
          <div className="setting">
            <div className="d">
              <div className="t">This computer</div>
              <div className="small muted">{app().device_name}{thisDevice?.version ? ` · Starlane ${thisDevice.version}` : ''}</div>
            </div>
            <span className={`chip ${phase.tone}`}>{host.phase === 'syncing' ? <span className="spin" /> : <span className={`dot ${phase.tone}`} />}{phase.label}</span>
          </div>
          {host.message ? <div className="setting"><div className="d small" style={{ color: host.phase === 'error' || host.phase === 'revoked' ? 'var(--bad)' : 'var(--warn)' }}>{host.message}</div></div> : null}
          {host.phase === 'unpaired' || host.phase === 'revoked' ? (
            <div className="setting">
              <div className="d small muted">Starlane reads your Day Book from TallyPrime on this computer and keeps it in sync while the app runs, even when the window is closed.</div>
              <button className="btn primary" disabled={!!busy} onClick={() => void run('pair', async () => { await tallyHost.pair(app().device_name); await tallyHost.start(); await tallyHost.syncNow(); })}>
                {busy === 'pair' ? <span className="spin" /> : null}Use this computer
              </button>
            </div>
          ) : (
            <>
              <div className="setting">
                <div className="d small">
                  <dl className="kv">
                    <dt>Last good sync</dt><dd>{host.lastSuccessAt ? ago(host.lastSuccessAt) : c.state.lastSuccessAt ? ago(c.state.lastSuccessAt) : 'not yet'}</dd>
                    {host.last ? <><dt>Last run</dt><dd className="fig">{host.last.imported} imported · {host.last.rejected} rejected · {host.last.skipped} skipped</dd></> : null}
                    <dt>Company</dt><dd>{getCompanyLabel()}</dd>
                    <dt>Next run</dt><dd>{host.nextRunAt ? new Date(host.nextRunAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : host.phase === 'syncing' ? 'now' : '—'}</dd>
                    {host.env ? <><dt>Starlane</dt><dd>{host.env}</dd></> : null}
                  </dl>
                </div>
              </div>
              <div className="setting" style={{ gap: 8 }}>
                <button className="btn" disabled={host.phase === 'syncing'} onClick={() => void tallyHost.syncNow().then(onChange)}>Sync now</button>
                <button className="btn" disabled={!!busy} onClick={() => void run('probe', async () => setProbe(await tallyHost.discover()))}>{busy === 'probe' ? <span className="spin" /> : null}Check Tally</button>
                <span style={{ flex: 1 }} />
                <button className="btn danger" disabled={!!busy} onClick={() => void run('disconnect', () => tallyHost.disconnect())}>Disconnect this computer</button>
              </div>
            </>
          )}
          {probe ? (
            <div className="setting">
              <div className="d small">
                {probe.reachable ? (
                  probe.companies.length ? (
                    <div className="field">
                      <label htmlFor="company">Company to sync</label>
                      <select id="company" className="input" defaultValue={getCompanyLabel(true)} onChange={(e) => void tallyHost.setCompany(e.target.value || null).then(onChange)}>
                        <option value="">The company open in Tally</option>
                        {probe.companies.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  ) : <span>Tally is answering{probe.message ? `, but: ${probe.message}` : ', but no company is open.'}</span>
                ) : <span className="err">{probe.message}</span>}
              </div>
            </div>
          ) : null}
          {busy === 'pair' ? <div className="setting"><Spinner label="Pairing this computer…" /></div> : null}
          {err ? <div className="setting"><span className="err">{err}</span></div> : null}
        </div>
        {c.state.lastAttempt?.status === 'failed' ? (
          <div className="small" style={{ color: 'var(--bad)' }}>Last attempt failed {ago(c.state.lastAttempt.finishedAt || c.state.lastAttempt.startedAt)}: {c.state.lastAttempt.error}</div>
        ) : null}
      </section>
      <section className="stack">
        <div>
          <h2 className="section">What Starlane reads</h2>
          <div className="panel panel-pad small">
            <p style={{ marginTop: 0 }}>{c.objects.map((o) => o.replace(/_/g, ' ')).join(', ')}. Read-only: Starlane never writes to Tally.</p>
            <p className="muted" style={{ marginBottom: 0 }}>Needs TallyPrime open with “Act as Server” on (F1 › Settings › Connectivity, port 9000).</p>
          </div>
        </div>
        {others.length ? (
          <div>
            <h2 className="section">Other computers</h2>
            <div className="panel">
              {others.map((d) => (
                <div className="setting" key={d.id}>
                  <div className="d"><div className="t">{d.name}</div><div className="small muted">{d.platform || 'bridge'}{d.version ? ` · ${d.version}` : ''} · seen {ago(d.lastSeenAt)}</div></div>
                  <button className="btn sm danger" onClick={() => void run(`revoke-${d.id}`, () => api().revokeDevice(d.id))}>Revoke</button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="small faint">Server status: {healthLabel(c.state.health)}.</div>
      </section>
    </div>
  );
}

function getCompanyLabel(raw = false) {
  const company = getPrefs().tally.company;
  return raw ? company || '' : company || 'The company open in Tally';
}

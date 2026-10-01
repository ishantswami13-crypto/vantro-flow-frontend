// Sign-in and first-run setup: account → organization → the systems the
// company uses → connect Tally on this computer → first sync. Every step shows
// what is actually true (the connector catalog decides what can be connected;
// Tally discovery asks the real TallyPrime), and any step can be skipped.
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError, OfflineError, ago, type Bootstrap, type Connector } from '@starlane/contracts';
import { api, app, savePrefs } from '../api';
import { tallyHost } from '../connector/tallyHost';
import { openExternal } from '../platform';
import { Mark, Spinner } from '../ui';
import { useHost } from './Sources';

const WEBSITE = 'https://vantro-flow-frontend.vercel.app';

function Frame({ step, children }: { step: number; children: ReactNode }) {
  const steps = ['Sign in', 'Your organization', 'Your systems', 'Connect Tally', 'First sync'];
  return (
    <div className="onb">
      <aside className="onb-side">
        <div className="wordmark" style={{ padding: 0 }}><Mark size={20} />Starlane</div>
        <p className="sentence" style={{ marginTop: 56 }}>Know what needs you today, from your company’s own books.</p>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s} data-state={i < step ? 'done' : i === step ? 'current' : 'todo'}>
              <span className="num">{i < step ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </aside>
      <main className="onb-main"><div className="inner fade-in" key={step}>{children}</div></main>
    </div>
  );
}

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api().login(email.trim(), password); onSignedIn(); }
    catch (e2) {
      setErr(e2 instanceof OfflineError ? 'Starlane cannot be reached from this computer. Check the internet connection.'
        : e2 instanceof ApiError && e2.status === 401 ? 'That email and password do not match.'
          : e2 instanceof ApiError && e2.status === 429 ? 'Too many attempts. Wait a minute and try again.' : (e2 as Error).message);
    } finally { setBusy(false); }
  }
  return (
    <Frame step={0}>
      <h1 className="page-title">Sign in to Starlane</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <div className="field"><label htmlFor="email">Work email</label><input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
        <div className="field"><label htmlFor="pw">Password</label><input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {err ? <div className="err" role="alert">{err}</div> : null}
        <button className="btn primary" style={{ height: 40 }} disabled={busy}>{busy ? <span className="spin" /> : null}Sign in</button>
      </form>
      <div className="small muted" style={{ display: 'flex', gap: 16 }}>
        <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => void openExternal(`${WEBSITE}/forgot-password`)}>Forgot password</button>
        <button className="btn ghost sm" onClick={() => void openExternal(`${WEBSITE}/access`)}>No account? Request access</button>
      </div>
      <p className="small faint">Your session is stored in {app().os === 'macos' ? 'the macOS Keychain' : app().os === 'windows' ? 'Windows Credential Manager' : 'this computer’s credential store'}, never in a file.</p>
    </Frame>
  );
}

export function Onboarding({ boot, onDone }: { boot: Bootstrap | null; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<Connector[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  useEffect(() => { void api().connectors().then(setCatalog).catch(() => setCatalog([])); }, []);
  const finish = async () => { await savePrefs({ onboarded: true }); onDone(); };

  if (step === 1) {
    return (
      <Frame step={1}>
        <div className="eyebrow">Signed in as {boot?.user?.email}</div>
        <h1 className="page-title">{boot?.organization.name || 'Your organization'}</h1>
        <p className="muted">Starlane will work on this organization’s records only. {boot && boot.organizationsAvailable > 1 ? `You have access to ${boot.organizationsAvailable} organizations; switching between them comes later.` : ''}</p>
        <dl className="kv small">
          <dt>Country</dt><dd>{boot?.organization.country || '—'}</dd>
          <dt>Currency</dt><dd>{boot?.organization.currency || 'INR'}</dd>
          <dt>Industry</dt><dd>{boot?.organization.industry || '—'}</dd>
        </dl>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn primary" onClick={() => setStep(2)}>Continue</button></div>
      </Frame>
    );
  }

  if (step === 2) {
    const items = (catalog || []).filter((c) => c.authType !== 'public_feed');
    return (
      <Frame step={2}>
        <h1 className="page-title">Which systems does the company use?</h1>
        <p className="muted small">Choose everything that applies. Starlane connects what it can today and tells you plainly what is not available yet.</p>
        {!catalog ? <Spinner label="Loading…" /> : (
          <div className="cat">
            {items.map((c) => {
              const on = chosen.has(c.id);
              return (
                <button key={c.id} className="opt" aria-pressed={on} aria-disabled={c.availability !== 'available'}
                  onClick={() => setChosen((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}>
                  <span className="t">{c.name}</span>
                  <span className="s">{c.availability === 'available' ? c.category : 'Not available yet'}</span>
                </button>
              );
            })}
          </div>
        )}
        {[...chosen].some((id) => catalog?.find((c) => c.id === id)?.availability !== 'available') ? (
          <p className="small muted">Noted. Systems marked “not available yet” cannot be connected today; nothing will pretend otherwise.</p>
        ) : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={() => setStep(chosen.has('tally') ? 3 : 5)}>Continue</button>
          <button className="btn ghost" onClick={() => void finish()}>Skip setup</button>
        </div>
      </Frame>
    );
  }

  if (step === 3) return <ConnectTally onNext={() => setStep(4)} onSkip={() => void finish()} />;
  if (step === 4) return <FirstSync onDone={() => void finish()} />;

  return (
    <Frame step={4}>
      <h1 className="page-title">You’re set up</h1>
      <p className="muted">You can connect sources any time from Sources.</p>
      <div><button className="btn primary" onClick={() => void finish()}>Open Starlane</button></div>
    </Frame>
  );
}

function ConnectTally({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [probe, setProbe] = useState<Awaited<ReturnType<typeof tallyHost.discover>> | null>(null);
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const discover = async () => { setProbe(null); setProbe(await tallyHost.discover()); };
  useEffect(() => { void discover(); }, []);

  async function pair() {
    setBusy(true); setErr(null);
    try {
      await tallyHost.setCompany(company || null);
      await tallyHost.pair(app().device_name);
      await tallyHost.start();
      onNext();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Frame step={3}>
      <h1 className="page-title">Connect Tally on this computer</h1>
      <p className="muted small">Starlane reads the Day Book from TallyPrime running here. It never writes to Tally.</p>
      <div className="panel panel-pad small" style={{ display: 'grid', gap: 10 }}>
        {!probe ? <Spinner label="Looking for TallyPrime on this computer…" /> : probe.reachable ? (
          <>
            <div><span className="dot ok" style={{ marginRight: 8 }} />TallyPrime is answering on port {probe.port}.</div>
            {probe.companies.length ? (
              <div className="field">
                <label htmlFor="co">Company</label>
                <select id="co" className="input" value={company} onChange={(e) => setCompany(e.target.value)}>
                  <option value="">The company open in Tally</option>
                  {probe.companies.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ) : <div className="muted">No company is open in Tally{probe.message ? ` (${probe.message})` : ''}. Open one, then check again.</div>}
          </>
        ) : (
          <>
            <div><span className="dot warn" style={{ marginRight: 8 }} />TallyPrime is not answering on this computer.</div>
            <ol className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Open TallyPrime and load your company.</li>
              <li>Press F1 › Settings › Connectivity and set “TallyPrime acts as” to Server, port 9000.</li>
              <li>Check again.</li>
            </ol>
          </>
        )}
      </div>
      {err ? <div className="err">{err}</div> : null}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={busy || !probe?.reachable} onClick={() => void pair()}>{busy ? <span className="spin" /> : null}Connect this computer</button>
        <button className="btn" onClick={() => void discover()}>Check again</button>
        <button className="btn ghost" onClick={onSkip}>Later</button>
      </div>
    </Frame>
  );
}

function FirstSync({ onDone }: { onDone: () => void }) {
  const host = useHost();
  const [started, setStarted] = useState(false);
  useEffect(() => { if (!started) { setStarted(true); void tallyHost.syncNow(); } }, [started]);
  const running = host.phase === 'syncing' || !started;
  return (
    <Frame step={4}>
      <h1 className="page-title">First sync</h1>
      <div className="panel panel-pad small" style={{ display: 'grid', gap: 8 }}>
        {running ? <Spinner label="Reading this financial year’s Day Book from Tally…" /> : host.phase === 'idle' && host.last ? (
          <>
            <div><span className="dot ok" style={{ marginRight: 8 }} />Synced {ago(host.lastSuccessAt)}.</div>
            <div className="fig">{host.last.imported} records imported · {host.last.rejected} rejected · {host.last.skipped} skipped (other voucher types or incomplete)</div>
            <div className="muted">Starlane will keep this up to date every {15} minutes while the app runs, including from the tray.</div>
          </>
        ) : <div className="err">{host.message || 'The first sync did not complete.'}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={running} onClick={onDone}>Open Starlane</button>
        {!running && host.phase !== 'idle' ? <button className="btn" onClick={() => void tallyHost.syncNow()}>Try again</button> : null}
      </div>
    </Frame>
  );
}

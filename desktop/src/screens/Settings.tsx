// Settings — account, signed-in devices (sign any of them out), background
// behaviour, notifications, updates and the server this app talks to.
import { useEffect, useState } from 'react';
import { ago, type Bootstrap } from '@starlane/contracts';
import { api, app, getPrefs, savePrefs, track } from '../api';
import { useResource } from '../lib/useResource';
import { autostart, isDesktop, openLogs, platformFetch, updates, type UpdateInfo } from '../platform';
import { useHost } from './Sources';
import { Empty, Loaded, Page, Spinner } from '../ui';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function SettingsScreen({ boot, onSignOut }: { boot: Bootstrap | null; onSignOut: () => void }) {
  const sessions = useResource('sessions', () => api().sessions());
  const [auto, setAuto] = useState(false);
  const [notify, setNotify] = useState(getPrefs().notifications);
  const [channel, setChannel] = useState(getPrefs().channel);
  const [upd, setUpd] = useState<UpdateInfo | null>(null);
  const [updBusy, setUpdBusy] = useState<null | 'check' | 'install'>(null);
  const [updErr, setUpdErr] = useState<string | null>(null);
  const info = app();

  useEffect(() => { void autostart.enabled().then(setAuto).catch(() => {}); }, []);

  async function check() {
    setUpdBusy('check'); setUpdErr(null);
    try {
      const u = await updates.check(channel);
      setUpd(u);
      if (u.available) track('client.update_available', { channel });
    } catch (e) { setUpdErr((e as Error).message); } finally { setUpdBusy(null); }
  }
  async function install() {
    setUpdBusy('install'); setUpdErr(null);
    try { await updates.install(channel); track('client.update_installed', { channel }); }
    catch (e) { setUpdErr((e as Error).message); track('client.update_failed', { channel }); setUpdBusy(null); }
  }

  return (
    <Page title="Settings">
      <section style={{ display: 'grid', gap: 24 }}>
        <div>
          <h2 className="section">Account</h2>
          <div className="panel">
            <div className="setting">
              <div className="d"><div className="t">{boot?.user?.email || '—'}</div><div className="small muted">{boot?.organization.name || 'Organization not named yet'} · Starlane {boot?.env || ''}</div></div>
              <button className="btn" onClick={onSignOut}>Sign out</button>
            </div>
          </div>
        </div>

        <div>
          <h2 className="section">Signed-in devices</h2>
          <div className="panel">
            <Loaded r={sessions}>
              {(list) => list.length === 0 ? <Empty title="No other devices." /> : (
                <>{list.map((s) => (
                  <div className="setting" key={s.id}>
                    <div className="d">
                      <div className="t">{s.device_name || (s.client === 'mobile' ? 'Phone' : 'Computer')}{s.current ? <span className="chip accent" style={{ marginLeft: 8 }}>This app</span> : null}</div>
                      <div className="small muted">Starlane for {s.client}{s.platform ? ` · ${s.platform}` : ''}{s.app_version ? ` · ${s.app_version}` : ''} · active {ago(s.last_used_at)}</div>
                    </div>
                    {!s.current ? <button className="btn sm danger" onClick={() => void api().revokeSession(s.id).then(() => sessions.reload())}>Sign out</button> : null}
                  </div>
                ))}</>
              )}
            </Loaded>
          </div>
        </div>

        <div>
          <h2 className="section">On this computer</h2>
          <div className="panel">
            <div className="setting">
              <div className="d"><div className="t">Start Starlane when I sign in</div><div className="small muted">Opens quietly in the tray so Tally keeps syncing.</div></div>
              <Switch label="Start at login" on={auto} onChange={(v) => { void autostart.set(v).then(() => setAuto(v)); }} />
            </div>
            <div className="setting">
              <div className="d"><div className="t">Notifications</div><div className="small muted">Approvals waiting, results of approved actions, and Tally problems.</div></div>
              <Switch label="Notifications" on={notify} onChange={(v) => { setNotify(v); void savePrefs({ notifications: v }); }} />
            </div>
            <div className="setting">
              <div className="d"><div className="t">Closing the window</div><div className="small muted">Starlane keeps running in the tray. Use “Quit Starlane” from the tray icon to stop it completely.</div></div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="section">Updates</h2>
          <div className="panel">
            <div className="setting">
              <div className="d">
                <div className="t">Starlane {info.version}</div>
                <div className="small muted">{info.updater_configured ? 'Updates are downloaded from Starlane’s releases and verified against Starlane’s signing key before they install.' : isDesktop ? 'This build was made without an update signing key, so it cannot update itself. Install new versions from the download page.' : 'Browser preview — updates apply to the installed app only.'}</div>
              </div>
              <select className="input" style={{ width: 120 }} value={channel} onChange={(e) => { const c = e.target.value as 'stable' | 'beta'; setChannel(c); void savePrefs({ channel: c }); setUpd(null); }} aria-label="Update channel">
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
              </select>
              <button className="btn" disabled={!info.updater_configured || !!updBusy} onClick={() => void check()}>{updBusy === 'check' ? <span className="spin" /> : null}Check now</button>
            </div>
            {upd ? (
              <div className="setting">
                <div className="d small">{upd.available ? <>Version <span className="fig">{upd.version}</span> is available.{upd.notes ? <div className="muted">{upd.notes}</div> : null}</> : 'You have the latest version.'}</div>
                {upd.available ? <button className="btn primary" disabled={!!updBusy} onClick={() => void install()}>{updBusy === 'install' ? <Spinner label="Installing…" /> : 'Install and restart'}</button> : null}
              </div>
            ) : null}
            {updErr ? <div className="setting"><span className="err">{updErr}</span></div> : null}
          </div>
        </div>

        <Diagnostics />

        <div className="small faint">{info.device_name} · {info.os} {info.arch} · API {api().baseUrl}</div>
      </section>
    </Page>
  );
}

// Support diagnostics: what support needs to tell a connection, sign-in,
// Bridge or update problem apart. No tokens, keys, pairing codes or business
// records are shown or copied.
type Row = { label: string; value: string; tone: 'ok' | 'warn' | 'bad' | '' };
function Diagnostics() {
  const info = app();
  const host = useHost();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true); setCopied(false);
    const out: Row[] = [
      { label: 'App version', value: `Starlane ${info.version} (${getPrefs().channel}) · ${info.os} ${info.arch}`, tone: '' },
      { label: 'Updates', value: info.updater_configured ? 'Signed updates configured' : 'This build cannot update itself; install new versions from the website', tone: info.updater_configured ? 'ok' : 'warn' },
    ];
    const started = Date.now();
    try {
      const r = await platformFetch(`${api().baseUrl}/api/health`, { method: 'GET' });
      out.push({ label: 'Starlane service', value: r.ok ? `Reachable (${Date.now() - started} ms) · ${api().baseUrl}` : `Answered ${r.status} · ${api().baseUrl}`, tone: r.ok ? 'ok' : 'bad' });
    } catch (e) {
      out.push({ label: 'Starlane service', value: `Not reachable from this computer (${(e as Error).name}) · ${api().baseUrl}`, tone: 'bad' });
    }
    try {
      await api().bootstrap();
      out.push({ label: 'Sign-in', value: 'Session valid', tone: 'ok' });
    } catch (e) {
      out.push({ label: 'Sign-in', value: `Not confirmed (${(e as Error).name})`, tone: 'bad' });
    }
    out.push({
      label: 'Bridge on this computer',
      value: host.phase === 'unpaired' ? 'Tally not set up on this computer' : `${host.phase.replace('_', ' ')}${host.message ? ` · ${host.message}` : ''}`,
      tone: host.phase === 'idle' || host.phase === 'syncing' ? 'ok' : host.phase === 'unpaired' ? '' : 'bad',
    });
    out.push({ label: 'Last sync from this computer', value: host.lastSuccessAt ? `${ago(host.lastSuccessAt)} (last attempt ${host.lastAttemptAt ? ago(host.lastAttemptAt) : 'never'})` : host.lastAttemptAt ? `No success since the app started (last attempt ${ago(host.lastAttemptAt)})` : 'None since the app started', tone: host.lastSuccessAt ? 'ok' : '' });
    try {
      const list = await api().connectors();
      const connected = list.filter((c) => c.state.health !== 'not_connected' && c.state.health !== 'unavailable');
      if (!connected.length) out.push({ label: 'Connectors', value: 'None connected yet', tone: 'warn' });
      for (const c of connected) {
        out.push({ label: c.name, value: `${c.state.health}${c.state.lastSuccessAt ? ` · last success ${ago(c.state.lastSuccessAt)}` : ''}${c.state.lastError ? ` · ${c.state.lastError}` : ''}`, tone: c.state.health === 'healthy' || c.state.health === 'connected' || c.state.health === 'syncing' ? 'ok' : c.state.health === 'error' || c.state.health === 'revoked' ? 'bad' : 'warn' });
      }
    } catch (e) {
      out.push({ label: 'Connectors', value: `Could not load (${(e as Error).name})`, tone: 'bad' });
    }
    setRows(out);
    setBusy(false);
  }

  async function copy() {
    if (!rows) return;
    const text = [`Starlane diagnostics ${new Date().toISOString()}`, ...rows.map((r) => `${r.label}: ${r.value}`)].join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }

  return (
    <div>
      <h2 className="section">Diagnostics</h2>
      <div className="panel">
        <div className="setting">
          <div className="d"><div className="t">Check this computer’s connection to Starlane</div><div className="small muted">Version, service, sign-in, the Bridge and connectors. Nothing secret is shown or copied.</div></div>
          <button className="btn" disabled={busy} onClick={() => void run()}>{busy ? <span className="spin" /> : null}Run checks</button>
          {isDesktop ? <button className="btn" onClick={() => void openLogs()}>Open logs</button> : null}
        </div>
        {rows ? rows.map((r) => (
          <div className="setting" key={r.label}>
            <div className="d"><div className="t"><span className={`dot ${r.tone}`} /> {r.label}</div><div className="small muted">{r.value}</div></div>
          </div>
        )) : null}
        {rows ? <div className="setting"><div className="d small muted">{copied ? 'Copied. Paste it into your message to Starlane support.' : 'Send this to Starlane support if something is not working.'}</div><button className="btn" onClick={() => void copy()}>Copy diagnostics</button></div> : null}
      </div>
    </div>
  );
}

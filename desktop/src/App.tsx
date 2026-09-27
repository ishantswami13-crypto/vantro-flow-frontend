import { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineError, SessionEnded, type Bootstrap } from '@starlane/contracts';
import { api, getPrefs, onSessionEnded, track } from './api';
import { tallyHost } from './connector/tallyHost';
import { RouterProvider, useRouter } from './lib/router';
import { clearResourceCache } from './lib/useResource';
import { isDesktop, notifyNative, onShellEvent } from './platform';
import { BridgeScreen } from './screens/Bridge';
import { ActionScreen } from './screens/Decisions';
import { MemoryScreen } from './screens/Memory';
import { MissionScreen, MissionsScreen, NewMissionScreen } from './screens/Missions';
import { Onboarding, SignIn } from './screens/Onboarding';
import { PreparedScreen } from './screens/Prepared';
import { ScanCustomerScreen, ScanInvoiceScreen, ScanScreen } from './screens/Scan';
import { SettingsScreen } from './screens/Settings';
import { SimulateScreen } from './screens/Simulate';
import { SourceScreen, SourcesScreen, useHost } from './screens/Sources';
import { WatchEventScreen, WatchScreen } from './screens/Watch';
import { Mark, Spinner } from './ui';

type Phase = 'loading' | 'signed_out' | 'onboarding' | 'ready';

export function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBootErr(null);
    if (!(await api().isSignedIn())) { setPhase('signed_out'); return; }
    try {
      const b = await api().bootstrap();
      setBoot(b);
      await tallyHost.start();
      setPhase(getPrefs().onboarded ? 'ready' : 'onboarding');
    } catch (e) {
      if (e instanceof SessionEnded) { setPhase('signed_out'); return; }
      // Offline at start-up: still open the app (screens show last-known data or say offline).
      if (e instanceof OfflineError) { track('client.offline', { reason: 'startup' }); await tallyHost.start(); setPhase(getPrefs().onboarded ? 'ready' : 'onboarding'); return; }
      setBootErr((e as Error).message);
      track('client.startup_failed', { error_code: (e as Error).name });
    }
  }, []);

  useEffect(() => {
    track('client.app_started');
    void load();
    return onSessionEnded(() => {
      track('client.session_expired');
      tallyHost.stop();
      clearResourceCache();
      setBoot(null);
      setPhase('signed_out');
    });
  }, [load]);

  async function signOut() {
    tallyHost.stop();
    await api().logout();
    clearResourceCache();
    setBoot(null);
    setPhase('signed_out');
  }

  if (bootErr) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ display: 'grid', gap: 12, maxWidth: 380 }}>
          <div className="wordmark" style={{ padding: 0 }}><Mark />Starlane</div>
          <div className="err">Starlane could not start: {bootErr}</div>
          <div><button className="btn" onClick={() => void load()}>Try again</button></div>
        </div>
      </div>
    );
  }
  if (phase === 'loading') return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Spinner label="Opening Starlane…" /></div>;
  if (phase === 'signed_out') return <SignIn onSignedIn={() => void load()} />;
  if (phase === 'onboarding') return <Onboarding boot={boot} onDone={() => setPhase('ready')} />;
  return <RouterProvider initial="/bridge"><Shell boot={boot} onSignOut={() => void signOut()} /></RouterProvider>;
}

// Starlane is seven features; Sources and Settings are utilities.
const NAV = [
  { path: '/bridge', label: 'The Bridge' },
  { path: '/scan', label: 'Scan' },
  { path: '/watch', label: 'Watch', badge: 'watch' as const },
  { path: '/missions', label: 'Missions', badge: 'decisions' as const },
  { path: '/simulate', label: 'Simulate' },
  { path: '/memory', label: 'Memory' },
  { path: '/prepared', label: 'Prepared' },
  { group: 'Utilities' },
  { path: '/sources', label: 'Sources' },
  { path: '/settings', label: 'Settings' },
];
// Older links (notifications, deep links) keep landing somewhere sensible.
const ALIAS: Record<string, string> = { now: 'bridge', decisions: 'missions', inbox: 'watch', discover: 'bridge', ask: 'scan' };

function Shell({ boot, onSignOut }: { boot: Bootstrap | null; onSignOut: () => void }) {
  const { route, go } = useRouter();
  const host = useHost();
  const [counts, setCounts] = useState({ decisions: 0, watch: 0 });
  const [offline, setOffline] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  // Poll the inbox: badge counts, offline state, and native notifications for
  // anything new since the app started (never a replay of old items).
  const poll = useCallback(async () => {
    try {
      const [inbox, bridge] = await Promise.all([api().inbox(), api().bridge()]);
      setOffline(false);
      setCounts({ decisions: bridge.attention.decisions, watch: bridge.attention.watch.open });
      const fresh = inbox.notifications.filter((n) => !n.readAt && !(seen.current?.has(n.id)));
      if (seen.current && getPrefs().notifications) for (const n of fresh.slice(0, 3)) await notifyNative(n.title, n.body);
      seen.current = new Set([...(seen.current || []), ...inbox.notifications.map((n) => n.id)]);
    } catch (e) {
      if (e instanceof OfflineError) { if (!offline) track('client.offline', { reason: 'poll' }); setOffline(true); }
    }
  }, [offline]);

  useEffect(() => { void poll(); const t = setInterval(() => void poll(), 60_000); return () => clearInterval(t); }, [poll]);

  // Shell events: deep links, tray "Sync now".
  useEffect(() => {
    const offs: Array<Promise<() => void>> = [
      onShellEvent('starlane://route', (p) => { if (typeof p === 'string') go(p); }),
      onShellEvent('starlane://sync-now', () => { void tallyHost.syncNow(); }),
    ];
    return () => { offs.forEach((p) => void p.then((off) => off())); };
  }, [go]);

  useEffect(() => { track('client.screen_opened', { screen: route.parts[0] || 'bridge' }); }, [route.parts]);

  const first = route.parts[0] || 'bridge';
  const top = `/${ALIAS[first] || first}`;
  const active = top === '/actions' ? '/missions' : top;
  const tallyTone = host.phase === 'idle' ? 'ok' : host.phase === 'syncing' ? 'accent' : host.phase === 'unpaired' ? '' : host.phase === 'revoked' || host.phase === 'error' ? 'bad' : 'warn';

  return (
    <div className="shell">
      <nav className="rail" aria-label="Starlane">
        <div className="wordmark"><Mark size={18} />Starlane</div>
        {NAV.map((n, i) => 'group' in n ? <div key={i} className="nav-group">{n.group}</div> : (
          <button key={n.path} className="nav-item" aria-current={active === n.path ? 'page' : undefined} onClick={() => go(n.path!)}>
            {n.label}
            {n.badge && counts[n.badge] > 0 ? <span className="count">{counts[n.badge]}</span> : null}
          </button>
        ))}
        <div className="rail-foot">
          <button className="nav-item" style={{ padding: 0, fontSize: 12 }} onClick={() => go('/sources/tally')}>
            <span className={`dot ${tallyTone}${host.phase === 'syncing' ? ' pulse' : ''}`} />
            {host.phase === 'unpaired' ? 'Tally not set up here' : host.phase === 'syncing' ? 'Syncing Tally…' : host.phase === 'idle' ? 'Tally syncing on this PC' : 'Tally needs attention'}
          </button>
          <div className="who" title={boot?.user?.email}>{boot?.organization.name || boot?.user?.email || ''}</div>
          {!isDesktop ? <div style={{ color: '#D9A441' }}>Browser preview</div> : null}
        </div>
      </nav>
      <main className="main">
        {offline ? <div className="banner warn">Offline — Starlane cannot be reached. Showing what was last loaded; nothing you see is live until the connection returns.</div> : null}
        <Screen boot={boot} onSignOut={onSignOut} onRead={() => void poll()} />
      </main>
    </div>
  );
}

function Screen({ boot, onSignOut, onRead }: { boot: Bootstrap | null; onSignOut: () => void; onRead: () => void }) {
  const { route } = useRouter();
  const [raw, b, c] = route.parts;
  const a = ALIAS[raw] || raw;
  const name = boot?.organization.name || null;
  switch (a) {
    case 'scan':
      if (b === 'customer' && c) return <ScanCustomerScreen key={c} customerKey={decodeURIComponent(c)} />;
      if (b === 'invoice' && c) return <ScanInvoiceScreen key={c} id={c} />;
      return <ScanScreen businessName={name} />;
    case 'watch': return b ? <WatchEventScreen key={b} id={b} /> : <WatchScreen onRead={onRead} />;
    case 'missions':
      if (b === 'new') return <NewMissionScreen key={route.path} invoice={route.query.get('invoice')} customer={route.query.get('customer')} />;
      return b ? <MissionScreen key={b} id={b} /> : <MissionsScreen />;
    case 'actions': return b ? <ActionScreen key={b} id={b} /> : <MissionsScreen />;
    case 'simulate': return <SimulateScreen key={route.path} missionId={route.query.get('mission')} />;
    case 'memory': return <MemoryScreen />;
    case 'prepared': return <PreparedScreen />;
    case 'sources': return b ? <SourceScreen key={b} id={b} /> : <SourcesScreen />;
    case 'settings': return <SettingsScreen boot={boot} onSignOut={onSignOut} />;
    default: return <BridgeScreen businessName={name} />;
  }
}

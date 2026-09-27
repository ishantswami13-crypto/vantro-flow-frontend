// WATCH — what changed that needs attention. Events have a state (open ->
// acknowledged -> resolved by Starlane when the condition clears, or
// dismissed by you) and every one carries its evidence and where to go next.
// Notifications (the same records that reach the phone) live here too.
import { useState } from 'react';
import { ago, type StarlaneNotification, type WatchDetail, type WatchList } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { ActionList, Chevron, EvidencePanel, Empty, Loaded, Page, Stale } from '../ui';

const SEV_RISK: Record<string, string> = { critical: 'high', high: 'high', normal: 'medium', low: 'low' };
const TABS = [
  { key: 'active', label: 'Needs attention' },
  { key: 'closed', label: 'Resolved' },
  { key: 'notifications', label: 'Notifications' },
] as const;
const RESOLUTION: Record<string, string> = {
  paid_or_removed: 'Paid or no longer in your books', moved_to_next_band: 'Moved to a later overdue band', sync_recovered: 'Sync recovered',
  promise_closed: 'Promise closed', dismissed_by_owner: 'Dismissed by you', cleared: 'Condition cleared',
};

export function WatchScreen({ onRead }: { onRead: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('active');
  return (
    <Page title="Watch">
      <p className="muted" style={{ marginTop: -8, maxWidth: '68ch' }}>Starlane watches your books for invoices slipping into worse overdue bands, missed promises and sync problems. Each thing is raised once, and closes itself when it stops being true.</p>
      <div className="tabs" role="tablist" style={{ marginTop: 14 }}>
        {TABS.map((t) => <button key={t.key} className="tab" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      {tab === 'notifications' ? <Notifications onRead={onRead} /> : <Events state={tab} />}
    </Page>
  );
}

function Events({ state }: { state: 'active' | 'closed' }) {
  const r = useResource<WatchList>(`watch:${state}`, () => api().watchEvents(state), { pollMs: 60_000 });
  const { go } = useRouter();
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <Stale r={r} />
        <button className="btn sm" onClick={() => void api().watchEvents(state, true).then(() => r.reload())}>Check now</button>
      </div>
      <div className="panel">
        <Loaded r={r}>
          {(d) => d.events.length === 0 ? (
            <Empty title={state === 'active' ? 'Nothing needs watching right now.' : 'Nothing has been resolved yet.'}>
              {state === 'active' ? 'When an invoice slips into a worse overdue band, a promise is missed or a sync fails, it appears here.' : null}
            </Empty>
          ) : (
            <ul className="rows">
              {d.events.map((e) => (
                <li key={e.id}>
                  <button className="row" onClick={() => go(`/watch/${e.id}`)}>
                    <span className={`risk ${SEV_RISK[e.severity]}`} aria-label={`${e.severity} severity`} />
                    <span style={{ minWidth: 0 }}>
                      <div className="t">{e.state === 'open' ? <span className="dot accent" style={{ marginRight: 8, verticalAlign: 2 }} /> : null}{e.title}</div>
                      <div className="s">{e.detail} · {e.resolution ? RESOLUTION[e.resolution] || e.resolution : `first seen ${ago(e.firstSeenAt)}`}</div>
                    </span>
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>
    </>
  );
}

function Notifications({ onRead }: { onRead: () => void }) {
  const r = useResource<{ unread: number; notifications: StarlaneNotification[] }>('inbox', () => api().inbox(), { pollMs: 60_000 });
  const { go } = useRouter();
  async function open(n: StarlaneNotification) {
    track('client.notification_opened', { screen: 'watch' });
    if (!n.readAt) { await api().markRead(n.id).catch(() => {}); onRead(); }
    go(n.route);
  }
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <Stale r={r} />
        {r.data?.unread ? <button className="btn sm" onClick={() => void api().markAllRead().then(() => { onRead(); return r.reload(); })}>Mark all read</button> : null}
      </div>
      <div className="panel">
        <Loaded r={r}>
          {(d) => d.notifications.length === 0 ? <Empty title="No notifications yet.">Approvals, results and sync problems are sent here and to your phone.</Empty> : (
            <ul className="rows">
              {d.notifications.map((n) => (
                <li key={n.id}>
                  <button className="row" onClick={() => void open(n)} style={n.readAt ? { opacity: .72 } : undefined}>
                    <span className={`risk ${SEV_RISK[n.severity] || 'low'}`} />
                    <span style={{ minWidth: 0 }}>
                      <div className="t">{!n.readAt ? <span className="dot accent" style={{ marginRight: 8, verticalAlign: 2 }} /> : null}{n.title}</div>
                      <div className="s">{n.body ? `${n.body} · ` : ''}{ago(n.createdAt)}</div>
                    </span>
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>
    </>
  );
}

export function WatchEventScreen({ id }: { id: string }) {
  const r = useResource<WatchDetail>(`watch-event:${id}`, () => api().watchEvent(id));
  const { go, back } = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function move(state: 'acknowledged' | 'dismissed' | 'open') {
    setBusy(true); setErr(null);
    try { await api().setWatchState(id, state); await r.reload(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>
        {(d) => {
          const e = d.event;
          return (
            <>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="eyebrow">Watch · {e.kind.replace(/_/g, ' ')}</span>
                <span className={`chip ${e.severity === 'critical' || e.severity === 'high' ? 'bad' : e.severity === 'normal' ? 'warn' : ''}`}>{e.severity}</span>
                <span className="chip">{e.state}</span>
                <span style={{ marginLeft: 'auto' }}><Stale r={r} /></span>
              </div>
              <h1 className="page-title" style={{ margin: '12px 0 6px', fontSize: 28, lineHeight: '36px', maxWidth: '34ch' }}>{e.title}</h1>
              <p className="muted" style={{ margin: '0 0 18px' }}>{e.detail} First seen {ago(e.firstSeenAt)}{e.lastSeenAt !== e.firstSeenAt ? `, still true ${ago(e.lastSeenAt)}` : ''}.{e.resolution ? ` Closed: ${RESOLUTION[e.resolution] || e.resolution}.` : ''}</p>
              <div className="grid-now" style={{ marginTop: 6 }}>
                <section className="stack">
                  <EvidencePanel ev={e.evidence} title="Why this was raised" />
                  <div>
                    <h2 className="section">Actions on this</h2>
                    <div className="panel"><ActionList actions={d.actions} onOpen={(aid) => go(`/actions/${aid}`)} empty={<Empty title="No action has been proposed yet." />} /></div>
                  </div>
                </section>
                <section className="stack">
                  <div className="panel panel-pad" style={{ display: 'grid', gap: 10 }}>
                    <div className="small muted">What next</div>
                    {d.next ? (
                      <>
                        <button className="btn primary" onClick={() => go(d.next!.scan)}>Scan: why is this happening?</button>
                        <button className="btn" onClick={() => go(d.next!.mission)}>{d.mission ? `Open mission: ${d.mission.title}` : 'Start a collections mission'}</button>
                      </>
                    ) : e.entity?.type === 'connector' ? <button className="btn primary" onClick={() => go(`/sources/${e.entity!.id}`)}>Open the source</button> : null}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {e.state === 'open' ? <button className="btn sm" disabled={busy} onClick={() => void move('acknowledged')}>Mark as seen</button> : null}
                      {e.state === 'open' || e.state === 'acknowledged' ? <button className="btn ghost sm" disabled={busy} onClick={() => void move('dismissed')}>Dismiss</button> : null}
                      {e.state === 'dismissed' ? <button className="btn sm" disabled={busy} onClick={() => void move('open')}>Reopen</button> : null}
                    </div>
                    {err ? <div className="err">{err}</div> : null}
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

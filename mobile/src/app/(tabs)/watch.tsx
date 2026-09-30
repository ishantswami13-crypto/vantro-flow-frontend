// WATCH tab: what needs attention (events with state), what was resolved, and
// the notifications that reached this phone.
import { useState } from 'react';
import { router } from 'expo-router';
import { ago, type StarlaneNotification, type WatchList } from '@starlane/contracts';
import { api, track } from '../../lib/api';
import { mobileRoute } from '../../lib/routes';
import { useResource } from '../../lib/useResource';
import { Card, Empty, Loaded, RiskBar, Row, Screen, Stale, T } from '../../components/ui';
import { SEV_LEVEL, Segments } from '../../components/feature';

type Tab = 'active' | 'closed' | 'notifications';

export default function WatchTab() {
  const [tab, setTab] = useState<Tab>('active');
  const events = useResource<WatchList>(`watch:${tab === 'closed' ? 'closed' : 'active'}`, () => api.watchEvents(tab === 'closed' ? 'closed' : 'active'));
  const inbox = useResource<{ unread: number; notifications: StarlaneNotification[] }>('inbox', () => api.inbox());
  const r = tab === 'notifications' ? inbox : events;
  async function open(n: StarlaneNotification) {
    track('client.notification_opened', { screen: 'watch' });
    if (!n.readAt) await api.markRead(n.id).catch(() => {});
    router.push(mobileRoute(n.route) as never);
  }
  return (
    <Screen r={r as never} title="Watch" aside={<Stale r={r as never} />}>
      <Segments value={tab} onChange={setTab} options={[{ key: 'active', label: 'Attention' }, { key: 'closed', label: 'Resolved' }, { key: 'notifications', label: `Alerts${inbox.data?.unread ? ` · ${inbox.data.unread}` : ''}` }]} />
      {tab === 'notifications' ? (
        <Loaded r={inbox}>
          {(d) => <Card>{d.notifications.length === 0 ? <Empty title="No notifications yet." /> : d.notifications.map((n, i) => (
            <Row key={n.id} first={i === 0} title={`${n.readAt ? '' : '• '}${n.title}`} sub={`${n.body ? `${n.body} · ` : ''}${ago(n.createdAt)}`} left={<RiskBar level={SEV_LEVEL[n.severity] || 'low'} />} onPress={() => void open(n)} />
          ))}</Card>}
        </Loaded>
      ) : (
        <Loaded r={events}>
          {(d) => d.events.length === 0 ? (
            <Card><Empty title={tab === 'active' ? 'Nothing needs watching right now.' : 'Nothing resolved yet.'}>{tab === 'active' ? 'Invoices slipping into worse overdue bands, missed promises and sync problems appear here.' : null}</Empty></Card>
          ) : (
            <Card>{d.events.map((e, i) => (
              <Row key={e.id} first={i === 0} title={`${e.state === 'open' ? '• ' : ''}${e.title}`} sub={`${e.detail || ''} · ${ago(e.firstSeenAt)}`} left={<RiskBar level={SEV_LEVEL[e.severity]} />} onPress={() => router.push(`/event/${e.id}`)} />
            ))}</Card>
          )}
        </Loaded>
      )}
      <T v="small">Each thing is raised once and closes itself when it stops being true. Urgent ones reach this phone as a notification.</T>
    </Screen>
  );
}

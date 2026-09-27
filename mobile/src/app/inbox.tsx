import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ago, type StarlaneNotification } from '@starlane/contracts';
import { api, track } from '../lib/api';
import { mobileRoute } from '../lib/routes';
import { useResource } from '../lib/useResource';
import { Button, Card, Empty, Loaded, RiskBar, Row, Screen, Stale, T } from '../components/ui';

export default function Inbox() {
  const r = useResource<{ unread: number; notifications: StarlaneNotification[] }>('inbox', () => api.inbox());
  async function open(n: StarlaneNotification) {
    track('client.notification_opened', { screen: 'inbox' });
    if (!n.readAt) void api.markRead(n.id).catch(() => {});
    router.push(mobileRoute(n.route) as never);
  }
  return (
    <Screen r={r} title="Inbox" aside={<Stale r={r} />}>
      <Pressable onPress={() => router.back()} hitSlop={12}><T v="small">‹ Back</T></Pressable>
      <Loaded r={r}>
        {(d) => (
          <>
            <Card>{d.notifications.length === 0 ? <Empty title="Nothing yet.">Approvals, results and connector problems appear here and as notifications.</Empty> : d.notifications.map((n, i) => (
              <Row key={n.id} first={i === 0} title={`${n.readAt ? '' : '● '}${n.title}`} sub={`${n.body ? `${n.body} · ` : ''}${ago(n.createdAt)}`}
                left={<RiskBar level={n.severity === 'high' || n.severity === 'critical' ? 'high' : n.severity === 'normal' ? 'medium' : 'low'} />} onPress={() => void open(n)} />
            ))}</Card>
            {d.unread ? <Button kind="secondary" label="Mark all read" onPress={() => void api.markAllRead().then(() => r.reload())} /> : null}
          </>
        )}
      </Loaded>
    </Screen>
  );
}

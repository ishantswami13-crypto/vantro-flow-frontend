import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Card, Row, Screen } from '../../components/ui';

export default function More() {
  const inbox = useResource('inbox', () => api.inbox());
  return (
    <Screen title="More">
      <Card>
        <Row first title="Inbox" sub={inbox.data ? `${inbox.data.unread} unread` : null} onPress={() => router.push('/inbox')} />
        <Row title="Watch" sub="Conditions Starlane checks for you" onPress={() => router.push('/watch')} />
        <Row title="Sources" sub="Tally and other connections" onPress={() => router.push('/sources')} />
        <Row title="Settings" sub="Devices, notifications, sign out" onPress={() => router.push('/settings')} />
      </Card>
    </Screen>
  );
}

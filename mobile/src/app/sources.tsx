import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ago, type Connector } from '@starlane/contracts';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Card, Chip, Health, Loaded, Row, Screen, Stale, T } from '../components/ui';

// Read-only on the phone: connecting Tally happens on the computer that runs it.
export default function Sources() {
  const r = useResource<Connector[]>('connectors', () => api.connectors());
  return (
    <Screen r={r} title="Sources" aside={<Stale r={r} />}>
      <Pressable onPress={() => router.back()} hitSlop={12}><T v="small">‹ Back</T></Pressable>
      <Loaded r={r}>
        {(list) => <Card>{list.filter((x) => x.authType !== 'public_feed').map((x, i) => (
          <Row key={x.id} first={i === 0} title={x.name}
            sub={x.availability !== 'available' ? (x.unavailableReason || 'Not available yet') : x.state.lastAttempt?.status === 'failed' ? `Last attempt failed: ${x.state.lastAttempt.error || 'unknown'}` : x.state.lastSuccessAt ? `Last good sync ${ago(x.state.lastSuccessAt)}` : x.summary}
            right={x.availability === 'available' ? <Health health={x.state.health} /> : <Chip label="Not available yet" />} />
        ))}</Card>}
      </Loaded>
      <T v="small">To connect Tally, install Starlane on the computer that runs TallyPrime.</T>
    </Screen>
  );
}

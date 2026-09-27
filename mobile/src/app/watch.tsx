import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { ago, type Watch } from '@starlane/contracts';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Card, Chip, Empty, Loaded, RiskBar, Row, Screen, Stale, T } from '../components/ui';

export default function WatchScreen() {
  const r = useResource<Watch[]>('watches', () => api.watches());
  return (
    <Screen r={r} title="Watch" aside={<Stale r={r} />}>
      <Pressable onPress={() => router.back()} hitSlop={12}><T v="small">‹ Back</T></Pressable>
      <Loaded r={r}>
        {(list) => <Card>{list.length === 0 ? <Empty title="No watches yet.">Watches are created on the Starlane website today.</Empty> : list.map((w, i) => (
          <Row key={w.id} first={i === 0} title={w.name} sub={`checked ${ago(w.last_evaluated_at)}${w.last_triggered_at ? ` · fired ${ago(w.last_triggered_at)}` : ''}`}
            left={<RiskBar level={w.severity === 'high' || w.severity === 'critical' ? 'high' : w.severity === 'medium' ? 'medium' : 'low'} />} right={<Chip label={w.status} tone={w.status === 'active' ? 'ok' : 'muted'} />} />
        ))}</Card>}
      </Loaded>
    </Screen>
  );
}

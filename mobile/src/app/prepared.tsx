// PREPARED on the phone: next 24 hours, 7 days, 30 days — each item with its
// reason; a horizon the data cannot support says so.
import { router } from 'expo-router';
import type { PreparedHorizon } from '@starlane/contracts';
import { api } from '../lib/api';
import { mobileRoute } from '../lib/routes';
import { useResource } from '../lib/useResource';
import { Card, Empty, Loaded, Row, Screen, Section, Stale, T } from '../components/ui';
import { Back, rupees } from '../components/feature';

export default function PreparedScreen() {
  const r = useResource<{ horizons: PreparedHorizon[] }>('prepared', () => api.prepared());
  return (
    <Screen r={r} title="Prepared" aside={<Stale r={r} />}>
      <Back />
      <Loaded r={r}>
        {(d) => (
          <>
            {d.horizons.map((h) => (
              <Section key={h.horizon} title={h.label} count={h.items.length || undefined}>
                <Card>
                  {h.items.length === 0 ? <Empty title={h.status === 'insufficient_data' ? 'Not enough data to prepare this.' : 'Nothing due.'}>{h.note}</Empty>
                    : h.items.map((i, n) => (
                      <Row key={i.id} first={n === 0} title={i.title} sub={i.reason} right={i.amount != null ? <T v="mono">{rupees(i.amount)}</T> : undefined} onPress={() => router.push(mobileRoute(i.route) as never)} />
                    ))}
                </Card>
              </Section>
            ))}
          </>
        )}
      </Loaded>
    </Screen>
  );
}

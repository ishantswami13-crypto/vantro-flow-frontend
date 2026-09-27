import { ago, type Opportunity } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Card, Empty, Loaded, Row, Screen, Section, Stale } from '../../components/ui';

interface Signal { id: string; event_title?: string | null; status?: string; event_type?: string | null; last_updated_at?: string }

export default function Discover() {
  const signals = useResource<Signal[]>('signals', () => api.signals() as unknown as Promise<Signal[]>);
  const opps = useResource<Opportunity[]>('opportunities', () => api.opportunities());
  return (
    <Screen refresh={() => Promise.all([signals.reload(), opps.reload()])} title="Discover" aside={<Stale r={signals} />}>
      <Section title="Signals">
        <Loaded r={signals}>
          {(list) => <Card>{list.length === 0 ? <Empty title="No outside events affect your business right now." /> : list.map((s, i) => (
            <Row key={s.id} first={i === 0} title={s.event_title || 'Signal'} sub={`${(s.event_type || '').replace(/_/g, ' ')} · ${ago(s.last_updated_at)}`} />
          ))}</Card>}
        </Loaded>
      </Section>
      <Section title="Opportunities">
        <Loaded r={opps}>
          {(list) => <Card>{list.length === 0 ? <Empty title="No opportunities found yet.">Starlane needs supplier and sales history to look for them.</Empty> : list.map((o, i) => (
            <Row key={i} first={i === 0} title={String(o.opportunity || o.title || '')} sub={String(o.reasoning || '')} />
          ))}</Card>}
        </Loaded>
      </Section>
    </Screen>
  );
}

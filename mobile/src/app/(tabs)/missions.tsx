// MISSIONS tab: what waits for your decision, and the missions with progress.
import { router } from 'expo-router';
import { MISSION_STATUS_LABEL, type ActionSummary, type Mission } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Button, Card, Chip, Empty, Loaded, RiskBar, Row, Screen, Section, Stale } from '../../components/ui';
import { LifecycleChip, rupees } from '../../components/feature';

const TONE = { active: 'accent', paused: 'warn', completed: 'ok', failed: 'bad', cancelled: 'muted', draft: 'muted' } as const;

export default function MissionsTab() {
  const r = useResource<Mission[]>('missions', () => api.missions());
  const waiting = useResource<ActionSummary[]>('actions:pending', () => api.actions('pending'));
  return (
    <Screen r={r} refresh={() => Promise.all([r.reload(), waiting.reload()])} title="Missions" aside={<Stale r={r} />}>
      <Section title="Waiting for your decision" count={waiting.data?.length}>
        <Loaded r={waiting}>
          {(list) => <Card>{list.length === 0 ? <Empty title="Nothing is waiting for you." /> : list.map((a, i) => (
            <Row key={a.id} first={i === 0} title={a.title} sub={`${a.description || a.type.replace(/_/g, ' ')}${a.missionId ? ' · mission' : ''}`} left={<RiskBar level={a.riskLevel} />}
              right={a.lifecycle ? <LifecycleChip state={a.lifecycle} /> : undefined} onPress={() => router.push(`/actions/${a.id}`)} />
          ))}</Card>}
        </Loaded>
      </Section>
      <Section title="Missions">
        <Loaded r={r}>
          {(list) => <Card>{list.length === 0 ? <Empty title="No missions yet.">Start one from an overdue invoice in Watch or a customer in Scan.</Empty> : list.map((m, i) => (
            <Row key={m.id} first={i === 0} title={m.title} sub={`${rupees(m.progress?.collected || 0)} of ${rupees(m.target.amount)}${m.status === 'active' && m.progress?.daysLeft != null ? ` · ${m.progress.daysLeft} days left` : ''}`}
              right={<Chip label={MISSION_STATUS_LABEL[m.status]} tone={TONE[m.status]} />} onPress={() => router.push(`/mission/${m.id}`)} />
          ))}</Card>}
        </Loaded>
      </Section>
      <Button label="New collections mission" kind="secondary" onPress={() => router.push('/mission/new')} />
    </Screen>
  );
}

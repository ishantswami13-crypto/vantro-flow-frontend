// A customer's scan body, shared by the customer and invoice scan screens.
import { router } from 'expo-router';
import type { CustomerScan } from '@starlane/contracts';
import { Button, Card, RiskBar, Row, Section, T } from './ui';
import { ActionRows, EvidenceCard, Lines, rupees } from './feature';

export function CustomerBody({ s }: { s: CustomerScan }) {
  return (
    <>
      <Section title="Why"><Lines items={s.why} /></Section>
      {s.missions.length
        ? <Button label={`Open mission: ${s.missions[0].title}`} kind="secondary" onPress={() => router.push(`/mission/${s.missions[0].id}`)} />
        : <Button label="Start a mission to collect" onPress={() => router.push(`/mission/new?customer=${encodeURIComponent(s.subject.name)}` as never)} />}
      <EvidenceCard ev={s.evidence} />
      <Section title="Open invoices">
        <Card>{s.invoices.map((i, n) => (
          <Row key={i.id} first={n === 0} title={`${i.invoiceNumber || 'No number'}${i.disputed ? ' · disputed' : ''}`} sub={i.daysOverdue > 0 ? `${i.daysOverdue} days overdue` : 'Not yet due'}
            left={<RiskBar level={i.daysOverdue > 30 ? 'high' : i.daysOverdue > 7 ? 'medium' : 'low'} />} right={<T v="mono">{rupees(i.amount)}</T>} onPress={() => router.push(`/invoice/${i.id}`)} />
        ))}</Card>
      </Section>
      <Section title="Actions"><ActionRows actions={s.actions} empty="No actions yet." /></Section>
      {s.memory.length ? <Section title="Remembered"><Lines items={s.memory.map((m) => `${m.statement} (${m.status})`)} /></Section> : null}
    </>
  );
}


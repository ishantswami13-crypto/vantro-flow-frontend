// Today — the phone version of Now: one sentence from real data, what needs
// the owner, the receivables position, and whether sources are healthy.
import { View } from 'react-native';
import { router } from 'expo-router';
import { ago, greeting, inrShort, nowSentence, type Now } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { useResource } from '../../lib/useResource';
import { mobileRoute } from '../../lib/routes';
import { Card, Empty, Health, Loaded, RiskBar, Row, Screen, Section, Stale, T, c } from '../../components/ui';

export default function Today() {
  const { state } = useSession();
  const r = useResource<Now>('now', () => api.now());
  const org = state.status === 'signed_in' ? state.boot?.organization.name : null;
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <Screen r={r}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="eyebrow" style={{ flex: 1 }} numberOfLines={1}>{date}{org ? ` · ${org}` : ''}</T>
        <Stale r={r} />
      </View>
      <Loaded r={r}>
        {(now) => {
          const tally = now.working.connectors.find((x) => x.id === 'tally');
          return (
            <>
              <T v="sentence">{greeting()}. {nowSentence({ needsYou: now.needsYou.length, changed: now.changed.length, connectorHealth: tally?.health, lastSyncAt: tally?.lastSuccessAt })}</T>

              <Section title="Needs you" count={now.needsYou.length}>
                <Card>
                  {now.needsYou.length === 0 ? <Empty title="Nothing is waiting for your decision." /> : now.needsYou.slice(0, 5).map((a, i) => (
                    <Row key={a.id} first={i === 0} title={a.title} sub={`${a.requiresApproval ? 'Needs approval' : 'Suggested'} · ${a.riskLevel} risk · ${ago(a.createdAt)}`}
                      left={<RiskBar level={a.riskLevel} />} onPress={() => router.push(`/actions/${a.id}`)} />
                  ))}
                </Card>
              </Section>

              {now.state && now.state.openInvoiceCount > 0 ? (
                <Section title="Receivables">
                  <Card style={{ flexDirection: 'row' }}>
                    <View style={{ flex: 1, padding: 14, gap: 4 }}><T v="eyebrow">Open</T><T v="figure">{inrShort(now.state.openReceivables)}</T><T v="small">{now.state.openInvoiceCount} invoices</T></View>
                    <View style={{ width: 1, backgroundColor: c.rule }} />
                    <View style={{ flex: 1, padding: 14, gap: 4 }}><T v="eyebrow">Overdue</T><T v="figure">{inrShort(now.state.overdueReceivables)}</T><T v="small">{now.state.over30Count} over 30 days</T></View>
                  </Card>
                  {now.dataAsOf ? <T v="small" style={{ color: c.faint }}>From your records, updated {ago(now.dataAsOf)}.</T> : null}
                </Section>
              ) : null}

              <Section title="What changed">
                <Card>
                  {now.changed.length === 0 ? <Empty title="No changes since yesterday." /> : now.changed.slice(0, 6).map((ch, i) => (
                    <Row key={i} first={i === 0} title={ch.title} sub={ago(ch.at)} onPress={() => router.push(mobileRoute(ch.route) as never)} />
                  ))}
                </Card>
              </Section>

              <Section title="Sources">
                <Card>
                  {now.working.connectors.length === 0 ? <Empty title="No sources connected.">Connect Tally from Starlane on your computer.</Empty> : now.working.connectors.map((s, i) => (
                    <Row key={s.id} first={i === 0} title={s.name} sub={s.lastSuccessAt ? `Last good sync ${ago(s.lastSuccessAt)}` : 'No successful sync yet'} right={<Health health={s.health} />} />
                  ))}
                </Card>
              </Section>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

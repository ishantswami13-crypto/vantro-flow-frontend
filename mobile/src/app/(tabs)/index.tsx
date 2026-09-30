// THE BRIDGE on the phone: one sentence from the books, what needs you, what
// Watch noticed, missions, what's coming. Same data as desktop.
import { View } from 'react-native';
import { router } from 'expo-router';
import { ago, inrShort, type BridgeView } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { useResource } from '../../lib/useResource';
import { Button, Card, Chip, Empty, Health, Loaded, RiskBar, Row, Screen, Section, Stale, T, c } from '../../components/ui';
import { Bar, Figure } from '../../components/motion';
import { LifecycleChip, SEV_LEVEL, rupees } from '../../components/feature';

const FRESH = { fresh: ['Up to date', 'ok'], delayed: ['Hours behind', 'warn'], stale: ['Over a day behind', 'bad'], none: ['No sync yet', 'muted'] } as const;

function sentence(b: BridgeView) {
  if (!b.hasData || !b.state) return 'Starlane has no books to read yet.';
  const s = b.state;
  const first = `You are owed ${rupees(s.openReceivables)}${s.overdueReceivables > 0 ? `; ${rupees(s.overdueReceivables)} is overdue.` : ', none overdue.'}`;
  const n = b.attention.decisions, w = b.attention.watch.open;
  return `${first} ${n || w ? `${n ? `${n} decision${n > 1 ? 's' : ''} for you` : ''}${n && w ? ', ' : ''}${w ? `${w} new in Watch` : ''}.` : 'Nothing needs you.'}`;
}

export default function Bridge() {
  const { state } = useSession();
  const r = useResource<BridgeView>('bridge', () => api.bridge());
  const org = state.status === 'signed_in' ? state.boot?.organization.name : null;
  return (
    <Screen r={r}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="eyebrow" style={{ flex: 1 }} numberOfLines={1}>The Bridge{org ? ` · ${org}` : ''}</T>
        {r.data ? <Chip label={FRESH[r.data.freshness][0]} tone={FRESH[r.data.freshness][1]} /> : null}
        <Stale r={r} />
      </View>
      <Loaded r={r}>
        {(b) => (
          <>
            <T v="sentence">{sentence(b)}</T>
            {!b.hasData ? (
              <Card style={{ padding: 16, gap: 8 }}>
                <T v="medium">Connect your books to start.</T>
                <T v="small">Install Starlane on the computer that runs Tally, or import a sheet from your bookkeeping software. Nothing here is sample data.</T>
                <Button label="Sources" kind="secondary" onPress={() => router.push('/sources')} />
              </Card>
            ) : (
              <>
                <Section title="Needs you" count={b.attention.decisions}>
                  <Card>
                    {b.attention.topDecisions.length === 0 ? <Empty title="Nothing is waiting for your decision." /> : b.attention.topDecisions.map((a, i) => (
                      <Row key={a.id} first={i === 0} title={a.title} sub={a.description} left={<RiskBar level={a.riskLevel} />} right={<LifecycleChip state={a.lifecycle} />} onPress={() => router.push(`/actions/${a.id}`)} />
                    ))}
                  </Card>
                </Section>

                {b.state ? (
                  <Section title="Receivables">
                    <Card style={{ flexDirection: 'row' }}>
                      <View style={{ flex: 1, padding: 14, gap: 4 }}><T v="eyebrow">Owed</T><Figure value={b.state.openReceivables} format={inrShort} style={{ fontSize: 20, lineHeight: 26, color: c.ink }} /><T v="small">{b.state.openInvoiceCount} invoices</T></View>
                      <View style={{ width: 1, backgroundColor: c.rule }} />
                      <View style={{ flex: 1, padding: 14, gap: 4 }}><T v="eyebrow">Overdue</T><Figure value={b.state.overdueReceivables} format={inrShort} style={{ fontSize: 20, lineHeight: 26, color: c.ink }} /><T v="small">{b.state.overdueInvoiceCount} invoices</T></View>
                    </Card>
                    <View style={{ gap: 8 }}>
                      {b.state.ageing.filter((a) => a.count).map((a) => {
                        const max = Math.max(...b.state!.ageing.map((x) => x.amount), 1);
                        return (
                          <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <T v="small" style={{ width: 86 }}>{a.label}</T>
                            <View style={{ flex: 1 }}><Bar ratio={a.amount / max} color={a.id === 'current' ? c.ruleStrong : a.id === '31_90' || a.id === '90_plus' ? c.bad : '#C7962F'} label={`${a.label}: ${rupees(a.amount)}`} /></View>
                            <T v="mono" style={{ fontSize: 12 }}>{rupees(a.amount)}</T>
                          </View>
                        );
                      })}
                    </View>
                    <T v="small" style={{ color: c.faint }}>{b.dataAsOf ? `From your books, synced ${ago(b.dataAsOf)}.` : 'From invoices in Starlane; no sync recorded.'}</T>
                  </Section>
                ) : null}

                <Section title="Watch" count={`${b.attention.watch.open} new`}>
                  <Card>
                    {b.attention.watch.latest.length === 0 ? <Empty title="Nothing needs watching." /> : b.attention.watch.latest.slice(0, 3).map((e, i) => (
                      <Row key={e.id} first={i === 0} title={e.title} sub={e.detail} left={<RiskBar level={SEV_LEVEL[e.severity]} />} onPress={() => router.push(`/event/${e.id}`)} />
                    ))}
                  </Card>
                </Section>

                <Section title="Missions">
                  <Card>
                    {b.missions.length === 0 ? <Empty title="No mission is running.">Start one from an overdue invoice in Watch.</Empty> : b.missions.map((m, i) => (
                      <Row key={m.id} first={i === 0} title={m.title} sub={`${rupees(m.progress?.collected || 0)} of ${rupees(m.target.amount)}${m.progress?.daysLeft != null && m.status === 'active' ? ` · ${m.progress.daysLeft} days left` : ` · ${m.status}`}`}
                        onPress={() => router.push(`/mission/${m.id}`)} />
                    ))}
                  </Card>
                </Section>

                {b.prepared ? (
                  <Section title="Coming up">
                    <Card>{b.prepared.map((h, i) => (
                      <Row key={h.horizon} first={i === 0} title={h.first ? h.first.title : h.status === 'insufficient_data' ? 'Not enough data to prepare' : 'Nothing due'} sub={`${h.label}${h.count > 1 ? ` · ${h.count - 1} more` : ''}`} onPress={() => router.push('/prepared')} />
                    ))}</Card>
                  </Section>
                ) : null}

                <Section title="Sources">
                  <Card>{b.sources.map((s, i) => (
                    <Row key={s.id} first={i === 0} title={s.name} sub={s.lastSuccessAt ? `Last good sync ${ago(s.lastSuccessAt)}` : 'No successful sync yet'} right={<Health health={s.health} />} />
                  ))}</Card>
                </Section>
              </>
            )}
          </>
        )}
      </Loaded>
    </Screen>
  );
}

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ago, type ActionSummary } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Card, Empty, Loaded, RiskBar, Row, Screen, Stale, T, c, f } from '../../components/ui';

const TABS = [['pending', 'Waiting'], ['done', 'Done'], ['failed', 'Failed'], ['rejected', 'Declined']] as const;

export default function Approvals() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('pending');
  const r = useResource<ActionSummary[]>(`actions:${tab}`, () => api.actions(tab));
  return (
    <Screen r={r} title="Approvals" aside={<Stale r={r} />}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {TABS.map(([k, label]) => (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: tab === k ? c.ink : c.sunk }}>
            <T style={{ fontFamily: f.uiBold, fontSize: 13, color: tab === k ? c.paper : c.graphite }}>{label}</T>
          </Pressable>
        ))}
      </View>
      <Loaded r={r}>
        {(list) => (
          <Card>
            {list.length === 0 ? <Empty title={tab === 'pending' ? 'Nothing is waiting for you.' : 'Nothing here yet.'} /> : list.map((a, i) => (
              <Row key={a.id} first={i === 0} title={a.title} sub={`${a.riskLevel} risk · ${ago(a.updatedAt || a.createdAt)}`} left={<RiskBar level={a.riskLevel} />} onPress={() => router.push(`/actions/${a.id}`)} />
            ))}
          </Card>
        )}
      </Loaded>
    </Screen>
  );
}

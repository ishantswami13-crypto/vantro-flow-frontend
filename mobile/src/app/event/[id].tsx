// One Watch event: why it was raised (evidence), what has been done, and the
// next step — Scan why, or a mission to collect.
import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ago, type WatchDetail } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Button, Chip, Loaded, Screen, Section, Stale, T } from '../../components/ui';
import { ActionRows, Back, EvidenceCard } from '../../components/feature';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useResource<WatchDetail>(`watch-event:${id}`, () => api.watchEvent(String(id)));
  const [err, setErr] = useState<string | null>(null);
  async function move(state: 'acknowledged' | 'dismissed' | 'open') {
    setErr(null);
    try { await api.setWatchState(String(id), state); await r.reload(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <Screen r={r}>
      <Back />
      <Loaded r={r}>
        {(d) => {
          const e = d.event;
          return (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Chip label={e.severity} tone={e.severity === 'critical' || e.severity === 'high' ? 'bad' : e.severity === 'normal' ? 'warn' : 'muted'} />
                <Chip label={e.state} />
                <Stale r={r} />
              </View>
              <T v="title">{e.title}</T>
              <T v="small">{e.detail} First seen {ago(e.firstSeenAt)}.</T>
              {d.next ? (
                <View style={{ gap: 10 }}>
                  <Button label="Scan: why is this happening?" onPress={() => router.push(d.next!.scan.replace('/scan/invoice/', '/invoice/') as never)} />
                  <Button label={d.mission ? `Open mission: ${d.mission.title}` : 'Start a collections mission'} kind="secondary"
                    onPress={() => router.push((d.mission ? `/mission/${d.mission.id}` : `/mission/new?invoice=${e.entity?.id}`) as never)} />
                </View>
              ) : null}
              <EvidenceCard ev={e.evidence} title="Why this was raised" />
              <Section title="Actions on this"><ActionRows actions={d.actions} empty="No action has been proposed yet." /></Section>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {e.state === 'open' ? <View style={{ flex: 1 }}><Button label="Mark as seen" kind="secondary" onPress={() => void move('acknowledged')} /></View> : null}
                {e.state === 'open' || e.state === 'acknowledged' ? <View style={{ flex: 1 }}><Button label="Dismiss" kind="secondary" onPress={() => void move('dismissed')} /></View> : null}
                {e.state === 'dismissed' ? <View style={{ flex: 1 }}><Button label="Reopen" kind="secondary" onPress={() => void move('open')} /></View> : null}
              </View>
              {err ? <T v="error">{err}</T> : null}
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

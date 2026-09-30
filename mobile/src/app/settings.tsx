import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { ago } from '@starlane/contracts';
import { api, appVersion, platform } from '../lib/api';
import { registerForPush, type PushState } from '../lib/push';
import { useSession } from '../lib/session';
import { useResource } from '../lib/useResource';
import { Button, Card, Chip, Empty, Loaded, Row, Screen, Section, T } from '../components/ui';

export default function Settings() {
  const { state, signOut } = useSession();
  const sessions = useResource('sessions', () => api.sessions());
  const [push, setPush] = useState<PushState | null>(null);
  useEffect(() => { void registerForPush().then(setPush); }, []);
  const boot = state.status === 'signed_in' ? state.boot : null;
  return (
    <Screen r={sessions} title="Settings">
      <Pressable onPress={() => router.back()} hitSlop={12}><T v="small">‹ Back</T></Pressable>
      <Section title="Account">
        <Card><Row first title={boot?.user?.email || '—'} sub={`${boot?.organization.name || 'Organization'} · Starlane ${boot?.env || ''}`} /></Card>
      </Section>
      <Section title="Notifications">
        <Card><Row first title="Push notifications" sub={push ? (push.status === 'registered' ? 'On for this phone' : push.reason) : 'Checking…'}
          right={<Chip label={push?.status === 'registered' ? 'On' : 'Off'} tone={push?.status === 'registered' ? 'ok' : 'muted'} />} /></Card>
      </Section>
      <Section title="Signed-in devices">
        <Loaded r={sessions}>
          {(list) => <Card>{list.length === 0 ? <Empty title="No devices." /> : list.map((s, i) => (
            <Row key={s.id} first={i === 0} title={`${s.device_name || (s.client === 'mobile' ? 'Phone' : 'Computer')}${s.current ? ' · this phone' : ''}`}
              sub={`Starlane for ${s.client}${s.platform ? ` · ${s.platform}` : ''} · active ${ago(s.last_used_at)}`}
              right={s.current ? undefined : <Pressable onPress={() => void api.revokeSession(s.id).then(() => sessions.reload())} hitSlop={8}><Chip label="Sign out" tone="bad" /></Pressable>} />
          ))}</Card>}
        </Loaded>
      </Section>
      <Button label="Sign out of this phone" kind="danger" onPress={() => void signOut()} />
      <T v="small">Starlane {appVersion} · {platform} · {api.baseUrl}</T>
    </Screen>
  );
}

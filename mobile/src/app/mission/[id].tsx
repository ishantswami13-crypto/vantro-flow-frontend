// One mission: progress against the frozen baseline, the actions it
// proposed (each through approval), blockers, and start / pause / cancel.
import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MISSION_STATUS_LABEL, type Mission } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Button, Card, Chip, Loaded, Screen, Section, Stale, T, c } from '../../components/ui';
import { Bar, haptic } from '../../components/motion';
import { ActionRows, Back, EvidenceCard, Lines, rupees } from '../../components/feature';

const TONE = { active: 'accent', paused: 'warn', completed: 'ok', failed: 'bad', cancelled: 'muted', draft: 'muted' } as const;

export default function MissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useResource<Mission>(`mission:${id}`, () => api.mission(String(id)));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  async function act(verb: 'activate' | 'pause' | 'cancel') {
    setBusy(verb); setErr(null); setNote(null);
    try {
      const out = await api.missionAction(String(id), verb);
      if (out.proposed) setNote(`${out.proposed.created} action${out.proposed.created === 1 ? '' : 's'} proposed for your approval.`);
      haptic.success();
      await r.reload();
    } catch (e) { haptic.warning(); setErr((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <Screen r={r}>
      <Back />
      <Loaded r={r}>
        {(m) => {
          const p = m.progress;
          const blockers = Array.isArray(p?.blockers) ? p!.blockers : [];
          return (
            <>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <T v="eyebrow" style={{ flex: 1 }}>Mission · Collections</T>
                <Chip label={MISSION_STATUS_LABEL[m.status]} tone={TONE[m.status]} />
                <Stale r={r} />
              </View>
              <T v="title">{m.title}</T>
              <T v="small">{m.objective}</T>
              {m.outcome ? <Card style={{ padding: 14, backgroundColor: m.outcome.result === 'completed' ? c.okSoft : c.warnSoft }}><T>{m.outcome.text} Collected {rupees(m.outcome.collected)} of {rupees(m.outcome.target)}.</T></Card> : null}
              {p && m.status !== 'draft' ? (
                <Section title="Progress">
                  <Card style={{ padding: 14, gap: 10 }}>
                    <T v="figure">{rupees(p.collected)} <T v="small">of {rupees(p.targetAmount)}{m.status === 'active' && p.daysLeft != null ? ` · ${p.daysLeft} days left` : ''}</T></T>
                    <Bar ratio={p.ratio} color={m.status === 'failed' ? c.bad : c.ok} label={`${Math.round(p.ratio * 100)}% of target`} />
                    {p.byInvoice?.map((i) => (
                      <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T v="small" style={{ flex: 1 }} numberOfLines={1}>{i.customer}{i.invoiceNumber ? ` · ${i.invoiceNumber}` : ''}</T>
                        <T v="mono" style={{ fontSize: 12 }}>{i.status === 'paid_or_removed' ? 'Paid' : `${rupees(i.now)} left`}</T>
                      </View>
                    ))}
                  </Card>
                </Section>
              ) : null}
              <View style={{ gap: 10 }}>
                {m.allowed?.includes('activate') ? <Button label={m.status === 'paused' ? 'Resume' : 'Start mission'} busy={busy === 'activate'} disabled={!!busy} onPress={() => void act('activate')} /> : null}
                {m.allowed?.includes('pause') ? <Button label="Pause" kind="secondary" disabled={!!busy} onPress={() => void act('pause')} /> : null}
                {m.status === 'active' || m.status === 'paused' ? <Button label="Simulate this mission" kind="secondary" onPress={() => router.push(`/simulate?mission=${m.id}` as never)} /> : null}
                {m.allowed?.includes('cancel') ? <Button label="Cancel mission" kind="danger" disabled={!!busy} onPress={() => void act('cancel')} /> : null}
              </View>
              {note ? <T v="small">{note}</T> : null}
              {err ? <T v="error">{err}</T> : null}
              <Section title="Actions" count={m.actions?.length || 0}><ActionRows actions={m.actions || []} empty={m.status === 'draft' ? 'Start the mission and Starlane proposes the first steps.' : 'No actions.'} /></Section>
              {blockers.length ? <Section title="Blockers"><Lines items={blockers.map((b) => b.text)} /></Section> : null}
              {p?.evidence ? <EvidenceCard ev={p.evidence} title="How progress is measured" /> : null}
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

// One action: what happens if approved, the evidence (each fact labelled
// observed / calculated / assumption), and the decision. A high-risk approval
// asks for Face ID / fingerprint (or the device passcode) first; the server
// independently refuses a high-risk approval that was not confirmed.
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { ApiError, ago, type ActionDetail, type DecisionResult } from '@starlane/contracts';
import { api, track } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Button, Card, Chip, Empty, Loaded, Screen, Section, Stale, T, c } from '../../components/ui';
import { DoneCheck, haptic } from '../../components/motion';
import { LifecycleChip } from '../../components/feature';

const show = (v: unknown) => v === null || v === undefined || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : typeof v === 'object' ? JSON.stringify(v) : String(v);
const KIND_TONE = { observed: 'ok', calculated: 'accent', assumption: 'warn', forecast: 'warn', external: 'muted' } as const;

async function confirmWithDevice(): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === 'web') return { ok: false, reason: 'High-risk approvals need the phone app (biometric confirmation).' };
  const hasHw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hasHw && (await LocalAuthentication.isEnrolledAsync());
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (!enrolled && level === LocalAuthentication.SecurityLevel.NONE) return { ok: false, reason: 'Set up a screen lock on this phone to approve high-risk actions.' };
  const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm high-risk approval', cancelLabel: 'Cancel' });
  return res.success ? { ok: true } : { ok: false, reason: res.error === 'user_cancel' || res.error === 'system_cancel' ? undefined : 'Could not confirm it was you.' };
}

export default function ActionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useResource<ActionDetail>(`action:${id}`, () => api.action(String(id)));
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const hasFacts = !!r.data?.evidence.facts.length;
  useEffect(() => { if (hasFacts) track('client.evidence_opened', { screen: 'action' }); }, [id, hasFacts]);

  async function decide(a: ActionDetail, decision: 'approve' | 'reject') {
    setErr(null);
    const high = decision === 'approve' && a.riskLevel === 'high';
    if (high) {
      const ok = await confirmWithDevice();
      if (!ok.ok) { if (ok.reason) setErr(ok.reason); return; }
    }
    setBusy(decision);
    try {
      const out = await api.decide(a.id, decision, high);
      setResult(out);
      if (out.status === 'failed') haptic.warning(); else haptic.success();
      track('client.approval_completed', { screen: 'action' });
      await r.reload();
    } catch (e) {
      haptic.warning();
      if (e instanceof ApiError && e.status === 409 && e.code === 'MISSION_NOT_ACTIVE') setErr(e.message);
      else if (e instanceof ApiError && e.status === 409) { setErr('Already decided on another device.'); await r.reload(); }
      else setErr((e as Error).message);
    } finally { setBusy(null); }
  }

  return (
    <Screen r={r}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}><T v="small">‹ Back</T></Pressable>
      <Loaded r={r}>
        {(a) => (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Chip label={`${a.riskLevel} risk`} tone={a.riskLevel === 'high' ? 'bad' : a.riskLevel === 'medium' ? 'warn' : 'muted'} />
              {a.lifecycle ? <LifecycleChip state={a.lifecycle} /> : <Chip label={a.status.replace(/_/g, ' ')} />}
              <Stale r={r} />
            </View>
            <T v="title">{a.title}</T>
            {a.description ? <T v="small">{a.description}</T> : null}
            {a.missionId ? <Pressable onPress={() => router.push(`/mission/${a.missionId}`)} hitSlop={8}><T v="small" style={{ color: c.accent }}>Part of a mission ›</T></Pressable> : null}

            <Section title="If you approve">
              {a.proposal.message ? (
                <Card style={{ padding: 14, backgroundColor: c.sunk }}><T style={{ fontFamily: 'Fraunces_400Regular', fontSize: 16, lineHeight: 24 }}>{a.proposal.message}</T></Card>
              ) : <Card><Empty title="No message is sent by this action." /></Card>}
              {a.risks.map((x) => <T key={x} v="small">• {x}</T>)}
            </Section>

            <Section title="Why Starlane suggests this">
              <Card>
                {a.evidence.facts.length === 0 ? <Empty title="No structured evidence was recorded.">Treat it as a suggestion to check yourself.</Empty> : a.evidence.facts.map((fct, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.rule }}>
                    <T v="body" style={{ flex: 1 }}>{fct.label}</T>
                    <T v="mono">{show(fct.value)}</T>
                    <Chip label={fct.kind} tone={KIND_TONE[fct.kind] || 'muted'} />
                  </View>
                ))}
              </Card>
              <T v="small" style={{ color: c.faint }}>
                {a.evidence.source ? `Source: ${a.evidence.source.table}. ` : ''}{a.evidence.computedAt ? `Computed ${ago(a.evidence.computedAt)}.` : ''}
              </T>
            </Section>

            {a.status === 'pending' ? (
              <View style={{ gap: 10 }}>
                <T v="small">{a.riskLevel === 'high' ? 'High risk — you will be asked to confirm with Face ID, fingerprint or your passcode.' : 'Nothing happens until you decide.'}</T>
                <Button label={a.riskLevel === 'high' ? 'Approve with confirmation' : 'Approve'} busy={busy === 'approve'} disabled={!!busy} onPress={() => void decide(a, 'approve')} />
                <Button label="Decline" kind="secondary" busy={busy === 'reject'} disabled={!!busy} onPress={() => void decide(a, 'reject')} />
              </View>
            ) : <Card style={{ padding: 14 }}><T v="medium">{a.lifecycleNote || `Decided — ${a.status.replace(/_/g, ' ')}`}</T><T v="small">Updated {ago(a.updatedAt || a.createdAt)}.</T></Card>}
            {result && result.status !== 'rejected' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {result.status === 'done' ? <DoneCheck /> : null}
                <T v={result.status === 'done' ? 'small' : 'error'} style={{ flex: 1 }}>{result.message}</T>
              </View>
            ) : null}
            {err ? <T v="error">{err}</T> : null}
            {a.lastError ? <T v="error">Last run failed: {a.lastError}</T> : null}
          </>
        )}
      </Loaded>
    </Screen>
  );
}

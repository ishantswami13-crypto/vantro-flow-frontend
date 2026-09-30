// New collections mission: who, how much, by when — with the simulated
// outcome before you start. Starting proposes reminders for your approval.
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { MissionDraft, MissionInput, Simulation } from '@starlane/contracts';
import { api } from '../../lib/api';
import { Button, Card, Screen, Section, T, c, f } from '../../components/ui';
import { Back, KindChip, rupees } from '../../components/feature';

const input = { height: 46, borderRadius: 10, borderWidth: 1, borderColor: c.ruleStrong, paddingHorizontal: 12, fontFamily: f.ui, fontSize: 15, color: c.ink, backgroundColor: c.surface } as const;

export default function NewMission() {
  const params = useLocalSearchParams<{ invoice?: string; customer?: string }>();
  const [form, setForm] = useState<MissionInput>({ horizonDays: 14, ...(params.invoice ? { invoiceIds: [String(params.invoice)] } : {}), ...(params.customer ? { customer: String(params.customer) } : {}) });
  const [preview, setPreview] = useState<{ errors: string[]; draft: MissionDraft; simulation: Simulation | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { void api.previewMission(form).then((p) => live && setPreview(p)).catch((e) => live && setErr((e as Error).message)); }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [form]);
  async function start() {
    setBusy(true); setErr(null);
    try {
      const { mission } = await api.createMission(form);
      await api.missionAction(mission.id, 'activate');
      router.replace(`/mission/${mission.id}`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const sim = preview?.simulation;
  const step = (d: number) => setForm((x) => ({ ...x, horizonDays: Math.max(3, Math.min(60, (x.horizonDays || 14) + d)) }));
  return (
    <Screen>
      <Back />
      <T v="eyebrow">New mission · Collections</T>
      <T v="title">{preview?.draft.title || 'Collect what is overdue'}</T>
      <View style={{ gap: 8 }}>
        <T v="small">Who</T>
        {form.invoiceIds ? <T>The invoice you chose</T> : <TextInput accessibilityLabel="Customer" style={input} placeholder="Everyone overdue" placeholderTextColor={c.faint} value={form.customer || ''} onChangeText={(v) => setForm((x) => ({ ...x, customer: v || undefined }))} />}
        <T v="small">Collect (₹)</T>
        <TextInput accessibilityLabel="Amount" style={input} keyboardType="numeric" placeholder={sim ? `Up to ${Math.round(Number(sim.facts[0]?.value || 0)).toLocaleString('en-IN')}` : ''} placeholderTextColor={c.faint}
          value={form.targetAmount != null ? String(form.targetAmount) : ''} onChangeText={(v) => { const n = v.replace(/[^0-9]/g, ''); setForm((x) => ({ ...x, targetAmount: n ? Number(n) : undefined })); }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <T style={{ flex: 1 }}>Within {form.horizonDays} days</T>
          <Pressable accessibilityLabel="Fewer days" onPress={() => step(-1)} style={{ width: 44, height: 40, borderRadius: 8, borderWidth: 1, borderColor: c.ruleStrong, alignItems: 'center', justifyContent: 'center' }}><T>−</T></Pressable>
          <Pressable accessibilityLabel="More days" onPress={() => step(1)} style={{ width: 44, height: 40, borderRadius: 8, borderWidth: 1, borderColor: c.ruleStrong, alignItems: 'center', justifyContent: 'center' }}><T>+</T></Pressable>
        </View>
      </View>
      {preview ? <Card style={{ padding: 14 }}><T>{preview.draft.objective}</T></Card> : null}
      {sim ? (
        <Section title="Simulated">
          <Card style={{ padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="figure" style={{ flex: 1 }}>{rupees(sim.estimate.expected.value)}</T><KindChip kind="estimate" /></View>
            <T v="small">expected within {sim.horizonDays} days · range {rupees(sim.estimate.range.low)} – {rupees(sim.estimate.range.high)}</T>
            {sim.target ? <T v={sim.target.reach === 'unlikely' ? 'error' : 'small'}>{sim.target.text}</T> : null}
          </Card>
        </Section>
      ) : null}
      {preview?.errors.length ? <T v="error">{preview.errors.join(' · ')}</T> : null}
      {err ? <T v="error">{err}</T> : null}
      <Button label="Start mission" busy={busy} disabled={!preview || !!preview.errors.length} onPress={() => void start()} />
      <T v="small">Starting proposes one reminder per customer for your approval. Disputed invoices are left out. Nothing is sent until you approve.</T>
    </Screen>
  );
}

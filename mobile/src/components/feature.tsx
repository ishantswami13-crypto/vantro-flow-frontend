// Shared pieces for the seven features on the phone — the same evidence and
// lifecycle language as the desktop app (desktop/src/ui.tsx).
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LIFECYCLE_LABEL, LIFECYCLE_TONE, type ActionLifecycle, type EvidenceItem, type EvidenceSet, type FeatureAction } from '@starlane/contracts';
import { Card, Chip, Empty, RiskBar, Row, Section, T, c } from './ui';

export const rupees = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export function showValue(v: unknown, unit?: string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return unit === 'INR' ? rupees(v) : `${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const KIND_TONE: Record<string, 'ok' | 'accent' | 'warn' | 'muted'> = {
  fact: 'ok', observed: 'ok', calculated: 'accent', assumption: 'warn', estimate: 'warn', forecast: 'warn', model: 'muted',
};
export const KindChip = ({ kind }: { kind: string }) => <Chip label={kind} tone={KIND_TONE[kind] || 'muted'} />;

export function FactLine({ f, first }: { f: EvidenceItem; first?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: first ? 0 : 1, borderTopColor: c.rule }}>
      <T v="body" style={{ flex: 1 }}>{f.label}</T>
      <T v="mono">{showValue(f.value, f.unit)}</T>
      <KindChip kind={f.kind} />
    </View>
  );
}

export function EvidenceCard({ ev, title = 'Evidence' }: { ev: EvidenceSet | null | undefined; title?: string }) {
  if (!ev) return null;
  return (
    <Section title={title}>
      <Card>{ev.facts.length ? ev.facts.map((f, i) => <FactLine key={i} f={f} first={i === 0} />) : <Empty title="No evidence was recorded." />}</Card>
      <T v="small" style={{ color: c.faint }}>{ev.summary}{ev.sources.length ? ` Source: ${ev.sources.join(', ')}.` : ''}</T>
    </Section>
  );
}

export const LifecycleChip = ({ state }: { state: ActionLifecycle }) => <Chip label={LIFECYCLE_LABEL[state] || state} tone={LIFECYCLE_TONE[state] || 'muted'} />;

export function ActionRows({ actions, empty }: { actions: FeatureAction[]; empty?: string }) {
  if (!actions.length) return <Card><Empty title={empty || 'No actions.'} /></Card>;
  return (
    <Card>
      {actions.map((a, i) => (
        <Row key={a.id} first={i === 0} title={a.title} sub={a.description} left={<RiskBar level={a.riskLevel} />} right={<LifecycleChip state={a.lifecycle} />} onPress={() => router.push(`/actions/${a.id}`)} />
      ))}
    </Card>
  );
}

export function Back() {
  return <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}><T v="small">‹ Back</T></Pressable>;
}

export function Segments<K extends string>({ value, options, onChange }: { value: K; options: Array<{ key: K; label: string }>; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.sunk, borderRadius: 10, padding: 3 }}>
      {options.map((o) => (
        <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{ selected: value === o.key }} onPress={() => onChange(o.key)}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: value === o.key ? c.surface : 'transparent' }}>
          <T v="medium" style={{ fontSize: 13, color: value === o.key ? c.ink : c.graphite }}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export const SEV_LEVEL: Record<string, string> = { critical: 'high', high: 'high', normal: 'medium', low: 'low' };

export function Lines({ items }: { items: ReactNode[] }) {
  return <Card>{items.map((x, i) => <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: c.rule }}>{typeof x === 'string' ? <T>{x}</T> : x}</View>)}</Card>;
}

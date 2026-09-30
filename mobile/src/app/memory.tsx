// MEMORY on the phone: what Starlane learned, where from; confirm, correct or
// forget.
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { MEMORY_STATUS_LABEL, type MemoryRecord } from '@starlane/contracts';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Button, Card, Chip, Empty, Loaded, Screen, Stale, T, c, f } from '../components/ui';
import { Back } from '../components/feature';

const SOURCE: Record<string, string> = { your_books: 'From your books', mission: 'From a mission', you: 'Written by you' };

export default function MemoryScreen() {
  const r = useResource<MemoryRecord[]>('memory:false', () => api.memory());
  return (
    <Screen r={r} title="Memory" aside={<Stale r={r} />}>
      <Back />
      <T v="small">How your customers pay and how missions went. Inferred things are Starlane’s reading of your books — confirm, correct or forget them.</T>
      <Loaded r={r}>
        {(list) => list.length === 0 ? <Card><Empty title="Nothing remembered yet.">Starlane learns a customer’s payment timing once it has three paid invoices with due and payment dates.</Empty></Card>
          : <View style={{ gap: 10 }}>{list.map((m) => <Item key={m.id} m={m} onChange={() => void r.reload()} />)}</View>}
      </Loaded>
    </Screen>
  );
}

function Item({ m, onChange }: { m: MemoryRecord; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.statement);
  const [err, setErr] = useState<string | null>(null);
  async function decide(verb: 'confirm' | 'correct' | 'remove') {
    setErr(null);
    try { await api.memoryDecide(m.id, verb, verb === 'correct' ? text : undefined); setEditing(false); onChange(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <Card style={{ padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <T v="eyebrow" style={{ flex: 1 }}>{m.subject.label}</T>
        <Chip label={MEMORY_STATUS_LABEL[m.status]} tone={m.status === 'inferred' ? 'accent' : 'ok'} />
        {m.freshness !== 'current' ? <Chip label={m.freshness === 'stale' ? 'Not rechecked' : 'Books changed'} tone="warn" /> : null}
      </View>
      {editing ? <TextInput accessibilityLabel="Corrected statement" value={text} onChangeText={setText} multiline style={{ minHeight: 60, borderRadius: 10, borderWidth: 1, borderColor: c.ruleStrong, padding: 10, fontFamily: f.ui, fontSize: 15, color: c.ink }} />
        : <T>{m.statement}</T>}
      <T v="small">{SOURCE[m.provenance.source] || m.provenance.source}{m.provenance.sampleSize ? ` · ${m.provenance.sampleSize} invoices` : ''}{m.provenance.correctedFrom ? ` · was: “${m.provenance.correctedFrom}”` : ''}</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {editing ? <View style={{ flex: 1 }}><Button label="Save" onPress={() => void decide('correct')} /></View> : null}
        {!editing && m.status === 'inferred' ? <View style={{ flex: 1 }}><Button label="That’s right" kind="secondary" onPress={() => void decide('confirm')} /></View> : null}
        {!editing ? <View style={{ flex: 1 }}><Button label="Correct" kind="secondary" onPress={() => setEditing(true)} /></View> : null}
        <View style={{ flex: 1 }}><Button label={editing ? 'Cancel' : 'Forget'} kind="secondary" onPress={() => (editing ? setEditing(false) : void decide('remove'))} /></View>
      </View>
      {err ? <T v="error">{err}</T> : null}
    </Card>
  );
}

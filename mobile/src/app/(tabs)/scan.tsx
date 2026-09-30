// SCAN tab: find a customer or invoice and see why it matters, or ask in
// words. Read-only — the server gives phone sessions look-up tools only.
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineError, type ScanSearch } from '@starlane/contracts';
import { api, track } from '../../lib/api';
import { useSession } from '../../lib/session';
import { Button, Card, Row, T, c, f } from '../../components/ui';
import { TypingDots } from '../../components/motion';
import { rupees } from '../../components/feature';

interface Turn { role: 'user' | 'assistant'; content: string }
const STARTERS = ['Who owes me the most?', 'Who is more than 30 days overdue?', 'Cash for the next 30 days?'];

export default function Scan() {
  const insets = useSafeAreaInsets();
  const { state } = useSession();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<ScanSearch | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const term = text.trim();
    if (term.length < 2 || (term.includes(' ') && term.length > 24)) { setHits(null); return; }
    let live = true;
    const t = setTimeout(() => { void api.scanSearch(term).then((h) => live && setHits(h)).catch(() => live && setHits(null)); }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [text]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next); setText(''); setHits(null); setBusy(true); setErr(null);
    track('client.ask_submitted', { screen: 'scan' });
    try {
      const reply = await api.ask(next, state.status === 'signed_in' ? state.boot?.organization.name : null);
      setTurns([...next, { role: 'assistant', content: reply.message || '(no answer)' }]);
    } catch (e) {
      setErr(e instanceof OfflineError ? 'Starlane cannot be reached. Your question was not sent.' : (e as Error).message);
      setTurns(turns); setText(question);
    } finally { setBusy(false); setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }
  }

  const found = hits && (hits.customers.length > 0 || hits.invoices.length > 0);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 18, padding: 18, gap: 12 }}>
        <T v="title">Scan</T>
        <T v="small">Type a customer or invoice number to see why it matters, with the evidence — or ask a question. Scan cannot change anything.</T>
        {found ? (
          <Card>
            {hits!.customers.map((h, i) => <Row key={h.key} first={i === 0} title={h.name} sub={`${h.openCount} open · oldest ${h.oldestDays} days overdue`} right={<T v="mono">{rupees(h.openTotal)}</T>} onPress={() => router.push(`/customer/${encodeURIComponent(h.key)}`)} />)}
            {hits!.invoices.map((h, i) => <Row key={h.id} first={i === 0 && !hits!.customers.length} title={`${h.invoiceNumber} · ${h.customer}`} sub={h.daysOverdue > 0 ? `${h.daysOverdue} days overdue` : 'Not yet due'} right={<T v="mono">{rupees(h.amount)}</T>} onPress={() => router.push(`/invoice/${h.id}`)} />)}
          </Card>
        ) : null}
        {turns.length === 0 && !found ? STARTERS.map((s) => (
          <Pressable key={s} onPress={() => void ask(s)} style={{ borderWidth: 1, borderColor: c.ruleStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start', backgroundColor: c.surface }}>
            <T v="medium" style={{ fontSize: 14 }}>{s}</T>
          </Pressable>
        )) : turns.map((t, i) => (
          <View key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', backgroundColor: t.role === 'user' ? c.ink : c.surface, borderRadius: 14, padding: 12, borderWidth: t.role === 'user' ? 0 : 1, borderColor: c.rule }}>
            <T style={{ color: t.role === 'user' ? c.paper : c.ink }}>{t.content}</T>
          </View>
        ))}
        {busy ? <View style={{ alignSelf: 'flex-start', backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.rule }}><TypingDots /></View> : null}
        {err ? <T v="error">{err}</T> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: c.rule, backgroundColor: c.surface }}>
        <TextInput accessibilityLabel="Scan" value={text} onChangeText={setText} placeholder="Customer, invoice no., or a question" placeholderTextColor={c.faint} maxLength={2000}
          style={{ flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: c.ruleStrong, paddingHorizontal: 12, fontFamily: f.ui, fontSize: 15, color: c.ink }} onSubmitEditing={() => void ask(text)} returnKeyType="send" />
        <View style={{ width: 76 }}><Button label="Ask" disabled={!text.trim()} busy={busy} onPress={() => void ask(text)} /></View>
      </View>
    </KeyboardAvoidingView>
  );
}

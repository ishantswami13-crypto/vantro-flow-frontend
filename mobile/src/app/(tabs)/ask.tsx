// Ask Starlane — answers from the company's own records. Read-only in the app
// (the server gives phone sessions look-up tools only).
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OfflineError } from '@starlane/contracts';
import { api, track } from '../../lib/api';
import { useSession } from '../../lib/session';
import { Button, T, c, f } from '../../components/ui';

interface Turn { role: 'user' | 'assistant'; content: string }
const STARTERS = ['Who owes me the most?', 'Who is more than 30 days overdue?', 'Cash for the next 30 days?'];

export default function Ask() {
  const insets = useSafeAreaInsets();
  const { state } = useSession();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next); setText(''); setBusy(true); setErr(null);
    track('client.ask_submitted', { screen: 'ask' });
    try {
      const reply = await api.ask(next, state.status === 'signed_in' ? state.boot?.organization.name : null);
      setTurns([...next, { role: 'assistant', content: reply.message || '(no answer)' }]);
    } catch (e) {
      setErr(e instanceof OfflineError ? 'Starlane cannot be reached. Your question was not sent.' : (e as Error).message);
      setTurns(turns); setText(question);
    } finally { setBusy(false); setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingTop: insets.top + 18, padding: 18, gap: 12 }}>
        <T v="title">Ask Starlane</T>
        <T v="small">Answers come from your own records. Starlane says when it doesn’t have the data, and cannot change anything from here.</T>
        {turns.length === 0 ? STARTERS.map((s) => (
          <Pressable key={s} onPress={() => void send(s)} style={{ borderWidth: 1, borderColor: c.ruleStrong, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start', backgroundColor: c.surface }}>
            <T v="medium" style={{ fontSize: 14 }}>{s}</T>
          </Pressable>
        )) : turns.map((t, i) => (
          <View key={i} style={{ alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%', backgroundColor: t.role === 'user' ? c.ink : c.surface, borderRadius: 14, padding: 12, borderWidth: t.role === 'user' ? 0 : 1, borderColor: c.rule }}>
            <T style={{ color: t.role === 'user' ? c.paper : c.ink }}>{t.content}</T>
          </View>
        ))}
        {busy ? <T v="small">Starlane is looking…</T> : null}
        {err ? <T v="error">{err}</T> : null}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: c.rule, backgroundColor: c.surface }}>
        <TextInput accessibilityLabel="Question" value={text} onChangeText={setText} placeholder="Ask about receivables, cash, stock…" placeholderTextColor={c.faint} maxLength={2000}
          style={{ flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: c.ruleStrong, paddingHorizontal: 12, fontFamily: f.ui, fontSize: 15, color: c.ink }} onSubmitEditing={() => void send(text)} returnKeyType="send" />
        <View style={{ width: 76 }}><Button label="Ask" disabled={!text.trim()} busy={busy} onPress={() => void send(text)} /></View>
      </View>
    </KeyboardAvoidingView>
  );
}

import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, OfflineError } from '@starlane/contracts';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { Button, T, c, f } from '../components/ui';

const WEBSITE = 'https://vantro-flow.vercel.app';

export default function SignIn() {
  const { refresh } = useSession();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setErr(null);
    try { await api.login(email.trim(), password); await refresh(); }
    catch (e) {
      setErr(e instanceof OfflineError ? 'Starlane cannot be reached. Check your connection.'
        : e instanceof ApiError && e.status === 401 ? 'That email and password do not match.'
          : e instanceof ApiError && e.status === 429 ? 'Too many attempts. Wait a minute and try again.' : (e as Error).message);
    } finally { setBusy(false); }
  }

  const input = { height: 50, borderRadius: 10, borderWidth: 1, borderColor: c.ruleStrong, backgroundColor: c.surface, paddingHorizontal: 14, fontFamily: f.ui, fontSize: 16, color: c.ink } as const;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={{ backgroundColor: c.rail, paddingTop: insets.top + 28, paddingHorizontal: 22, paddingBottom: 30, gap: 22 }}>
        <T v="heading" style={{ color: c.railInk, fontFamily: f.display, fontSize: 20 }}>✦ Starlane</T>
        <T v="sentence" style={{ color: c.railInk }}>What needs you today, from your company’s own books.</T>
      </View>
      <View style={{ padding: 22, gap: 14 }}>
        <T v="small" style={{ color: c.graphite }}>Work email</T>
        <TextInput accessibilityLabel="Work email" style={input} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" value={email} onChangeText={setEmail} />
        <T v="small" style={{ color: c.graphite }}>Password</T>
        <TextInput accessibilityLabel="Password" style={input} secureTextEntry autoComplete="current-password" textContentType="password" value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} />
        {err ? <T v="error">{err}</T> : null}
        <Button label="Sign in" busy={busy} disabled={!email || !password} onPress={() => void submit()} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => void Linking.openURL(`${WEBSITE}/forgot-password`)}><T v="small">Forgot password</T></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${WEBSITE}/access`)}><T v="small">No account? Get Starlane</T></Pressable>
        </View>
        <T v="small" style={{ color: c.faint, marginTop: 8 }}>Your session is kept in this phone’s {Platform.OS === 'ios' ? 'Keychain' : 'secure keystore'} and never leaves it.</T>
      </View>
    </KeyboardAvoidingView>
  );
}

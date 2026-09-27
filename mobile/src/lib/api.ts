// The Starlane API client for the phone app. Sessions live in the iOS Keychain
// / Android Keystore via expo-secure-store (this device only, available after
// unlock) — never AsyncStorage or any file.
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createStarlaneClient, type Session, type StarlaneClient, type TelemetryEvent, type TokenStore } from '@starlane/contracts';

const PRODUCTION_API = 'https://vantro-flow-backend-production.up.railway.app';
const API = process.env.EXPO_PUBLIC_STARLANE_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || PRODUCTION_API;
const KEY = 'starlane.session';
const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

// Web preview (development/screenshots only): no secure store, so memory only.
const memory = new Map<string, string>();
const store = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(memory.get(k) ?? null) : SecureStore.getItemAsync(k, OPTS)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(void memory.set(k, v)) : SecureStore.setItemAsync(k, v, OPTS)),
  del: (k: string) => (Platform.OS === 'web' ? Promise.resolve(void memory.delete(k)) : SecureStore.deleteItemAsync(k, OPTS)),
};

const tokens: TokenStore = {
  async load() { const raw = await store.get(KEY).catch(() => null); if (!raw) return null; try { return JSON.parse(raw) as Session; } catch { return null; } },
  save: (s) => store.set(KEY, JSON.stringify(s)),
  clear: () => store.del(KEY),
};

export const appVersion = Constants.expoConfig?.version || '0.0.0';
export const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

const listeners = new Set<() => void>();
export const onSessionEnded = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

export const api: StarlaneClient = createStarlaneClient({
  baseUrl: API,
  fetch: fetch as never,
  tokens,
  // Model name, not the user-given device name (which is often a person's name).
  info: { client: 'mobile', platform, appVersion, deviceName: Device.modelName || (platform === 'ios' ? 'iPhone' : 'Phone') },
  onSessionEnded: () => listeners.forEach((cb) => cb()),
});

const queue: TelemetryEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
export function track(name: TelemetryEvent['name'], props: TelemetryEvent['props'] = {}) {
  queue.push({ name, props: { client: 'mobile', platform, app_version: appVersion, ...props } });
  if (!timer) timer = setTimeout(flush, 4000);
}
async function flush() {
  timer = null;
  const batch = queue.splice(0, 20);
  if (batch.length) await api.telemetry(batch).catch(() => false);
  if (queue.length) timer = setTimeout(flush, 4000);
}

// Push: registers this phone's Expo push token with Starlane so approvals,
// results and connector problems arrive as notifications, and routes a tapped
// notification to the exact screen. Needs an EAS project id in the build
// (expo.extra.eas.projectId) and, on Android, a build with FCM credentials;
// without them registration reports why instead of pretending.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

export type PushState = { status: 'registered' } | { status: 'unavailable' | 'denied' | 'error'; reason: string };

export async function registerForPush(): Promise<PushState> {
  if (Platform.OS === 'web') return { status: 'unavailable', reason: 'Push is not available in the web preview.' };
  if (!Device.isDevice) return { status: 'unavailable', reason: 'Push needs a real phone, not a simulator.' };
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return { status: 'unavailable', reason: 'This build is not linked to a push project yet (EAS project id missing).' };
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Starlane', importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { status: 'denied', reason: 'Notifications are turned off for Starlane in Settings.' };
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api.registerPush(token, Platform.OS, Device.modelName || undefined);
    return { status: 'registered' };
  } catch (e) {
    return { status: 'error', reason: (e as Error).message };
  }
}

/** Calls `go(route)` for a tapped notification (including the one that opened the app). */
export function onNotificationRoute(go: (route: string) => void) {
  const routeOf = (r: Notifications.NotificationResponse | null) => {
    const route = (r?.notification.request.content.data as { route?: unknown } | undefined)?.route;
    return typeof route === 'string' && /^\/[a-z0-9/_-]+$/i.test(route) ? route : null;
  };
  if (Platform.OS === 'web') return () => {};
  const initial = routeOf(Notifications.getLastNotificationResponse());
  if (initial) setTimeout(() => go(initial), 300);
  const sub = Notifications.addNotificationResponseReceivedListener((r) => { const route = routeOf(r); if (route) go(route); });
  return () => sub.remove();
}

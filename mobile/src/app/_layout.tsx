import { useEffect } from 'react';
import { Redirect, Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { SessionProvider, useSession } from '../lib/session';
import { onNotificationRoute, registerForPush } from '../lib/push';
import { mobileRoute } from '../lib/routes';
import { track } from '../lib/api';
import { c } from '../components/ui';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, IBMPlexMono_400Regular, IBMPlexMono_500Medium,
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { state } = useSession();
  const segments = useSegments();
  const onSignIn = segments[0] === 'sign-in';

  useEffect(() => { if (state.status !== 'loading') void SplashScreen.hideAsync().catch(() => {}); }, [state.status]);
  useEffect(() => {
    if (state.status !== 'signed_in') return;
    void registerForPush().then((p) => { if (p.status !== 'registered') console.log('[push]', p.status); });
    return onNotificationRoute((route) => { track('client.notification_opened'); router.push(mobileRoute(route) as never); });
  }, [state.status]);

  if (state.status === 'loading') return null;
  if (state.status === 'signed_out' && !onSignIn) return <Redirect href="/sign-in" />;
  if (state.status === 'signed_in' && onSignIn) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="actions/[id]" options={{ presentation: 'card' }} />
    </Stack>
  );
}

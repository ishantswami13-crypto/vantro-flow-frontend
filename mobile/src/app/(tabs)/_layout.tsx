import { Tabs } from 'expo-router/js-tabs';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c, f } from '../../components/ui';

// Text tabs with a small mark above the current one — no icon font to load,
// legible at a glance.
function Label({ focused, children }: { focused: boolean; children: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: focused ? c.ink : 'transparent' }} />
      <Text style={{ fontFamily: f.uiBold, fontSize: 12.5, color: focused ? c.ink : c.faint }}>{children}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.rule, height: 58 + insets.bottom, paddingBottom: insets.bottom },
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarLabel: ({ focused, children }) => <Label focused={focused}>{children}</Label>,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Bridge' }} />
      <Tabs.Screen name="watch" options={{ title: 'Watch' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}

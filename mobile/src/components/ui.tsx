// Starlane mobile UI kit — the same tokens as desktop (packages/contracts),
// set for one hand: a paper background, one serif sentence per screen, figures
// in mono, and state colours only for state.
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { asOf, healthLabel, healthTone, tokens } from '@starlane/contracts';
import type { Resource } from '../lib/useResource';

export const c = tokens.color;
export const f = {
  display: 'Fraunces_400Regular',
  ui: 'PlusJakartaSans_400Regular',
  uiMedium: 'PlusJakartaSans_500Medium',
  uiBold: 'PlusJakartaSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
};

export function T({ children, style, v = 'body', numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; v?: keyof typeof text; numberOfLines?: number }) {
  return <Text style={[text[v], style]} numberOfLines={numberOfLines}>{children}</Text>;
}

const text = StyleSheet.create({
  sentence: { fontFamily: f.display, fontSize: 28, lineHeight: 35, color: c.ink, letterSpacing: -0.3 },
  title: { fontFamily: f.display, fontSize: 24, lineHeight: 30, color: c.ink },
  heading: { fontFamily: f.uiBold, fontSize: 14, lineHeight: 19, color: c.ink },
  body: { fontFamily: f.ui, fontSize: 15, lineHeight: 22, color: c.ink },
  medium: { fontFamily: f.uiMedium, fontSize: 15, lineHeight: 21, color: c.ink },
  small: { fontFamily: f.ui, fontSize: 13, lineHeight: 18, color: c.graphite },
  eyebrow: { fontFamily: f.monoMedium, fontSize: 11, lineHeight: 14, color: c.graphite, letterSpacing: 0.4, textTransform: 'uppercase' },
  figure: { fontFamily: f.monoMedium, fontSize: 20, lineHeight: 26, color: c.ink },
  mono: { fontFamily: f.mono, fontSize: 13, lineHeight: 18, color: c.ink },
  error: { fontFamily: f.ui, fontSize: 13, lineHeight: 18, color: c.bad },
});

/** Scrollable screen with pull-to-refresh and safe-area padding. */
export function Screen({ children, r, refresh, title, aside }: { children: ReactNode; r?: Resource<unknown>; refresh?: () => Promise<unknown>; title?: string; aside?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const onRefresh = refresh || r?.reload;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 40, paddingHorizontal: 18, gap: 18 }}
      refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={() => void onRefresh()} tintColor={c.graphite} /> : undefined}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T v="title" style={{ flex: 1 }}>{title}</T>
          {aside}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: c.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.rule, overflow: 'hidden' }, style]}>{children}</View>;
}

export function Row({ title, sub, onPress, left, right, first }: { title: string; sub?: string | null; onPress?: () => void; left?: ReactNode; right?: ReactNode; first?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth * 2, borderTopColor: c.rule, backgroundColor: pressed ? c.sunk : 'transparent', minHeight: 56 }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="medium" numberOfLines={2}>{title}</T>
        {sub ? <T v="small" numberOfLines={2}>{sub}</T> : null}
      </View>
      {right ?? (onPress ? <T v="small" style={{ color: c.faint, fontSize: 18 }}>›</T> : null)}
    </Pressable>
  );
}

export function RiskBar({ level }: { level: string }) {
  return <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: level === 'high' ? c.bad : level === 'medium' ? '#C7962F' : c.ruleStrong }} />;
}

type Tone = 'ok' | 'warn' | 'bad' | 'accent' | 'muted';
const toneColors: Record<Tone, [string, string]> = { ok: [c.okSoft, c.ok], warn: [c.warnSoft, c.warn], bad: [c.badSoft, c.bad], accent: [c.accentSoft, c.accent], muted: [c.sunk, c.graphite] };
export function Chip({ label, tone = 'muted' }: { label: string; tone?: Tone }) {
  const [bg, fg] = toneColors[tone];
  return <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ fontFamily: f.uiMedium, fontSize: 12, color: fg }}>{label}</Text></View>;
}
export const Health = ({ health }: { health: string }) => <Chip label={healthLabel(health)} tone={(healthTone[health] || 'muted') as Tone} />;

export function Button({ label, onPress, kind = 'primary', busy, disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [{
        height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18,
        backgroundColor: primary ? c.ink : c.surface, borderWidth: primary ? 0 : 1, borderColor: kind === 'danger' ? '#E3C4C4' : c.ruleStrong,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      }]}
    >
      {busy ? <ActivityIndicator color={primary ? c.paper : c.ink} /> : null}
      <Text style={{ fontFamily: f.uiBold, fontSize: 15, color: primary ? c.paper : kind === 'danger' ? c.bad : c.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <View style={{ padding: 16, gap: 4 }}><T v="medium">{title}</T>{children ? <T v="small">{children}</T> : null}</View>;
}

export function Loaded<D>({ r, children }: { r: Resource<D>; children: (d: D) => ReactNode }) {
  if (r.data === undefined) {
    if (r.loading) return <View style={{ padding: 24 }}><ActivityIndicator color={c.graphite} /></View>;
    if (r.error) {
      return (
        <Card style={{ padding: 16, gap: 12 }}>
          <T v="error">{r.offline ? 'Starlane cannot be reached. Check your connection.' : r.error.message}</T>
          <Button label="Try again" kind="secondary" onPress={() => void r.reload()} />
        </Card>
      );
    }
    return null;
  }
  return <>{children(r.data)}</>;
}

export function Stale({ r }: { r: Resource<unknown> }) {
  if (!r.error || r.data === undefined) return null;
  return <Chip tone="warn" label={`${r.offline ? 'Offline' : 'Not refreshed'} · ${asOf(r.fetchedAt)}`} />;
}

export function Section({ title, count, children }: { title: string; count?: number | string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
        <T v="heading">{title}</T>
        {count !== undefined ? <T v="mono" style={{ color: c.graphite, fontSize: 12 }}>{String(count)}</T> : null}
      </View>
      {children}
    </View>
  );
}

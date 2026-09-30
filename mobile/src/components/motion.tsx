// Motion for the phone app — the same rules as desktop (desktop/src/ui.tsx):
// motion only when something means something (a value changed, work is
// happening, a decision landed), 150–600 ms, ease-out, and nothing at all when
// the phone's Reduce Motion setting is on. Haptics confirm a decision the way a
// physical switch does: one short tick for success, a double for a problem.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Text, View, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { c, f } from './ui';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

const easeOut = Easing.bezier(0.2, 0.7, 0.2, 1);

/** Counts from the previous value to the new one, only when it changes. Tabular figures keep commas still. */
export function Figure({ value, format, style }: { value: number; format: (n: number) => string; style?: TextStyle }) {
  const reduced = useReducedMotion();
  const prev = useRef<number | null>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === null || from === value || reduced) { setShown(value); return; }
    let raf = 0; const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / 600);
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <Text style={[{ fontFamily: f.monoMedium, fontVariant: ['tabular-nums'] }, style]}>{format(Number.isInteger(value) ? Math.round(shown) : shown)}</Text>;
}

/** A proportion bar that grows from the left. */
export function Bar({ ratio, color = c.ink, label }: { ratio: number; color?: string; label?: string }) {
  const reduced = useReducedMotion();
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const w = useRef(new Animated.Value(reduced ? r : 0)).current;
  useEffect(() => {
    if (reduced) { w.setValue(r); return; }
    Animated.timing(w, { toValue: r, duration: 600, easing: easeOut, useNativeDriver: false }).start();
  }, [r, reduced, w]);
  return (
    <View accessible={!!label} accessibilityLabel={label} style={{ height: 6, borderRadius: 3, backgroundColor: c.sunk, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** Three dots rising in turn: working, without pretending to know how long. */
export function TypingDots() {
  const reduced = useReducedMotion();
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (reduced) return;
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(d, { toValue: 1, duration: 330, easing: easeOut, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 330, easing: easeOut, useNativeDriver: true }),
      Animated.delay(440 - i * 150),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View accessible accessibilityLabel="Starlane is looking this up" style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.faint,
          opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }} />
      ))}
    </View>
  );
}

/** A check that springs in once, with a success tick on devices that have haptics. */
export function DoneCheck() {
  const reduced = useReducedMotion();
  const s = useRef(new Animated.Value(reduced ? 1 : 0.4)).current;
  useEffect(() => {
    if (!reduced) Animated.spring(s, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
  }, [reduced, s]);
  return (
    <Animated.View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.okSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: s }] }}>
      <Text style={{ color: c.ok, fontFamily: f.uiBold, fontSize: 13 }}>✓</Text>
    </Animated.View>
  );
}

export const haptic = {
  success: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};

// SIMULATE on the phone: expected collection with each assumption visible and
// adjustable in steps of 5 points; facts, assumptions and estimates labelled.
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SIM_SOURCE_LABEL, type BandId, type Simulation } from '@starlane/contracts';
import { api } from '../lib/api';
import { Card, Empty, Screen, Section, T, c } from '../components/ui';
import { Bar } from '../components/motion';
import { Back, FactLine, KindChip, rupees } from '../components/feature';

export default function SimulateScreen() {
  const { mission } = useLocalSearchParams<{ mission?: string }>();
  const [horizon, setHorizon] = useState(30);
  const [rates, setRates] = useState<Partial<Record<BandId, number>>>({});
  const [out, setOut] = useState<{ simulation: Simulation | null; emptyReason: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      void api.simulateCash({ horizonDays: horizon, rates, ...(mission ? { missionId: String(mission) } : {}) }).then((r) => live && setOut(r)).catch((e) => live && setErr((e as Error).message));
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [horizon, rates, mission]);
  const sim = out?.simulation;
  const nudge = (band: BandId, cur: number, d: number) => setRates((r) => ({ ...r, [band]: Math.max(0, Math.min(1, Math.round((cur + d) * 20) / 20)) }));
  const stepBtn = (label: string, onPress: () => void) => (
    <Pressable accessibilityLabel={label} onPress={onPress} style={{ width: 38, height: 34, borderRadius: 8, borderWidth: 1, borderColor: c.ruleStrong, alignItems: 'center', justifyContent: 'center' }}><T>{label === 'Lower' ? '−' : '+'}</T></Pressable>
  );
  return (
    <Screen title="Simulate">
      <Back />
      <T v="small">{mission ? 'What is left of this mission, ' : 'Everything you are owed, '}over the next {horizon} days. Nothing here touches your books.</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[14, 30, 60].map((d) => (
          <Pressable key={d} onPress={() => setHorizon(d)} style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: horizon === d ? c.ink : c.surface, borderWidth: 1, borderColor: horizon === d ? c.ink : c.ruleStrong }}>
            <T v="medium" style={{ color: horizon === d ? c.paper : c.ink, fontSize: 14 }}>{d} days</T>
          </Pressable>
        ))}
      </View>
      {err ? <T v="error">{err}</T> : null}
      {out && !sim ? <Card><Empty title="Nothing to simulate yet.">{out.emptyReason}</Empty></Card> : null}
      {sim ? (
        <>
          <Section title="Estimate">
            <Card style={{ padding: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="figure" style={{ flex: 1 }}>{rupees(sim.estimate.expected.value)}</T><KindChip kind="estimate" /></View>
              <T v="small">{sim.estimate.expected.label} · range {rupees(sim.estimate.range.low)} – {rupees(sim.estimate.range.high)}</T>
              {sim.target ? <T v={sim.target.reach === 'unlikely' ? 'error' : 'small'}>Target {rupees(sim.target.amount)}: {sim.target.text}</T> : null}
            </Card>
          </Section>
          <Section title="Assumptions">
            <Card>
              {sim.assumptions.filter((a) => sim.bands.find((b) => b.band === a.band)?.count).map((a, i) => {
                const band = sim.bands.find((b) => b.band === a.band)!;
                return (
                  <View key={a.band} style={{ padding: 14, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.rule }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flex: 1 }}><T v="medium">{a.label}: {Math.round(a.rate * 100)}% paid</T><T v="small">{SIM_SOURCE_LABEL[a.source]}</T></View>
                      {stepBtn('Lower', () => nudge(a.band, a.rate, -0.05))}
                      {stepBtn('Higher', () => nudge(a.band, a.rate, 0.05))}
                    </View>
                    <Bar ratio={a.rate} color={c.ok} label={`${rupees(band.expected)} of ${rupees(band.amount)}`} />
                    <T v="small">{rupees(band.expected)} of {rupees(band.amount)} expected</T>
                  </View>
                );
              })}
            </Card>
            {sim.caveat ? <T v="small" style={{ color: c.faint }}>{sim.caveat}</T> : null}
          </Section>
          <Section title="From your books"><Card>{sim.facts.map((fct, i) => <FactLine key={i} f={fct} first={i === 0} />)}</Card></Section>
        </>
      ) : null}
    </Screen>
  );
}

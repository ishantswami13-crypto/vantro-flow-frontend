// Scan a customer: why they matter, with evidence, and the next step.
import { useLocalSearchParams } from 'expo-router';
import type { CustomerScan } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Loaded, Screen, T } from '../../components/ui';
import { Back } from '../../components/feature';
import { CustomerBody } from '../../components/CustomerBody';

export default function CustomerScanScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const r = useResource<CustomerScan>(`scan-c:${key}`, () => api.scanCustomer(String(key)));
  return (
    <Screen r={r}>
      <Back />
      <Loaded r={r}>{(s) => (<>
        <T v="eyebrow">Scan · Customer</T>
        <T v="title">{s.subject.name}</T>
        <T v="sentence" style={{ fontSize: 21, lineHeight: 28 }}>{s.headline}</T>
        <CustomerBody s={s} />
      </>)}</Loaded>
    </Screen>
  );
}

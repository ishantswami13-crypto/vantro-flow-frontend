// Scan an invoice: the invoice as recorded, then its customer's picture.
import { useLocalSearchParams } from 'expo-router';
import type { InvoiceScan } from '@starlane/contracts';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { Loaded, Screen, T } from '../../components/ui';
import { Back, EvidenceCard } from '../../components/feature';
import { CustomerBody } from '../../components/CustomerBody';

export default function InvoiceScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useResource<InvoiceScan>(`scan-i:${id}`, () => api.scanInvoice(String(id)));
  return (
    <Screen r={r}>
      <Back />
      <Loaded r={r}>{(s) => (<>
        <T v="eyebrow">Scan · Invoice {s.subject.invoiceNumber || ''}</T>
        <T v="title">{s.subject.customer}</T>
        <T v="sentence" style={{ fontSize: 21, lineHeight: 28 }}>{s.headline}</T>
        {s.customer ? <CustomerBody s={s.customer} /> : null}
        <EvidenceCard ev={s.evidence} title="This invoice" />
      </>)}</Loaded>
    </Screen>
  );
}

// PREPARED — what is coming in the next 24 hours, 7 days and 30 days, worked
// out from dates in your books. Each item says why it is here and what it was
// worked out from; a horizon your data cannot support says so.
import { type PreparedHorizon } from '@starlane/contracts';
import { api } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Chevron, Empty, Loaded, Page, Stale, inrShort } from '../ui';

const KIND: Record<string, string> = {
  invoices_due: 'Falling due', crossing_band: 'About to slip', promise_due: 'Promise due', mission_ending: 'Mission ends', decisions_waiting: 'Waiting on you',
};

export function PreparedScreen() {
  const r = useResource<{ horizons: PreparedHorizon[] }>('prepared', () => api().prepared(), { pollMs: 5 * 60_000 });
  const { go } = useRouter();
  return (
    <Page title="Prepared" aside={<Stale r={r} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '68ch' }}>Starlane looks ahead so nothing arrives as a surprise: what falls due, who is about to slip into a worse overdue band, promises coming due, missions ending.</p>
      <Loaded r={r}>
        {(d) => (
          <div style={{ display: 'grid', gap: 22, marginTop: 18 }}>
            {d.horizons.map((h) => (
              <section key={h.horizon}>
                <h2 className="section">{h.label} <span className="n">{h.items.length || ''}</span></h2>
                <div className="panel">
                  {h.items.length === 0 ? (
                    <Empty title={h.status === 'insufficient_data' ? 'Not enough data to prepare this.' : 'Nothing due in this window.'}>{h.note}</Empty>
                  ) : (
                    <ul className="rows">
                      {h.items.map((i) => (
                        <li key={i.id}>
                          <button className="row" onClick={() => go(i.route)}>
                            <span className="eyebrow" style={{ width: 92 }}>{KIND[i.kind] || i.kind}</span>
                            <span style={{ minWidth: 0 }}>
                              <div className="t">{i.title}</div>
                              <div className="s">{i.reason}{i.customers?.length ? ` · ${i.customers.join(', ')}` : ''}</div>
                            </span>
                            {i.amount != null ? <span className="fig">{inrShort(i.amount)}</span> : <Chevron />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </Loaded>
    </Page>
  );
}

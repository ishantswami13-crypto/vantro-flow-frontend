// SIMULATE — what is likely to come in, and what if. Facts from the books,
// assumptions you can change, estimates that follow from them — each shown
// as what it is. Starlane's starting assumptions are marked as such; where
// your own paid invoices give enough history, that is used instead.
import { useEffect, useState } from 'react';
import { SIM_SOURCE_LABEL, type BandId, type Mission, type Simulation } from '@starlane/contracts';
import { api } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Bar, Empty, FactRow, Figure, KindTag, Page, Spinner, inrShort } from '../ui';

export function SimulateScreen({ missionId: initialMission }: { missionId?: string | null }) {
  const missions = useResource<Mission[]>('missions', () => api().missions());
  const [missionId, setMissionId] = useState<string>(initialMission || '');
  const [horizon, setHorizon] = useState(30);
  const [rates, setRates] = useState<Partial<Record<BandId, number>>>({});
  const [out, setOut] = useState<{ simulation: Simulation | null; emptyReason: string | null; invoiceCount: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { go } = useRouter();

  useEffect(() => {
    let live = true; setLoading(true);
    const t = setTimeout(() => {
      void api().simulateCash({ horizonDays: horizon, rates, ...(missionId ? { missionId } : {}) })
        .then((r) => { if (live) { setOut(r); setErr(null); } }).catch((e) => live && setErr((e as Error).message)).finally(() => live && setLoading(false));
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [horizon, rates, missionId]);

  const sim = out?.simulation;
  const open = (missions.data || []).filter((m) => m.status === 'active' || m.status === 'paused');
  return (
    <Page title="Simulate">
      <p className="muted" style={{ marginTop: -8, maxWidth: '68ch' }}>What is likely to be collected, and how that changes if customers pay better or worse than assumed. Change any assumption; nothing here touches your books.</p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap', margin: '16px 0 20px' }}>
        <div className="field" style={{ minWidth: 260 }}>
          <label htmlFor="scope">What to simulate</label>
          <select id="scope" className="input" value={missionId} onChange={(e) => { setMissionId(e.target.value); setRates({}); }}>
            <option value="">Everything you are owed</option>
            {open.map((m) => <option key={m.id} value={m.id}>Mission: {m.title}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 240 }}>
          <label htmlFor="h">Over the next {horizon} days</label>
          <input id="h" type="range" min={7} max={90} step={1} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} />
        </div>
        {Object.keys(rates).length ? <button className="btn ghost sm" onClick={() => setRates({})}>Reset assumptions</button> : null}
        {loading ? <Spinner label="Recalculating…" /> : null}
      </div>
      {err ? <div className="err">{err}</div> : null}
      {out && !sim ? <div className="panel"><Empty title="Nothing to simulate yet.">{out.emptyReason}<div><button className="btn sm" style={{ marginTop: 10 }} onClick={() => go('/sources')}>Connect a source</button></div></Empty></div> : null}
      {sim ? (
        <div className="grid-now" style={{ marginTop: 0 }}>
          <section className="stack">
            <div>
              <h2 className="section">Estimate <KindTag kind="estimate" /></h2>
              <div className="figures">
                <div className="figure"><div className="eyebrow">{sim.estimate.expected.label}</div><div className="v"><Figure value={sim.estimate.expected.value} format={inrShort} /></div><div className="small muted">range {inrShort(sim.estimate.range.low)} – {inrShort(sim.estimate.range.high)}</div></div>
                <div className="figure"><div className="eyebrow">{sim.estimate.stillOwed.label}</div><div className="v"><Figure value={sim.estimate.stillOwed.value} format={inrShort} /></div><div className="small muted">if the assumptions hold</div></div>
              </div>
              {sim.target ? <div className={`banner ${sim.target.reach === 'likely' ? 'ok' : sim.target.reach === 'possible' ? 'warn' : 'bad'}`} style={{ borderRadius: 8, marginTop: 12 }}>Mission target {inrShort(sim.target.amount)} (what is left to collect): {sim.target.text}</div> : null}
              <div className="compare" style={{ marginTop: 16 }}>
                {sim.bands.filter((b) => b.count).map((b) => (
                  <div className="compare-row" key={b.band} style={{ gridTemplateColumns: '96px minmax(0,1fr) auto' }}>
                    <span>{b.label}</span>
                    <span style={{ position: 'relative', display: 'block' }}>
                      <Bar ratio={1} tone="faint" label={`${inrShort(b.amount)} owed`} />
                      <span style={{ position: 'absolute', inset: 0 }}><Bar ratio={b.rate} tone="ok" label={`${inrShort(b.expected)} expected`} /></span>
                    </span>
                    <span className="fig small" style={{ whiteSpace: 'nowrap' }}>{inrShort(b.expected)} of {inrShort(b.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="small faint" style={{ marginTop: 8 }}>{sim.method}</div>
            </div>
            <div>
              <h2 className="section">From your books <KindTag kind="fact" /></h2>
              <div className="panel">{sim.facts.map((f, i) => <FactRow key={i} f={f} />)}</div>
            </div>
          </section>
          <section className="stack">
            <div>
              <h2 className="section">Assumptions <KindTag kind="assumption" /></h2>
              <div className="panel">
                {sim.assumptions.map((a) => (
                  <div className="fact" key={a.band} style={{ gridTemplateColumns: 'minmax(0,1fr) 150px 44px' }}>
                    <span>
                      <div>Paid within {sim.horizonDays} days if {a.label.toLowerCase()}</div>
                      <div className="small faint">{SIM_SOURCE_LABEL[a.source]}{a.sample ? ` (${a.sample} invoices)` : ''}</div>
                    </span>
                    <input type="range" min={0} max={100} value={Math.round(a.rate * 100)} aria-label={`Assumed rate for ${a.label}`}
                      onChange={(e) => setRates((r) => ({ ...r, [a.band]: Number(e.target.value) / 100 }))} />
                    <span className="fig">{Math.round(a.rate * 100)}%</span>
                  </div>
                ))}
              </div>
              {sim.caveat ? <div className="small faint" style={{ marginTop: 8 }}>{sim.caveat}</div> : null}
            </div>
          </section>
        </div>
      ) : null}
    </Page>
  );
}

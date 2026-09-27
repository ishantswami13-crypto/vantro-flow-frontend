// SCAN — look into anything and see why. Search a customer or an invoice for
// an explanation built from your records (every fact labelled), or ask a
// question in words. Scan reads; it never changes anything (the assistant is
// read-only for app sessions on the server, not just in this screen).
import { useEffect, useRef, useState } from 'react';
import { OfflineError, ago, type CustomerScan, type InvoiceScan, type ScanSearch } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { ActionList, Chevron, EvidencePanel, Empty, Loaded, Page, Spinner, TypingDots, inrShort } from '../ui';

interface Turn { role: 'user' | 'assistant'; content: string }
const STARTERS = ['Who owes me the most right now?', 'Which customers are more than 30 days overdue?', 'What does cash look like for the next 30 days?'];

export function ScanScreen({ businessName }: { businessName: string | null }) {
  const { go } = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ScanSearch | null>(null);
  const [searching, setSearching] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || (term.includes(' ') && term.length > 24)) { setHits(null); return; }
    let live = true; setSearching(true);
    const t = setTimeout(() => { void api().scanSearch(term).then((h) => live && setHits(h)).catch(() => live && setHits(null)).finally(() => live && setSearching(false)); }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next); setQ(''); setHits(null); setBusy(true); setErr(null);
    track('client.ask_submitted', { screen: 'scan' });
    try {
      const reply = await api().ask(next.map(({ role, content }) => ({ role, content })), businessName);
      setTurns([...next, { role: 'assistant', content: reply.message || '(no answer)' }]);
    } catch (e) {
      setErr(e instanceof OfflineError ? 'Starlane cannot be reached. Your question was not sent.' : (e as Error).message);
      setTurns(turns); setQ(question);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  const found = hits && (hits.customers.length || hits.invoices.length);
  return (
    <Page title="Scan">
      <p className="muted" style={{ marginTop: -8, maxWidth: '66ch' }}>Type a customer or invoice number to see why it matters, with the evidence. Or ask a question — answers come from your records, and Scan cannot change anything.</p>
      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input className="input" autoFocus placeholder="Mehta Hardware, S/101, or “who is slipping this month?”" value={q} onChange={(e) => setQ(e.target.value)} maxLength={2000} aria-label="Scan" />
        <button className="btn primary" disabled={busy || !q.trim()}>Ask</button>
      </form>
      {searching ? <div style={{ marginTop: 10 }}><Spinner label="Searching your records…" /></div> : null}
      {found ? (
        <div className="panel fade-in" style={{ marginTop: 12 }}>
          <ul className="rows">
            {hits!.customers.map((c) => (
              <li key={c.key}><button className="row" onClick={() => go(`/scan/customer/${encodeURIComponent(c.key)}`)}><span className="eyebrow">Customer</span>
                <span style={{ minWidth: 0 }}><div className="t">{c.name}</div><div className="s">{c.openCount} open · oldest {c.oldestDays} days overdue</div></span><span className="fig">{inrShort(c.openTotal)}</span></button></li>
            ))}
            {hits!.invoices.map((i) => (
              <li key={i.id}><button className="row" onClick={() => go(`/scan/invoice/${i.id}`)}><span className="eyebrow">Invoice</span>
                <span style={{ minWidth: 0 }}><div className="t">{i.invoiceNumber} · {i.customer}</div><div className="s">{i.daysOverdue > 0 ? `${i.daysOverdue} days overdue` : 'Not yet due'}</div></span><span className="fig">{inrShort(i.amount)}</span></button></li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="ask-log" style={{ marginTop: 20 }}>
        {turns.length === 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{STARTERS.map((s) => <button key={s} className="btn sm" onClick={() => void ask(s)}>{s}</button>)}</div>
        ) : turns.map((t, i) => <div key={i} className={`bubble ${t.role} fade-in`}>{t.content}</div>)}
        {busy ? <div className="bubble assistant fade-in"><TypingDots label="Starlane is looking this up" /></div> : null}
        <div ref={end} />
      </div>
      {err ? <div className="err" style={{ marginTop: 8 }}>{err}</div> : null}
    </Page>
  );
}

function CustomerBody({ s }: { s: CustomerScan }) {
  const { go } = useRouter();
  return (
    <div className="grid-now" style={{ marginTop: 6 }}>
      <section className="stack">
        <div>
          <h2 className="section">Why</h2>
          <div className="panel">{s.why.map((w, i) => <div className="fact" key={i} style={{ gridTemplateColumns: '1fr' }}><span>{w}</span></div>)}</div>
        </div>
        <EvidencePanel ev={s.evidence} />
        <div>
          <h2 className="section">Open invoices</h2>
          <div className="panel"><ul className="rows">{s.invoices.map((i) => (
            <li key={i.id}><button className="row" onClick={() => go(`/scan/invoice/${i.id}`)}><span className={`risk ${i.daysOverdue > 30 ? 'high' : i.daysOverdue > 7 ? 'medium' : 'low'}`} />
              <span style={{ minWidth: 0 }}><div className="t">{i.invoiceNumber || 'No number'}{i.disputed ? ' · disputed' : ''}</div><div className="s">{i.daysOverdue > 0 ? `${i.daysOverdue} days overdue` : 'Not yet due'}{i.dueDate ? ` · due ${i.dueDate}` : ''}</div></span>
              <span className="fig">{inrShort(i.amount)}</span></button></li>
          ))}</ul></div>
        </div>
      </section>
      <section className="stack">
        <div className="panel panel-pad" style={{ display: 'grid', gap: 10 }}>
          {s.nextStep ? <div className="small"><span className="muted">Next step: </span>{s.nextStep.stage.replace(/_/g, ' ').toLowerCase()}. <span className="muted">{s.nextStep.text}</span></div> : null}
          {s.missions.length ? <button className="btn" onClick={() => go(`/missions/${s.missions[0].id}`)}>Open mission: {s.missions[0].title}</button>
            : <button className="btn primary" onClick={() => go(`/missions/new?customer=${encodeURIComponent(s.subject.name)}`)}>Start a mission to collect</button>}
          <button className="btn ghost" onClick={() => go('/memory')}>What Starlane remembers</button>
        </div>
        <div>
          <h2 className="section">Actions</h2>
          <div className="panel"><ActionList actions={s.actions} onOpen={(id) => go(`/actions/${id}`)} empty={<Empty title="No actions yet." />} /></div>
        </div>
        {s.watch.length ? (
          <div>
            <h2 className="section">In Watch</h2>
            <div className="panel"><ul className="rows">{s.watch.map((e) => <li key={e.id}><button className="row" onClick={() => go(`/watch/${e.id}`)}><span /><span style={{ minWidth: 0 }}><div className="t">{e.title}</div><div className="s">{e.state} · {ago(e.lastSeenAt)}</div></span><Chevron /></button></li>)}</ul></div>
          </div>
        ) : null}
        {s.memory.length ? (
          <div>
            <h2 className="section">Remembered</h2>
            <div className="panel">{s.memory.map((m) => <div className="fact" key={m.id} style={{ gridTemplateColumns: '1fr auto' }}><span>{m.statement}</span><span className={`kind ${m.status === 'inferred' ? 'model' : 'fact'}`}>{m.status}</span></div>)}</div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ScanCustomerScreen({ customerKey }: { customerKey: string }) {
  const r = useResource<CustomerScan>(`scan-c:${customerKey}`, () => api().scanCustomer(customerKey));
  const { back } = useRouter();
  useEffect(() => { track('client.evidence_opened', { screen: 'scan' }); }, [customerKey]);
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>{(s) => (<>
        <div className="eyebrow">Scan · Customer</div>
        <h1 className="page-title" style={{ margin: '10px 0 4px' }}>{s.subject.name}</h1>
        <p className="sentence" style={{ fontSize: 22, lineHeight: '30px', maxWidth: '44ch', marginBottom: 18 }}>{s.headline}</p>
        <CustomerBody s={s} />
      </>)}</Loaded>
    </div>
  );
}

export function ScanInvoiceScreen({ id }: { id: string }) {
  const r = useResource<InvoiceScan>(`scan-i:${id}`, () => api().scanInvoice(id));
  const { back, go } = useRouter();
  useEffect(() => { track('client.evidence_opened', { screen: 'scan' }); }, [id]);
  return (
    <div className="page fade-in">
      <button className="btn ghost sm" onClick={back} style={{ marginLeft: -10, marginBottom: 12 }}>‹ Back</button>
      <Loaded r={r}>{(s) => (<>
        <div className="eyebrow">Scan · Invoice {s.subject.invoiceNumber || ''}</div>
        <h1 className="page-title" style={{ margin: '10px 0 4px' }}>
          <button className="btn ghost" style={{ font: 'inherit', padding: 0 }} onClick={() => go(`/scan/customer/${encodeURIComponent(s.subject.customerKey)}`)}>{s.subject.customer}</button>
        </h1>
        <p className="sentence" style={{ fontSize: 22, lineHeight: '30px', maxWidth: '44ch', marginBottom: 18 }}>{s.headline}</p>
        <EvidencePanel ev={s.evidence} title="This invoice" />
        {s.customer ? <div style={{ marginTop: 26 }}><h2 className="section" style={{ fontSize: 15 }}>{s.customer.headline}</h2><CustomerBody s={s.customer} /></div> : null}
      </>)}</Loaded>
    </div>
  );
}

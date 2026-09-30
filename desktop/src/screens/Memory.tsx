// MEMORY — what Starlane has learned about your business, where each thing
// came from, and whether you agree. Inferred things can be confirmed,
// corrected in your own words, or removed (and are then never re-inferred).
import { useState } from 'react';
import { MEMORY_STATUS_LABEL, ago, type MemoryRecord } from '@starlane/contracts';
import { api } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Empty, Loaded, Page, Stale } from '../ui';

const SOURCE: Record<string, string> = { your_books: 'Worked out from your books', mission: 'From a mission’s result', you: 'Written by you' };

export function MemoryScreen() {
  const [removed, setRemoved] = useState(false);
  const r = useResource<MemoryRecord[]>(`memory:${removed}`, () => api().memory(removed));
  const [note, setNote] = useState('');
  const [subject, setSubject] = useState('');
  const [err, setErr] = useState<string | null>(null);
  async function add() {
    setErr(null);
    try { await api().remember(note, subject || undefined); setNote(''); setSubject(''); await r.reload(); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <Page title="Memory" aside={<Stale r={r} />}>
      <p className="muted" style={{ marginTop: -8, maxWidth: '68ch' }}>What Starlane knows about how your customers pay and how your missions went. Inferred things are Starlane’s reading of your books — confirm them, correct them in your words, or remove them.</p>
      <div className="tabs" role="tablist" style={{ marginTop: 14 }}>
        <button className="tab" role="tab" aria-selected={!removed} onClick={() => setRemoved(false)}>Remembered</button>
        <button className="tab" role="tab" aria-selected={removed} onClick={() => setRemoved(true)}>Removed</button>
      </div>
      <Loaded r={r}>
        {(list) => list.length === 0 ? (
          <div className="panel"><Empty title={removed ? 'Nothing removed.' : 'Nothing remembered yet.'}>{removed ? null : 'Starlane learns a customer’s payment timing once it has at least three paid invoices with due and payment dates. You can also write things down below.'}</Empty></div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>{list.map((m) => <Record key={m.id} m={m} onChange={() => void r.reload()} />)}</div>
        )}
      </Loaded>
      {!removed ? (
        <div className="panel panel-pad" style={{ marginTop: 22, display: 'grid', gap: 10, maxWidth: 680 }}>
          <div className="t" style={{ fontWeight: 500 }}>Tell Starlane something</div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', gap: 8 }}>
            <input className="input" placeholder="About (customer, optional)" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="About" />
            <input className="input" placeholder="e.g. Call the accountant, not the owner" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} aria-label="What to remember" />
          </div>
          <div><button className="btn sm" disabled={note.trim().length < 3} onClick={() => void add()}>Remember</button></div>
          {err ? <div className="err">{err}</div> : null}
        </div>
      ) : null}
    </Page>
  );
}

function Record({ m, onChange }: { m: MemoryRecord; onChange: () => void }) {
  const { go } = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.statement);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function decide(verb: 'confirm' | 'correct' | 'remove') {
    setBusy(true); setErr(null);
    try { await api().memoryDecide(m.id, verb, verb === 'correct' ? text : undefined); setEditing(false); onChange(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const tone = m.status === 'inferred' ? 'accent' : m.status === 'removed' ? '' : 'ok';
  return (
    <div className="panel panel-pad fade-in" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="eyebrow">{m.subject.label}</span>
        <span className={`chip ${tone}`}>{MEMORY_STATUS_LABEL[m.status]}</span>
        {m.freshness === 'stale' ? <span className="chip warn">Not rechecked in 30 days</span> : null}
        {m.freshness === 'changed_since_confirmed' ? <span className="chip warn">Your books have changed since you confirmed this</span> : null}
        <span className="small faint" style={{ marginLeft: 'auto' }}>{ago(m.updatedAt)}</span>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} aria-label="Corrected statement" autoFocus />
          <button className="btn primary sm" disabled={busy || text.trim().length < 3} onClick={() => void decide('correct')}>Save</button>
          <button className="btn ghost sm" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : <div style={{ fontSize: 15 }}>{m.statement}</div>}
      <div className="small muted">
        {SOURCE[m.provenance.source] || m.provenance.source}{m.provenance.method ? ` · ${m.provenance.method}` : ''}{m.provenance.sampleSize ? ` · ${m.provenance.sampleSize} invoices` : ''}
        {m.provenance.correctedFrom ? <> · Starlane had said: “{m.provenance.correctedFrom}”</> : null}
      </div>
      {m.status !== 'removed' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {m.status === 'inferred' ? <button className="btn sm" disabled={busy} onClick={() => void decide('confirm')}>That’s right</button> : null}
          {!editing ? <button className="btn sm" disabled={busy} onClick={() => setEditing(true)}>Correct</button> : null}
          <button className="btn ghost sm" disabled={busy} onClick={() => void decide('remove')}>Forget this</button>
          {m.subject.type === 'customer' ? <button className="btn ghost sm" onClick={() => go(`/scan/customer/${encodeURIComponent(m.subject.key)}`)}>Scan {m.subject.label}</button> : null}
        </div>
      ) : null}
      {err ? <div className="err">{err}</div> : null}
    </div>
  );
}

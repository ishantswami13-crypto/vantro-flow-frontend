// Ask Starlane — questions answered from this company's own records through
// the backend's tools. In the apps it is read-only by construction (the server
// gives native sessions look-up tools only); changes happen in Decisions.
import { useRef, useState } from 'react';
import { OfflineError } from '@starlane/contracts';
import { api, track } from '../api';
import { Page, TypingDots } from '../ui';

interface Turn { role: 'user' | 'assistant'; content: string; actions?: string[] }

const STARTERS = ['Who owes me the most right now?', 'Which customers are more than 30 days overdue?', 'What does cash look like for the next 30 days?'];

export function AskScreen({ businessName }: { businessName: string | null }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: question }];
    setTurns(next); setText(''); setBusy(true); setErr(null);
    track('client.ask_submitted', { screen: 'ask' });
    try {
      const reply = await api().ask(next.map(({ role, content }) => ({ role, content })), businessName);
      setTurns([...next, { role: 'assistant', content: reply.message || '(no answer)', actions: reply.actions }]);
    } catch (e) {
      setErr(e instanceof OfflineError ? 'Starlane cannot be reached. Your question was not sent.' : (e as Error).message);
      setTurns(turns);
      setText(question);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <Page title="Ask Starlane">
      <p className="muted" style={{ marginTop: -8, maxWidth: '64ch' }}>Answers come from your own records. Starlane says so when it does not have the data, and it cannot change anything from here.</p>
      <div className="ask-log" style={{ marginTop: 18 }}>
        {turns.length === 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STARTERS.map((s) => <button key={s} className="btn sm" onClick={() => void send(s)}>{s}</button>)}
          </div>
        ) : turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role} fade-in`}>
            {t.content}
            {t.actions?.length ? <div className="small muted" style={{ marginTop: 8 }}>{t.actions.join(' · ')}</div> : null}
          </div>
        ))}
        {busy ? <div className="bubble assistant fade-in"><TypingDots label="Starlane is looking this up" /></div> : null}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} style={{ display: 'flex', gap: 8, marginTop: 20, position: 'sticky', bottom: 16 }}>
        <input className="input" placeholder="Ask about your receivables, cash, stock…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Question" />
        <button className="btn primary" disabled={busy || !text.trim()}>Ask</button>
      </form>
      {err ? <div className="err" style={{ marginTop: 8 }}>{err}</div> : null}
    </Page>
  );
}

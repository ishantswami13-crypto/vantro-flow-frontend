// Inbox — the canonical notification feed (same records that become push
// notifications on mobile and native notifications here).
import { ago, type StarlaneNotification } from '@starlane/contracts';
import { api, track } from '../api';
import { useRouter } from '../lib/router';
import { useResource } from '../lib/useResource';
import { Chevron, Empty, Loaded, Page, Stale } from '../ui';

const SEV: Record<string, string> = { critical: 'high', high: 'high', normal: 'medium', low: 'low' };

export function InboxScreen({ onRead }: { onRead: () => void }) {
  const r = useResource<{ unread: number; notifications: StarlaneNotification[] }>('inbox', () => api().inbox(), { pollMs: 60_000 });
  const { go } = useRouter();
  async function open(n: StarlaneNotification) {
    track('client.notification_opened', { screen: 'inbox' });
    if (!n.readAt) { await api().markRead(n.id).catch(() => {}); onRead(); }
    go(n.route);
  }
  return (
    <Page title="Inbox" aside={
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Stale r={r} />
        {r.data?.unread ? <button className="btn sm" onClick={() => void api().markAllRead().then(() => { onRead(); return r.reload(); })}>Mark all read</button> : null}
      </span>
    }>
      <div className="panel">
        <Loaded r={r}>
          {(d) => d.notifications.length === 0 ? <Empty title="Nothing yet.">Approvals, results and connector problems will show up here.</Empty> : (
            <ul className="rows">
              {d.notifications.map((n) => (
                <li key={n.id}>
                  <button className="row" onClick={() => void open(n)} style={n.readAt ? { opacity: .72 } : undefined}>
                    <span className={`risk ${SEV[n.severity] || 'low'}`} />
                    <span style={{ minWidth: 0 }}>
                      <div className="t">{!n.readAt ? <span className="dot accent" style={{ marginRight: 8, verticalAlign: 2 }} /> : null}{n.title}</div>
                      <div className="s">{n.body ? `${n.body} · ` : ''}{ago(n.createdAt)}</div>
                    </span>
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Loaded>
      </div>
    </Page>
  );
}

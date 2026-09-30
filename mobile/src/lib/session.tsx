// Signed-in state for the whole app. Bootstrap confirms the session and gives
// the organization; a revoked or expired session sends the user to sign-in.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { OfflineError, SessionEnded, type Bootstrap } from '@starlane/contracts';
import { api, onSessionEnded, track } from './api';
import { clearResourceCache } from './useResource';

type State = { status: 'loading' } | { status: 'signed_out' } | { status: 'signed_in'; boot: Bootstrap | null; offline: boolean };
interface Ctx { state: State; refresh: () => Promise<void>; signOut: () => Promise<void> }
const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const refresh = useCallback(async () => {
    if (!(await api.isSignedIn())) { setState({ status: 'signed_out' }); return; }
    try { setState({ status: 'signed_in', boot: await api.bootstrap(), offline: false }); }
    catch (e) {
      if (e instanceof SessionEnded) setState({ status: 'signed_out' });
      else if (e instanceof OfflineError) setState({ status: 'signed_in', boot: null, offline: true });
      else setState({ status: 'signed_in', boot: null, offline: false });
    }
  }, []);
  useEffect(() => {
    track('client.app_started');
    void refresh();
    return onSessionEnded(() => { track('client.session_expired'); clearResourceCache(); setState({ status: 'signed_out' }); });
  }, [refresh]);
  const signOut = useCallback(async () => { await api.logout(); clearResourceCache(); setState({ status: 'signed_out' }); }, []);
  return <SessionCtx.Provider value={{ state, refresh, signOut }}>{children}</SessionCtx.Provider>;
}
export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('SessionProvider missing');
  return c;
}

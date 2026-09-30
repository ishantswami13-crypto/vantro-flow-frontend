// Same contract as the desktop app: last good answer kept in memory only,
// with its time; offline shows it labelled instead of blanking.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { OfflineError, SessionEnded } from '@starlane/contracts';

const cache = new Map<string, { data: unknown; fetchedAt: string }>();
export const clearResourceCache = () => cache.clear();

export interface Resource<T> { data: T | undefined; error: Error | null; loading: boolean; offline: boolean; fetchedAt: string | null; reload: () => Promise<void> }

export function useResource<T>(key: string, fetcher: () => Promise<T>): Resource<T> {
  const hit = cache.get(key);
  const [data, setData] = useState<T | undefined>(hit?.data as T | undefined);
  const [fetchedAt, setFetchedAt] = useState<string | null>(hit?.fetchedAt ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!hit);
  const [offline, setOffline] = useState(false);
  const f = useRef(fetcher);
  f.current = fetcher;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const d = await f.current();
      const at = new Date().toISOString();
      cache.set(key, { data: d, fetchedAt: at });
      setData(d); setFetchedAt(at); setError(null); setOffline(false);
    } catch (e) {
      if (e instanceof SessionEnded) return;
      setOffline(e instanceof OfflineError); setError(e as Error);
    } finally { setLoading(false); }
  }, [key]);

  useEffect(() => {
    void reload();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void reload(); });
    return () => sub.remove();
  }, [reload]);

  return { data, error, loading, offline, fetchedAt, reload };
}

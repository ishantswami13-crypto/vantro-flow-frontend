// Data loading with honest staleness. The last good answer is kept in memory
// (never on disk) with the time it was fetched; when Starlane cannot be
// reached the screen keeps showing it, labelled "as of <time>", instead of
// blanking or pretending it is live.
import { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineError, SessionEnded } from '@starlane/contracts';

interface Entry { data: unknown; fetchedAt: string }
const cache = new Map<string, Entry>();
export const clearResourceCache = () => cache.clear();

export interface Resource<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  offline: boolean;
  fetchedAt: string | null;
  reload: () => Promise<void>;
}

export function useResource<T>(key: string | null, fetcher: () => Promise<T>, opts: { pollMs?: number } = {}): Resource<T> {
  const hit = key ? cache.get(key) : undefined;
  const [data, setData] = useState<T | undefined>(hit?.data as T | undefined);
  const [fetchedAt, setFetchedAt] = useState<string | null>(hit?.fetchedAt ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!hit && !!key);
  const [offline, setOffline] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const d = await fetcherRef.current();
      const at = new Date().toISOString();
      cache.set(key, { data: d, fetchedAt: at });
      setData(d); setFetchedAt(at); setError(null); setOffline(false);
    } catch (e) {
      if (e instanceof SessionEnded) return; // the app shell handles sign-out
      setOffline(e instanceof OfflineError);
      setError(e as Error);
    } finally { setLoading(false); }
  }, [key]);

  useEffect(() => {
    const h = key ? cache.get(key) : undefined;
    setData(h?.data as T | undefined); setFetchedAt(h?.fetchedAt ?? null);
    void reload();
    if (!opts.pollMs) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, opts.pollMs);
    return () => clearInterval(t);
  }, [key, reload, opts.pollMs]);

  return { data, error, loading, offline, fetchedAt, reload };
}

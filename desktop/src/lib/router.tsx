// In-memory router. Routes are the client-agnostic paths the backend uses in
// notifications (/actions/<id>, /sources/tally, …), so a deep link, a native
// notification and an in-app link all land on the same screen.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Route { path: string; parts: string[]; query: URLSearchParams }
const parse = (path: string): Route => {
  const [pathname, qs = ''] = path.split('?');
  return { path, parts: pathname.split('/').filter(Boolean), query: new URLSearchParams(qs) };
};

interface RouterCtx { route: Route; go: (path: string) => void; back: () => void }
const Ctx = createContext<RouterCtx | null>(null);

export function RouterProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const [stack, setStack] = useState<string[]>([initial]);
  const go = useCallback((path: string) => setStack((s) => (s[s.length - 1] === path ? s : [...s.slice(-30), path])), []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const value = useMemo(() => ({ route: parse(stack[stack.length - 1]), go, back }), [stack, go, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useRouter() {
  const c = useContext(Ctx);
  if (!c) throw new Error('RouterProvider missing');
  return c;
}

// Backend routes are client-agnostic (/actions/<id>, /watch/<id>,
// /missions/<id>, /scan/invoice/<id>, /sources/tally, …); map them to this
// app's screens. Unknown or retired routes land on the Bridge.
export function mobileRoute(route: string): string {
  const [path, query] = route.split('?');
  const [a, b, c] = path.split('/').filter(Boolean);
  const q = query ? `?${query}` : '';
  if (a === 'actions' && b) return `/actions/${b}`;
  if (a === 'watch') return b ? `/event/${b}` : '/watch';
  if (a === 'missions') return b === 'new' ? `/mission/new${q}` : b ? `/mission/${b}` : '/missions';
  if (a === 'scan' && b === 'invoice' && c) return `/invoice/${c}`;
  if (a === 'scan' && b === 'customer' && c) return `/customer/${c}`;
  if (a === 'scan') return '/scan';
  if (['simulate', 'memory', 'prepared', 'sources', 'settings'].includes(a)) return `/${a}`;
  if (a === 'inbox') return '/watch';
  return '/';
}

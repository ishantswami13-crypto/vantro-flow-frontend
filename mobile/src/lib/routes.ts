// Backend notification routes are client-agnostic (/actions/<id>,
// /sources/tally, /watch/<id>, /discover/<id>); map them to this app's screens.
export function mobileRoute(route: string): string {
  const [a, b] = route.split('/').filter(Boolean);
  if (a === 'actions' && b) return `/actions/${b}`;
  if (a === 'sources') return '/sources';
  if (a === 'watch') return '/watch';
  if (a === 'discover') return '/discover';
  if (a === 'inbox') return '/inbox';
  return '/';
}

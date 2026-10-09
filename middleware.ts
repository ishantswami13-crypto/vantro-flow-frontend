import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/collections', '/whatsapp', '/dunning', '/forecast', '/reports', '/inventory', '/scanner',
  '/billing', '/settings', '/bills', '/khata', '/bank', '/today', '/customers', '/suppliers',
  '/sales', '/purchases', '/orders', '/team', '/ledger', '/admin', '/invoice', '/bad-debt',
  '/onboarding', '/decisions', '/control', '/approvals', '/connections', '/intelligence',
  // The seven surfaces and their supporting pages — guarded server-side so a
  // signed-out visitor never sees a page shell before the client-side bounce.
  '/bridge', '/scan', '/watch', '/simulate', '/prepared', '/missions', '/memory',
  '/agents', '/sources', '/discover', '/intelligence', '/outreach',
];

// Home of the signed-in product (the V32 Bridge).
const APP_HOME = '/bridge';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(
    request.cookies.get('vantro_session')?.value ||
    request.cookies.get('vantro_token')?.value
  );

  // Logged-in users visiting root, login or signup → the product home
  if ((pathname === '/' || pathname === '/login' || pathname === '/signup') && hasSession) {
    return NextResponse.redirect(new URL(APP_HOME, request.url));
  }

  // Protected routes without token → send to login
  if (!hasSession && PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon).*)'],
};

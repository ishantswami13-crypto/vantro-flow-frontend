import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/dashboard', '/collections', '/whatsapp', '/dunning', '/forecast',
  '/analytics', '/reports', '/inventory', '/crm', '/scanner',
  '/ai-chat', '/billing', '/settings', '/bills', '/khata', '/bank',
  '/today', '/customers', '/suppliers', '/sales', '/purchases', '/orders', '/attendance', '/team', '/brain', '/business-state',
  '/neural-engine', '/network', '/ledger', '/my-id', '/admin',
  '/ai-train', '/industry', '/invoice',
  '/bad-debt', '/disputes', '/referrals', '/ca-portal', '/payment-plans',
  '/onboarding', '/ai-actions',
  // Starlane V32 product surfaces (lib/navigation.ts) — previously unguarded
  // server-side, so a signed-out visitor saw each page's shell before the
  // client-side 401 bounce.
  '/bridge', '/scan', '/discover', '/watch', '/missions', '/simulate', '/memory',
  '/prepared', '/sources', '/agents', '/control', '/intelligence', '/approvals',
  '/connections',
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

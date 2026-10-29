import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const PROTECTED = [
  '/dashboard', '/collections', '/whatsapp', '/dunning', '/forecast',
  '/analytics', '/reports', '/inventory', '/crm', '/scanner',
  '/ai-chat', '/billing', '/settings', '/bills', '/khata', '/bank',
  '/today', '/customers', '/suppliers', '/sales', '/purchases', '/orders', '/attendance', '/team', '/brain', '/business-state',
  '/neural-engine', '/network', '/ledger', '/my-id', '/admin',
  '/ai-train', '/industry', '/invoice',
  '/bad-debt', '/disputes', '/referrals', '/ca-portal', '/payment-plans',
  '/onboarding', '/ai-actions',
  '/decisions', '/control', '/approvals', '/connections',
  // The seven surfaces and their supporting pages — guarded server-side so a
  // signed-out visitor never sees a page shell before the client-side bounce.
  '/bridge', '/scan', '/watch', '/simulate', '/prepared', '/missions', '/memory',
  '/agents', '/sources', '/discover', '/intelligence', '/outreach',
];

// Home of the signed-in product (the V32 Bridge).
const APP_HOME = '/bridge';

// Older screens that are no longer part of the product. Their pages are kept
// in the codebase, but every visit is sent to the home page.
const RETIRED = [
  '/today', '/business-state', '/dashboard', '/customers', '/suppliers',
  '/collections', '/invoice/new', '/bills', '/bank', '/ledger', '/forecast',
  '/bad-debt', '/khata', '/sales', '/purchases', '/orders', '/inventory',
  '/scanner', '/attendance', '/team', '/whatsapp', '/dunning', '/ai-actions',
  '/brain', '/ai-chat', '/ai-train', '/analytics', '/reports', '/crm',
  '/industry', '/neural-engine', '/network', '/disputes', '/payment-plans',
  '/ca-portal', '/referrals', '/supply-chain-actions',
];

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

  if (RETIRED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL(hasSession ? APP_HOME : '/login', request.url));
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

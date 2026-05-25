import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALWAYS_PUBLIC = ['/', '/login', '/signup', '/onboarding'];

const PROTECTED = [
  '/dashboard', '/collections', '/whatsapp', '/dunning', '/forecast',
  '/analytics', '/reports', '/inventory', '/crm', '/scanner',
  '/ai-chat', '/billing', '/settings', '/bills', '/khata', '/bank',
  '/today', '/purchases', '/orders', '/attendance', '/team', '/brain',
  '/neural-engine', '/network', '/ledger', '/my-id', '/admin',
  '/ai-train', '/industry', '/invoice',
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

  const token = request.cookies.get('vantro_token')?.value;

  // Logged-in users visiting landing page → send to dashboard
  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Logged-in users visiting login/signup → send to dashboard
  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected routes without token → send to login
  if (!token && PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon).*)'],
};

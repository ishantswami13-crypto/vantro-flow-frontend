import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/onboarding'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for token in cookie (set on login) or skip if no cookie (client-side auth handles it)
  const token = request.cookies.get('vantro_token')?.value;

  // If accessing a protected route with no token cookie, redirect to login
  if (!token && pathname.startsWith('/dashboard') || !token && pathname.startsWith('/collections') ||
      !token && pathname.startsWith('/whatsapp') || !token && pathname.startsWith('/dunning') ||
      !token && pathname.startsWith('/forecast') || !token && pathname.startsWith('/analytics') ||
      !token && pathname.startsWith('/reports') || !token && pathname.startsWith('/inventory') ||
      !token && pathname.startsWith('/crm') || !token && pathname.startsWith('/scanner') ||
      !token && pathname.startsWith('/ai-chat') || !token && pathname.startsWith('/billing') ||
      !token && pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icon).*)'],
};

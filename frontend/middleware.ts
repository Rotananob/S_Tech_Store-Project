import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strict Security Lockdown: Completely block public access to legacy /admin paths
  // Return standard 404 Not Found so scanners and bots cannot discover or enter the admin portal
  if (
    pathname === '/admin' || 
    pathname.startsWith('/admin/') || 
    pathname === '/km/admin' || 
    pathname.startsWith('/km/admin/') || 
    pathname === '/en/admin' || 
    pathname.startsWith('/en/admin/')
  ) {
    return new NextResponse('404 Not Found', { status: 404 });
  }

  return intlMiddleware(request);
}

export const config = {
  // Intercept all routes except Next.js internals, API, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

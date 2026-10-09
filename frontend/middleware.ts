import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strict Security Lockdown: Completely block public access to legacy /admin and old portal paths
  // Return standard 404 Not Found so scanners, bots, and unauthorized users cannot discover or enter the admin portal
  if (
    pathname === '/admin' || 
    pathname.startsWith('/admin/') || 
    pathname === '/km/admin' || 
    pathname.startsWith('/km/admin/') || 
    pathname === '/en/admin' || 
    pathname.startsWith('/en/admin/') ||
    pathname === '/stech-hq-portal' || 
    pathname.startsWith('/stech-hq-portal/') || 
    pathname === '/km/stech-hq-portal' || 
    pathname.startsWith('/km/stech-hq-portal/') || 
    pathname === '/en/stech-hq-portal' || 
    pathname.startsWith('/en/stech-hq-portal/')
  ) {
    return new NextResponse('404 Not Found', { status: 404 });
  }

  return intlMiddleware(request);
}

export const config = {
  // Intercept all routes except Next.js internals, API, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

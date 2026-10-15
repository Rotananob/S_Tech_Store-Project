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
    // Fire and forget security alert to Telegram in background
    try {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'Scanner';
      const backendUrl = process.env.NODE_ENV === 'production' ? 'https://stech-backend-xz6j.onrender.com/api' : 'http://127.0.0.1:8000/api';
      fetch(`${backendUrl}/security/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: '🚨 Admin Portal Honeypot Triggered',
          ip: clientIp,
          device: userAgent,
          user: 'Scanner probing ' + pathname,
          action: 'BLOCKED (404 Concealed)',
          details: `Scanner attempted to access legacy admin path: ${pathname}`,
        }),
      }).catch(() => {});
    } catch {}

    return new NextResponse('404 Not Found', { status: 404 });
  }

  // Firebase Auth handler, system reverse-proxy, and root PWA / SEO asset bypass
  if (
    pathname.startsWith('/__') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/version.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.jpg'
  ) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Intercept all routes except Next.js internals, API, static files, and Firebase internal paths
  matcher: ['/((?!api|_next|_vercel|__|sw\\.js|manifest\\.json|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|version\\.json|favicon\\.ico|logo\\.jpg|.*\\..*).*)']
};

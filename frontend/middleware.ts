import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'km'],
  defaultLocale: 'en',
  localeDetection: false
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|km)/:path*']
};

import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'km'],
  defaultLocale: 'km'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|km)/:path*']
};

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Intercept all routes except Next.js internals, API, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'km'],
  defaultLocale: 'en',
  // Always prefix the URL with the locale (e.g. /en/..., /km/...)
  localePrefix: 'always',
  // Do not auto-detect locale from browser Accept-Language header
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

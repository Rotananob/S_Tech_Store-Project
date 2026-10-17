import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/rok-mix-khernh/',
          '/api/',
          '/account/',
          '/cart',
          '/checkout',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/rok-mix-khernh/',
          '/api/',
          '/account/',
          '/cart',
          '/checkout',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/rok-mix-khernh/',
          '/api/',
          '/account/',
          '/cart',
          '/checkout',
        ],
      },
    ],
    sitemap: 'https://www.s-tech-store.tech/sitemap.xml',
    host: 'https://www.s-tech-store.tech',
  };
}

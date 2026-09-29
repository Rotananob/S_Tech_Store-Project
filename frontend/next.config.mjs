import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin(
  './i18n.ts'
);

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Firebase Storage
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Unsplash
      { protocol: "https", hostname: "images.unsplash.com" },
      // Generic https fallback — covers any other external image host
      { protocol: "https", hostname: "**" },
    ],
  },
  allowedDevOrigins: ['puny-news-juggle.loca.lt', 'lazy-hotels-teach.loca.lt', '172.20.10.2'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*'
      }
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin(
  './i18n.ts'
);

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: true,
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
  async rewrites() {
    let backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.INTERNAL_API_URL ||
      (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : null) ||
      (process.env.NODE_ENV === 'production'
        ? 'https://stech-backend-xz6j.onrender.com'
        : 'http://127.0.0.1:8000');

    // Strip trailing /api or slash to prevent double /api
    backendUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://fir-tech-store.firebaseapp.com/__/auth/:path*'
      },
      {
        source: '/:locale/__/auth/:path*',
        destination: 'https://fir-tech-store.firebaseapp.com/__/auth/:path*'
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

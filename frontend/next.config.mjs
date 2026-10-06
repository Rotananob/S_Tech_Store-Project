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
  async rewrites() {
    let backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_URL ||
      'http://127.0.0.1:8000';

    // Strip trailing /api or slash to prevent double /api
    backendUrl = backendUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      }
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));

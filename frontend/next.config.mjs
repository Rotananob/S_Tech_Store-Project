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
};

export default withSerwist(withNextIntl(nextConfig));

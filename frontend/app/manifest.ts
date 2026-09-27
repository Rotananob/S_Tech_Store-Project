import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'S Tech Store',
    short_name: 'S Tech',
    description: 'ហាងបច្ចេកវិទ្យាលំដាប់ខ្ពស់ នៅក្នុងប្រទេសកម្ពុជា',
    start_url: '/km',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8B1A1A',
    orientation: 'portrait',
    categories: ['shopping', 'business'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

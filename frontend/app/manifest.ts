import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'S Tech Store',
    short_name: 'S Tech',
    description: 'ហាងបច្ចេកវិទ្យាលំដាប់ខ្ពស់ នៅក្នុងប្រទេសកម្ពុជា',
    start_url: '/km',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
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
    ],
  };
}

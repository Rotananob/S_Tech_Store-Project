import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.s-tech-store.tech';
  const locales = ['km', 'en'];
  
  // All public indexable shop routes
  const staticRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/products', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/categories', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/pc-builder', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/services', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/terms', priority: 0.5, changeFrequency: 'yearly' as const },
  ];
  
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. Add static multilingual routes
  staticRoutes.forEach(({ path, priority, changeFrequency }) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      });
    });
  });

  // 2. Add dynamic products from backend database
  try {
    const apiUrl = process.env.INTERNAL_API_URL 
      || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api` : 'http://127.0.0.1:8000/api');
      
    const res = await fetch(`${apiUrl}/products`, {
      next: { revalidate: 3600 },
    });
    
    if (res.ok) {
      const data = await res.json();
      const products = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      
      products.forEach((product: any) => {
        if (product.slug) {
          locales.forEach((locale) => {
            sitemapEntries.push({
              url: `${baseUrl}/${locale}/products/${product.slug}`,
              lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
              changeFrequency: 'daily',
              priority: 0.85,
            });
          });
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  return sitemapEntries;
}

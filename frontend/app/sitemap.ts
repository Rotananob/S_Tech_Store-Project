import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.s-tech-store.tech';
  const locales = ['km', 'en'];
  
  // All public indexable shop routes
  const staticRoutes = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/products', priority: 0.95, changeFrequency: 'daily' as const },
    { path: '/build-pc', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/promotions', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/services', priority: 0.85, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/warranty', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/returns', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/faqs', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.7, changeFrequency: 'monthly' as const },
  ];
  
  const sitemapEntries: MetadataRoute.Sitemap = [
    // Root canonical URL
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

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

  // 2. Add Category Filter Pages for enhanced Google search ranking
  const categories = ['laptops', 'desktops', 'parts', 'gaming', 'monitors', 'accessories'];
  categories.forEach((cat) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/products?category=${cat}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
    });
  });

  // 3. Add dynamic products from backend database
  try {
    const backend = process.env.BACKEND_URL 
      || process.env.NEXT_PUBLIC_BACKEND_URL 
      || 'https://stech-backend-xz6j.onrender.com';
    const apiUrl = process.env.INTERNAL_API_URL || `${backend}/api`;
      
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

import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://s-tech-store-project.vercel.app';
  const locales = ['km', 'en'];
  const routes = ['', '/products', '/cart', '/checkout'];
  
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add static routes
  routes.forEach((route) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
      });
    });
  });

  // Fetch product slugs
  try {
    const res = await fetch('https://stech-backend-xz6j.onrender.com/api/products');
    if (res.ok) {
      const data = await res.json();
      const products = data?.data || [];
      
      products.forEach((product: any) => {
        locales.forEach((locale) => {
          sitemapEntries.push({
            url: `${baseUrl}/${locale}/products/${product.slug}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
          });
        });
      });
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  return sitemapEntries;
}

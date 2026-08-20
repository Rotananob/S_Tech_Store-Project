import { getCategories, getProducts } from "@/lib/services/product.service";
import { Category, Product } from "@/types";
import { HeroSection, FeatureStrip, CategorySection, BestSellers } from "./home-client";

export default async function HomePage() {
  let categories: Category[] = [];
  let products: Product[] = [];
  
  try {
    const [categoriesRes, productsRes] = await Promise.all([
      getCategories(),
      getProducts()
    ]);
    
    categories = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []);
    products = Array.isArray(productsRes) ? productsRes : (productsRes?.data || []);
  } catch (error) {
    console.error("Error fetching home page data:", error);
  }

  return (
    <div>
      <HeroSection />
      <FeatureStrip />
      <CategorySection categories={categories} />
      <BestSellers products={[...products].reverse().slice(0, 8)} />
    </div>
  );
}

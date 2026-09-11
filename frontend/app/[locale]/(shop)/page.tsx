import { getCategories, getProducts } from "@/lib/services/product.service";
import { Category, Product } from "@/types";
import { HeroSection, FeatureStrip, CategorySection, BestSellers, PromoCTA } from "./home-client";

import { Metadata } from "next";

// Revalidate this page at most once every 60 seconds
export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isKm = locale === 'km';
  const title = isKm ? 'ទំព័រដើម | S Tech Store' : 'Home | S Tech Store';
  const description = isKm 
    ? 'ស្វែងរកម៉ាស៊ីន​កំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។ S Tech Store ផ្តល់ជូននូវផលិតផលពិតប្រាកដនៅកម្ពុជា។' 
    : 'Discover top-tier laptops, custom desktop builds, and professional IT services. S Tech Store provides genuine products in Cambodia.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://s-tech-store-project.vercel.app/${locale}`,
    }
  };
}
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
      <PromoCTA />
    </div>
  );
}

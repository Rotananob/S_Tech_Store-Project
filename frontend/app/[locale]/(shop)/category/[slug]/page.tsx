// Server Component: fetches all products once on the server with ISR cache,
// then hands the data to CategoryClient which handles filtering in memory.
import { getProducts } from "@/lib/services/product.service";
import CategoryClient from "./category-client";
import { Metadata } from "next";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const label = slug === "all" ? "All Products" : slug === "secondhand" ? "Second-Hand" : slug;
  return {
    title: `${label} | S Tech Store`,
    description: `Browse ${label} at S Tech Store — genuine tech products in Cambodia.`,
    openGraph: {
      url: `https://s-tech-store-project.vercel.app/${locale}/category/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let rawProducts: any[] = [];
  try {
    const res: any = await getProducts();
    rawProducts = Array.isArray(res) ? res : (res?.data ?? []);
  } catch {
    // On error, hand an empty array — CategoryClient renders "no results" state gracefully
  }

  return <CategoryClient slug={slug} initialProducts={rawProducts} />;
}

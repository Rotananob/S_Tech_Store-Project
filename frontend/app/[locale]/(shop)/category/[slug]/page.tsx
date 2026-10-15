// Server Component: fetches all products once on the server with ISR cache,
// then hands the data to CategoryClient which handles filtering in memory.
import { getProducts } from "@/lib/services/product.service";
import CategoryClient from "./category-client";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const isKm = locale === "km";
  const labelMap: Record<string, { km: string; en: string }> = {
    all: { km: "ទំនិញបច្ចេកវិទ្យាទាំងអស់", en: "All Products" },
    secondhand: { km: "កុំព្យូទ័រមួយទឹកគុណភាពខ្ពស់ (Second-Hand)", en: "Quality Second-Hand" },
    laptops: { km: "Laptops & Gaming Notebooks", en: "Laptops & Gaming Notebooks" },
    "pc-gaming": { km: "Custom Gaming PC Builds", en: "Custom Gaming PC Builds" },
    accessories: { km: "គ្រឿងបន្លាស់ & Gear", en: "Accessories & Gear" },
    monitors: { km: "អេក្រង់ Monitors គុណភាពខ្ពស់", en: "High Performance Monitors" },
  };

  const label = labelMap[slug]?.[isKm ? "km" : "en"] || slug.toUpperCase();
  const title = `${label} | S Tech Store Cambodia`;
  const description = isKm
    ? `ស្វែងរក និងទិញ ${label} គុណភាពខ្ពស់ តម្លៃពិសេស ជាមួយការធានាផ្លូវការ និងដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង នៅ S Tech Store Cambodia។`
    : `Explore and shop genuine ${label} with official warranty and fast delivery across Cambodia at S Tech Store.`;

  const canonicalUrl = `https://www.s-tech-store.tech/${locale}/category/${slug}`;
  const ogImageUrl = "https://www.s-tech-store.tech/og-image.png";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        km: `https://www.s-tech-store.tech/km/category/${slug}`,
        en: `https://www.s-tech-store.tech/en/category/${slug}`,
      },
    },
    openGraph: {
      type: "website",
      locale: isKm ? "km_KH" : "en_US",
      url: canonicalUrl,
      siteName: "S Tech Store Cambodia",
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${label} - S Tech Store`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      creator: "@STechStore",
      site: "@STechStore",
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

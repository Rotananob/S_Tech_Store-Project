import { redirect } from "next/navigation";
import { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isKm = locale === "km";
  const title = isKm
    ? "ទំនិញបច្ចេកវិទ្យាទាំងអស់ | S Tech Store Cambodia"
    : "All Products & Tech Categories | S Tech Store Cambodia";
  const description = isKm
    ? "ស្វែងរក និងទិញទំនិញបច្ចេកវិទ្យាទាំងអស់ Laptops, Gaming PC, គ្រឿងបន្លាស់ នៅ S Tech Store Cambodia។"
    : "Explore and shop genuine tech products, laptops, custom gaming PCs, and components at S Tech Store Cambodia.";

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.s-tech-store.tech/${locale}/category/all`,
      languages: {
        km: "https://www.s-tech-store.tech/km/category/all",
        en: "https://www.s-tech-store.tech/en/category/all",
      },
    },
  };
}

export default async function CategoryRootPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/category/all`);
}

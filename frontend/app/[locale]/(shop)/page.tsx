import { getCategories, getProducts } from "@/lib/services/product.service";
import { Category, Product } from "@/types";
import { HeroSection, PromotionDealsSection, FeatureStrip, CategorySection, BestSellers, PromoCTA } from "./home-client";
import { Metadata } from "next";

// ISR revalidation every 15s for instant page loading and fresh data updates
export const revalidate = 15;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isKm = locale === 'km';

  // Primary SEO target keyword: "S Tech" / "s tech" + "S Tech Store"
  const title = isKm 
    ? 'S Tech — ហាងលក់ និងជួសជុលកុំព្យូទ័រ Laptop & Gaming PC Cambodia | S Tech Store' 
    : 'S Tech — Genuine Laptop, Gaming PC & Computer Shop Cambodia | S Tech Store';

  const description = isKm 
    ? 'S Tech (S Tech Store Cambodia) គឺជាហាងកុំព្យូទ័រ និងបច្ចេកវិទ្យាឈានមុខគេនៅកម្ពុជា។ ផ្គត់ផ្គង់ Laptops, Custom Gaming PC, Monitors, គ្រឿងបន្លាស់កុំព្យូទ័រ និងសេវាជួសជុលរហ័សទាន់ចិត្ត ធានាត្រឹមត្រូវ ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង។' 
    : 'S Tech (S Tech Store Cambodia) is your premier destination for genuine laptops, custom gaming PCs, computer parts, monitors, and expert IT repair services in Phnom Penh, Cambodia. Fast delivery nationwide.';

  return {
    title,
    description,
    keywords: [
      "S Tech",
      "s tech",
      "STech",
      "S-Tech",
      "stech",
      "S Tech Store",
      "s tech store",
      "S Tech Cambodia",
      "s tech cambodia",
      "s tech phnom penh",
      "s tech computer",
      "s tech laptop",
      "s tech pc",
      "s tech build pc",
      "s tech accessories",
      "ហាង S Tech",
      "កុំព្យូទ័រ S Tech",
      "S Tech Store Cambodia",
      "laptop cambodia",
      "gaming pc phnom penh",
      "computer parts cambodia",
      "repair laptop phnom penh"
    ],
    alternates: {
      canonical: `https://www.s-tech-store.tech/${locale}`,
      languages: {
        km: 'https://www.s-tech-store.tech/km',
        en: 'https://www.s-tech-store.tech/en',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://www.s-tech-store.tech/${locale}`,
      siteName: 'S Tech Store Cambodia',
      type: 'website',
      images: [
        {
          url: 'https://www.s-tech-store.tech/og-image.png',
          width: 1200,
          height: 630,
          alt: 'S Tech Store - Premier Computer & Laptop Hub in Cambodia',
        },
      ],
      locale: isKm ? 'km_KH' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://www.s-tech-store.tech/og-image.png'],
      creator: '@STechStore',
      site: '@STechStore',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const isKm = locale === 'km';

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

  // High-priority SEO Structured Data (JSON-LD) for Google Brand Search ("S Tech")
  const homeStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Store", "ComputerStore", "ElectronicsStore", "OnlineStore"],
        "@id": "https://www.s-tech-store.tech/#store",
        "name": "S Tech",
        "alternateName": [
          "S Tech Store",
          "s tech",
          "STech",
          "S-Tech",
          "S Tech Store Cambodia",
          "ហាង S Tech",
          "ហាងកុំព្យូទ័រ S Tech",
          "S Tech Computer"
        ],
        "url": `https://www.s-tech-store.tech/${locale}`,
        "logo": "https://www.s-tech-store.tech/logo.jpg",
        "image": "https://www.s-tech-store.tech/og-image.png",
        "description": "Leading computer, laptop, custom gaming PC, and IT repair store in Phnom Penh, Cambodia.",
        "telephone": "+855-12-345-678",
        "priceRange": "$$",
        "currenciesAccepted": "USD, KHR",
        "paymentAccepted": "Cash, ABA PAY, Bakong KHQR, Credit Card",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Phnom Penh",
          "addressRegion": "Phnom Penh",
          "addressCountry": "KH"
        },
        "areaServed": {
          "@type": "Country",
          "name": "Cambodia"
        },
        "brand": {
          "@type": "Brand",
          "name": "S Tech",
          "alternateName": ["STech", "S-Tech", "S Tech Store"]
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.s-tech-store.tech/#website",
        "url": "https://www.s-tech-store.tech",
        "name": "S Tech",
        "alternateName": [
          "S Tech Store",
          "s tech",
          "STech",
          "S-Tech",
          "S Tech Cambodia"
        ],
        "publisher": { "@id": "https://www.s-tech-store.tech/#store" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.s-tech-store.tech/products?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <div>
      {/* ── Semantic SEO Headings for Search Crawlers (Googlebot / Bingbot) ── */}
      <h1 className="sr-only">
        {isKm 
          ? "S Tech — ហាងកុំព្យូទ័រ Laptop, Gaming PC និងគ្រឿងបន្លាស់ផ្លូវការនៅកម្ពុជា (S Tech Store Cambodia)" 
          : "S Tech — Official Computer, Laptop & Gaming PC Store in Cambodia (S Tech Store)"}
      </h1>

      {/* Structured Data for SEO Keyword Dominance */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />

      <HeroSection />
      <PromotionDealsSection products={products} />
      <FeatureStrip />
      <CategorySection categories={categories} />
      <BestSellers products={products} />
      <PromoCTA />
    </div>
  );
}

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
    ? 'S Tech — #1 Laptop, Gaming PC & Tech Store in Cambodia' 
    : 'S Tech — #1 Laptop, Gaming PC & Tech Store in Cambodia';

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
      "s_tech",
      "S Tech Store",
      "s tech store",
      "S-Tech Store",
      "STech Store",
      "S Tech Cambodia",
      "s tech cambodia",
      "s tech phnom penh",
      "s tech store cambodia",
      "s tech computer",
      "s tech laptop",
      "s tech gaming pc",
      "s tech pc",
      "s tech build pc",
      "s tech accessories",
      "ហាង S Tech",
      "កុំព្យូទ័រ S Tech",
      "ហាងកុំព្យូទ័រ S Tech",
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
        'x-default': 'https://www.s-tech-store.tech',
      },
    },
    openGraph: {
      title,
      description,
      url: `https://www.s-tech-store.tech/${locale}`,
      siteName: 'S Tech',
      type: 'website',
      images: [
        {
          url: 'https://www.s-tech-store.tech/og-image.png',
          width: 1200,
          height: 630,
          alt: 'S Tech - Official Computer & Laptop Hub in Cambodia',
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
        "legalName": "S Tech Store Cambodia",
        "alternateName": [
          "s tech",
          "S Tech Store",
          "s tech store",
          "STech",
          "S-Tech",
          "stech",
          "s_tech",
          "S Tech Cambodia",
          "s tech cambodia",
          "S Tech Store Cambodia",
          "S-Tech Store",
          "STech Store",
          "ហាង S Tech",
          "ហាងកុំព្យូទ័រ S Tech",
          "កុំព្យូទ័រ S Tech",
          "S Tech Computer"
        ],
        "url": `https://www.s-tech-store.tech/${locale}`,
        "logo": "https://www.s-tech-store.tech/logo.png",
        "image": "https://www.s-tech-store.tech/og-image.png",
        "description": "Leading computer, laptop, custom gaming PC, and IT repair store in Phnom Penh, Cambodia. Fast delivery nationwide.",
        "telephone": "+855-12-345-678",
        "priceRange": "$$",
        "currenciesAccepted": "USD, KHR",
        "paymentAccepted": "Cash, ABA PAY, Bakong KHQR, Credit Card",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Street 271",
          "addressLocality": "Phnom Penh",
          "addressRegion": "Phnom Penh",
          "postalCode": "12000",
          "addressCountry": "KH"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "11.5564",
          "longitude": "104.9282"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "08:00",
            "closes": "20:00"
          }
        ],
        "areaServed": {
          "@type": "Country",
          "name": "Cambodia"
        },
        "brand": {
          "@type": "Brand",
          "name": "S Tech",
          "alternateName": ["s tech", "STech", "S-Tech", "S Tech Store"]
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "bestRating": "5",
          "ratingCount": "128",
          "reviewCount": "128"
        },
        "sameAs": [
          "https://t.me/S_TECH_ASSISTANTBOT",
          "https://t.me/COMPUTERSTOREBUY",
          "https://t.me/PCANDGAMESTORE",
          "https://www.s-tech-store.tech"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.s-tech-store.tech/#website",
        "url": "https://www.s-tech-store.tech",
        "name": "S Tech",
        "alternateName": [
          "s tech",
          "STech",
          "S-Tech",
          "stech",
          "S Tech Store",
          "s tech store",
          "S-Tech Store",
          "STech Store",
          "S Tech Cambodia",
          "s tech cambodia"
        ],
        "publisher": { "@id": "https://www.s-tech-store.tech/#store" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.s-tech-store.tech/products?search={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "FAQPage",
        "@id": `https://www.s-tech-store.tech/${locale}#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": isKm ? "តើ S Tech (S Tech Store) ជាអ្វី?" : "What is S Tech (S Tech Store)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": isKm 
                ? "S Tech (S Tech Store Cambodia) គឺជាហាងកុំព្យូទ័រ និងបច្ចេកវិទ្យាឈានមុខគេនៅកម្ពុជា ដែលផ្គត់ផ្គង់ Laptops, Custom Gaming PC, Monitors, គ្រឿងបន្លាស់កុំព្យូទ័រ និងសេវាកម្មជួសជុល IT ជំនាញ ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង។"
                : "S Tech (S Tech Store Cambodia) is the leading computer and technology store in Cambodia offering genuine laptops, custom gaming PCs, computer parts, monitors, and expert IT repair services with nationwide delivery."
            }
          },
          {
            "@type": "Question",
            "name": isKm ? "តើ S Tech Store មានទីតាំងនៅណា និងទំនាក់ទំនងយ៉ាងដូចម្តេច?" : "Where is S Tech Store located?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": isKm 
                ? "ហាង S Tech Store មានទីតាំងនៅរាជធានីភ្នំពេញ ផ្លូវ ២៧១។ ទំនាក់ទំនងទូរស័ព្ទ៖ 012 345 678 / 087 948 370 ឬតាម Telegram: @S_TECH_ASSISTANTBOT និង @PCANDGAMESTORE។"
                : "S Tech Store is located at Street 271, Phnom Penh, Cambodia. Contact us via phone at +855 12 345 678 or Telegram: @S_TECH_ASSISTANTBOT."
            }
          },
          {
            "@type": "Question",
            "name": isKm ? "តើ S Tech មានផលិតផលអ្វីខ្លះ?" : "What products does S Tech offer?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": isKm
                ? "S Tech ផ្គត់ផ្គង់កុំព្យូទ័រយួរដៃ (Laptops) គ្រប់ម៉ាកល្បីៗ (ASUS ROG, Dell, Lenovo, Apple MacBook, Acer), កុំព្យូទ័រ Custom Gaming PC, CPU, GPU, RAM, SSD, Monitors, Gaming Gear និងគ្រឿងបន្លាស់សុទ្ធ 100%។"
                : "S Tech offers laptops from top brands (ASUS ROG, Dell, Lenovo, Apple MacBook, Acer), custom gaming PCs, PC components (CPUs, GPUs, RAM, SSDs), monitors, and gaming accessories."
            }
          },
          {
            "@type": "Question",
            "name": isKm ? "តើ S Tech មានសេវាដឹកជញ្ជូនរហ័សដែរឬទេ?" : "Does S Tech offer fast delivery?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": isKm
                ? "S Tech ផ្តល់សេវាដឹកជញ្ជូនឥតគិតថ្លៃ Same-Day Delivery ក្នុងរាជធានីភ្នំពេញ និងដឹកជញ្ជូនរហ័សប្រកបដោយសុវត្ថិភាពដល់ ២៥ ខេត្ត-ក្រុងទូទាំងប្រទេសកម្ពុជា។"
                : "Yes, S Tech offers free same-day delivery within Phnom Penh and reliable delivery across all 25 provinces in Cambodia."
            }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": `https://www.s-tech-store.tech/${locale}#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "S Tech",
            "item": `https://www.s-tech-store.tech/${locale}`
          }
        ]
      }
    ]
  };

  return (
    <div>
      {/* ── Semantic SEO Headings & Brand Keywords for Search Crawlers (Googlebot / Bingbot) ── */}
      <h1 className="sr-only">
        {isKm 
          ? "S Tech — ហាងកុំព្យូទ័រ Laptops, Gaming PC និងគ្រឿងបន្លាស់ផ្លូវការនៅកម្ពុជា (S Tech Store Cambodia)" 
          : "S Tech — Cambodia's #1 Computer, Laptop & Gaming PC Store (S Tech Store)"}
      </h1>
      <div className="sr-only">
        <p>S Tech (S Tech Store Cambodia) គឺជាប្រភពបច្ចេកវិទ្យាផ្លូវការសម្រាប់ទិញ Laptops, Gaming PC, Computer Parts, Monitors និងគ្រឿងបន្លាស់កុំព្យូទ័រនៅរាជធានីភ្នំពេញ កម្ពុជា។</p>
        <p>Brand keywords: S Tech, s tech, STech, S-Tech, stech, s_tech, S Tech Store, s tech store, S-Tech Store, STech Store, S Tech Cambodia, s tech laptop, s tech pc, s tech phnom penh.</p>
      </div>

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

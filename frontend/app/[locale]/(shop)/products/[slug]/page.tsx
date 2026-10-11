import { getProduct } from "@/lib/services/product.service";
import { ProductDetailClient } from "./product-client";
import { Metadata, ResolvingMetadata } from "next";

// Revalidate cached product page every 60 seconds
export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug, locale } = await params;
  const productRes: any = await getProduct(slug);
  const product = productRes?.data ? productRes.data : productRes;
  
  if (!product) {
    return {
      title: "ទំនិញរកមិនឃើញ / Product Not Found | S Tech Store",
    };
  }

  const title = `${product.name} | S Tech Store Cambodia`;
  const description = product.description 
    ? `${product.description.slice(0, 160)}... តម្លៃត្រឹមតែ $${product.price} មានធានាផ្លូវការនៅ S Tech Store`
    : `ទិញ ${product.name} តម្លៃពិសេស $${product.price} ជាមួយការធានាផ្លូវការ និងសេវាដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង នៅ S Tech Store Cambodia។`;
    
  const rawImage = product.images?.[0] || product.image || "/og-image.png";
  const imageUrl = rawImage.startsWith("http") 
    ? rawImage 
    : `https://www.s-tech-store.tech${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

  const canonicalUrl = `https://www.s-tech-store.tech/${locale}/products/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        km: `https://www.s-tech-store.tech/km/products/${slug}`,
        en: `https://www.s-tech-store.tech/en/products/${slug}`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "km_KH",
      url: canonicalUrl,
      siteName: "S Tech Store Cambodia",
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: {
      "product:price:amount": String(product.price || 0),
      "product:price:currency": "USD",
      "product:availability": (product.stock ?? 1) > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ProductDetailPage({
  params,
}: Props) {
  const { slug, locale } = await params;
  
  try {
    const productRes: any = await getProduct(slug);
    const product = productRes?.data ? productRes.data : productRes;

    if (!product) {
      return (
        <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
          Product not found
        </div>
      );
    }

    const rawImage = product.images?.[0] || product.image || "/og-image.png";
    const imageUrl = rawImage.startsWith("http") 
      ? rawImage 
      : `https://www.s-tech-store.tech${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: [imageUrl],
      description: product.description || `Buy ${product.name} at S Tech Store Cambodia`,
      brand: {
        "@type": "Brand",
        name: product.brand || "S Tech",
      },
      offers: {
        "@type": "Offer",
        url: `https://www.s-tech-store.tech/${locale}/products/${product.slug || slug}`,
        priceCurrency: "USD",
        price: product.price,
        itemCondition: "https://schema.org/NewCondition",
        availability: (product.stock ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: "S Tech Store Cambodia",
        },
      },
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProductDetailClient product={product} />
      </>
    );
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return (
      <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
        Error loading product
      </div>
    );
  }
}

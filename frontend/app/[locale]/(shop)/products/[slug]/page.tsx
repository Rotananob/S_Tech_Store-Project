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

  const priceFormatted = product.sale_price ? `$${product.sale_price}` : (product.price ? `$${product.price}` : "");
  const title = priceFormatted ? `${product.name} (${priceFormatted}) | S Tech Store` : `${product.name} | S Tech Store Cambodia`;
  const description = product.description 
    ? `${product.name} ${priceFormatted ? `តម្លៃត្រឹមតែ ${priceFormatted}` : ""} — ${product.description.replace(/\r?\n|\r/g, " ").slice(0, 150)}... មានធានាត្រឹមត្រូវ ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង នៅ S Tech Store Cambodia`
    : `ទិញ ${product.name} ${priceFormatted ? `តម្លៃពិសេស ${priceFormatted}` : ""} ជាមួយការធានាផ្លូវការ និងសេវាដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង នៅ S Tech Store Cambodia។`;
    
  const extractedImg = 
    product.image_url || 
    product.image || 
    (Array.isArray(product.images) && product.images[0] 
      ? (typeof product.images[0] === 'string' ? product.images[0] : (product.images[0].image_url || product.images[0].url || product.images[0].image)) 
      : '') || 
    "/og-image.png";

  const imageUrl = extractedImg.startsWith("http") 
    ? extractedImg 
    : `https://www.s-tech-store.tech${extractedImg.startsWith("/") ? "" : "/"}${extractedImg}`;

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
          secureUrl: imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
          type: imageUrl.endsWith(".png") ? "image/png" : "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      creator: "@STechStore",
      site: "@STechStore",
    },
    other: {
      "product:price:amount": String(product.sale_price || product.price || 0),
      "product:price:currency": "USD",
      "product:availability": (product.stock ?? 1) > 0 ? "in stock" : "out of stock",
      "og:image:secure_url": imageUrl,
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

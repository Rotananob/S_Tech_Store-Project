import { getProduct } from "@/lib/services/product.service";
import { ProductDetailClient } from "./product-client";
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug, locale } = await params;
  const productRes: any = await getProduct(slug);
  const product = productRes?.data ? productRes.data : productRes;
  
  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const title = product.name;
  const description = product.description || `Buy ${product.name} at S Tech Store`;
  const image = product.images?.[0] || product.image || "/og-image.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      url: `https://s-tech-store-project.vercel.app/${locale}/products/${slug}`,
    }
  };
}

export default async function ProductDetailPage({
  params,
}: Props) {
  const { slug } = await params;
  
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

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: product.images?.[0] || product.image,
      description: product.description || `Buy ${product.name} at S Tech Store`,
      offers: {
        "@type": "Offer",
        url: `https://s-tech-store-project.vercel.app/products/${product.slug || slug}`,
        priceCurrency: "USD",
        price: product.price,
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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

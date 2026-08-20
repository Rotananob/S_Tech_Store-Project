import { getProduct } from "@/lib/services/product.service";
import { ProductDetailClient } from "./product-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  try {
    const productRes = await getProduct(slug);
    const product = productRes?.data ? productRes.data : productRes;

    if (!product) {
      return (
        <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
          Product not found
        </div>
      );
    }

    return <ProductDetailClient product={product} />;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return (
      <div style={{ minHeight: "100vh", background: "#111", display: "flex", justifyContent: "center", alignItems: "center", color: "white" }}>
        Error loading product
      </div>
    );
  }
}

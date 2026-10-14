import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Products & Tech Gear | S Tech Store Cambodia",
  description: "Browse the complete collection of genuine laptops, custom gaming PCs, computer parts, monitors, and accessories at S Tech Store Cambodia. Best prices and official warranty.",
  keywords: [
    "S Tech Products",
    "S Tech Laptops",
    "S Tech Gaming PC",
    "S Tech Computer Parts",
    "Buy Laptop Cambodia",
    "S Tech Store Phnom Penh"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/products",
  },
  openGraph: {
    title: "All Products & Tech Gear | S Tech Store Cambodia",
    description: "Browse the complete collection of genuine laptops, custom gaming PCs, computer parts, monitors, and accessories at S Tech Store Cambodia.",
    url: "https://www.s-tech-store.tech/products",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

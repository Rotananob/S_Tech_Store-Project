import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Special Promotions & Deals | S Tech Store Cambodia",
  description: "Exclusive promotions, discount codes, and flash sales on laptops, gaming PCs, and tech accessories at S Tech Store Cambodia. Save big with official warranties.",
  keywords: [
    "S Tech Promotions",
    "S Tech Deals",
    "Laptop Promotion Cambodia",
    "Gaming PC Discount Phnom Penh",
    "Pchum Ben Promotion S Tech",
    "S Tech Voucher Code"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/promotions",
  },
  openGraph: {
    title: "Special Promotions & Deals | S Tech Store Cambodia",
    description: "Exclusive promotions, discount codes, and flash sales on laptops, gaming PCs, and tech accessories at S Tech Store Cambodia.",
    url: "https://www.s-tech-store.tech/promotions",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

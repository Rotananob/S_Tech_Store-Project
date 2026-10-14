import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Replacement Policy | S Tech Store Cambodia",
  description: "Read S Tech Store's easy return and replacement policy for defective or DOA products in Cambodia. Fast processing and fair customer support.",
  keywords: [
    "S Tech Return Policy",
    "S Tech Replacement",
    "Return Policy Cambodia"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/returns",
  },
  openGraph: {
    title: "Return & Replacement Policy | S Tech Store Cambodia",
    description: "Read S Tech Store's easy return and replacement policy for defective or DOA products in Cambodia.",
    url: "https://www.s-tech-store.tech/returns",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official Warranty & Policy | S Tech Store Cambodia",
  description: "Check warranty status and policies for genuine laptops, custom PC builds, and hardware components purchased at S Tech Store Cambodia.",
  keywords: [
    "S Tech Warranty",
    "S Tech Store Warranty Check",
    "Laptop Warranty Cambodia",
    "Computer Warranty Phnom Penh"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/warranty",
  },
  openGraph: {
    title: "Official Warranty & Policy | S Tech Store Cambodia",
    description: "Check warranty status and policies for genuine laptops, custom PC builds, and hardware components purchased at S Tech Store Cambodia.",
    url: "https://www.s-tech-store.tech/warranty",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function WarrantyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

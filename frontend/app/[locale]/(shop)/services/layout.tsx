import { Metadata } from "next";

export const metadata: Metadata = {
  title: "IT & Repair Services | S Tech Store Cambodia",
  description: "Professional computer, laptop, and phone repair services by S Tech Store in Phnom Penh, Cambodia. Fast diagnostics, genuine replacement parts, and warranty.",
  keywords: [
    "S Tech Repair",
    "S Tech Services",
    "Laptop Repair Phnom Penh",
    "Computer Repair Cambodia",
    "MacBook Repair Phnom Penh",
    "Screen Replacement S Tech"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/services",
  },
  openGraph: {
    title: "IT & Repair Services | S Tech Store Cambodia",
    description: "Professional computer, laptop, and phone repair services by S Tech Store in Phnom Penh, Cambodia.",
    url: "https://www.s-tech-store.tech/services",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

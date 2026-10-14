import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About S Tech | S Tech Store Cambodia",
  description: "Learn more about S Tech (S Tech Store), Cambodia's trusted provider of genuine laptops, custom gaming PCs, and professional IT repair services in Phnom Penh.",
  keywords: ["About S Tech", "S Tech Store Cambodia", "S Tech computer shop", "S Tech Phnom Penh"],
  alternates: {
    canonical: "https://www.s-tech-store.tech/about",
  },
  openGraph: {
    title: "About S Tech | S Tech Store Cambodia",
    description: "Learn more about S Tech, Cambodia's trusted provider of genuine tech products and professional IT repair services.",
    url: "https://www.s-tech-store.tech/about",
  }
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

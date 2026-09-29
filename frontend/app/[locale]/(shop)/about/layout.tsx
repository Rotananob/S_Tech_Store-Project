import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | S Tech Store",
  description: "Learn more about S Tech Store, Cambodia's trusted provider of genuine tech products and professional IT services.",
  openGraph: {
    title: "About Us | S Tech Store",
    description: "Learn more about S Tech Store, Cambodia's trusted provider of genuine tech products and professional IT services.",
  }
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

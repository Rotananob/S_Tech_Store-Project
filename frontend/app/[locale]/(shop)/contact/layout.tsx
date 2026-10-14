import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact S Tech | S Tech Store Customer Support",
  description: "Get in touch with S Tech (S Tech Store Cambodia) for order assistance, gaming PC consulting, or laptop repair support. We are here to help!",
  keywords: ["Contact S Tech", "S Tech Store Cambodia", "S Tech customer service", "S Tech Telegram support"],
  alternates: {
    canonical: "https://www.s-tech-store.tech/contact",
  },
  openGraph: {
    title: "Contact S Tech | S Tech Store Customer Support",
    description: "Get in touch with S Tech for order assistance, gaming PC consulting, or laptop repair support.",
    url: "https://www.s-tech-store.tech/contact",
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

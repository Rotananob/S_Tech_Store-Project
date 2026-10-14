import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQs) | S Tech Store Cambodia",
  description: "Find quick answers to common questions about orders, payments (ABA, Bakong KHQR), delivery, and warranties at S Tech Store in Cambodia.",
  keywords: [
    "S Tech FAQ",
    "S Tech Questions",
    "How to buy on S Tech Store",
    "S Tech delivery Cambodia"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/faqs",
  },
  openGraph: {
    title: "Frequently Asked Questions (FAQs) | S Tech Store Cambodia",
    description: "Find quick answers to common questions about orders, payments, delivery, and warranties at S Tech Store in Cambodia.",
    url: "https://www.s-tech-store.tech/faqs",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function FAQsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

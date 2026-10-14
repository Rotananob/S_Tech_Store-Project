import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service & User Agreement | S Tech Store Cambodia",
  description: "Read the S Tech Store Terms of Service. Understand our purchase conditions, official warranties, account policies, and TikTok social sign-in agreements.",
  keywords: [
    "S Tech Terms of Service",
    "S Tech Store Terms",
    "S Tech user agreement",
    "S Tech Cambodia warranty terms",
    "S Tech online store terms"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/terms",
  },
  openGraph: {
    title: "Terms of Service & User Agreement | S Tech Store Cambodia",
    description: "Read the S Tech Store Terms of Service. Transparent and trustworthy policies for our customers in Cambodia.",
    url: "https://www.s-tech-store.tech/terms",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

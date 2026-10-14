import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Safety | S Tech Store Cambodia",
  description: "Read the S Tech Store Privacy Policy. Learn how we handle your personal data, secure social sign-in (TikTok Login, Google), and support user data deletion.",
  keywords: [
    "S Tech Privacy Policy",
    "S Tech Store Policy",
    "S Tech TikTok Login Policy",
    "S Tech data deletion",
    "S Tech Cambodia",
    "s tech store terms"
  ],
  alternates: {
    canonical: "https://www.s-tech-store.tech/privacy",
  },
  openGraph: {
    title: "Privacy Policy & Data Safety | S Tech Store Cambodia",
    description: "Read the S Tech Store Privacy Policy. Transparent, secure, and respectful of your personal privacy and social sign-in data.",
    url: "https://www.s-tech-store.tech/privacy",
    siteName: "S Tech Store",
    type: "website",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

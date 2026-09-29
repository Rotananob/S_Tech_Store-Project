import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | S Tech Store",
  description: "Securely checkout your order at S Tech Store.",
  robots: "noindex, nofollow"
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

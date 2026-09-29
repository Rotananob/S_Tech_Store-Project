import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart | S Tech Store",
  description: "Review the items in your shopping cart before proceeding to checkout.",
  robots: "noindex, nofollow"
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}

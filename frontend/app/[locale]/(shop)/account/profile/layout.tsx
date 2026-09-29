import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | S Tech Store",
  description: "Manage your S Tech Store account, track orders, and view your wishlist.",
  robots: "noindex, nofollow"
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

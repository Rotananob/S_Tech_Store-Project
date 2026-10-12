import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  title: {
    default: "S Tech Store — Admin Portal",
    template: "%s | S Tech Admin",
  },
  description: "ផ្ទាំងគ្រប់គ្រងទំនិញ ការបញ្ជាទិញ និងប្រព័ន្ធហាង S Tech Store",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "S Tech Admin",
  },
  icons: {
    icon: "/logo.jpg",
    apple: "/icons/icon-192.png",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us & Tech Support | S Tech Store",
  description: "Get in touch with S Tech Store for order support, technical issues, or general inquiries. We are here to help!",
  openGraph: {
    title: "Contact Us & Tech Support | S Tech Store",
    description: "Get in touch with S Tech Store for order support, technical issues, or general inquiries. We are here to help!",
  }
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

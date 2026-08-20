import type { Metadata } from "next";
import "./globals.css";
import FloatingBackButton from "@/components/ui/FloatingBackButton";

export const metadata: Metadata = {
  title: {
    default: "S Tech Store — Your Hub for Genuine Tech in Cambodia",
    template: "%s | S Tech Store",
  },
  description:
    "Discover top-tier laptops, custom desktop builds, and professional IT services. ស្វែងរកម៉ាស៊ីន​កំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។",
  keywords: ["computer shop", "laptops", "Cambodia", "Phnom Penh", "S Tech Store", "ហាងដែក"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dangrek&family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Khmer:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <FloatingBackButton />
      </body>
    </html>
  );
}

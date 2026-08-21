import type { Metadata } from "next";
import { Inter, Suwannaphum } from "next/font/google";
import "./globals.css";
import FloatingBackButton from "@/components/ui/FloatingBackButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const suwannaphum = Suwannaphum({ 
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["khmer"], 
  variable: "--font-suwannaphum" 
});

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
          href="https://fonts.googleapis.com/css2?family=Dangrek&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${suwannaphum.variable}`}>
        {children}
        <FloatingBackButton />
      </body>
    </html>
  );
}

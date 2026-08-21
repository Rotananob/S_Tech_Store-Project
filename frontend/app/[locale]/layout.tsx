import type { Metadata } from "next";
import { Inter, Suwannaphum } from "next/font/google";
import "@/app/globals.css";
import FloatingBackButton from "@/components/ui/FloatingBackButton";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dangrek&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${suwannaphum.variable}`}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <FloatingBackButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

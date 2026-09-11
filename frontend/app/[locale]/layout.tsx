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
  metadataBase: new URL('https://s-tech-store-project.vercel.app'),
  title: {
    default: "S Tech Store — Your Hub for Genuine Tech in Cambodia",
    template: "%s | S Tech Store",
  },
  description:
    "Discover top-tier laptops, custom desktop builds, and professional IT services. ស្វែងរកម៉ាស៊ីន​កំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។",
  keywords: ["computer shop", "laptops", "Cambodia", "Phnom Penh", "S Tech Store", "ហាងដែក"],
  openGraph: {
    title: "S Tech Store — Your Hub for Genuine Tech in Cambodia",
    description: "Discover top-tier laptops, custom desktop builds, and professional IT services. ស្វែងរកម៉ាស៊ីន​កំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។",
    url: "https://s-tech-store-project.vercel.app",
    siteName: "S Tech Store",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "S Tech Store Cambodia",
      },
    ],
    locale: "km_KH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S Tech Store",
    description: "Your Hub for Genuine Tech in Cambodia",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      km: "/km",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'S Tech Store',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
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
          href="https://fonts.googleapis.com/css2?family=Dangrek&family=Noto+Sans+Khmer:wght@400;500;600;700&display=swap"
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

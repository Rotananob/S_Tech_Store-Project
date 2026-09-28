import type { Metadata } from "next";
import { Inter, Battambang } from "next/font/google";
import "@/app/globals.css";
import FloatingBackButton from "@/components/ui/FloatingBackButton";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import SplashScreen from "@/components/ui/SplashScreen";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import CookieConsent from "@/components/ui/CookieConsent";
import AppUpdatePrompt from "@/components/ui/AppUpdatePrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const khmerFont = Battambang({ 
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["khmer"], 
  variable: "--font-khmer" 
});

export const metadata: Metadata = {
  metadataBase: new URL('https://s-tech-store-project.vercel.app'),
  title: {
    default: "S Tech Store — Your Hub for Genuine Tech in Cambodia",
    template: "%s | S Tech Store",
  },
  description:
    "Discover top-tier laptops, custom desktop builds, and professional IT services. ស្វែងរកម៉ាស៊ីនកំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។",
  keywords: ["computer shop", "laptops", "Cambodia", "Phnom Penh", "S Tech Store", "ហាងដែក"],
  openGraph: {
    title: "S Tech Store — Your Hub for Genuine Tech in Cambodia",
    description: "Discover top-tier laptops, custom desktop builds, and professional IT services. ស្វែងរកម៉ាស៊ីនកំព្យូទ័រ និងឧបករណ៍ IT គ្រប់ប្រភេទ។",
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
    statusBarStyle: 'default',
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
        <meta name="theme-color" content="#8B1A1A" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dangrek&family=Noto+Sans+Khmer:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${khmerFont.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <SplashScreen />
            {children}
            <FloatingBackButton />
            <ScrollToTopButton />
            <CookieConsent />
            <AppUpdatePrompt />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

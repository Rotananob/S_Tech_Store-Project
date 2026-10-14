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
import TrafficTracker from "@/components/ui/TrafficTracker";
import TelegramAuthBridge from "@/components/auth/TelegramAuthBridge";
import WelcomeGiftModal from "@/components/promotions/WelcomeGiftModal";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const khmerFont = Battambang({ 
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["khmer"], 
  variable: "--font-khmer" 
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.s-tech-store.tech'),
  title: {
    default: "S Tech | S Tech Store — ហាងលក់ និងជួសជុលកុំព្យូទ័រ Laptops & Gaming PC នៅកម្ពុជា",
    template: "%s | S Tech Store Cambodia",
  },
  description:
    "S Tech (S Tech Store) ហាងបច្ចេកវិទ្យាផ្លូវការនៅកម្ពុជា ផ្គត់ផ្គង់ Laptops, Gaming PC, Computer Parts, Smart devices និងសេវាជួសជុលរហ័សទាន់ចិត្ត ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង។",
  keywords: [
    "S Tech",
    "s tech",
    "STech",
    "S-Tech",
    "stech",
    "S Tech Store",
    "s tech store",
    "S Tech Cambodia",
    "s tech cambodia",
    "s tech computer",
    "s tech laptop",
    "s tech gaming pc",
    "s tech phnom penh",
    "ហាង S Tech",
    "កុំព្យូទ័រ S Tech",
    "ហាងកុំព្យូទ័រ",
    "ទិញកុំព្យូទ័រ",
    "កុំព្យូទ័រយួរដៃ",
    "laptop cambodia",
    "gaming pc cambodia",
    "computer shop phnom penh",
    "phone accessories",
    "ជួសជុលកុំព្យូទ័រ",
    "គ្រឿងបន្លាស់ pc",
    "s-tech-store.tech"
  ],
  authors: [{ name: "Rotana Nob", url: "https://www.s-tech-store.tech" }],
  creator: "Rotana Nob",
  publisher: "S Tech Store",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "S Tech Store — ហាងលក់ និងជួសជុលកុំព្យូទ័រ ស្មាតហ្វូន គ្រឿងបន្លាស់គុណភាពខ្ពស់",
    description: "Discover top-tier laptops, custom desktop builds, and professional IT services. ផ្គត់ផ្គង់កុំព្យូទ័រ គ្រឿងបន្លាស់ និងសេវាបច្ចេកវិទ្យា IT គុណភាពខ្ពស់នៅកម្ពុជា។",
    url: "https://www.s-tech-store.tech",
    siteName: "S Tech Store Cambodia",
    images: [
      {
        url: "https://www.s-tech-store.tech/og-image.png",
        width: 1200,
        height: 630,
        alt: "S Tech Store Cambodia - Official Tech Hub",
        type: "image/png",
      },
    ],
    locale: "km_KH",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S Tech Store — Genuine Tech Hub in Cambodia",
    description: "Laptops, Gaming PC Builds, Accessories & Professional Repair Services in Phnom Penh.",
    images: ["https://www.s-tech-store.tech/og-image.png"],
    creator: "@STechStore",
    site: "@STechStore",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://www.s-tech-store.tech",
    languages: {
      en: "https://www.s-tech-store.tech/en",
      km: "https://www.s-tech-store.tech/km",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'S Tech Store',
  },
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/icons/icon-192.png',
  },
  verification: {
    google: '3660d58f4e2bffb0',
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "OnlineStore", "ComputerStore"],
      "@id": "https://www.s-tech-store.tech/#organization",
      "name": "S Tech",
      "alternateName": [
        "S Tech Store",
        "s tech",
        "STech",
        "S-Tech",
        "S Tech Store Cambodia",
        "ហាង S Tech Store",
        "ហាងកុំព្យូទ័រ S Tech",
        "S Tech Cambodia",
        "stech"
      ],
      "url": "https://www.s-tech-store.tech",
      "logo": "https://www.s-tech-store.tech/logo.jpg",
      "image": "https://www.s-tech-store.tech/og-image.png",
      "description": "Leading computer, laptop, gaming PC, and IT repair store in Phnom Penh, Cambodia.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Phnom Penh",
        "addressRegion": "Phnom Penh",
        "addressCountry": "KH"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+855-12-345-678",
        "contactType": "customer service",
        "availableLanguage": ["Khmer", "English"]
      },
      "brand": {
        "@type": "Brand",
        "name": "S Tech",
        "alternateName": ["STech", "S-Tech", "S Tech Store"]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.s-tech-store.tech/#website",
      "url": "https://www.s-tech-store.tech",
      "name": "S Tech",
      "alternateName": [
        "S Tech Store",
        "s tech",
        "STech",
        "S-Tech",
        "S Tech Cambodia"
      ],
      "publisher": { "@id": "https://www.s-tech-store.tech/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.s-tech-store.tech/products?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  ]
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#8B1A1A" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/logo.jpg" />
        <link rel="shortcut icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dangrek&family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700&family=Koh+Santepheap:wght@300;400;700;900&family=Noto+Sans+Khmer:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Battambang:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var f = localStorage.getItem('stech_font_system');
                if (f) document.documentElement.setAttribute('data-font', f);
              } catch(e) {}
            `,
          }}
        />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${khmerFont.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <SplashScreen />
            <TrafficTracker />
            <TelegramAuthBridge />
            <WelcomeGiftModal />
            {children}
            <FloatingBackButton />
            <ScrollToTopButton />
            <CookieConsent />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

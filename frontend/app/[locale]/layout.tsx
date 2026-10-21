import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Noto_Sans_Khmer, Plus_Jakarta_Sans } from "next/font/google";
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

const notoSansKhmer = Noto_Sans_Khmer({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["khmer"],
  display: "swap",
  variable: "--font-khmer",
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-latin",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.s-tech-store.tech'),
  title: {
    default: "S Tech — #1 Laptop, Gaming PC & Tech Store in Cambodia",
    template: "%s | S Tech",
  },
  applicationName: "S Tech",
  description:
    "S Tech (S Tech Store Cambodia) ហាងកុំព្យូទ័រ និងបច្ចេកវិទ្យាផ្លូវការនៅកម្ពុជា។ ផ្គត់ផ្គង់ Laptops, Custom Gaming PC, Monitors, គ្រឿងបន្លាស់កុំព្យូទ័រ និងសេវាជួសជុលរហ័សទាន់ចិត្ត ធានាត្រឹមត្រូវ ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង។",
  keywords: [
    "S Tech",
    "s tech",
    "STech",
    "S-Tech",
    "stech",
    "s_tech",
    "S Tech Store",
    "s tech store",
    "S-Tech Store",
    "STech Store",
    "S Tech Cambodia",
    "s tech cambodia",
    "s tech phnom penh",
    "s tech store cambodia",
    "s tech computer",
    "s tech laptop",
    "s tech gaming pc",
    "s tech pc",
    "s tech build pc",
    "s tech accessories",
    "ហាង S Tech",
    "កុំព្យូទ័រ S Tech",
    "ហាងកុំព្យូទ័រ S Tech",
    "ទិញកុំព្យូទ័រ S Tech",
    "កុំព្យូទ័រយួរដៃ S Tech",
    "laptop cambodia",
    "gaming pc cambodia",
    "computer shop phnom penh",
    "phone accessories",
    "ជួសជុលកុំព្យូទ័រ",
    "គ្រឿងបន្លាស់ pc",
    "s-tech-store.tech"
  ],
  authors: [{ name: "S Tech", url: "https://www.s-tech-store.tech" }],
  creator: "S Tech",
  publisher: "S Tech",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "S Tech — #1 Laptop, Gaming PC & Tech Store in Cambodia",
    description: "S Tech (S Tech Store Cambodia) ផ្គត់ផ្គង់ Laptops, Custom Gaming PC, Monitors, គ្រឿងបន្លាស់កុំព្យូទ័រ និងសេវាជួសជុលរហ័សទាន់ចិត្ត ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង។",
    url: "https://www.s-tech-store.tech",
    siteName: "S Tech",
    images: [
      {
        url: "https://www.s-tech-store.tech/og-image.png",
        secureUrl: "https://www.s-tech-store.tech/og-image.png",
        width: 1200,
        height: 630,
        alt: "S Tech - Official Computer & Tech Hub in Cambodia",
        type: "image/png",
      },
    ],
    locale: "km_KH",
    alternateLocale: ["en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S Tech — #1 Laptop, Gaming PC & Tech Store in Cambodia",
    description: "Laptops, Gaming PC Builds, Accessories & Professional Repair Services in Phnom Penh, Cambodia.",
    images: ["https://www.s-tech-store.tech/og-image.png"],
    creator: "@STechStore",
    site: "@STechStore",
  },
  other: {
    "og:image:secure_url": "https://www.s-tech-store.tech/og-image.png",
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:type": "image/png",
    "twitter:image:alt": "S Tech - Official Computer & Tech Hub in Cambodia",
    "apple-mobile-web-app-title": "S Tech",
    "application-name": "S Tech",
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
      "x-default": "https://www.s-tech-store.tech",
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'S Tech',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
      { url: '/icon.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  verification: {
    google: '3660d58f4e2bffb0',
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "OnlineStore", "ComputerStore", "ElectronicsStore"],
      "@id": "https://www.s-tech-store.tech/#organization",
      "name": "S Tech",
      "legalName": "S Tech Store Cambodia",
      "alternateName": [
        "s tech",
        "STech",
        "S-Tech",
        "stech",
        "s_tech",
        "S Tech Store",
        "s tech store",
        "S-Tech Store",
        "STech Store",
        "S Tech Cambodia",
        "s tech cambodia",
        "S Tech Store Cambodia",
        "ហាង S Tech Store",
        "ហាងកុំព្យូទ័រ S Tech",
        "ហាង S Tech",
        "កុំព្យូទ័រ S Tech"
      ],
      "url": "https://www.s-tech-store.tech",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://www.s-tech-store.tech/#logo",
        "url": "https://www.s-tech-store.tech/logo.png",
        "contentUrl": "https://www.s-tech-store.tech/logo.png",
        "width": 512,
        "height": 512,
        "caption": "S Tech Logo"
      },
      "image": "https://www.s-tech-store.tech/og-image.png",
      "description": "Leading computer, laptop, custom gaming PC, and IT repair store in Phnom Penh, Cambodia. Fast delivery nationwide.",
      "telephone": "+855-12-345-678",
      "email": "support@stechstore.com.kh",
      "priceRange": "$$",
      "currenciesAccepted": "USD, KHR",
      "paymentAccepted": "Cash, ABA PAY, Bakong KHQR, Credit Card",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Street 271",
        "addressLocality": "Phnom Penh",
        "addressRegion": "Phnom Penh",
        "postalCode": "12000",
        "addressCountry": "KH"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "11.5564",
        "longitude": "104.9282"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "08:00",
          "closes": "20:00"
        }
      ],
      "sameAs": [
        "https://t.me/S_TECH_ASSISTANTBOT",
        "https://t.me/COMPUTERSTOREBUY",
        "https://t.me/PCANDGAMESTORE",
        "https://www.s-tech-store.tech"
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "telephone": "+855-12-345-678",
          "contactType": "customer service",
          "areaServed": "KH",
          "availableLanguage": ["Khmer", "English"]
        },
        {
          "@type": "ContactPoint",
          "telephone": "+855-87-948-370",
          "contactType": "sales",
          "areaServed": "KH",
          "availableLanguage": ["Khmer", "English"]
        }
      ],
      "brand": {
        "@type": "Brand",
        "name": "S Tech",
        "alternateName": ["s tech", "STech", "S-Tech", "S Tech Store"]
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "bestRating": "5",
        "ratingCount": "128",
        "reviewCount": "128"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.s-tech-store.tech/#website",
      "url": "https://www.s-tech-store.tech",
      "name": "S Tech",
      "alternateName": [
        "s tech",
        "STech",
        "S-Tech",
        "stech",
        "S Tech Store",
        "s tech store",
        "S-Tech Store",
        "STech Store",
        "S Tech Cambodia",
        "s tech cambodia"
      ],
      "publisher": { "@id": "https://www.s-tech-store.tech/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.s-tech-store.tech/products?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://www.s-tech-store.tech/#sitelinks",
      "name": "S Tech Navigation",
      "itemListElement": [
        {
          "@type": "SiteNavigationElement",
          "position": 1,
          "name": "S Tech Products & Laptops",
          "description": "Genuine Laptops, Gaming PCs, Monitors and Accessories.",
          "url": "https://www.s-tech-store.tech/products"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 2,
          "name": "Custom PC Builder (S Tech)",
          "description": "Build and customize gaming rigs with live compatibility check.",
          "url": "https://www.s-tech-store.tech/build-pc"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 3,
          "name": "Promotions & Hot Deals",
          "description": "Special discounts and promo codes for tech items.",
          "url": "https://www.s-tech-store.tech/promotions"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 4,
          "name": "IT Repair & Maintenance Services",
          "description": "Fast diagnostics, genuine parts, and expert technician repair.",
          "url": "https://www.s-tech-store.tech/services"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 5,
          "name": "Contact S Tech Store",
          "description": "Phone: 012 345 678, Telegram, and store location in Phnom Penh.",
          "url": "https://www.s-tech-store.tech/contact"
        },
        {
          "@type": "SiteNavigationElement",
          "position": 6,
          "name": "Warranty & Support Policy",
          "description": "Official product warranty and reliable customer support.",
          "url": "https://www.s-tech-store.tech/warranty"
        }
      ]
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
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0c0e14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Google & Browser Favicons (Standards compliant: ICO & 48px square multiples) */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700;900&family=Dangrek&family=Koh+Santepheap:wght@300;400;700;900&family=Noto+Sans+Khmer:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
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
                if (!f || f === 'noto-sans' || f === 'kantumruy' || f === 'inter') {
                  f = 'koh-santepheap';
                  localStorage.setItem('stech_font_system', 'koh-santepheap');
                }
                document.documentElement.setAttribute('data-font', f);
              } catch(e) {}
            `,
          }}
        />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body suppressHydrationWarning className={`${notoSansKhmer.variable} ${plusJakarta.variable}`}>
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

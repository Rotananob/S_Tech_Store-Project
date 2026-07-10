import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "S Tech Store — Premium Computer & Tech Shop",
    template: "%s | S Tech Store",
  },
  description:
    "Shop the latest laptops, desktops, monitors, gaming gear and accessories at S Tech Store. Best prices guaranteed.",
  keywords: ["computer shop", "laptops", "gaming gear", "tech store", "S Tech Store"],
  authors: [{ name: "S Tech Store" }],
  openGraph: {
    title: "S Tech Store — Premium Computer & Tech Shop",
    description: "Shop the latest laptops, desktops, monitors, gaming gear and accessories.",
    type: "website",
    locale: "en_US",
    siteName: "S Tech Store",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

# Implementation Plan 4: SEO, PWA & Responsive Design

## Goal
To elevate the S Tech Store project to a world-class production standard by implementing Advanced SEO (Search Engine Optimization), converting the site into a Progressive Web App (PWA) so users can install it on their phones, and ensuring a flawless Responsive Design across all devices (Mobile, Tablet, Desktop, iOS, and Android).

## User Review Required
> [!IMPORTANT]  
> 1. **PWA Icons:** We will need a square version of your logo to generate PWA app icons (192x192 and 512x512). Do you want me to generate these automatically from your existing `logo.jpg`?
> 2. **SEO Name:** Do you want the primary search name on Google to be "S Tech Store - Cambodia" or something else?

## Proposed Changes

### Phase 1: Advanced SEO (Search Engine Optimization)
- **Dynamic Metadata & i18n:** Update `generateMetadata` in layout and pages to support both English and Khmer. Include Open Graph (Facebook/Telegram) and Twitter Card tags.
- **Sitemap & Robots:** Generate `sitemap.ts` (with language alternates) and `robots.txt` so Google can crawl the site perfectly.
- **JSON-LD (Structured Data):** Add E-commerce structured data to the Product Detail pages so prices and stock show directly in Google Search results.

### Phase 2: Progressive Web App (PWA) Setup
- **Service Worker Configuration:** Install modern PWA libraries (e.g., `@serwist/next`) to cache assets and allow the site to load faster and work offline.
- **Manifest.json:** Create `manifest.ts` defining the App Name, Theme Color, and Display Mode (Standalone).
- **iOS & Android Support:** Add Apple Touch Icons (`apple-touch-icon.png`) and Android specific meta tags so users get a native app-like experience when saving to their home screen.

### Phase 3: Responsive Design Audit & Mobile Optimization
- **Mobile Navbar:** Ensure the hamburger menu and language switcher are perfectly aligned and usable on small screens (iPhone SE to Pro Max).
- **Product Grids:** Audit Tailwind classes to ensure smooth transitions: 1 column on Mobile (`grid-cols-1`), 2 columns on Tablet (`md:grid-cols-2`), and 4 columns on Desktop (`lg:grid-cols-4`).
- **Touch Targets & Safe Areas:** Ensure all "Add to Cart" and "Checkout" buttons are large enough for thumb-tapping (min 44px). Add `safe-area-inset` padding for iOS devices with notches.
- **Cart & Checkout Layout:** Ensure the shopping cart table transforms into a stacked card layout on mobile so it doesn't break horizontally.

### Phase 4: Performance & Lighthouse QA
- Run a full Google Lighthouse audit on local build.
- Optimize image loading with Next.js `<Image>` component `priority` and `sizes` attributes.

## Verification Plan
1. Simulate mobile and tablet views in Chrome DevTools to verify responsive layouts.
2. Verify that the "Install App" prompt appears (or check the Manifest in DevTools).
3. Check `<head>` tags to ensure proper SEO tags and `hreflang` attributes are injected.

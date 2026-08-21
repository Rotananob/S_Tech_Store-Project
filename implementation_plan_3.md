# Implementation Plan 3: Internationalization (Khmer & English)

## Goal
Implement a complete dual-language system (Khmer and English) across all pages of the S Tech Store frontend. The translation must be high quality (not robotic Google Translate) and use beautiful Khmer fonts.

## User Review Required
> [!IMPORTANT]  
> Changing a Next.js App Router to support multiple languages requires changing the folder structure. 
> Do you prefer:
> **Option A (Best for SEO & Professional):** URL changes when language changes. Example: `s-tech-store.com/km/cart` vs `s-tech-store.com/en/cart`.
> **Option B (Faster to build, no URL change):** Language changes instantly without changing the URL (using Zustand/Cookies).

I highly recommend **Option A** for a client project to ensure the highest quality.

## Proposed Changes

### 1. Font Configuration
- We will standardize the use of **Noto Sans Khmer** (which is already loaded but needs to be applied beautifully) or integrate **Kantumruy Pro** / **Suwannaphum** for a more premium look.
- Apply a custom Tailwind class for Khmer text to ensure perfect line-height and rendering.

### 2. Dictionary Setup
- Create `messages/en.json` (English Dictionary)
- Create `messages/km.json` (Khmer Dictionary) with high-quality, natural-sounding translations. For example:
  - "Home" -> "ទំព័រដើម" (Not ផ្ទះ)
  - "Add to Cart" -> "បន្ថែមចូលកន្ត្រក"
  - "Checkout" -> "ទូទាត់ប្រាក់"
  - "Your Hub for Genuine Tech" -> "មជ្ឈមណ្ឌលបច្ចេកវិទ្យាសុទ្ធ ១០០% នៅកម្ពុជា"

### 3. Routing & State Architecture (Assuming Option A)
- Move existing routes into `app/[locale]/...`
- Create `middleware.ts` to detect the user's preferred language and automatically route them (e.g., default to `km`).
- Create a Language Switcher component in the Header (e.g., a dropdown or a Flag icon).

### 4. Component Refactoring
- Wrap standard strings in a translation hook (e.g., `useTranslations()` or dictionary mapping).
- Update all Next.js `<Link>` components to respect the current locale.

## Verification Plan
1. Ensure the Language Switcher is visible and functional on the navbar.
2. Toggle between EN and KM on the Home, Cart, and Product pages.
3. Verify no hydration errors occur.
4. Verify the font renders Khmer characters flawlessly without clipping.

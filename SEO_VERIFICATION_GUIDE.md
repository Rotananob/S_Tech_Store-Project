# 🔍 មគ្គុទ្ទេសក៍ផ្ទៀងផ្ទាត់ SEO & Custom Domain ឱ្យជាប់ Google ១០០%
> **គោលបំណង:** ធ្វើឱ្យគេហទំព័រ `s-tech-store.tech` ជាប់ចំណាត់ថ្នាក់ខ្ពស់លើ Google Search, ឆែករកឃើញគ្រប់ទំព័រ (All Pages Indexed), និងលោត Rich Results (Logo, តម្លៃ, ការវាយតម្លៃ) យ៉ាងមានប្រសិទ្ធភាព។

---

## 🛠️ ជំហានទី ១៖ ផ្ទៀងផ្ទាត់ Google Search Console (GSC Verification)

គេហទំព័រយើងត្រូវបានរៀបចំកូដផ្ទៀងផ្ទាត់រួចជាស្រេចទាំង ២ របៀប (HTML Tag & HTML File)៖
* **Verification Code:** `3660d58f4e2bffb0`
* **File ក្នុង Public:** `https://www.s-tech-store.tech/google3660d58f4e2bffb0.html`

### របៀបធ្វើ៖
1. ចូលទៅកាន់ [Google Search Console](https://search.google.com/search-console)
2. ចុច **Add Property**
3. ជ្រើសរើសយក **URL prefix** រួចវាយបញ្ចូល៖ `https://www.s-tech-store.tech`
4. ជ្រើសរើសវិធីផ្ទៀងផ្ទាត់ (Verification Method)៖
   - **វិធី HTML tag:** ចុច **Verify** ភ្លាមៗ (ព្រោះនៅក្នុង `layout.tsx` បានបង្កប់ Meta Tag រួចហើយ)
   - **វិធី HTML file:** ចុច **Verify** ភ្លាមៗ (ព្រោះ File មាននៅក្នុង `public/` រួចហើយ)
5. ប្រសិនបើបងចង់ Verify កម្រិត **Domain Property (គ្របដណ្តប់ Subdomain ទាំងអស់)**៖
   - គ្រាន់តែចូលទៅកាន់ Cloudflare / Namecheap (កន្លែងគ្រប់គ្រង Domain)
   - Add Record ប្រភេទ **TXT**:
     - **Name:** `@`
     - **Content:** `google-site-verification=3660d58f4e2bffb0`
   - រួចចុច **Verify** ក្នុង Google Search Console ជាការស្រេច!

---

## 🗺️ ជំហានទី ២៖ ដាក់បញ្ជូន Sitemap ទៅ Google (Submit Sitemap.xml)

ប្រព័ន្ធយើងមាន Dynamic Sitemap ស្រាប់នៅ `app/sitemap.ts` ដែលទាញយកទាំងទំព័រថេរ (Static Pages) និងទំនិញថ្មីៗពី PostgreSQL Database ដោយស្វ័យប្រវត្តិ។

### របៀបធ្វើ៖
1. ក្នុងផ្ទាំង Google Search Console ខាងឆ្វេងដៃ ចុចលើពាក្យ **Sitemaps**
2. នៅប្រអប់ **Add a new sitemap** វាយបញ្ចូលពាក្យ៖
   ```text
   sitemap.xml
   ```
3. ចុចប៊ូតុង **Submit**
4. រង់ចាំពីរបីវិនាទី Google នឹងបង្ហាញស្ថានភាព **Success (ពណ៌បៃតង 🟢)** ដែលមានន័យថា Google ស្គាល់រាល់ Link ទាំងអស់ (ទាំងភាសាខ្មែរ `/km/...` និងអង់គ្លេស `/en/...`)។

---

## 🤖 ជំហានទី ៣៖ ផ្ទៀងផ្ទាត់ឯកសារ Robots.txt

យើងបានកំណត់ `robots.ts` ឱ្យអនុញ្ញាតឱ្យ Googlebot ចូល Index គ្រប់ទំព័រផលិតផល ប៉ុន្តែបិទមិនឱ្យ Googlebot ចូលទំព័រ Admin (`/rok-mix-khernh/`) និងទំព័រ Checkout ដើម្បីរក្សាសុវត្ថិភាព។

* បងអាចបើកមើលលើ Browser ផ្ទាល់៖ `https://www.s-tech-store.tech/robots.txt`
* ត្រូវប្រាកដថាវាបង្ហាញត្រឹមត្រូវតាមទម្រង់៖
  ```txt
  User-Agent: *
  Allow: /
  Disallow: /rok-mix-khernh/
  Disallow: /api/
  Disallow: /checkout
  Sitemap: https://www.s-tech-store.tech/sitemap.xml
  ```

---

## ⚡ ជំហានទី ៤៖ ស្នើសុំឱ្យ Googlebot ចុះ Index ភ្លាមៗ (Instant URL Inspection)

ដើម្បីកុំឱ្យរង់ចាំ Google យូរ (ធម្មតាត្រូវរង់ចាំ ៧ ទៅ ១៤ ថ្ងៃ) បងអាចប្រើក្បាច់ **Force Request Indexing** ធ្វើឱ្យ Google ចាប់យកក្នុងរយៈពេល **២៤ ទៅ ៤៨ ម៉ោង**៖

1. នៅលើរបារស្វែងរកខាងលើនៃ Google Search Console វាយបញ្ចូល Link៖
   - `https://www.s-tech-store.tech/km`
   - `https://www.s-tech-store.tech/km/products`
   - `https://www.s-tech-store.tech/km/pc-builder`
2. ចុច **Enter**
3. ចុចប៊ូតុង **"Test Live URL"** (រង់ចាំប្រហែល ៣០ វិនាទី)
4. នៅពេលឃើញសញ្ញាគ្រីសពណ៌បៃតង ចុចប៊ូតុង **"Request Indexing"**
5. ធ្វើបែបនេះសម្រាប់ Home Page និងទំព័រផលិតផលសំខាន់ៗ Googlebot នឹងមក Crawl ភ្លាមៗ!

---

## 🌟 ជំហានទី ៥៖ ពិនិត្យមើល Rich Snippets (Schema.org Structured Data)

គេហទំព័រយើងមាន Schema.org ប្រភេទ **Organization, WebSite, Store, និង LocalBusiness** បង្កប់ស្រាប់ក្នុង `layout.tsx`។

1. ចូលទៅកាន់ [Google Rich Results Test](https://search.google.com/test/rich-results)
2. វាយបញ្ចូល URL: `https://www.s-tech-store.tech/km`
3. ចុច **Test URL**
4. Google នឹងបង្ហាញថាគេហទំព័រយើងមាន Structured Data ត្រឹមត្រូវ ដែលធ្វើឱ្យពេលគេ Search លើ Google វានឹងចេញ **Logo ហាង, អាសយដ្ឋានភ្នំពេញ, លេខទូរស័ព្ទ, និង Sitelinks Searchbox** យ៉ាងស្រស់ស្អាតលើគេ!

---

## 📱 ជំហានទី ៦៖ ផ្ទៀងផ្ទាត់កាតចែករំលែកលើ Telegram & Facebook (OpenGraph Social Cards)

នៅពេលបង copy link `https://www.s-tech-store.tech` ទៅផ្ញើក្នុង Telegram ឬបង្ហោះលើ Facebook៖
* វាបង្ហាញរូប Banner ផ្លូវការ (`og-image.png`) ទំហំ 1200x630px
* បង្ហាញចំណងជើងជាភាសាខ្មែរ៖ *"S Tech Store — ហាងលក់ និងជួសជុលកុំព្យូទ័រ ស្មាតហ្វូន..."*
* បង្ហាញ Description សង្ខេបពីសេវាកម្មកុំព្យូទ័រ និងការដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង

*(រាល់ពេលបង្ហោះ link គឺមើលទៅអាជីព និងទាក់ទាញអតិថិជនចុចចូលទស្សនាទ្វេដង!)*

# 📘 S Tech Store — សៀវភៅណែនាំការប្រើប្រាស់ និងលក្ខណៈពិសេសទាំងមូល (Master Features & User Manual)

> **ឯកសារផ្លូវការសម្រាប់អតិថិជន និងម្ចាស់អាជីវកម្ម (Official Client & Operations Manual)**  
> កំណែប្រែ៖ **Version 1.2.0 (Build 20261016.01) — Production Master Edition**  
> ស្ថានភាព៖ **Production Verified & Live**  
> ភាសា៖ **ខ្មែរ (Khmer) & English Reference**  
> 📖 **សៀវភៅបណ្តុះបណ្តាលបុគ្គលិកលម្អិត៖** [ADMIN_AND_STAFF_TRAINING_GUIDE.md](file:///d:/WEB%20Development/S%20Tech%20Store/ADMIN_AND_STAFF_TRAINING_GUIDE.md)

---

## 📑 មាតិកា (Table of Contents)
1. [សេចក្តីផ្តើម (Introduction)](#1-សេចក្តីផ្តើម-introduction)
2. [ផ្នែកអតិថិជន (Customer Storefront Features)](#2-ផ្នែកអតិថិជន-customer-storefront-features)
   - [២.១ ទំព័រដើម និងផ្ទាំងផ្សព្វផ្សាយ (Home & Dynamic Banners)](#២១-ទំព័រដើម-និងផ្ទាំងផ្សព្វផ្សាយ-home--dynamic-banners)
   - [២.២ ប្រព័ន្ធស្វែងរកទំនិញឆ្លាតវៃ (Live Predictive Search & Filter)](#២២-ប្រព័ន្ធស្វែងរកទំនិញឆ្លាតវៃ-live-predictive-search--filter)
   - [២.៣ ស្កេនរូបភាពកាមេរ៉ាឆ្លាតវៃ (Camera Visual AI Search — Hero Feature)](#២៣-ស្កេនរូបភាពកាមេរ៉ាឆ្លាតវៃ-camera-visual-ai-search--hero-feature)
   - [២.៤ ទំព័រព័ត៌មានលម្អិតទំនិញ (Product Details, Specs & Reviews)](#២៤-ទំព័រព័ត៌មានលម្អិតទំនិញ-product-details-specs--reviews)
   - [២.៥ កន្ត្រកទំនិញរហ័ស (Interactive Slide-Over Cart)](#២៥-កន្ត្រកទំនិញរហ័ស-interactive-slide-over-cart)
   - [២.៦ ដំណើរការទូទាត់ប្រាក់ និង Bakong KHQR (Checkout & Payment Gateway)](#២៦-ដំណើរការទូទាត់ប្រាក់-និង-bakong-khqr-checkout--payment-gateway)
   - [២.៧ ឧបករណ៍ផ្គុំកុំព្យូទ័រតាមចិត្ត (Interactive Custom PC Builder)](#២៧-ឧបករណ៍ផ្គុំកុំព្យូទ័រតាមចិត្ត-interactive-custom-pc-builder)
   - [២.៨ សេវាកម្មជួសជុល និងថែទាំកុំព្យូទ័រ (Repairs & Maintenance Booking)](#២៨-សេវាកម្មជួសជុល-និងថែទាំកុំព្យូទ័រ-repairs--maintenance-booking)
   - [២.៩ គណនីផ្ទាល់ខ្លួន និងការតាមដានការដឹកជញ្ជូន (VIP Profile & Order Tracking)](#២៩-គណនីផ្ទាល់ខ្លួន-និងការតាមដានការដឹកជញ្ជូន-vip-profile--order-tracking)
   - [២.១០ ប្រព័ន្ធចូលគណនីឆ្លាតវៃ (1-Click Telegram Handshake & Social Auth)](#២១០-ប្រព័ន្ធចូលគណនីឆ្លាតវៃ-1-click-telegram-handshake--social-auth)
   - [២.១១ ការដំឡើង App លើទូរស័ព្ទ (PWA - Add to Home Screen)](#២១១-ការដំឡើង-app-លើទូរស័ព្ទ-pwa---add-to-home-screen)
   - [២.១២ ទិញទំនិញផ្ទាល់ក្នុង Telegram Mini App (In-Telegram Smart Shopping)](#២១២-ទិញទំនិញផ្ទាល់ក្នុង-telegram-mini-app-in-telegram-smart-shopping)
3. [ផ្នែកគ្រប់គ្រងហាង និងបុគ្គលិក (Admin & Staff Portal — `/rok-mix-khernh`)](#3-ផ្នែកគ្រប់គ្រងហាង-និងបុគ្គលិក-admin--staff-portal--rok-mix-khernh)
   - [៣.១ ផ្លូវសម្ងាត់ និងការការពារសុវត្ថិភាព (Secret Route & RBAC Permissions)](#៣១-ផ្លូវសម្ងាត់-និងការការពារសុវត្ថិភាព-secret-route--rbac-permissions)
   - [៣.២ ផ្ទាំងស្ថិតិទូទៅ (Real-time Analytics Dashboard)](#៣២-ផ្ទាំងស្ថិតិទូទៅ-real-time-analytics-dashboard)
   - [៣.៣ ការគ្រប់គ្រងការបញ្ជាទិញ និងបោះពុម្ពវិក្កយបត្រ (Orders & Invoice Printing)](#៣៣-ការគ្រប់គ្រងការបញ្ជាទិញ-និងបោះពុម្ពវិក្កយបត្រ-orders--invoice-printing)
   - [៣.៤ ការគ្រប់គ្រងទំនិញ និងស្តុក (Catalog, Image Upload & Stock Matrix)](#៣៤-ការគ្រប់គ្រងទំនិញ-និងស្តុក-catalog-image-upload--stock-matrix)
   - [៣.៥ ការគ្រប់គ្រងគណនីអតិថិជន និង Pagination (Users & Dual Auth DB)](#៣៥-ការគ្រប់គ្រងគណនីអតិថិជន-និង-pagination-users--dual-auth-db)
   - [៣.៦ ប្រព័ន្ធគ្រប់គ្រងការជួសជុលកុំព្យូទ័រ (Hardware Repair Management)](#៣៦-ប្រព័ន្ធគ្រប់គ្រងការជួសជុលកុំព្យូទ័រ-hardware-repair-management)
   - [៣.៧ ការគ្រប់គ្រងវេនការងារ និងប្រអប់លុយ (Staff Shifts & Cash Register POS)](#៣៧-ការគ្រប់គ្រងវេនការងារ-និងប្រអប់លុយ-staff-shifts--cash-register-pos)
   - [៣.៨ ការគ្រប់គ្រងប្រូម៉ូសិន និងគូប៉ុង (Coupons & Promotions)](#៣៨-ការគ្រប់គ្រងប្រូម៉ូសិន-និងគូប៉ុង-coupons--promotions)
   - [៣.៩ ការកំណត់សាខាហាង (Branches Management)](#៣៩-ការកំណត់សាខាហាង-branches-management)
   - [៣.១០ ការគ្រប់គ្រង Telegram Bot & របាយការណ៍ស្វ័យប្រវត្តិ (Telegram Alerts & Auto Reports)](#៣១០-ការគ្រប់គ្រង-telegram-bot--របាយការណ៍ស្វ័យប្រវត្តិ-telegram-alerts--auto-reports)
   - [៣.១១ ផ្ទាំងបញ្ជាពិសេសរបស់ម្ចាស់ប្រព័ន្ធ (Grand Master Console — Owner Only)](#៣១១-ផ្ទាំងបញ្ជាពិសេសរបស់ម្ចាស់ប្រព័ន្ធ)
   - [៣.១២ Admin PWA សម្រាប់បុគ្គលិកហាង](#៣១២-admin-pwa-សម្រាប់បុគ្គលិកហាង)
4. [ប្រព័ន្ធស្វ័យប្រវត្តិកម្ម Dual Telegram Bot](#4-ប្រព័ន្ធស្វ័យប្រវត្តិកម្ម-dual-telegram-bot)
5. [ប្រព័ន្ធសុវត្ថិភាពកម្រិតខ្ពស់ (5-Stage Red Team Hardening)](#5-ប្រព័ន្ធសុវត្ថិភាពកម្រិតខ្ពស់-5-stage-red-team-hardening)
6. [សំណួរញឹកញាប់ និងការដោះស្រាយបញ្ហា (FAQ & Troubleshooting)](#6-សំណួរញឹកញាប់-និងការដោះស្រាយបញ្ហា-faq--troubleshooting)

---

## 1. សេចក្តីផ្តើម (Introduction)

**S Tech Store** គឺជាប្រព័ន្ធ E-Commerce និងគ្រប់គ្រងអាជីវកម្មបច្ចេកវិទ្យា (Computer & Electronics Retail Platform) ជំនាន់ថ្មីដែលត្រូវបានរចនាឡើងយ៉ាងម៉ត់ចត់បំផុត ស្របតាមស្តង់ដារវិស្វកម្មសកល និងសមស្រប ១០០% សម្រាប់ទីផ្សារប្រទេសកម្ពុជា។

### ចំណុចខ្លាំងលេចធ្លោបំផុតរបស់ប្រព័ន្ធ៖
* ⚡ **ល្បឿនលឿនកម្រិតកំពូល**៖ បង្កើតឡើងដោយ Next.js 16 (App Router + Turbopack) ធ្វើឱ្យការបើកទំព័រ និងការបញ្ជាទិញមានភាពរលូនគ្មានទាក់ទើឡើយ។
* 🇰🇭 **គាំទ្រប្រព័ន្ធបង់ប្រាក់ជាតិ Bakong KHQR**៖ បង្កើតកូដ KHQR Dynamic ដោយស្វ័យប្រវត្តិតាមស្តង់ដារ EMVCo និងពិនិត្យមើលស្ថានភាពបង់ប្រាក់ Real-time ជាមួយធនាគារជាតិនៃកម្ពុជា (NBC)។
* 🤖 **ប្រព័ន្ធតេឡេក្រាមស្វ័យប្រវត្តិ ២ ដាច់ដោយឡែកពីគ្នា (Dual Telegram Bots)**៖
  1. **Bot ទី១ (សម្រាប់ម្ចាស់ហាង និងបុគ្គលិក)**៖ ផ្ញើដំណឹងភ្លាមៗចូលគ្រុបហាងពេលមាន Order ថ្មី, ស្តុកជិតអស់, ប្តូរវេនការងារ, និងសំបុត្រជួសជុល។
  2. **Bot ទី២ (`@S_TECH_ASSISTANTBOT`)**៖ បម្រើអតិថិជនផ្ទាល់ ដោយផ្ញើវិក្កយបត្រឌីជីថល (Digital Receipts), លេខទូរស័ព្ទអ្នកដឹក, និងអាច Login ដោយមិនបាច់វាយលេខសម្ងាត់ (1-Click Handshake)។
* 📱 **តម្លើងជា App លើទូរស័ព្ទបាន (PWA)**៖ ទាំងអតិថិជន និងបុគ្គលិកអាច Add to Home Screen ប្រើដូច Native App នៅលើ iPhone និង Android។
* 🛡️ **សុវត្ថិភាពរឹងមាំឆ្លងកាត់ការធ្វើ Pentest ៥ ដំណាក់កាល**៖ ការពារទិន្នន័យអតិថិជន និងទិន្នន័យហិរញ្ញវត្ថុពីការវាយប្រហារតាមអ៊ីនធឺណិត។

---

## 2. ផ្នែកអតិថិជន (Customer Storefront Features)

### ២.១ ទំព័រដើម និងផ្ទាំងផ្សព្វផ្សាយ (Home & Dynamic Banners)
* **Hero Carousel Banner**៖ បង្ហាញប្រូម៉ូសិនថ្មីៗ និងផលិតផលលេចធ្លោ ដោយអាចចុចអូស (Touch Swipe) លើទូរស័ព្ទដៃបានយ៉ាងរលូន។
* **Hot Deals & Countdown Timer**៖ ផ្នែកលក់បញ្ចុះតម្លៃពិសេសដែលមាននាឡិការាប់ថយក្រោយជំរុញការទិញ (Flash Sales)។
* **Category Navigation**៖ រូបតំណាងប្រភេទផលិតផលស្អាតបែបទំនើប (Laptops, Desktops, PC Components, Accessories, Gaming Monitors, Networking)។
* **Bilingual Switcher**៖ ប្តូរភាសាខ្មែរ ↔ អង់គ្លេស ភ្លាមៗដោយរក្សាទំព័រ និងទំនិញដែលកំពុងមើល។
* **Dark / Light Theme**៖ គាំទ្រពន្លឺងងឹត និងភ្លឺ ស្រួលភ្នែកពេលមើលពេលយប់។

### ២.២ ប្រព័ន្ធស្វែងរកទំនិញឆ្លាតវៃ (Live Predictive Search & Filter)
* **Live Search Dropdown**៖ គ្រាន់តែវាយអក្សរ ១ ឬ ២ តួ ប្រព័ន្ធនឹងទាញទំនិញមកបង្ហាញភ្លាមៗព្រមទាំងរូបភាព, តម្លៃ, និងស្ថានភាពស្តុក (In Stock / Out of Stock)។
* **Advanced Filters**៖
  * ត្រងតាមម៉ាក (Brand: ASUS, MSI, Dell, Apple, Razer, Corsair...)
  * ត្រងតាមចន្លោះតម្លៃ (Price Range Slider)
  * ត្រងតាមលក្ខណៈបច្ចេកទេស (Specs: Intel i5/i7/i9, AMD Ryzen, RTX 40-Series, RAM 16GB/32GB, SSD 512GB/1TB/2TB)
  * តម្រៀបតាម៖ តម្លៃទាបទៅខ្ពស់, តម្លៃខ្ពស់ទៅទាប, ទំនិញថ្មីបំផុត, និងពិន្ទុ Review ខ្ពស់បំផុត។

### ២.៣ ស្កេនរូបភាពកាមេរ៉ាឆ្លាតវៃ (Camera Visual AI Search — Hero Feature)
* 📸 **Floating Luminous Camera Shutter**៖ ប៊ូតុងកាមេរ៉ារាងមូលពន្លឺចាំងផ្លេកបែប **Ruby Glowing Gem** នៅចំកណ្តាលរបារ Bottom Nav (លើទូរស័ព្ទដៃ) និងនៅខាងក្នុងប្រអប់ស្វែងរក (លើកុំព្យូទ័រ)។
* **Instant Pattern & Object Recognition**៖ អតិថិជន ឬបុគ្គលិកហាង អាចចុចថតរូបកុំព្យូទ័រ Laptop, គ្រឿង PC, ឬរូបថតអេក្រង់ដែលទាញយកពីក្នុងទូរស័ព្ទ ➔ ប្រព័ន្ធនឹងវិភាគរូបភាព និងស្វែងរកទំនិញដែលត្រូវគ្នាក្នុងឃ្លាំងរបស់ S Tech Store ភ្លាមៗក្នុងរយៈពេល **១ វិនាទី**។
* គាំទ្រការប្រើប្រាស់កាមេរ៉ាមុខ/ក្រោយ (Front/Rear Camera Flip) និងការជ្រើសរើសរូបភាពពី Photo Albums។

### ២.៤ ទំព័រព័ត៌មានលម្អិតទំនិញ (Product Details, Specs & Reviews)
* **Interactive Image Gallery**៖ រូបភាពផលិតផលច្បាស់កម្រិតខ្ពស់ អាចចុច Zoom មើលលម្អិត និងប្តូររូបភាពតាម Thumbnail។
* **Real-time Stock Counter**៖ បង្ហាញចំនួនទំនិញដែលនៅសល់ជាក់ស្តែងក្នុងឃ្លាំង មិនបារម្ភរឿងទិញជាន់គ្នា។
* **Full Technical Specifications**៖ តារាងលម្អិតអំពី CPU, GPU, Display, Battery, Ports, និងលក្ខខណ្ឌធានា (Warranty Period)។
* **Real Customer Reviews**៖ អតិថិជនដែលបានទិញពិតប្រាកដអាចដាក់ផ្កាយ (Rating 1–5 Stars) និងសរសេរមតិយោបល់ ដែលមានផ្លាកសម្គាល់ "Verified Buyer"។
* **Social Sharing**៖ ចុច Share ទៅកាន់ Telegram, Facebook, ឬ Copy Link បានយ៉ាងរហ័ស។

### ២.៥ កន្ត្រកទំនិញរហ័ស (Interactive Slide-Over Cart)
* **Flyout Cart Drawer**៖ ពេលចុច "Add to Cart" ផ្ទាំងកន្ត្រកនឹងរំកិលចេញមកពីចំហៀងភ្លាមៗ ដោយមិនបាច់ Refresh ឬចាកចេញពីទំព័រដែលកំពុងមើលឡើយ។
* **Adjust Quantity**៖ បន្ថែម ឬបន្ថយចំនួនទំនិញភ្លាមៗ ដោយមានប្រព័ន្ធទប់ស្កាត់មិនឱ្យលើសពីស្តុកដែលមាន។
* **Free Delivery Progress**៖ បង្ហាញរបាររំលឹកអតិថិជនថាត្រូវទិញប៉ុន្មានដុល្លារទៀតដើម្បីទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃ។

### ២.៦ ដំណើរការទូទាត់ប្រាក់ និង Bakong KHQR (Checkout & Payment Gateway)
* **One-Page Checkout**៖ បំពេញឈ្មោះ លេខទូរស័ព្ទ និងទីតាំងដឹកជញ្ជូន (រាជធានីភ្នំពេញ ឬតាមបណ្តាខេត្ត) យ៉ាងសាមញ្ញ និងលឿនរហ័ស។
* **Coupon Promo Code**៖ អាចបញ្ចូលកូដបញ្ចុះតម្លៃដើម្បីទទួលបានការបញ្ចុះតម្លៃភ្លាមៗ។
* **ជម្រើសទូទាត់ប្រាក់ចំនួន ៣ ប្រភេទ**៖
  1. **Bakong KHQR (ABA & គ្រប់ធនាគារទាំងអស់)**៖
     - បង្កើត QR Code ត្រឹមត្រូវតាមស្តង់ដារ EMVCo មានទឹកប្រាក់ជាក់លាក់ (Dynamic QR)។
     - គណនី ABA ទទួលប្រាក់៖ `014 579 634` (ឈ្មោះ `NOB ROTANA`)។
     - **Live Auto-Check Status**៖ ប្រព័ន្ធត្រួតពិនិត្យជាមួយ Bakong API ដោយស្វ័យប្រវត្តិតាមរយៈ Token ធនាគារជាតិ។ នៅពេលអតិថិជន Scan បង់លុយតាម App ធនាគាររួចភ្លាម វេបសាយនឹងបន្លឺសំឡេង "Ding!" បញ្ជាក់ការទូទាត់ជោគជ័យ ហើយរុញទៅកាន់ទំព័រ Order Confirmed ដោយមិនបាច់ Refresh ឡើយ!
  2. **ទូទាត់ពេលទំនិញមកដល់ (Cash on Delivery - COD)**៖ បង់លុយផ្ទាល់ជាមួយអ្នកដឹកជញ្ជូន។
  3. **ផ្ទេរប្រាក់ផ្ទាល់តាមគណនីធនាគារ (Direct Bank Transfer)**៖ បង្ហាញព័ត៌មានកុងធនាគារ និងអាច Upload បង្កាន់ដៃបង់ប្រាក់បាន។
* **Digital Invoice & Instant Telegram Dispatch**៖
  - ពេល Order ជោគជ័យ វិក្កយបត្រឌីជីថលពេញលេញនឹងត្រូវបានផ្ញើជូនអតិថិជនភ្លាមៗចូលទៅក្នុង **Telegram Bot `@S_TECH_ASSISTANTBOT`** របស់ពួកគាត់។

### ២.៧ ឧបករណ៍ផ្គុំកុំព្យូទ័រតាមចិត្ត (Interactive Custom PC Builder)
* ចូលទៅកាន់ `/build-pc` ដើម្បីជ្រើសរើសគ្រឿងបន្លាស់មួយឈុតដោយខ្លួនឯង៖
  * CPU (Processor)
  * Motherboard (Mainboard)
  * RAM (Memory)
  * GPU (Graphics Card)
  * Storage (SSD / HDD)
  * Power Supply (PSU)
  * Case (Computer Chassis)
  * Cooler (Liquid / Air Cooler)
* **Hardware Compatibility Validation**៖ ប្រព័ន្ធត្រួតពិនិត្យដោយស្វ័យប្រវត្តិដើម្បីធានាថា Socket CPU ត្រូវគ្នាជាមួយ Motherboard និងប្រភេទ RAM ត្រូវគ្នា (DDR4 / DDR5)។
* **Wattage Estimator**៖ គណនាថាមពលភ្លើងសរុប (Estimated Wattage) ដើម្បីណែនាំទំហំ PSU ឱ្យសមស្រប។
* **1-Click Add Entire Build to Cart**៖ ចុចតែមួយ Click បញ្ចូលគ្រឿងបន្លាស់ទាំងអស់ចូលក្នុងកន្ត្រកដើម្បី Checkout តែម្តង។

### ២.៨ សេវាកម្មជួសជុល និងថែទាំកុំព្យូទ័រ (Repairs & Maintenance Booking)
* អតិថិជនអាចស្នើសុំសេវាកម្មតាមរយៈទំព័រ `/services`៖
  * ជួសជុល Laptop / Desktop
  * ប្តូរកម្ដៅ Thermal Paste និងសម្អាតធូលី (Deep Cleaning)
  * ដំឡើង Windows និងកម្មវិធីស្របច្បាប់
  * Upgrade SSD, RAM, GPU
* អាចតាមដានដំណាក់កាលជួសជុលបានតាមរយៈលេខកូដសំបុត្រ (Repair Ticket ID)។

### ២.៩ គណនីផ្ទាល់ខ្លួន និងការតាមដានការដឹកជញ្ជូន (VIP Profile & Order Tracking)
* **VIP Member Badge**៖ កម្រិតសមាជិកភាពរបស់អតិថិជន (Standard, Silver, Gold, Platinum VIP) ផ្អែកលើប្រវត្តិទិញ។
* **Live Order Tracking**៖ មើលដំណាក់កាលនៃទំនិញ (កំពុងរៀបចំ → កំពុងដឹក → បានដឹកដល់) ព្រមទាំងមានលេខទូរស័ព្ទ និងឈ្មោះអ្នកដឹកជញ្ជូនផ្ទាល់។
* **Saved Addresses**៖ រក្សាទុកអាសយដ្ឋានច្រើនកន្លែង (ផ្ទះ, កន្លែងធ្វើការ) ស្រួលជ្រើសរើសពេលទិញលើកក្រោយ។
* **Wishlist**៖ បញ្ជីទំនិញដែលពេញចិត្ត ដោយអាចចុចបេះដូងទុកមើលពេលក្រោយ។
* **Security & 2FA OTP**៖ អាចបើកមុខងារផ្ទៀងផ្ទាត់ ២ ជាន់ (Two-Factor Authentication) ដើម្បីសុវត្ថិភាពគណនីខ្ពស់បំផុត។

### ២.១០ ប្រព័ន្ធចូលគណនីឆ្លាតវៃ (1-Click Telegram Handshake & Social Auth)
* **Telegram 1-Click Handshake Login**៖ មិនបាច់វាយ Email ឬ Password ឡើយ! គ្រាន់តែចុចប៊ូតុង "ចូលដោយប្រើ Telegram" វានឹងបើក Bot `@S_TECH_ASSISTANTBOT` រួច Log in ចូលវេបសាយដោយស្វ័យប្រវត្តិតាមបច្ចេកវិទ្យា Cryptographic Handshake។
* **Google, Apple, Facebook Login**៖ គាំទ្រការចូលតាមគណនីសង្គមល្បីៗប្រកបដោយសុវត្ថិភាព។
* **Traditional Email & Password**៖ មានប្រព័ន្ធ Password Strength Meter និង Reset Password តាម Email យ៉ាងត្រឹមត្រូវ។

### ២.១១ ការដំឡើង App លើទូរស័ព្ទ (PWA - Add to Home Screen)
* វេបសាយទាំងមូលត្រូវបានបង្កើតឡើងជា **Progressive Web App (PWA)**៖
  * **លើ iPhone (Safari)**៖ ចុចប៊ូតុង **Share** (សញ្ញាព្រួញចង្អុលឡើងលើ) ➔ រើសយក **"Add to Home Screen"**។
  * **លើ Android (Chrome)**៖ ចុចប៊ូតុង Menu (ចំណុច ៣) ➔ រើសយក **"Install App"** ឬ **"Add to Home Screen"**។
* បន្ទាប់ពីដំឡើងរួច Icon ហាង **S Tech Store** នឹងបង្ហាញនៅលើអេក្រង់ទូរស័ព្ទដូច App ធម្មតា ដោយបើកពេញអេក្រង់ (Standalone Fullscreen) គ្មានរបារ URL របស់ Browser ឡើយ និងដំណើរការលឿនដូច Native App!

### ២.១២ ទិញទំនិញផ្ទាល់ក្នុង Telegram Mini App (In-Telegram Smart Shopping)
* **ទិញទំនិញដោយផ្ទាល់ក្នុងកម្មវិធី Telegram** ដោយគ្រាន់តែចុចចូល Bot `@S_TECH_ASSISTANTBOT` រួចចុចប៊ូតុង Menu **"🛒 បើកហាង S Tech Store"**។
* **Auto-Authenticated** មិនបាច់វាយលេខសម្ងាត់ ដោយប្រព័ន្ធភ្ជាប់ជាមួយគណនី Telegram របស់គាត់ដោយស្វ័យប្រវត្តិ។
* គាំទ្រការស្កេនបង់ប្រាក់ Bakong KHQR ក្នុង Telegram និងទទួលវិក្កយបត្រឌីជីថលភ្លាមៗក្នុងប្រអប់ Chat។

---

## 3. ផ្នែកគ្រប់គ្រងហាង និងបុគ្គលិក (Admin & Staff Portal — `/rok-mix-khernh`)

### ៣.១ ផ្លូវសម្ងាត់ និងការការពារសុវត្ថិភាព (Secret Route & RBAC Permissions)
* **Secret Path**៖ ផ្លូវចូលគ្រប់គ្រងត្រូវបានលាក់នៅអាសយដ្ឋានពិសេស៖ **`/rok-mix-khernh`** (ជាភាសាខ្មែរ "រកម៉េចឃើញ") ដើម្បីទប់ស្កាត់ Bot និង Hacker ដែលព្យាយាមវាយប្រហារផ្លូវធម្មតាដូចជា `/admin` ឬ `/dashboard`។
* **Role-Based Access Control (RBAC)**៖ បែងចែកសិទ្ធិបុគ្គលិកយ៉ាងតឹងរ៉ឹង៖
  * **Super Admin / Owner**៖ មានសិទ្ធិពេញលេញលើប្រព័ន្ធទាំងមូល មើលរបាយការណ៍ហិរញ្ញវត្ថុ និងកំណត់សិទ្ធិអ្នកដទៃ។
  * **Admin / Store Manager**៖ គ្រប់គ្រង Order, ស្តុកទំនិញ, ប្រូម៉ូសិន, និងបុគ្គលិក។
  * **Cashier (គិតលុយ)**៖ គ្រប់គ្រងការចេញវិក្កយបត្រ, ទទួលលុយ, និងបិទ/បើកវេនការងារ (Shifts)។
  * **Technician (ជាងជួសជុល)**៖ ចូលមើល និងកែប្រែស្ថានភាពសំបុត្រជួសជុល (Repair Tickets)។

### ៣.២ ផ្ទាំងស្ថិតិទូទៅ (Real-time Analytics Dashboard)
* **Sales Summary Cards**៖ បង្ហាញចំណូលសរុបប្រចាំថ្ងៃ, ប្រចាំខែ, ចំនួន Order សរុប, និងចំនួនអតិថិជនថ្មី។
* **Interactive Revenue Charts**៖ ក្រាហ្វិកបង្ហាញពីការកើនឡើងនៃចំណូលប្រៀបធៀបតាមថ្ងៃ និងខែ។
* **Low Stock Warning Center**៖ ប្រអប់ជូនដំណឹងបន្ទាន់អំពីមុខទំនិញណាខ្លះដែលជិតអស់ពីស្តុក ដើម្បីឱ្យអ្នកគ្រប់គ្រងបញ្ជាទិញចូលទាន់ពេលវេលា។
* **Recent Orders Feed**៖ បង្ហាញ Order ថ្មីៗដែលទើបតែចូលមកភ្លាមៗជាមួយស្ថានភាពជាក់ស្តែង។

### ៣.៣ ការគ្រប់គ្រងការបញ្ជាទិញ និងបោះពុម្ពវិក្កយបត្រ (Orders & Invoice Printing)
* **Order Status Workflow**៖
  1. `Pending` (រង់ចាំការពិនិត្យ / រង់ចាំការបង់ប្រាក់)
  2. `Confirmed` (បានបញ្ជាក់ការបញ្ជាទិញ)
  3. `Processing` (កំពុងរៀបចំវេចខ្ចប់ទំនិញក្នុងស្តុក)
  4. `Out for Delivery` (បានប្រគល់ជូនអ្នកដឹកជញ្ជូន និងមានលេខកូដតាមដាន)
  5. `Completed` (អតិថិជនបានទទួលទំនិញជោគជ័យ)
  6. `Cancelled` (បានបោះបង់ការបញ្ជាទិញ)
* **Invoice Printing Engine**៖
  * **បោះពុម្ពវិក្កយបត្រខ្នាត A4 ផ្លូវការ**៖ មាន Logo ហាង, ព័ត៌មានក្រុមហ៊ុន, តារាងទំនិញ, និងហត្ថលេខា។
  * **បោះពុម្ពវិក្កយបត្រ Thermal Receipt (80mm POS)**៖ សម្រាប់ម៉ាស៊ីនព្រីនកម្តៅតាមបញ្ជរគិតលុយរហ័ស។

### ៣.៤ ការគ្រប់គ្រងទំនិញ និងស្តុក (Catalog, Image Upload & Stock Matrix)
* **Product Management Matrix**៖
  * បង្កើតទំនិញថ្មី (`/rok-mix-khernh/products/new`) ជាមួយ UI ទំនើបបែប Professional។
  * ជ្រើសរើសប្រភេទ (Category) និងប្រភេទរង (Sub-category)។
  * Upload រូបភាពច្រើនសន្លឹកព្រមគ្នា ជាមួយមុខងារជ្រើសរើសរូបតំណាងចម្បង (Main Thumbnail)។
  * កំណត់តម្លៃលក់ (Selling Price), តម្លៃដើម (Cost Price), និងភាគរយបញ្ចុះតម្លៃ (Discount %)—ប្រព័ន្ធនឹងគណនាប្រាក់ចំណេញ (Profit Margin) បង្ហាញដោយស្វ័យប្រវត្តិ។
  * ប្រអប់បញ្ចូលលក្ខណៈបច្ចេកទេស (Dynamic Specifications) ងាយស្រួល និងរៀបរយ។

### ៣.៥ ការគ្រប់គ្រងគណនីអតិថិជន និង Pagination (Users & Dual Auth DB)
* ចូលទៅកាន់ `/rok-mix-khernh/users`៖
  * **Role Tabs ជាក់លាក់**៖ អតិថិជន (Customers), បុគ្គលិក (Staff), Admin & System Owner, និងទាំងអស់ (All Accounts)។
  * **Dual Authentication Tracking**៖ បែងចែករវាងគណនី Google Firebase Auth និង Telegram Bot OAuth ជាមួយ Badge ច្បាស់លាស់។
  * **Database Pagination (២០ គណនី/ទំព័រ)**៖ គាំទ្រទាំងប៊ូតុងទំព័រ `1, 2, 3...` និងប៊ូតុង "មើលបន្ថែម (+២០ ទៀត) • Load More" ព្រមទាំង Live Database Search។
  * **សកម្មភាពរហ័ស**៖ ផ្អាក/បើកដំណើរការគណនី, បង្កើត Magic Login Link, និងកែសម្រួល Loyalty Coins។

### ៣.៦ ប្រព័ន្ធគ្រប់គ្រងការជួសជុលកុំព្យូទ័រ (Hardware Repair Management)
* ចូលទៅកាន់ `/rok-mix-khernh/repairs` ដើម្បីគ្រប់គ្រងសំបុត្រជួសជុល៖
  * **Quick Customer Auto-Fill**៖ ជ្រើសរើសឈ្មោះអតិថិជនពី Database នោះព័ត៌មានទំនាក់ទំនងនឹងបំពេញដោយស្វ័យប្រវត្តិតែម្តង។
  * បង្កើត Ticket ទទួលម៉ាស៊ីន (ម៉ាក Laptop/PC, លេខ Serial Number, អាការៈខូចដែលអតិថិជនប្រាប់)។
  * កំណត់ជាងទទួលខុសត្រូវ (Assign Technician)។
  * ធ្វើបច្ចុប្បន្នភាពដំណាក់កាល៖ បានទទួលម៉ាស៊ីន → កំពុងត្រួតពិនិត្យ → រង់ចាំគ្រឿងបន្លាស់ → កំពុងជួសជុល → ជួសជុលរួចរាល់រង់ចាំយក → ប្រគល់ជូនអតិថិជន។
  * កត់ត្រាតម្លៃគ្រឿងបន្លាស់ និងថ្លៃឈ្នួលជួសជុលចេញជាវិក្កយបត្រ។

### ៣.៧ ការគ្រប់គ្រងវេនការងារ និងប្រអប់លុយ (Staff Shifts & Cash Register POS)
* ចូលទៅកាន់ `/rok-mix-khernh/shifts`៖
  * **បើកវេន (Open Shift)**៖ បុគ្គលិកគិតលុយបញ្ចូលចំនួនទឹកប្រាក់ដើមគ្រាក្នុងកេស (Opening Cash Drawer Balance)។
  * **តាមដានប្រាក់ចំណូលតាមវេន**៖ ប្រព័ន្ធកត់ត្រាចំនួនទឹកប្រាក់ដែលទទួលបានពី Cash និង Bakong KHQR ដាច់ដោយឡែកពីគ្នា។
  * **បិទវេន (Close Shift & Reconcile)**៖ រាប់ចំនួនទឹកប្រាក់ចុងក្រោយ ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ថាតើទឹកប្រាក់គ្រប់, លើស ឬខ្វះ និងបង្កើតរបាយការណ៍បិទវេនជាស្វ័យប្រវត្តិ។

### ៣.៨ ការគ្រប់គ្រងប្រូម៉ូសិន និងគូប៉ុង (Coupons & Promotions)
* បង្កើតកូដបញ្ចុះតម្លៃ (ឧទាហរណ៍៖ `STECH2026`, `GAMINGPRO`)៖
  * កំណត់ការបញ្ចុះតម្លៃជាភាគរយ (%) ឬជាទឹកប្រាក់ជាក់លាក់ ($)។
  * កំណត់លក្ខខណ្ឌចំណាយអប្បបរមា (Minimum Spend)។
  * កំណត់ចំនួនដងដែលអាចប្រើប្រាស់បាន និងកាលបរិច្ឆេទផុតកំណត់។
  * **Real-time Eviction**៖ ពេលលុបប្រូម៉ូសិន វានឹងរលុបបាត់ភ្លាមៗពី Website និង Checkout UI។

### ៣.៩ ការកំណត់សាខាហាង (Branches Management)
* គ្រប់គ្រងព័ត៌មានសាខាហាងនីមួយៗ (អាសយដ្ឋាន, លេខទូរស័ព្ទទំនាក់ទំនង, ម៉ោងបើក/បិទ, និងទីតាំងលើ Google Map)។

### ៣.១០ ការគ្រប់គ្រង Telegram Bot & របាយការណ៍ស្វ័យប្រវត្តិ (Telegram Alerts & Auto Reports)
* ចូលទៅកាន់ `/rok-mix-khernh/telegram-bot` ដើម្បីត្រួតពិនិត្យ និងតេស្តការបញ្ជូនដំណឹងរបស់ Official Bot (`@S_TECH_ASSISTANTBOT`) ចូលក្នុងគ្រុបបុគ្គលិកហាង។
* **របាយការណ៍ស្វ័យប្រវត្តិម៉ោង ៨:០០ យប់ (ច័ន្ទ-សៅរ៍)**៖ គណនាផលបូកអ្នកចូលមើល, Order, ចំណូល, និងទំនិញលក់ដាច់។
* **របាយការណ៍សប្តាហ៍ថ្ងៃអាទិត្យ**៖ សង្ខេបទំនិញពេញនិយម និងស្ថិតិអតិថិជនថ្មី។

### ៣.១១ ផ្ទាំងបញ្ជាពិសេសរបស់ម្ចាស់ប្រព័ន្ធ (Grand Master Console — Owner Only)
* គ្រប់គ្រង Storefront Mode (Normal, Vacation Countdown Mode ជាមួយការបើកឡើងវិញដោយស្វ័យប្រវត្តិ, Maintenance Mode) និងប៊ូតុង Master Lockdown បង្កកសិទ្ធិបុគ្គលិកពេលមានអាសន្ន។

### ៣.១២ Admin PWA សម្រាប់បុគ្គលិកហាង
* ផ្ទាំងគ្រប់គ្រង Admin ក៏គាំទ្រមុខងារ **PWA (Progressive Web App)** ផងដែរ៖
* ម្ចាស់ហាង និងបុគ្គលិកអាច Add ផ្ទាំង Admin ទៅកាន់អេក្រង់ដើមរបស់ iPad, Tablet, ឬទូរស័ព្ទដៃ ដើម្បីប្រើប្រាស់ដូចជាម៉ាស៊ីន POS ចល័តក្នុងហាង ដើរឆែកមើលស្តុក និងស្កេនទំនិញបានគ្រប់ពេលវេលា!
* បំពាក់ប្រព័ន្ធការពារ Session មិនឱ្យជួបបញ្ហា 401 Unauthorized ពេលទុកចោលយូរឡើយ។

---

## 4. ប្រព័ន្ធស្វ័យប្រវត្តិកម្ម Telegram Bot ផ្លូវការ (Unified Official Bot)

| លក្ខណៈសម្បត្តិ | Official Assistant & Store Alerts Bot |
|---|---|
| **ឈ្មោះ Bot** | `@S_TECH_ASSISTANTBOT` (ID: `8689597792`) |
| **Token ប្រព័ន្ធ** | `8689597792:AAESJgFacj-eTx-3sDCQllT2A7d9Pm49mI8` |
| **អ្នកប្រើប្រាស់គោលដៅ** | អតិថិជនទូទៅ + ម្ចាស់ហាង, អ្នកគ្រប់គ្រង និងបុគ្គលិក |
| **ទីកន្លែងដំណើរការ** | Private 1-on-1 Chat ជាមួយអតិថិជន និង Group Forum Topics របស់ហាង |
| **មុខងារចម្បង** | • **Telegram Mini App (TMA)**៖ បើកទិញទំនិញពេញលេញក្នុង Telegram ផ្ទាល់<br>• ចូលប្រើប្រាស់វេបសាយដោយមិនបាច់វាយ Password (1-Click Login Handshake)<br>• ជូនដំណឹងពេលមាន Order ថ្មី, ស្តុកជិតអស់, របាយការណ៍ប្រចាំថ្ងៃ, និង Error Alerts<br>• ផ្ញើវិក្កយបត្រឌីជីថល (Digital Receipts) ភ្លាមៗពេលទិញទំនិញជោគជ័យ<br>• ផ្ញើដំណឹងដឹកជញ្ជូន និងលេខទូរស័ព្ទអ្នកដឹក<br>• ផ្ទៀងផ្ទាត់សុវត្ថិភាព 2FA |

---

## 5. ប្រព័ន្ធសុវត្ថិភាពកម្រិតខ្ពស់ (5-Stage Red Team Hardening)

ប្រព័ន្ធទាំងមូលត្រូវបានត្រួតពិនិត្យ និងការពារយ៉ាងតឹងរ៉ឹងបំផុតតាមរយៈការធ្វើតេស្តវាយលុក (Pentest & Stress Test) ចំនួន ៥ ដំណាក់កាល៖

1. **ដំណាក់កាលទី ១ — ការការពារព្រំដែនបណ្តាញ (Perimeter & Rate Limiting)**៖
   - ការពារការវាយលុក Spam និង DDoS ដោយកំណត់ Rate Limit (`throttle:api`) ត្រឹម ៦០ ដងក្នុង ១ នាទីសម្រាប់ Public Endpoint និងកំណត់យ៉ាងតឹងរ៉ឹងលើកន្លែង Checkout និង Login។
   - បំពាក់ Security Headers ពេញលេញ៖ `Content-Security-Policy`, `HSTS`, `X-Frame-Options: SAMEORIGIN`, និង `X-Content-Type-Options: nosniff`។
2. **ដំណាក់កាលទី ២ — សុវត្ថិភាពគណនី និង Session (Zero-Trust Auth)**៖
   - ការ Login តាម Telegram ប្រើប្រាស់ការផ្ទៀងផ្ទាត់ហត្ថលេខាឌីជីថល `HMAC-SHA256` ជាមួយ Telegram Secret Key មិនអាចបន្លំបានឡើយ។
   - លេខសម្ងាត់ត្រូវបាន Hash តាមស្តង់ដារ Bcrypt (Cost 12) និង Token ត្រូវបានការពារដោយ HTTP-only Secure Cookies។
3. **ដំណាក់កាលទី ៣ — ការពារការលួចទិន្នន័យ (SQLi & XSS Shielding)**៖
   - ប្រើប្រាស់ PDO Parameterized Queries ១០០% លើគ្រប់ Eloquent Database Calls គ្មានចន្លោះប្រហោង SQL Injection ឡើយ។
   - រាល់ទិន្នន័យដែលបញ្ចូលមកពីខាងក្រៅ ត្រូវបានច្រោះសម្អាត (HTML Entities / Anti-XSS Sanitization) មុននឹងរក្សាទុកក្នុង Database។
4. **ដំណាក់កាលទី ៤ — សុចរិតភាពនៃតម្លៃ និងប្រតិបត្តិការហិរញ្ញវត្ថុ (Financial Integrity)**៖
   - តម្លៃទំនិញ, សេវាដឹក, និងការបញ្ចុះតម្លៃ ត្រូវបានគណនាឡើងវិញទាំងស្រុងនៅលើ Server (Server-side recalculation) ដោយមិនទុកចិត្តតម្លៃដែលផ្ញើមកពី Browser ឡើយ។
   - ប្រើប្រាស់ Database Transactions រួមជាមួយ Row Locking (`lockForUpdate`) ការពារកុំឱ្យមានការកាត់ស្តុកជាន់គ្នាពេលមានមនុស្សច្រើនទិញព្រមគ្នា។
   - កូដ KHQR ត្រូវបានគណនា និងផ្ទៀងផ្ទាត់តាមរូបមន្តគណិតវិទ្យា CRC16 CCITT Polynomial យ៉ាងត្រឹមត្រូវ ១០០%។
5. **ដំណាក់កាលទី ៥ — ការពារសិទ្ធិបុគ្គលិក និងទិន្នន័យសម្ងាត់ (RBAC & Privilege Escalation)**៖
   - Endpoints របស់ Admin ទាំងអស់ត្រូវបានចាក់សោរដោយ Middleware ពិនិត្យ Role ច្បាស់លាស់។
   - ឯកសារសម្ងាត់ (.env, API Keys, Database Credentials) ត្រូវបានការពារមិនឱ្យ Leak ទៅខាងក្រៅឡើយ។

---

## 6. សំណួរញឹកញាប់ និងការដោះស្រាយបញ្ហា (FAQ & Troubleshooting)

### សំណួរទី ១៖ តើអតិថិជនស្កេន KHQR ហើយ វេបសាយដឹងថាបានបង់លុយដោយរបៀបណា?
**ចម្លើយ**៖ នៅពេលអតិថិជនស្កេន និងទូទាត់ប្រាក់ក្នុង App ធនាគារ (ABA ឬធនាគារផ្សេងទៀត) ប្រព័ន្ធ Backend របស់វេបសាយនឹងធ្វើការ Check ជាមួយ **Bakong Open API របស់ធនាគារជាតិនៃកម្ពុជា** តាមរយៈ JWT Token ផ្លូវការ។ នៅពេលធនាគារជាតិបញ្ជាក់ថាប្រតិបត្តិការបានជោគជ័យ វេបសាយនឹងបន្លឺសំឡេង និងផ្លាស់ប្តូរស្ថានភាព Order ទៅជា `Confirmed` ភ្លាមៗដោយស្វ័យប្រវត្តិ។

### សំណួរទី ២៖ ចុះបើអតិថិជនមិនចង់ប្រើ Email ឬ Password ពេលទិញទំនិញ?
**ចម្លើយ**៖ អតិថិជនអាចចុចប៊ូតុង **"ចូលដោយប្រើ Telegram"** នោះប្រព័ន្ធនឹងភ្ជាប់ទៅកាន់ Bot `@S_TECH_ASSISTANTBOT` រួចបង្កើតគណនី និង Login ជូនពួកគាត់ដោយស្វ័យប្រវត្តិតាមរយៈ Telegram ID របស់ពួកគាត់តែម្តង។

### សំណួរទី ៣៖ តើធ្វើដូចម្តេចដើម្បីឱ្យបុគ្គលិកហាងដំឡើង Admin Portal លើ iPad ឬទូរស័ព្ទ?
**ចម្លើយ**៖
1. ចូលទៅកាន់ Link សម្ងាត់ `/rok-mix-khernh` លើ Browser របស់ Tablet ឬទូរស័ព្ទ។
2. ចុចប៊ូតុង Share (លើ Safari/iOS) ឬប៊ូតុង Menu ចុច ៣ (លើ Chrome/Android)។
3. ជ្រើសរើស **"Add to Home Screen"** ឬ **"Install App"**។
4. ផ្ទាំង Admin នឹងក្លាយជា App ដាច់ដោយឡែកមួយនៅលើអេក្រង់ ងាយស្រួលចុចបើកប្រើប្រាស់គ្រប់ពេលវេលា!

### សំណួរទី ៤៖ តើត្រូវធ្វើដូចម្តេចប្រសិនបើចង់ប្តូរលេខកុងធនាគារ ABA ទទួលប្រាក់ KHQR?
**ចម្លើយ**៖ គ្រាន់តែចូលទៅកែប្រែក្នុង file `backend/.env` ត្រង់ចំណុច៖
- `BAKONG_MERCHANT_ACCOUNT="លេខកុងABAថ្មី"`
- `BAKONG_MERCHANT_NAME="ឈ្មោះម្ចាស់កុងថ្មី"`  
រួច run command `php artisan config:cache` នោះកូដ QR ទាំងអស់នឹងបង្កើតតាមលេខកុងថ្មីភ្លាមៗ។

---

> **រក្សាសិទ្ធិគ្រប់យ៉ាង © 2026 S Tech Store**  
> បង្កើតឡើងដោយវិស្វកម្មកូដកម្រិតខ្ពស់ ដើម្បីភាពជោគជ័យ និងរីកចម្រើននៃអាជីវកម្មរបស់អ្នក! 🚀

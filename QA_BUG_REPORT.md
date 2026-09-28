# 🔴 QA Bug Report & Action Plan (25 Phases)

**Project:** S Tech Store (E-commerce Mobile App)
**Date:** 2026-09-29
**Status:** 🔴 Active - Needs Backend & Frontend Fixes

---

## 🛠️ PHASE 1-8: BACKEND, API & DATABASE (CRITICAL)
*រាល់ API ត្រូវប្រាកដថាដើរជាមួយ Cloudinary (Images), Neon DB និង Render Hosting ត្រឹមត្រូវ ជៀសវាងការច្រឡំ Local ជាមួយ Production។*

### [ ] Phase 1: Database & Storage Configuration
- [ ] ត្រួតពិនិត្យ និងរៀបចំ Environment Variables សម្រាប់ Cloudinary, Neon, Render ឲ្យត្រូវគ្នា ១០០%។
- [ ] ដោះស្រាយបញ្ហា Admin និង Home page មិន Link គ្នា (ទិន្នន័យមិន Sync)។

### [ ] Phase 2: Admin API - Product Creation
- [ ] ដោះស្រាយបញ្ហា Admin មិនអាច Add Product បាន។
- [ ] ដោះស្រាយបញ្ហា Admin មិនអាច Upload Image ឬ Add Link Image បាន។

### [ ] Phase 3: Admin API - Product Management
- [ ] ដោះស្រាយបញ្ហា Admin មិនអាច Edit Product។
- [ ] ដោះស្រាយបញ្ហា Admin មិនអាច Delete Product។

### [ ] Phase 4: Admin Dashboard Enhancements
- [ ] បង្កើតមុខងារគ្រប់គ្រង Discount / Promo Codes។
- [ ] បង្កើតមុខងារ User Management សម្រាប់ Admin។

### [ ] Phase 5: Checkout & Order API
- [ ] ដោះស្រាយបញ្ហា API Order Fail ធ្វើឲ្យ User ទិញអីវ៉ាន់មិនបាន (Checkout failed)។
- [ ] ភ្ជាប់ទិន្នន័យ Order ចូល Database ពិតប្រាកដ។

### [ ] Phase 6: User Profile & Security API
- [ ] បង្កើត API សម្រាប់ Update User Profile ពិតប្រាកដ។
- [ ] បង្កើត API សម្រាប់ Security & Privacy Settings (ពិតៗ មិនមែន Mock)។

### [ ] Phase 7: Wishlist & PC Build API
- [ ] បង្កើត API សម្រាប់ Save to Wishlist (ពេលចុចបេះដូង)។
- [ ] បង្កើត API សម្រាប់ PC Build (Save build ទុក និង Add ចូល Cart ពី Database)។

### [ ] Phase 8: Notification Architecture
- [ ] បង្កើត Backend Logic សម្រាប់ Notifications ពិតប្រាកដ (Cancel Order, Confirm Order, Delivery)។
- [ ] អនុញ្ញាតឲ្យ Admin អាច Push Notification ទៅ User ពេលដោះស្រាយ Ticket ចប់។

---

## 📱 PHASE 9-15: GLOBAL UI & NAVIGATION

### [ ] Phase 9: Global Localization & Theming
- [ ] ជួសជុលកន្លែង Change Language ក្នង Setting ឲ្យដំណើរការប្ដូរភាសាបានពិតៗទូទាំង App។
- [ ] បន្ថែមមុខងារ Change Font និងប្ដូរ Theme (Dark / Light / System) ធានាថាមើលឃើញ Product ច្បាស់ទោះចូល Dark Mode ក៏ដោយ។

### [ ] Phase 10: Splash Screen & Hero Banner
- [ ] កែប្រែ Splash Screen (Loading) ដោយប្រើ Logo S Tech ពេញ និងទាក់ទាញ (មិនមែនត្រឹមតែអក្សរ និង Loop Icon ទេ)។
- [ ] កែប្រែ Hero Banner: ពង្រីកអក្សរ S Tech Store និង Logo ឲ្យធំជាងមុន។
- [ ] Hero Banner: បន្ថែម Animation Auto Scroll សម្រាប់ Banner Text ទាំង ៤ ឲ្យឡូយ។

### [ ] Phase 11: Top Navigation (Header)
- [ ] Search Box: ដក Icon Camera ចេញ ជំនួសដោយ Icon Search, ចុចទៅ Search បានដូច FB។
- [ ] Search Box Text: រុញអក្សរមកកណ្តាល ឬស្តាំបន្តិច កុំឲ្យបាត់អក្សរខាងដើមពេលវាយបញ្ចូល។
- [ ] Top Right Icons: បន្ថែម Icon ទី៣ (បច្ចុប្បន្នមានតែ 2 គឺ Noti នឹង Cart តិចពេក)។

### [ ] Phase 12: Bottom Navigation & Global Actions
- [ ] Bottom Nav: ប្តូរ Icon Search កណ្តាល ទៅជា Icon Scan វិញ (សម្រាប់ Scan រូបភាពរកទំនិញ)។
- [ ] Back Buttons: Design ប៊ូតុង Back នៅលើ Mobile ឲ្យស្អាត និងធំល្មមសមរម្យ។
- [ ] Fast Scroll Up: បន្ថែមប៊ូតុងព្រួញ Scroll ឡើងលើវិញពេល User អូសចុះក្រោម។
- [ ] Cookie Policy & Update: បន្ថែម Popup Policy និង Popup អោយ Update ពេលមានជំនាន់ថ្មី។

### [ ] Phase 13: Home Page Sections
- [ ] Services Banner: ធ្វើឲ្យ Text (1 year warranty, delivery...) មានចលនា រត់ទៅឆ្វេងស្តាំ (Marquee Animation)។
- [ ] Shop by Category: ពង្រីក Icon ឲ្យធំ និងឲ្យពេញទទឹងទូរស័ព្ទ។
- [ ] ទាំង Category និង Best Seller ត្រូវបន្ថែមប៊ូតុង "View All"។

### [ ] Phase 14: Product List Cards
- [ ] Design Card សារជាថ្មី (ប្តូរពណ៌អក្សរ ឲ្យស្អាតជាងមុន)។
- [ ] បន្ថែមប៊ូតុង / មុខងារ "Preview Details" ពេលចុចលើ Card។
- [ ] Cart Icon: ធ្វើឲ្យធំល្មម។
- [ ] Add to Cart Animation: ពេលចុច Add, Product ត្រូវរត់ពីធំទៅតូច រួចលោតផ្លោះចូលកន្ត្រក (Fly-to-cart)។

### [ ] Phase 15: Category Filter & Cart UI
- [ ] Category Filter: កែ Popup Filter កុំឲ្យលោតមកបាំងខាងក្រោមពេក ត្រូវឲ្យលោតមកដល់លើ និងស្អាតជាងនេះ។
- [ ] Cart Icon Action: ប៊ូតុង View Cart/Checkout លិចចុះក្រោមពេក ចុចមិនបាន រុញវាឡើងលើវិញឲ្យធំបន្តិច។
- [ ] Shopping Cart Page: កែ UI ទាំងមូលឲ្យស្អាតជាងនេះ។

---

## 🛒 PHASE 16-20: CHECKOUT & PRODUCT DETAIL

### [ ] Phase 16: Checkout Flow
- [ ] Checkout Step 2 (Delivery & Payment): ប៊ូតុង "Pay" បាត់មើលមិនឃើញលើទូរស័ព្ទ (ត្រូវ Fix ឲ្យឃើញ)។
- [ ] Checkout Last Step (Done): កុំអោយលោតត្រឡប់ទៅ Home វិញ ត្រូវលោត Popup ឲ្យ View Order ប្រាប់អតិថិជនពីជម្រើសរបស់គាត់ និងលីងទៅកន្លែង Order History។

### [ ] Phase 17: Product Detail - Design & Layout
- [ ] Unique Design: រៀបចំ Layout ថ្មី កុំចម្លង Taobao/Amazon ១០០% ត្រូវបង្កើតភាព Unique របស់ S Tech។
- [ ] មាន Multi-image Slider អាចអូសមើលរូបច្រើនបាន។
- [ ] Store Section: ប្តូរ Icon Shop ទូទៅ ដាក់ Logo S Tech វិញ។
- [ ] Condition / Product Details: ទាញយកទិន្នន័យពិតពី DB (ថ្មី ឬ មួយទឹក)។
- [ ] Store Location: បង្ហាញទីតាំងរបស់ហាង S Tech Store នៅគ្រប់ Product ទាំងអស់។
- [ ] Text Spacing: រក្សាគម្លាតអក្សរ កុំឲ្យជាប់គែមឆ្វេងពេក បណ្តាលឲ្យបាត់អក្សរ។

### [ ] Phase 18: Product Detail - Core Actions
- [ ] Buy Now Button: កែ Logic ប៊ូតុង Buy Now ឲ្យដំណើរការវិញ។
- [ ] Save to Wishlist: ពេលចុចបេះដូង ត្រូវ Save ចូល Wishlist (ប្រើ Real API ទី ៧) ប្តូរ Icon ផ្សេងក៏បាន។
- [ ] Share Options: បន្ថែមជម្រើស Share (Share to FB, Copy Link, Telegram, Save Image)។

### [ ] Phase 19: Product Detail - Interactive Chat
- [ ] Chat Button: ពេលចុច ត្រូវលោត Popup ស្អាតមួយសួរថាចង់ "Chat តាម Telegram" ឬ "Chat ក្នុង Website"។
- [ ] បើចុច Telegram: លីងទៅតេឡេក្រាម។
- [ ] បើចុច Website Chat: បើក Box ChatBot ដែលមានសំណួរត្រៀមទុក និងជម្រើសសុំជួបភ្នាក់ងារពិត។

### [ ] Phase 20: Product Detail - Social Proof
- [ ] Reviews: ទាញយក Review ពិតពី DB មកបង្ហាញ (មាន Avatar រូបអ្នកទិញ និង Comment) ដក Mock ចោល។
- [ ] Suggested Products: បន្ថែមផ្នែក "ទំនិញស្រដៀងគ្នា" នៅខាងក្រោម។

---

## 👤 PHASE 21-25: ACCOUNT, PROFILE & SEO

### [ ] Phase 21: Profile Dashboard
- [ ] User Card Design: Design កាត User ឲ្យស្អាត មានមុខងារ Loyalty ផង។
- [ ] មានមុខងារ Upload Profile Image ពិតប្រាកដ។
- [ ] មាន Tick Blue (Verified Badge)។
- [ ] Member Since: យកថ្ងៃខែឆ្នាំចុះឈ្មោះពិតប្រាកដពី DB (Ex: 19/09/2026) មិនមែន Mock។
- [ ] Total Orders/Order Details: បង្ហាញទិន្នន័យពិត និងឲ្យមានលក្ខណៈ Professional។

### [ ] Phase 22: Profile Settings & Info Pages
- [ ] នៅក្នុង Setting ត្រូវមាន: About Us, Privacy Policy, Contact Us, How to Use។
- [ ] បន្ថែម Developer Credit: "ផ្ដល់ជូនដោយ Rotana NOB" ភ្ជាប់ជាមួយ Portfolio Link ដើម្បី Promote។
- [ ] Location Address: បន្ថែមមុខងារគ្រប់គ្រងអាសយដ្ឋានដឹកជញ្ជូនឲ្យបានស៊ីជម្រៅជាងនេះ។
- [ ] គ្រប់ Setting ទាំងអស់ (Profile Update, Privacy) ត្រូវតែដំណើរការ 100% មិនមែនគ្រាន់តែ UI ទេ។

### [ ] Phase 23: Tech Support Page
- [ ] កែសម្រួល UI ទំព័រ Tech Support កុំឲ្យបែកលើ Mobile (Make it fully responsive)។

### [ ] Phase 24: PC Build Page
- [ ] ទាញយកទិន្នន័យគ្រឿងបន្លាស់ពិតពី DB យកមកបង្ហាញ។
- [ ] អនុញ្ញាតឲ្យ User រៀបរួច ចុច Add to Cart ជាមួយគ្នា និង Save Build ទុកបាន។

### [ ] Phase 25: SEO Optimization
- [ ] រៀបចំ SEO កម្រិតខ្ពស់សម្រាប់គ្រប់ទំព័រទាំងអស់ ដើម្បីអោយស្រាវជ្រាវងាយឃើញ។

---
**End of Bug Report**

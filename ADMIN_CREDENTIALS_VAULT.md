# 🛡️ S TECH STORE — ADMIN CREDENTIALS & SECURITY VAULT

> **CONFIDENTIAL & RESTRICTED ACCESS**  
> ឯកសារសម្ងាត់កម្រិតខ្ពស់សម្រាប់តែម្ចាស់ប្រព័ន្ធ (System Owner) និងថ្នាក់ដឹកនាំជាន់ខ្ពស់ប៉ុណ្ណោះ។ ហាមចែករំលែកជាសាធារណៈជាដាច់ខាត។

---

## 1. សង្ខេបអំពីប្រព័ន្ធសុវត្ថិភាព (Security Architecture)

- **Password Hashing Algorithm**: Bcrypt ជាមួយ Cost Factor 12 (`rounds = 12`) — ការពារ Brute-force និង Rainbow Table Attacks កម្រិតខ្ពស់។
- **Role-Based Access Control (RBAC)**:
  1. **Super Admin (មហាសិទ្ធិ)**: សិទ្ធិផ្ដាច់មុខលើប្រព័ន្ធទាំងមូល (`['*']`) សម្រាប់តែម្ចាស់ប្រព័ន្ធផ្ទាល់ប៉ុណ្ណោះ។
  2. **Admin (អ្នកគ្រប់គ្រងទូទៅ)**: សិទ្ធិគ្រប់គ្រងសាខា, បុគ្គលិក, របាយការណ៍ហិរញ្ញវត្ថុ, និងស្តុកទំនិញ (គ្មានសិទ្ធិកែប្រែ System Owner ឡើយ)។
  3. **Staff (បុគ្គលិកប្រតិបត្តិការ)**: សិទ្ធិគ្រប់គ្រងការលក់, បញ្ជាទិញ (Orders), ស្តុកទំនិញ, និងជជែកជាមួយអតិថិជន។
- **UI Hardening**: លុបបំបាត់ចោលទាំងស្រុងនូវប៊ូតុងសាកល្បង (Demo Buttons), គំរូអ៊ីមែល (Email Placeholders), និង Link សម្ងាត់ពីផ្ទាំង Login។
- **Isolated Admin PWA**: កំណត់ Manifest ដាច់ដោយឡែក (`/admin-manifest.json`) ដោយផ្ទុក `start_url: "/km/rok-mix-khernh?source=admin_pwa"` ដើម្បីកុំឱ្យច្រឡំចូល Storefront ធម្មតាពេល Add to Home Screen។

---

## 2. បញ្ជីគណនី និងលេខកូដសម្ងាត់ (Master Account Directory)

### 👑 TIER 1: មហាសិទ្ធិ / SYSTEM OWNER (`super_admin`)
*សិទ្ធិខ្ពស់បំផុតក្នុងប្រព័ន្ធ គ្មានដែនកំណត់ (`*`)*

| ព័ត៌មានលម្អិត | តម្លៃ (Value) |
| :--- | :--- |
| **ឈ្មោះបង្ហាញ (Name)** | Rotana Nob (System Owner) |
| **អ៊ីមែលចម្បង (Primary Email)** | `owner@stechstore.com` |
| **អ៊ីមែលបម្រុង (Backup 1)** | `nobrothana180703@gmail.com` |
| **អ៊ីមែលបម្រុង (Backup 2)** | `rotananob@gmail.com` |
| **លេខសម្ងាត់ (Password)** | `ST#Own3r_98X$kQ29@2026!Sec^Omega` |
| **កម្រិតសិទ្ធិ (Role)** | `super_admin` |
| **សាខា (Branch)** | Phnom Penh Main Branch (សាខាកណ្តាល) |
| **វេនការងារ (Shift)** | Full-Time Shift (វេនពេញម៉ោង) |

---

### 🛡️ TIER 2: អ្នកគ្រប់គ្រងទូទៅ / STORE ADMINISTRATOR (`admin`)
*សិទ្ធិគ្រប់គ្រងទូទៅលើសាខា បុគ្គលិក ផលិតផល និងរបាយការណ៍*

| ព័ត៌មានលម្អិត | តម្លៃ (Value) |
| :--- | :--- |
| **ឈ្មោះបង្ហាញ (Name)** | S Tech Admin |
| **អ៊ីមែល (Email)** | `admin@stechstore.com` |
| **លេខសម្ងាត់ (Password)** | `ST#Adm1n_74Wp@81K!2026$Nexus*9X` |
| **កម្រិតសិទ្ធិ (Role)** | `admin` |
| **សាខា (Branch)** | Phnom Penh Main Branch (សាខាកណ្តាល) |
| **វេនការងារ (Shift)** | Full-Time Shift (វេនពេញម៉ោង) |
| **សិទ្ធិអនុញ្ញាត (Permissions)** | `all`, `manage_products`, `manage_orders`, `manage_staff`, `manage_branches`, `manage_shifts`, `manage_promotions`, `system_settings`, `financial_reports` |

---

### 💼 TIER 3: បុគ្គលិកហាង & ផ្នែកលក់ / STORE OPERATIONS STAFF (`staff`)
*សិទ្ធិប្រតិបត្តិការលក់ បញ្ជាទិញ និងសេវាកម្មអតិថិជន*

| ព័ត៌មានលម្អិត | តម្លៃ (Value) |
| :--- | :--- |
| **ឈ្មោះបង្ហាញ (Name)** | S Tech Operations Staff |
| **អ៊ីមែល (Email)** | `staff@stechstore.com` |
| **លេខសម្ងាត់ (Password)** | `ST#St@ff_52Mv#63Q^2026!Shift&7B` |
| **កម្រិតសិទ្ធិ (Role)** | `staff` |
| **សាខា (Branch)** | Phnom Penh Main Branch (សាខាកណ្តាល) |
| **វេនការងារ (Shift)** | Morning Shift (វេនព្រឹក) |
| **សិទ្ធិអនុញ្ញាត (Permissions)** | `manage_products`, `manage_orders`, `view_inventory`, `customer_service`, `process_repairs` |

---

## 3. ផ្លូវចូល និងតំណភ្ជាប់ប្រព័ន្ធ (System Endpoints)

- **Admin Login Portal**: `https://stechstore.com/km/rok-mix-khernh/login` (ឬ `http://localhost:3000/km/rok-mix-khernh/login` ក្នុង Dev)
- **Admin Dashboard**: `https://stechstore.com/km/rok-mix-khernh`
- **PWA Standalone Launch URL**: `https://stechstore.com/km/rok-mix-khernh?source=admin_pwa`
- **Dedicated Admin Manifest**: `https://stechstore.com/admin-manifest.json`

---

## 4. វិធានការសុវត្ថិភាពបន្ថែម (Hardening Implementation Notes)

1. **Clean Login UI**:
   - គ្មាន Demo Auto-fill ឬ Quick Login ទៀតឡើយ។
   - Email Placeholder ត្រូវបានប្តូរទៅជាទម្រង់ទូទៅ `name@stechstore.com` ដោយគ្មានបង្ហាញអ៊ីមែលពិតប្រាកដក្នុង UI ឡើយ។
2. **Auto-Normalization Logic**:
   - រាល់ពេល User ដែលមាន Role `admin` ចូល Login ប្រព័ន្ធ Backend នឹងធានាឈ្មោះត្រឹម `S Tech Admin` ដោយស្វ័យប្រវត្តិកុំឱ្យច្រឡំជាមួយ `Super Admin`។
   - Role `super_admin` ត្រូវបានការពារជាពិសេស សម្រាប់តែម្ចាស់ប្រព័ន្ធប៉ុណ្ណោះ។
3. **PWA Home Screen Routing**:
   - នៅលើទំព័រដើម Customer Storefront (`home-client.tsx`) ប្រសិនបើ App បើកចេញពី Admin PWA (`?source=admin_pwa`) វានឹង Redirect ចូល Admin Dashboard ភ្លាមៗដោយស្វ័យប្រវត្តិ។

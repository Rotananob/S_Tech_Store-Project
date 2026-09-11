export interface TranslationDictionary {
  nav: {
    home: string;
    laptops: string;
    desktops: string;
    parts: string;
    gaming: string;
    services: string;
    buildPc: string;
    products: string;
    promotions: string;
    contact: string;
    about: string;
    orders: string;
    searchPlaceholder: string;
    freeDelivery: string;
    signIn: string;
    register: string;
    signOut: string;
    wishlist: string;
    cart: string;
    alerts: string;
    profile: string;
    hi: string;
  };
  hero: {
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
    khmerSubtitle: string;
    shopNow: string;
  };
  features: {
    genuine: string;
    warranty: string;
    localPayments: string;
    sameDayDelivery: string;
  };
  categories: {
    shopByCategory: string;
    laptops: string;
    desktops: string;
    parts: string;
    gaming: string;
    services: string;
    secondHand: string;
    allProducts: string;
    searchSubtitle: string;
    sortBy: string;
    popular: string;
    priceLowHigh: string;
    priceHighLow: string;
    newest: string;
    filters: string;
    inStockOnly: string;
    brand: string;
    priceUsd: string;
    min: string;
    max: string;
  };
  products: {
    bestSellers: string;
    viewAll: string;
    addToCart: string;
    hot: string;
    newArrival: string;
    inStock: string;
    outOfStock: string;
    shipsToday: string;
    quantity: string;
    orderTelegram: string;
    oneYearWarranty: string;
    genuineProduct: string;
    specifications: string;
    description: string;
    reviews: string;
    noReviews: string;
  };
  cart: {
    title: string;
    cartStep: string;
    deliveryStep: string;
    paymentStep: string;
    doneStep: string;
    orderSummary: string;
    subtotal: string;
    delivery: string;
    free: string;
    sameDayPhnomPenh: string;
    total: string;
    proceedToCheckout: string;
    secureCheckout: string;
    emptyCart: string;
    continueShopping: string;
    viewCart: string;
    checkout: string;
  };
  buildPc: {
    title: string;
    subtitle: string;
    compatCheck: string;
    compatStatus: string;
    compatIssues: string;
    runCheck: string;
    allCompatible: string;
    clickRunCheck: string;
    buildSummary: string;
    totalUsd: string;
    totalKhr: string;
    addToCart: string;
    saveBuild: string;
    select: string;
    change: string;
    selectComponent: string;
  };
  footer: {
    desc: string;
    shop: string;
    support: string;
    company: string;
    copyright: string;
  };
  notifications: {
    title: string;
    markAllRead: string;
    clearAll: string;
    empty: string;
    welcomeTitle: string;
    welcomeMsg: string;
    loginTitle: string;
    loginMsg: string;
    promoTitle: string;
    promoMsg: string;
    timeJustNow: string;
    time2h: string;
    time1d: string;
  };
  profilePage: {
    title: string;
    subtitle: string;
    overview: string;
    settings: string;
    security: string;
    notifPrefs: string;
    welcomeCardTitle: string;
    welcomeCardDesc: string;
    memberSince: string;
    roleCustomer: string;
    statsOrders: string;
    statsWishlist: string;
    statsBuilds: string;
    statsPoints: string;
    formName: string;
    formEmail: string;
    formPhone: string;
    formAddress: string;
    formCity: string;
    saveBtn: string;
    savedSuccess: string;
    secPassword: string;
    sec2FA: string;
    sec2FADesc: string;
    recentActivity: string;
    actLogin: string;
    actCreate: string;
    prefOrderTitle: string;
    prefOrderDesc: string;
    prefPromoTitle: string;
    prefPromoDesc: string;
    prefBuildTitle: string;
    prefBuildDesc: string;
  };
}

export const translations: Record<"EN" | "KM", TranslationDictionary> = {
  EN: {
    nav: {
      home: "Home",
      laptops: "Laptops",
      desktops: "Desktops",
      parts: "Parts",
      gaming: "Gaming",
      services: "Services",
      buildPc: "🔧 Build PC",
      products: "Products",
      promotions: "Promotions",
      contact: "Contact",
      about: "About Us",
      orders: "Orders",
      searchPlaceholder: "Search products...",
      freeDelivery: "🇰🇭 Free Same-Day Delivery in Phnom Penh",
      signIn: "Sign In",
      register: "Register",
      signOut: "Sign Out",
      wishlist: "Wishlist",
      cart: "Cart",
      alerts: "Alerts",
      profile: "Profile",
      hi: "Hi, ",
    },
    hero: {
      titleLine1: "Your Hub for Genuine",
      titleLine2: "Tech in Cambodia",
      subtitle: "Discover top-tier laptops, custom desktop builds, and professional IT services.",
      khmerSubtitle: "ស្វែងរកកុំព្យូទ័រ, លប់ថប់, និងសេវាកម្ម IT គ្រប់ប្រភេទ",
      shopNow: "Shop Now",
    },
    features: {
      genuine: "Genuine Products",
      warranty: "1-Year Warranty",
      localPayments: "Local Payments",
      sameDayDelivery: "Same-Day Delivery",
    },
    categories: {
      shopByCategory: "Shop by Category",
      laptops: "Laptops",
      desktops: "Desktops",
      parts: "Parts",
      gaming: "Gaming",
      services: "Services",
      secondHand: "2nd-Hand / Pre-Owned",
      allProducts: "All Products",
      searchSubtitle: "Explore our complete selection of genuine tech products",
      sortBy: "Sort by:",
      popular: "Popular",
      priceLowHigh: "Price: Low to High",
      priceHighLow: "Price: High to Low",
      newest: "Newest Arrivals",
      filters: "Filters",
      inStockOnly: "In Stock Only",
      brand: "Brand",
      priceUsd: "Price (USD)",
      min: "Min",
      max: "Max",
    },
    products: {
      bestSellers: "Best Sellers",
      viewAll: "View All",
      addToCart: "Add to Cart",
      hot: "HOT",
      newArrival: "NEW ARRIVAL",
      inStock: "In Stock",
      outOfStock: "Out of Stock",
      shipsToday: "— Ships today",
      quantity: "Quantity",
      orderTelegram: "Order via Telegram",
      oneYearWarranty: "1-Year Official Warranty",
      genuineProduct: "100% Genuine Product",
      specifications: "Specifications",
      description: "Description",
      reviews: "Reviews",
      noReviews: "No reviews yet. Be the first to review this product.",
    },
    cart: {
      title: "Your Cart",
      cartStep: "Cart",
      deliveryStep: "Delivery",
      paymentStep: "Payment",
      doneStep: "Done",
      orderSummary: "Order Summary",
      subtotal: "Subtotal",
      delivery: "Delivery",
      free: "Free",
      sameDayPhnomPenh: "Phnom Penh Same-Day",
      total: "Total",
      proceedToCheckout: "Proceed to Checkout",
      secureCheckout: "Secure encrypted checkout",
      emptyCart: "Your cart is empty.",
      continueShopping: "Continue Shopping",
      viewCart: "View Cart",
      checkout: "Checkout",
    },
    buildPc: {
      title: "Build Your PC",
      subtitle: "Select compatible components to build your custom rig.",
      compatCheck: "Compatibility Check",
      compatStatus: "Compatibility Status",
      compatIssues: "Compatibility Issues",
      runCheck: "Run Check",
      allCompatible: "All selected components are compatible.",
      clickRunCheck: 'Click "Run Check" to verify component compatibility.',
      buildSummary: "Build Summary",
      totalUsd: "Total (USD)",
      totalKhr: "Total (KHR)",
      addToCart: "Add to Cart",
      saveBuild: "Save Build",
      select: "SELECT",
      change: "Change",
      selectComponent: "Select Component",
    },
    footer: {
      desc: "Your trusted source for genuine tech in Cambodia. Top-tier laptops, custom builds, and professional IT services.",
      shop: "Shop",
      support: "Support",
      company: "Company",
      copyright: "© 2025 S Tech Store. All rights reserved. | Phnom Penh, Cambodia 🇰🇭",
    },
    notifications: {
      title: "Notifications",
      markAllRead: "Mark all as read",
      clearAll: "Clear all",
      empty: "No new notifications",
      welcomeTitle: "Welcome to S Tech Store! 🎉",
      welcomeMsg: "Thank you for joining Cambodia's #1 Genuine Tech Store with 1-Year Official Warranty.",
      loginTitle: "New Account Login 🔐",
      loginMsg: "You successfully signed in to your S Tech Store account.",
      promoTitle: "Free Same-Day Delivery 🚚",
      promoMsg: "Enjoy free express delivery in Phnom Penh for all orders today!",
      timeJustNow: "Just now",
      time2h: "2 hours ago",
      time1d: "1 day ago",
    },
    profilePage: {
      title: "Account Profile & Settings",
      subtitle: "Manage your account settings, preferences, and notifications.",
      overview: "Overview",
      settings: "Personal Info",
      security: "Security",
      notifPrefs: "Notifications",
      welcomeCardTitle: "Welcome back to your S Tech Portal!",
      welcomeCardDesc: "Here you can track your orders, configure custom PC builds, and manage your genuine warranty.",
      memberSince: "Member since",
      roleCustomer: "VIP Customer",
      statsOrders: "Total Orders",
      statsWishlist: "Wishlist Items",
      statsBuilds: "PC Builds",
      statsPoints: "S-Points",
      formName: "Full Name",
      formEmail: "Email Address",
      formPhone: "Phone Number",
      formAddress: "Shipping Address",
      formCity: "City / Province",
      saveBtn: "Save Changes",
      savedSuccess: "Profile updated successfully!",
      secPassword: "Change Password",
      sec2FA: "Two-Factor Authentication (2FA)",
      sec2FADesc: "Add an extra layer of security to your S Tech account.",
      recentActivity: "Recent Account Activity",
      actLogin: "Successful Sign-In — Phnom Penh, KH (Windows / Chrome)",
      actCreate: "Account created and welcome notification sent.",
      prefOrderTitle: "Order Status Updates",
      prefOrderDesc: "Receive real-time order tracking via Telegram & Email.",
      prefPromoTitle: "Promotions & Daily Deals",
      prefPromoDesc: "Be the first to know about discounts and new tech arrivals.",
      prefBuildTitle: "PC Build Compatibility Alerts",
      prefBuildDesc: "Get notified when compatible parts drop in price.",
    },
  },
  KM: {
    nav: {
      home: "ទំព័រដើម",
      laptops: "ឡិបថប (Laptops)",
      desktops: "កុំព្យូទ័រលើតុ (Desktops)",
      parts: "គ្រឿងបន្លាស់ (Parts)",
      gaming: "ហ្គេម (Gaming)",
      services: "សេវាកម្ម (Services)",
      buildPc: "🔧 ដំឡើងកុំព្យូទ័រ (Build PC)",
      products: "ផលិតផលទាំងអស់",
      promotions: "ប្រូម៉ូសិន",
      contact: "ទំនាក់ទំនង",
      about: "អំពីយើង",
      orders: "ការបញ្ជាទិញ",
      searchPlaceholder: "ស្វែងរកផលិតផល...",
      freeDelivery: "🇰🇭 ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងថ្ងៃតែមួយ (ភ្នំពេញ)",
      signIn: "ចូលគណនី",
      register: "ចុះឈ្មោះ",
      signOut: "ចាកចេញ",
      wishlist: "បញ្ជីចំណងជើង",
      cart: "កន្ត្រកទំនិញ",
      alerts: "សារជូនដំណឹង",
      profile: "គណនី",
      hi: "សួស្តី, ",
    },
    hero: {
      titleLine1: "មជ្ឈមណ្ឌលបច្ចេកវិទ្យា",
      titleLine2: "សុទ្ធពិត 100% នៅកម្ពុជា",
      subtitle: "ស្វែងរកកុំព្យូទ័រយួរដៃកំពូល កុំព្យូទ័រលើតុតាមតម្រូវការ និងសេវាកម្ម IT ជំនាញវិជ្ជាជីវៈ។",
      khmerSubtitle: "គុណភាពខ្ពស់ ធានាជាផ្លូវការ ទំនុកចិត្តពិតប្រាកដ",
      shopNow: "ទិញឥឡូវនេះ",
    },
    features: {
      genuine: "ផលិតផលសុទ្ធ 100%",
      warranty: "ធានាផ្លូវការ 1 ឆ្នាំ",
      localPayments: "ទូទាត់តាមធនាគារក្នុងស្រុក",
      sameDayDelivery: "ដឹកជញ្ជូនក្នុងថ្ងៃតែមួយ",
    },
    categories: {
      shopByCategory: "ទិញតាមប្រភេទផលិតផល",
      laptops: "ឡិបថប (Laptops)",
      desktops: "កុំព្យូទ័រលើតុ (Desktops)",
      parts: "គ្រឿងបន្លាស់ (Parts)",
      gaming: "ហ្គេម (Gaming)",
      services: "សេវាកម្ម (Services)",
      secondHand: "របស់ ១ ទឹក (Second-Hand)",
      allProducts: "ផលិតផលទាំងអស់",
      searchSubtitle: "ស្វែងរកផលិតផលបច្ចេកវិទ្យាសុទ្ធពិតគ្រប់ប្រភេទនៅទីនេះ",
      sortBy: "តម្រៀបតាម៖",
      popular: "ពេញនិយម",
      priceLowHigh: "តម្លៃ៖ ទាបទៅខ្ពស់",
      priceHighLow: "តម្លៃ៖ ខ្ពស់ទៅទាប",
      newest: "ផលិតផលថ្មីៗ",
      filters: "ជម្រើសចម្រាញ់",
      inStockOnly: "មានក្នុងស្តុក",
      brand: "ម៉ាក (Brand)",
      priceUsd: "តម្លៃ ($)",
      min: "អប្បបរមា",
      max: "អតិបរមា",
    },
    products: {
      bestSellers: "ផលិតផលលក់ដាច់បំផុត",
      viewAll: "មើលទាំងអស់",
      addToCart: "ដាក់ចូលកន្ត្រក",
      hot: "ល្បី",
      newArrival: "មកដល់ថ្មី",
      inStock: "មានក្នុងស្តុក",
      outOfStock: "អស់ពីស្តុក",
      shipsToday: "— ដឹកជញ្ជូនថ្ងៃនេះ",
      quantity: "បរិមាណ",
      orderTelegram: "កម្ម៉ង់តាម Telegram",
      oneYearWarranty: "ធានាផ្លូវការ 1 ឆ្នាំពេញ",
      genuineProduct: "ផលិតផលសុទ្ធពិត 100%",
      specifications: "លក្ខណៈបច្ចេកទេស",
      description: "ការពិពណ៌នា",
      reviews: "មតិអតិថិជន",
      noReviews: "មិនទាន់មានមតិអតិថិជនទេ។ សូមក្លាយជាអ្នកដំបូងដើម្បីផ្តល់មតិ។",
    },
    cart: {
      title: "កន្ត្រកទំនិញរបស់អ្នក",
      cartStep: "កន្ត្រក",
      deliveryStep: "ដឹកជញ្ជូន",
      paymentStep: "ទូទាត់",
      doneStep: "រួចរាល់",
      orderSummary: "សេចក្តីសង្ខេបការបញ្ជាទិញ",
      subtotal: "សរុបបណ្តោះអាសន្ន",
      delivery: "ដឹកជញ្ជូន",
      free: "ឥតគិតថ្លៃ",
      sameDayPhnomPenh: "ដឹកជញ្ជូនថ្ងៃនេះ (ភ្នំពេញ)",
      total: "សរុបរួម",
      proceedToCheckout: "បន្តទៅទូទាត់ប្រាក់",
      secureCheckout: "ការទូទាត់ប្រាក់មានសុវត្ថិភាពខ្ពស់",
      emptyCart: "កន្ត្រកទំនិញរបស់អ្នកទទេស្អាត។",
      continueShopping: "បន្តការទិញទំនិញ",
      viewCart: "មើលកន្ត្រកទំនិញ",
      checkout: "ទូទាត់ប្រាក់",
    },
    buildPc: {
      title: "ដំឡើងកុំព្យូទ័រតាមតម្រូវការ",
      subtitle: "ជ្រើសរើសគ្រឿងបន្លាស់ដែលត្រូវគ្នាដើម្បីដំឡើងកុំព្យូទ័រក្នុងក្តីស្រមៃរបស់អ្នក។",
      compatCheck: "ពិនិត្យភាពត្រូវគ្នា",
      compatStatus: "ស្ថានភាពភាពត្រូវគ្នា",
      compatIssues: "បញ្ហាភាពមិនត្រូវគ្នា",
      runCheck: "ពិនិត្យឥឡូវនេះ",
      allCompatible: "គ្រឿងបន្លាស់ទាំងអស់ត្រូវគ្នាល្អឥតខ្ចោះ។",
      clickRunCheck: 'ចុច "ពិនិត្យឥឡូវនេះ" ដើម្បីផ្ទៀងផ្ទាត់ភាពត្រូវគ្នា។',
      buildSummary: "សេចក្តីសង្ខេបគ្រឿងបន្លាស់",
      totalUsd: "សរុប (ដុល្លារ)",
      totalKhr: "សរុប (រៀល)",
      addToCart: "ដាក់ចូលកន្ត្រក",
      saveBuild: "រក្សាទុកការដំឡើង",
      select: "ជ្រើសរើស",
      change: "ប្តូរ",
      selectComponent: "ជ្រើសរើសគ្រឿងបន្លាស់",
    },
    footer: {
      desc: "ប្រភពទំនុកចិត្តសម្រាប់ផលិតផលបច្ចេកវិទ្យាសុទ្ធពិតនៅកម្ពុជា។ កុំព្យូទ័រយួរដៃកំពូលៗ កុំព្យូទ័រដំឡើង និងសេវាកម្ម IT ជំនាញ។",
      shop: "ទិញទំនិញ",
      support: "ជំនួយ",
      company: "ក្រុមហ៊ុន",
      copyright: "© 2025 S Tech Store. រក្សាសិទ្ធិគ្រប់យ៉ាង | ភ្នំពេញ, កម្ពុជា 🇰🇭",
    },
    notifications: {
      title: "សារជូនដំណឹង",
      markAllRead: "អានទាំងអស់",
      clearAll: "លុបទាំងអស់",
      empty: "មិនមានសារជូនដំណឹងថ្មីទេ",
      welcomeTitle: "សូមស្វាគមន៍មកកាន់ S Tech Store! 🎉",
      welcomeMsg: "អរគុណសម្រាប់ការក្លាយជាសមាជិកហាងបច្ចេកវិទ្យាសុទ្ធពិតលេខ 1 នៅកម្ពុជា ជាមួយការធានាផ្លូវការ 1 ឆ្នាំ។",
      loginTitle: "ការចូលប្រើគណនីថ្មី 🔐",
      loginMsg: "អ្នកបានចូលប្រើគណនី S Tech Store ដោយជោគជ័យ។",
      promoTitle: "ដឹកជញ្ជូនឥតគិតថ្លៃក្នុងថ្ងៃតែមួយ 🚚",
      promoMsg: "ទទួលបានការដឹកជញ្ជូនឥតគិតថ្លៃក្នុងរាជធានីភ្នំពេញសម្រាប់រាល់ការបញ្ជាទិញថ្ងៃនេះ!",
      timeJustNow: "អម្បាញ់មិញ",
      time2h: "2 ម៉ោងមុន",
      time1d: "1 ថ្ងៃមុន",
    },
    profilePage: {
      title: "គណនី និងការកំណត់",
      subtitle: "គ្រប់គ្រងព័ត៌មានគណនី ការកំណត់ និងសារជូនដំណឹង។",
      overview: "ទិដ្ឋភាពទូទៅ",
      settings: "ព័ត៌មានផ្ទាល់ខ្លួន",
      security: "សុវត្ថិភាព",
      notifPrefs: "សារជូនដំណឹង",
      welcomeCardTitle: "សូមស្វាគមន៍មកកាន់គណនី S Tech របស់អ្នក!",
      welcomeCardDesc: "តាមដានការបញ្ជាទិញ កុំព្យូទ័រដំឡើង និងការធានាផ្លូវការនៅទីនេះ។",
      memberSince: "សមាជិកតាំងពី",
      roleCustomer: "អតិថិជន VIP",
      statsOrders: "ការបញ្ជាទិញសរុប",
      statsWishlist: "ចំណង់ចំណូលចិត្ត",
      statsBuilds: "កុំព្យូទ័រដំឡើង",
      statsPoints: "ពិន្ទុ S-Points",
      formName: "ឈ្មោះពេញ",
      formEmail: "អ៊ីមែល",
      formPhone: "លេខទូរស័ព្ទ",
      formAddress: "អាសយដ្ឋានដឹកជញ្ជូន",
      formCity: "ទីក្រុង / ខេត្ត",
      saveBtn: "រក្សាទុកការផ្លាស់ប្តូរ",
      savedSuccess: "បានធ្វើបច្ចុប្បន្នភាពគណនីដោយជោគជ័យ!",
      secPassword: "ប្តូរពាក្យសម្ងាត់",
      sec2FA: "ការផ្ទៀងផ្ទាត់ 2 ដំណាក់កាល",
      sec2FADesc: "បន្ថែមសុវត្ថិភាពទ្វេដងដល់គណនី S Tech របស់អ្នក។",
      recentActivity: "សកម្មភាពគណនីថ្មីៗ",
      actLogin: "ការចូលគណនីជោគជ័យ — ភ្នំពេញ, កម្ពុជា (Windows / Chrome)",
      actCreate: "បានបង្កើតគណនី និងផ្ញើសារស្វាគមន៍។",
      prefOrderTitle: "សារជូនដំណឹងពីការបញ្ជាទិញ",
      prefOrderDesc: "ទទួលដំណឹងតាមដានការបញ្ជាទិញភ្លាមៗតាម Telegram និងអ៊ីមែល។",
      prefPromoTitle: "ប្រូម៉ូសិន និងការបញ្ចុះតម្លៃ",
      prefPromoDesc: "ដឹងមុនគេអំពីការបញ្ចុះតម្លៃ និងផលិតផលបច្ចេកវិទ្យាថ្មីៗ។",
      prefBuildTitle: "សារជូនដំណឹងភាពត្រូវគ្នាកុំព្យូទ័រដំឡើង",
      prefBuildDesc: "ទទួលដំណឹងនៅពេលគ្រឿងបន្លាស់ត្រូវគ្នាមានការបញ្ចុះតម្លៃ។",
    },
  },
};

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface User {
  id: number;
  firebase_uid: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: "admin" | "customer" | "staff";
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: number;
  count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  sale_price?: number | null;
  stock?: number;
  category?: string;
  brand?: string;
  sku?: string;
  badge?: string | null;
  rating?: number;
  reviews?: number;
  image?: string;
  images?: ProductImage[];
  specs?: ProductSpec[];
  is_featured?: boolean;
  in_stock?: boolean;
  status?: "active" | "inactive" | "out_of_stock";
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductSpec {
  id: number;
  product_id: number;
  spec_key: string;
  spec_value: string;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
}

export interface Order {
  id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total_amount: number;
  payment_method: string;
  payment_status: "paid" | "unpaid" | "refunded";
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Review {
  id: number;
  user: Pick<User, "name" | "avatar_url">;
  rating: number;
  comment: string;
  created_at: string;
  is_verified: boolean;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  cta?: string;
  link?: string;
  badge?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

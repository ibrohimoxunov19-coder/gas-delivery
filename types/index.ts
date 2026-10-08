export type UserRole = 'customer' | 'driver' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  address?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  car_plate?: string;
  car_model?: string;
  driver_phone?: string;
  home_district?: string;
}

export interface CylinderType {
  id: number;
  name: string;
  weight_kg: number;
  price: number;
  trade_in_price?: number | null; // 🆕 almashtirish narxi (arzon)
  stock: number;
}

export type OrderStatus = 'new' | 'confirmed' | 'on_the_way' | 'delivered' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'payme' | 'click';

export interface Order {
  id: number;
  customer_id: string;
  driver_id?: string;
  cylinder_type_id: number;
  quantity: number;
  status: OrderStatus;
  delivery_address: string;
  region?: string;
  district?: string;
  mfy?: string;
  latitude?: number;
  longitude?: number;
  total_price: number;
  notes?: string;
  payment_method: PaymentMethod;
  is_trade_in: boolean;
  empty_balloons: number;
  delivery_time?: string;
  delivered_at?: string;   // haydovchi to'lov oldi (3-band)
  completed_at?: string;   // mijoz tasdiqladi -> chek (4-band)
  receipt_no?: string;
  is_recurring: boolean;
  rating?: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  cylinder_types?: CylinderType;
  driver_profile?: Profile;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  note?: string;
  expense_date: string;
  created_by?: string;
  created_at: string;
}
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
  // Yangi maydonlar
  car_plate?: string;
  car_model?: string;
  driver_phone?: string;
}

export interface CylinderType {
  id: number;
  name: string;
  weight_kg: number;
  price: number;
  stock: number;
}

export type OrderStatus = 'new' | 'confirmed' | 'on_the_way' | 'delivered' | 'cancelled';
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
  receipt_no?: string;
  is_recurring: boolean;
  rating?: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  cylinder_types?: CylinderType;
  driver_profile?: Profile; // <-- join orqali keladi
}
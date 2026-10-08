'use client';

import { Order, OrderStatus } from '@/types';
import {
  Package, MapPin, Clock, CheckCircle, XCircle, Truck, Home, CircleCheckBig,
} from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onUpdateStatus?: (orderId: number, status: OrderStatus) => void;
  showActions?: boolean;
}

const statusLabels: Record<OrderStatus, string> = {
  new: 'Yangi',
  confirmed: 'Tasdiqlangan',
  on_the_way: "Yo'lda",
  delivered: 'Yetkazildi',
  completed: 'Yakunlandi',
  cancelled: 'Bekor qilindi',
};

const statusColors: Record<OrderStatus, string> = {
  new: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  on_the_way: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  new: <Clock className="w-5 h-5" />,
  confirmed: <CheckCircle className="w-5 h-5" />,
  on_the_way: <Truck className="w-5 h-5" />,
  delivered: <Package className="w-5 h-5" />,
  completed: <CircleCheckBig className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
};

export default function OrderCard({
  order,
  onUpdateStatus,
  showActions = false,
}: OrderCardProps) {
  // Haydovchi/admin uchun zanjir: delivered — uning yakuni (to'lov oldi).
  // completed — mijozning ishi, shuning uchun haydovchi tugmasida chiqmaydi.
  const nextStatus: Record<OrderStatus, OrderStatus | null> = {
    new: 'confirmed',
    confirmed: 'on_the_way',
    on_the_way: 'delivered',
    delivered: null,
    completed: null,
    cancelled: null,
  };

  // 💰 3-band: haydovchi yakuniy tugmasi — "to'lov oldi" ma'nosida
  const actionLabel = (status: OrderStatus): string => {
    const next = nextStatus[status];
    if (!next) return '';
    if (next === 'delivered') return "Yetkazdim & to'lov oldim 💰";
    return `${statusLabels[next]} deb belgilash`;
  };

  const fullAddress = [order.region, order.district, order.delivery_address]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">Buyurtma #{order.id}</h3>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleString('uz-UZ')}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusColors[order.status]}`}
        >
          {statusIcons[order.status]}
          {statusLabels[order.status]}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium">Manzil</p>
            <p className="text-gray-600">{fullAddress}</p>
          </div>
        </div>

        {order.mfy && (
          <div className="flex items-start gap-2">
            <Home className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium">MFY</p>
              <p className="text-gray-600">{order.mfy}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Package className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium">Mahsulot</p>
            <p className="text-gray-600">
              {order.cylinder_types?.name} x {order.quantity}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-gray-600">Jami narx:</span>
          <span className="text-xl font-bold text-blue-600">
            {order.total_price.toLocaleString()} so'm
          </span>
        </div>
      </div>

      {showActions && nextStatus[order.status] && onUpdateStatus && (
        <button
          onClick={() => onUpdateStatus(order.id, nextStatus[order.status]!)}
          className={`w-full py-2 rounded-lg font-semibold transition text-white ${
            nextStatus[order.status] === 'delivered'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {actionLabel(order.status)}
        </button>
      )}
    </div>
  );
}
'use client';

import { Order, OrderStatus } from '@/types';
import { CheckCircle2, Circle, Clock, Truck, Package, XCircle } from 'lucide-react';

interface Props {
  order: Order;
}

const STEPS: { key: OrderStatus; label: string; icon: any }[] = [
  { key: 'new', label: 'Qabul qilindi', icon: Package },
  { key: 'confirmed', label: 'Tasdiqlangan', icon: CheckCircle2 },
  { key: 'on_the_way', label: "Yo'lda", icon: Truck },
  { key: 'delivered', label: 'Yetkazildi', icon: Clock },
];

export default function OrderTimeline({ order }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="bg-white p-5 rounded-2xl border shadow-sm mt-3">
      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-600" /> Buyurtma tarixi
      </h4>

      <div className="relative">
        {/* Chiziq */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx <= currentIndex && !isCancelled;
          const isCurrent = idx === currentIndex && !isCancelled;

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {/* Nuqta / ikonka */}
              <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isCancelled && idx > currentIndex ? 'bg-gray-100 text-gray-300' :
                isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'
              }`}>
                {isActive ? <Icon className="w-5 h-5" /> : <Circle className="w-4 h-4" />}
              </div>

              {/* Matn */}
              <div className="pt-1.5 flex-1">
                <p className={`font-semibold text-sm ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-blue-600 font-medium animate-pulse mt-0.5">
                    Hozirgi holat
                  </p>
                )}
                {isActive && !isCurrent && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.updated_at).toLocaleTimeString('uz-UZ')}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Bekor qilingan belgisi */}
        {isCancelled && (
          <div className="relative flex items-start gap-4 pt-2">
            <div className="z-10 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="pt-1.5">
              <p className="font-semibold text-sm text-red-600">Bekor qilindi</p>
              <p className="text-xs text-gray-500">{new Date(order.updated_at).toLocaleString('uz-UZ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
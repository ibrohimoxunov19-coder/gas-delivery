'use client';

import { Order } from '@/types';
import { Flame, Printer, X } from 'lucide-react';

interface ReceiptProps {
  order: Order;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  new: 'Yangi', confirmed: 'Tasdiqlangan', on_the_way: "Yo'lda",
  delivered: 'Yetkazildi', cancelled: 'Bekor qilindi',
};

const paymentLabels: Record<string, string> = {
  cash: 'Naqd', payme: 'Payme', click: 'Click',
};

export default function Receipt({ order, onClose }: ReceiptProps) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4 print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none print:rounded-none">
        {/* Tugmalar (chop etilmaydi) */}
        <div className="flex justify-between items-center p-4 border-b print:hidden sticky top-0 bg-white">
          <h3 className="font-bold text-gray-800">Kvitansiya</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> PDF / Chop etish
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Kvitansiya mazmuni */}
        <div className="p-8 receipt-print">
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-extrabold">
                Gaz<span className="text-blue-600">Express</span>
              </span>
            </div>
            <p className="text-sm text-gray-500">Propan gaz ballonlari yetkazib berish xizmati</p>
            <p className="text-xs text-gray-400 mt-1">+998 90 123 45 67 · info@gazexpress.uz</p>
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-500">Kvitansiya №</p>
              <p className="font-bold text-lg">{order.receipt_no || `#${order.id}`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Sana</p>
              <p className="font-semibold text-sm">
                {new Date(order.created_at).toLocaleString('uz-UZ')}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
            <p className="font-bold text-gray-700 mb-2">Mijoz</p>
            <p className="text-gray-600">{order.profiles?.full_name || '—'}</p>
            <p className="text-gray-600">{order.profiles?.phone || '—'}</p>
            <p className="text-gray-600 mt-2">
              {order.region}, {order.district}, {order.mfy} MFY
            </p>
            <p className="text-gray-600">{order.delivery_address}</p>
          </div>

          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left text-gray-500">
                <th className="py-2">Mahsulot</th>
                <th className="py-2 text-center">Miqdor</th>
                <th className="py-2 text-right">Narx</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 font-medium">{order.cylinder_types?.name || 'Ballon'}</td>
                <td className="py-2 text-center">{order.quantity}</td>
                <td className="py-2 text-right">
                  {(order.total_price / order.quantity).toLocaleString()} so'm
                </td>
              </tr>
              {order.is_trade_in && order.empty_balloons > 0 && (
                <tr className="border-b border-gray-200 text-green-600">
                  <td className="py-2 font-medium">Trade-in chegirma ({order.empty_balloons} ta)</td>
                  <td className="py-2 text-center">−</td>
                  <td className="py-2 text-right">
                    {(order.empty_balloons * 5000).toLocaleString()} so'm
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border-t-2 border-dashed border-gray-300 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">To'lov usuli</span>
              <span className="font-semibold">{paymentLabels[order.payment_method] || 'Naqd'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Yetkazish vaqti</span>
              <span className="font-semibold">{order.delivery_time || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Holat</span>
              <span className="font-semibold">{statusLabels[order.status]}</span>
            </div>
            {order.is_recurring && (
              <div className="flex justify-between text-purple-600">
                <span>♻ Takroriy buyurtma</span>
                <span className="font-semibold">Ha (oyiga 1 marta)</span>
              </div>
            )}
          </div>

          <div className="mt-4 bg-blue-600 text-white rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-lg">JAMI TO'LOV:</span>
            <span className="font-extrabold text-2xl">{order.total_price.toLocaleString()} so'm</span>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Ushbu kvitansiya elektron hisob-faktura o'rnini bosadi. Rahmat! 🙏
          </p>
        </div>
      </div>
    </div>
  );
}
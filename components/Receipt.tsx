'use client';

import { Order } from '@/types';
import { Flame, Printer, X } from 'lucide-react';

interface Props {
  order: Order;
  onClose: () => void;
}

const paymentLabel: Record<string, string> = { cash: 'Naqd', payme: 'Payme', click: 'Click' };

function fmt(d?: string | null): string {
  return d ? new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

// 🖨️ Brend pechat (SVG) — print'da ham rangi saqlanadi
function brandSVG(size = 90): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <circle cx="50" cy="50" r="47" fill="#2563eb"/>
    <circle cx="50" cy="50" r="47" fill="none" stroke="#1e3a8a" stroke-width="2"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3"/>
    <!-- alanga -->
    <path d="M50 22 C44 32 38 36 38 46 C38 54 43 60 50 60 C57 60 62 54 62 46 C62 38 56 34 54 28 C53 33 50 35 48 33 C47 31 49 27 50 22 Z" fill="#fbbf24"/>
    <path d="M50 34 C47 40 44 42 44 48 C44 53 47 56 50 56 C53 56 56 53 56 48 C56 43 52 41 50 34 Z" fill="#f97316"/>
    <!-- yuk mashinasi -->
    <rect x="30" y="64" width="26" height="12" rx="2" fill="#ffffff"/>
    <path d="M56 67 L66 67 L70 72 L70 76 L56 76 Z" fill="#ffffff"/>
    <circle cx="38" cy="78" r="3.5" fill="#1e3a8a"/><circle cx="38" cy="78" r="1.5" fill="#ffffff"/>
    <circle cx="62" cy="78" r="3.5" fill="#1e3a8a"/><circle cx="62" cy="78" r="1.5" fill="#ffffff"/>
    <text x="50" y="92" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#1e3a8a">GAZEKSPRESS</text>
  </svg>`;
}

// 🖨️ Ekrandagi ko'rinish uchun React JSX
function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${accent || 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

export default function Receipt({ order, onClose }: Props) {
  const ct = order.cylinder_types;
  const cust = order.profiles;
  const drv = order.driver_profile;
  const unit = ct?.price ?? 0;
  const lineTotal = unit * order.quantity;
  const tradeIn = order.is_trade_in ? (order.empty_balloons || 0) * 5000 : 0;

  // 🖨️ PRINT — yangi oynada, oddiy HTML + inline CSS (Tailwind ishlamaydi)
  const printReceipt = () => {
    const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8">
<title>Kvitansiya ${order.receipt_no || order.id}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 24px; color: #111827; }
  .paper { max-width: 380px; margin: 0 auto; border: 1px dashed #9ca3af; padding: 18px; }
  .head { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
  .head h1 { color: #2563eb; font-size: 20px; margin: 6px 0 2px; letter-spacing: 1px; }
  .head p { color: #6b7280; font-size: 11px; margin: 0; }
  .sec { border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
  .sec-title { font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
  .row span:first-child { color: #6b7280; }
  .row span:last-child { font-weight: 600; text-align: right; }
  .green { color: #15803d; } .purple { color: #7c3aed; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
  th { text-align: left; color: #9ca3af; font-size: 10px; border-bottom: 1px solid #e5e7eb; padding: 3px 0; }
  td { padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
  .num { text-align: right; }
  .total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #2563eb; border-top: 2px dashed #9ca3af; margin-top: 8px; padding-top: 8px; }
  .foot { text-align: center; margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
  .foot p { font-size: 12px; color: #374151; margin: 2px 0; }
  .stamp { margin-top: 8px; opacity: 0.9; }
  @media print { body { padding: 0; } .paper { border: none; max-width: 100%; } }
</style></head><body><div class="paper">

  <div class="head">
    ${brandSVG(70)}
    <h1>GAZEKSPRESS</h1>
    <p>Suyultirilgan gaz yetkazib berish xizmati</p>
    <p>+998 90 123 45 67 · info@gazexpress.uz</p>
  </div>

  <div class="sec">
    <div class="row"><span>Kvitansiya №</span><span>${order.receipt_no || '#' + order.id}</span></div>
    <div class="row"><span>Buyurtma berildi</span><span>${fmt(order.created_at)}</span></div>
    <div class="row"><span>Yetkazildi</span><span class="green">${fmt(order.delivered_at)}</span></div>
    ${order.delivery_time ? `<div class="row"><span>Rejalashtirilgan</span><span>${order.delivery_time}</span></div>` : ''}
  </div>

  <div class="sec">
    <div class="sec-title">Mijoz</div>
    <div class="row"><span>Ism</span><span>${cust?.full_name || '—'}</span></div>
    <div class="row"><span>Telefon</span><span>${cust?.phone || '—'}</span></div>
    <div class="row"><span>Manzil</span><span>${order.delivery_address || '—'}${order.mfy ? ' · ' + order.mfy + ' MFY' : ''}${order.district ? ', ' + order.district : ''}</span></div>
  </div>

  <div class="sec">
    <div class="sec-title">Haydovchi</div>
    ${drv ? `
    <div class="row"><span>Ism</span><span>${drv.full_name || '—'}</span></div>
    <div class="row"><span>Telefon</span><span>${drv.driver_phone || drv.phone || '—'}</span></div>
    ${(drv.car_plate || drv.car_model) ? `<div class="row"><span>Mashina</span><span>${[drv.car_plate, drv.car_model].filter(Boolean).join(' · ')}</span></div>` : ''}
    ` : `<div class="row"><span>Biriktirilmagan</span><span>—</span></div>`}
  </div>

  <div class="sec">
    <div class="sec-title">Mahsulot</div>
    <table>
      <thead><tr><th>Nom</th><th class="num">Kg</th><th class="num">Narx</th><th class="num">Dona</th><th class="num">Summa</th></tr></thead>
      <tbody><tr>
        <td>${ct?.name || '—'}</td>
        <td class="num">${ct?.weight_kg ?? '—'}</td>
        <td class="num">${unit.toLocaleString('ru-RU')}</td>
        <td class="num">${order.quantity}</td>
        <td class="num"><b>${lineTotal.toLocaleString('ru-RU')}</b></td>
      </tr></tbody>
    </table>
    ${order.is_trade_in ? `<div class="row" style="margin-top:6px;color:#15803d;"><span>Bo'sh ballon almashtirish (${order.empty_balloons})</span><span>−${tradeIn.toLocaleString('ru-RU')}</span></div>` : ''}
    <div class="total"><span>JAMI TO'LOV</span><span>${Number(order.total_price).toLocaleString('ru-RU')} so'm</span></div>
    <div class="row" style="margin-top:4px;"><span>To'lov usuli</span><span>${paymentLabel[order.payment_method] || order.payment_method}</span></div>
  </div>

  ${order.notes ? `<div class="sec"><div class="sec-title">Izoh</div><p style="font-size:12px;margin:2px 0;">${order.notes}</p></div>` : ''}

  <div class="foot">
    <p><b>Rahmat, mijoz! 🙏</b></p>
    <p>Gazingiz doimo uyingizda bo'lsin</p>
    <div class="stamp">${brandSVG(80)}</div>
  </div>

</div></body></html>`;

    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) { alert('Brauzer yangi oynani blokladi — ruxsat bering.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 350); // kontent yuklanishi uchun ozgina kutish
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-4">
        {/* Sarlavha */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 text-center">
          <div className="inline-block mb-1">{/* ekran uchun kichik SVG */}
            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="47" fill="#ffffff" fillOpacity="0.15"/>
              <path d="M50 22 C44 32 38 36 38 46 C38 54 43 60 50 60 C57 60 62 54 62 46 C62 38 56 34 54 28 C53 33 50 35 48 33 C47 31 49 27 50 22 Z" fill="#fbbf24"/>
              <path d="M50 34 C47 40 44 42 44 48 C44 53 47 56 50 56 C53 56 56 53 56 48 C56 43 52 41 50 34 Z" fill="#f97316"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold">GazExpress</h2>
          <p className="text-blue-100 text-xs">Suyultirilgan gaz yetkazib berish xizmati</p>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b flex justify-between items-center text-sm">
          <span className="text-gray-500">Kvitansiya №</span>
          <span className="font-mono font-bold text-gray-800">{order.receipt_no || `#${order.id}`}</span>
        </div>

        <div className="px-5 py-3 border-b space-y-1">
          <Row label="Buyurtma berildi:" value={fmt(order.created_at)} />
          <Row label="Yetkazildi:" value={fmt(order.delivered_at)} accent="text-green-700" />
          {order.delivery_time && <Row label="Rejalashtirilgan:" value={order.delivery_time} />}
        </div>

        <div className="px-5 py-3 border-b">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Mijoz</p>
          <p className="font-bold text-gray-800">{cust?.full_name || '—'}</p>
          <p className="text-sm text-gray-600">{cust?.phone || '—'}</p>
          <p className="text-sm text-gray-600">{order.delivery_address}{order.mfy ? ` · ${order.mfy} MFY` : ''}{order.district ? `, ${order.district}` : ''}</p>
        </div>

        <div className="px-5 py-3 border-b bg-purple-50/40">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Haydovchi</p>
          {drv ? (
            <>
              <p className="font-bold text-gray-800">{drv.full_name || '—'}</p>
              <p className="text-sm text-gray-600">{drv.driver_phone || drv.phone || '—'}</p>
              {(drv.car_plate || drv.car_model) && <p className="text-sm text-gray-600">{[drv.car_plate, drv.car_model].filter(Boolean).join(' · ')}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-400">Biriktirilmagan</p>
          )}
        </div>

        <div className="px-5 py-3">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Mahsulot</p>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 text-xs border-b">
              <th className="text-left py-1">Nom</th><th className="text-center py-1">Kg</th><th className="text-right py-1">Narx</th><th className="text-center py-1">Dona</th><th className="text-right py-1">Summa</th>
            </tr></thead>
            <tbody><tr className="border-b">
              <td className="py-2 font-medium">{ct?.name || '—'}</td>
              <td className="text-center text-gray-600">{ct?.weight_kg ?? '—'}</td>
              <td className="text-right text-gray-600">{unit.toLocaleString()}</td>
              <td className="text-center">{order.quantity}</td>
              <td className="text-right font-semibold">{lineTotal.toLocaleString()}</td>
            </tr></tbody>
          </table>
          {order.is_trade_in && (
            <div className="flex justify-between text-sm text-green-700 mt-2">
              <span>Bo'sh ballon almashtirish ({order.empty_balloons})</span>
              <span>−{tradeIn.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-dashed">
            <span className="font-bold text-gray-700">JAMI TO'LOV:</span>
            <span className="text-xl font-extrabold text-blue-600">{Number(order.total_price).toLocaleString()} so'm</span>
          </div>
          <Row label="To'lov usuli:" value={paymentLabel[order.payment_method] || order.payment_method} />
        </div>

        {order.notes && (
          <div className="px-5 pb-3"><p className="text-xs text-gray-400">Izoh: <span className="text-gray-600">{order.notes}</span></p></div>
        )}

        {/* Pastki brend pechat */}
        <div className="px-5 py-4 bg-gray-50 text-center border-t">
          <div className="inline-block mb-2">
            <svg width="70" height="70" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="47" fill="#2563eb"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3"/>
              <path d="M50 22 C44 32 38 36 38 46 C38 54 43 60 50 60 C57 60 62 54 62 46 C62 38 56 34 54 28 C53 33 50 35 48 33 C47 31 49 27 50 22 Z" fill="#fbbf24"/>
              <path d="M50 34 C47 40 44 42 44 48 C44 53 47 56 50 56 C53 56 56 53 56 48 C56 43 52 41 50 34 Z" fill="#f97316"/>
              <rect x="30" y="64" width="26" height="12" rx="2" fill="#fff"/>
              <path d="M56 67 L66 67 L70 72 L70 76 L56 76 Z" fill="#fff"/>
              <circle cx="38" cy="78" r="3.5" fill="#1e3a8a"/><circle cx="62" cy="78" r="3.5" fill="#1e3a8a"/>
              <text x="50" y="93" textAnchor="middle" fontFamily="Arial" fontSize="9" fontWeight="bold" fill="#1e3a8a">GAZEKSPRESS</text>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">Rahmat, mijoz! 🙏</p>
          <p className="text-xs text-gray-400">Gazingiz doimo uyingizda bo'lsin</p>
        </div>

        <div className="flex gap-2 p-4">
          <button onClick={printReceipt} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2">
            <Printer className="w-5 h-5" /> Chop etish / PDF
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center gap-1">
            <X className="w-5 h-5" /> Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { REGIONS } from '@/lib/regions';
import { MFY_SUGGESTIONS } from '@/lib/mfy';
import { CylinderType, PaymentMethod } from '@/types';
import Map from './Map';
import { toast } from './Toast';
import {
  ShoppingCart, MapPin, AlertCircle, Home, Wallet, RefreshCw, Clock, Recycle,
} from 'lucide-react';

interface OrderFormProps {
  customerId: string;
  onSuccess?: () => void;
}

const DELIVERY_SLOTS = [
  'Bugun 09:00–11:00',
  'Bugun 11:00–13:00',
  'Bugun 14:00–16:00',
  'Bugun 16:00–18:00',
  'Ertaga 09:00–11:00',
  'Ertaga 14:00–16:00',
];

const TRADE_IN_DISCOUNT = 5000; // har bir bo'sh ballon uchun chegirma

export default function OrderForm({ customerId, onSuccess }: OrderFormProps) {
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [selectedType, setSelectedType] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [mfy, setMfy] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_SLOTS[0]);
  const [isTradeIn, setIsTradeIn] = useState(false);
  const [emptyBalloons, setEmptyBalloons] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCylinderTypes();
  }, []);

  const loadCylinderTypes = async () => {
    const { data, error } = await supabase.from('cylinder_types').select('*');
    if (!error && data) {
      setCylinderTypes(data);
      if (data.length > 0) setSelectedType(data[0].id);
    }
  };

  const selectedRegion = REGIONS.find((r) => r.name === region);
  const selectedDistrict = selectedRegion?.districts.find((d) => d.name === district);

  const mapCenter: [number, number] = selectedDistrict
    ? [selectedDistrict.lat, selectedDistrict.lng]
    : selectedRegion
      ? [selectedRegion.lat, selectedRegion.lng]
      : [41.37, 64.58];
  const mapZoom = selectedDistrict ? 13 : selectedRegion ? 9 : 6;

  const locationSelected = latitude !== null && longitude !== null;
  const selectedCylinder = cylinderTypes.find((ct) => ct.id === selectedType);
  const stock = selectedCylinder?.stock ?? 0;
  const stockOk = quantity <= stock;

  const basePrice = selectedCylinder ? selectedCylinder.price * quantity : 0;
  const tradeInDiscount = isTradeIn ? emptyBalloons * TRADE_IN_DISCOUNT : 0;
  const totalPrice = Math.max(basePrice - tradeInDiscount, 0);

  const canSubmit =
    locationSelected &&
    address.trim().length > 0 &&
    mfy.trim().length > 0 &&
    !!region &&
    !!district &&
    stockOk;

  const handleRegionChange = (value: string) => {
    setRegion(value);
    setDistrict('');
    setLatitude(null);
    setLongitude(null);
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setLatitude(null);
    setLongitude(null);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!locationSelected) {
      toast('Iltimos, avval xaritada manzilni belgilang!', 'error');
      return;
    }
    if (!stockOk) {
      toast(`Afsuski, omborda faqat ${stock} ta qoldi!`, 'error');
      return;
    }

    setLoading(true);

    try {
      const receiptNo = `RX-${Date.now().toString().slice(-6)}`;

      const { error } = await supabase.from('orders').insert({
        customer_id: customerId,
        cylinder_type_id: selectedType,
        quantity,
        region,
        district,
        mfy: mfy.trim(),
        delivery_address: address.trim(),
        latitude,
        longitude,
        total_price: totalPrice,
        notes,
        payment_method: payment,
        is_trade_in: isTradeIn,
        empty_balloons: isTradeIn ? emptyBalloons : 0,
        delivery_time: deliveryTime,
        receipt_no: receiptNo,
        is_recurring: isRecurring,
        status: 'new',
      });

      if (error) throw error;

      // Ombor qoldig'ini kamaytirish (atomik)
      await supabase.rpc('decrement_stock', { p_type_id: selectedType, p_qty: quantity });

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('Buyurtma muvaffaqiyatli qabul qilindi');
        utterance.lang = 'uz-UZ';
        speechSynthesis.speak(utterance);
      }

      toast(`Buyurtma qabul qilindi! Kvitansiya: ${receiptNo}`, 'success');

      setAddress('');
      setRegion('');
      setDistrict('');
      setMfy('');
      setLatitude(null);
      setLongitude(null);
      setNotes('');
      setQuantity(1);
      setIsTradeIn(false);
      setEmptyBalloons(0);
      setIsRecurring(false);
      setPayment('cash');

      loadCylinderTypes();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast('Xatolik: ' + (error as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4 animate-fade-in-up"
    >
      <h3 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
        <span className="bg-blue-100 p-2 rounded-lg">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
        </span>
        Yangi buyurtma
      </h3>

      {/* Hudud */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Viloyat</label>
          <select
            value={region}
            onChange={(e) => handleRegionChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            required
          >
            <option value="">Tanlang...</option>
            {REGIONS.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Tuman / Shahar</label>
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedRegion}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
          >
            <option value="">Tanlang...</option>
            {selectedRegion?.districts.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
          <Home className="w-4 h-4 text-blue-600" /> MFY (mahalla) nomi
        </label>
        <input
          type="text"
          value={mfy}
          onChange={(e) => setMfy(e.target.value)}
          list="mfy-suggestions"
          placeholder="Yozing yoki ro'yxatdan tanlang..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          required
        />
        <datalist id="mfy-suggestions">
          {MFY_SUGGESTIONS.map((name) => (<option key={name} value={name} />))}
        </datalist>
      </div>

      {/* Ballon turi + ombor */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Ballon turi</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          {cylinderTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} — {type.price.toLocaleString()} so'm (omborda: {type.stock})
            </option>
          ))}
        </select>
        {selectedCylinder && (
          <p className={`text-xs mt-1 font-medium ${stockOk ? 'text-green-600' : 'text-red-600'}`}>
            {stockOk ? `✓ Omborda ${stock} ta bor` : `⚠ Faqat ${stock} ta qoldi!`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Miqdori</label>
        <input
          type="number"
          min="1"
          max={stock || 1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {/* Yetkazish vaqti */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
          <Clock className="w-4 h-4 text-blue-600" /> Yetkazib berish vaqti
        </label>
        <select
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          {DELIVERY_SLOTS.map((slot) => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
      </div>

      {/* To'lov metodi */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 flex items-center gap-1">
          <Wallet className="w-4 h-4 text-blue-600" /> To'lov usuli
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'cash', l: 'Naqd' },
            { v: 'payme', l: 'Payme' },
            { v: 'click', l: 'Click' },
          ] as { v: PaymentMethod; l: string }[]).map((p) => (
            <button
              key={p.v}
              type="button"
              onClick={() => setPayment(p.v)}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition ${
                payment === p.v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Trade-in */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isTradeIn}
            onChange={(e) => setIsTradeIn(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Recycle className="w-4 h-4 text-green-600" /> Bo'sh ballonni yangisiga almashtirish (trade-in)
          </span>
        </label>
        {isTradeIn && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Qaytariladigan bo'sh ballonlar soni (har biri −{TRADE_IN_DISCOUNT.toLocaleString()} so'm)
            </label>
            <input
              type="number"
              min="0"
              value={emptyBalloons}
              onChange={(e) => setEmptyBalloons(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
        )}
      </div>

      {/* Takroriy buyurtma */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <RefreshCw className="w-4 h-4 text-purple-600" /> Oyiga bir marta takroriy buyurtma sifatida belgilash
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Aniq manzil (ko'cha, uy)</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Masalan: 5-kvartal, 12-uy, 3-xonadon"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 flex items-center gap-2 text-gray-700">
          <MapPin className="w-4 h-4 text-blue-600" /> Xaritada manzilni belgilang
        </label>
        <Map
          center={mapCenter}
          zoom={mapZoom}
          selected={locationSelected ? [latitude!, longitude!] : null}
          onLocationSelect={handleLocationSelect}
          height="300px"
        />
        {locationSelected ? (
          <p className="text-sm text-green-600 mt-2 font-medium">
            ✓ Joylashuv tanlandi: {latitude!.toFixed(4)}, {longitude!.toFixed(4)}
          </p>
        ) : (
          <p className="text-sm text-amber-600 mt-2 font-medium flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> Buyurtma berish uchun xaritada manzilni belgilang
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Qo'shimcha izohlar</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          rows={2}
        />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Narx:</span><span>{basePrice.toLocaleString()} so'm</span>
        </div>
        {tradeInDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Trade-in chegirma:</span><span>−{tradeInDiscount.toLocaleString()} so'm</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-800 pt-1 border-t border-blue-100">
          <span>Jami:</span><span className="text-blue-600">{totalPrice.toLocaleString()} so'm</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Yuborilmoqda...' : !stockOk ? 'Omborda yetarli emas' : 'Buyurtma berish'}
      </button>
    </form>
  );
}
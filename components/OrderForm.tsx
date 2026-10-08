'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { REGIONS } from '@/lib/regions';
import { MFY_ZONES } from '@/lib/mfyZones';
import { CylinderType, PaymentMethod } from '@/types';
import Map from './Map';
import { toast } from './Toast';
import {
  ShoppingCart, MapPin, AlertCircle, Home, Wallet, RefreshCw, Clock, Recycle, Crosshair,
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

const TRADE_IN_DISCOUNT = 5000; // trade_in_price bo'sh bo'lsa, avtomatik chegirma

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
  const [gpsLoc, setGpsLoc] = useState<[number, number] | null>(null);
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

  // 🏙️ Shahar / tuman ajratish (optgroup uchun)
  const cityList = selectedRegion?.districts.filter((d) => d.name.includes('shahri')) || [];
  const townList = selectedRegion?.districts.filter((d) => !d.name.includes('shahri')) || [];

  // Xarita faqat GPS yoki tuman/viloyat tanlovida sakraydi; klik/drag'da SILJIMAYDI
  const mapCenter: [number, number] = gpsLoc
    ? gpsLoc
    : selectedDistrict
      ? [selectedDistrict.lat, selectedDistrict.lng]
      : selectedRegion
        ? [selectedRegion.lat, selectedRegion.lng]
        : [41.37, 64.58];
  const mapZoom = gpsLoc ? 15 : selectedDistrict ? 13 : selectedRegion ? 9 : 6;

  const locationSelected = latitude !== null && longitude !== null;
  const selectedCylinder = cylinderTypes.find((ct) => ct.id === selectedType);
  const stock = selectedCylinder?.stock ?? 0;
  const stockOk = quantity <= stock;

  // 💰 YANGI NARX MODELİ: almashtirish (arzon) + yangi (qimmat) aralashmasi
  const unitNew = selectedCylinder?.price ?? 0;
  const unitTrade = selectedCylinder
    ? (selectedCylinder.trade_in_price ?? (selectedCylinder.price - TRADE_IN_DISCOUNT))
    : 0;
  const tradeInCount = isTradeIn ? Math.min(emptyBalloons, quantity) : 0;
  const newCount = quantity - tradeInCount;
  const newLine = newCount * unitNew;
  const tradeLine = tradeInCount * unitTrade;
  const totalPrice = newLine + tradeLine;

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
    setGpsLoc(null);
    setLatitude(null);
    setLongitude(null);
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setGpsLoc(null);
    setLatitude(null);
    setLongitude(null);
  };

  // Xaritaga klik — manzil qo'yiladi (xarita siljimaydi, chunki gpsLoc null)
  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  // Markerni surish — aniq uyga qo'yish
  const handleMarkerDrag = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  // Trade-in belgilanganda bo'sh ballonlar = miqdorga teng (qulaylik), bekor qilsa 0
  const handleTradeInToggle = (checked: boolean) => {
    setIsTradeIn(checked);
    setEmptyBalloons(checked ? quantity : 0);
  };

  // 📍 GPS — ayni turgan joyga nuqta tushadi
  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      toast("Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi", 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLatitude(la);
        setLongitude(ln);
        setGpsLoc([la, ln]);
        toast('Joylashuvingiz aniqlandi 📍 — kerak bo\'lsa suring', 'success');
      },
      () => toast('Joylashuvga ruxsat berilmadi', 'error')
    );
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
        empty_balloons: isTradeIn ? tradeInCount : 0,
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
      setGpsLoc(null);
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
            {cityList.length > 0 && (
              <optgroup label="🏙️ Shaharlar">
                {cityList.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </optgroup>
            )}
            {townList.length > 0 && (
              <optgroup label="🏘️ Tumanlar">
                {townList.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* MFY — datalist MFY_ZONES dan */}
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
          {MFY_ZONES.map((z) => (<option key={z.name} value={z.name} />))}
        </datalist>
      </div>

      {/* Ballon turi + ombor (yangi/almashtirish narxi bilan) */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Ballon turi</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        >
          {cylinderTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name} — yangi {type.price.toLocaleString()} / almashtirish {(type.trade_in_price ?? (type.price - TRADE_IN_DISCOUNT)).toLocaleString()} so'm (omborda: {type.stock})
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
          onChange={(e) => {
            const q = Number(e.target.value);
            setQuantity(q);
            if (isTradeIn) setEmptyBalloons(Math.min(emptyBalloons, q));
          }}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      {/* Yetkazish vaqti (slotlar) */}
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

      {/* 💰 Trade-in — belgilanganda narx JONLI o'zgaradi */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isTradeIn}
            onChange={(e) => handleTradeInToggle(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Recycle className="w-4 h-4 text-green-600" /> Bo'sh ballonni almashtirish (arzonroq)
          </span>
        </label>
        {isTradeIn && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Qaytariladigan bo'sh ballonlar soni (0–{quantity}) — har biri {unitTrade.toLocaleString()} so'mdan
            </label>
            <input
              type="number"
              min="0"
              max={quantity}
              value={emptyBalloons}
              onChange={(e) => setEmptyBalloons(Math.max(0, Math.min(quantity, Number(e.target.value))))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 {tradeInCount} ta almashtirish ({unitTrade.toLocaleString()}) + {newCount} ta yangi ({unitNew.toLocaleString()})
            </p>
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

      {/* Xarita + 📍 geolocation + drag */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-blue-600" /> Xaritada manzilni belgilang
          </label>
          <button
            type="button"
            onClick={locateMe}
            className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <Crosshair className="w-4 h-4" /> Joylashuvimni aniqlash
          </button>
        </div>
        <Map
          center={mapCenter}
          zoom={mapZoom}
          selected={locationSelected ? [latitude!, longitude!] : null}
          onLocationSelect={handleLocationSelect}
          onMarkerDrag={handleMarkerDrag}
          height="300px"
        />
        {locationSelected ? (
          <p className="text-sm text-green-600 mt-2 font-medium">
            ✓ Joylashuv tanlandi: {latitude!.toFixed(4)}, {longitude!.toFixed(4)} — <span className="text-gray-500">(nuqtani suring)</span>
          </p>
        ) : (
          <p className="text-sm text-amber-600 mt-2 font-medium flex items-center gap-1">
            <AlertCircle className="w-4 h-4" /> "Joylashuvimni aniqlash" bosing yoki xaritaga klik qiling
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

      {/* 💰 JONLI NARX — trade-in o'zgarsa shu yerda ko'rinadi */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100 space-y-1">
        {isTradeIn && tradeInCount > 0 ? (
          <>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Yangi ballon ({newCount} dona):</span>
              <span>{newLine.toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between text-sm text-green-700">
              <span>Almashtirish ({tradeInCount} dona):</span>
              <span>{tradeLine.toLocaleString()} so'm</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Narx ({quantity} dona):</span>
            <span>{totalPrice.toLocaleString()} so'm</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-800 pt-1 border-t border-blue-100">
          <span>Jami:</span>
          <span className="text-blue-600">{totalPrice.toLocaleString()} so'm</span>
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
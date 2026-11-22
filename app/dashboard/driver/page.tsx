'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Profile } from '@/types';
import OrderCard from '@/components/OrderCard';
import Map from '@/components/Map';
import Receipt from '@/components/Receipt';
import { toast } from '@/components/Toast';
import { sendPush } from '@/lib/notifications';
import ProfileButton from '@/components/ProfileButton';
import { getNavUrl } from '@/lib/navigation';
import { buildOptimalRoute, RouteResult } from '@/lib/route';
import NotificationBell from '@/components/NotificationBell';
import { notifyOutForDelivery, notifyConfirmed } from '@/lib/sms';
import {
  buildDriverReport,
  exportDriverCSV,
  DriverReport,
  DRIVER_FEE_PER_DELIVERY,
} from '@/lib/reporting';
import { useRouter } from 'next/navigation';
import {
  LogOut, Truck, MapPin, Star, Filter, TrendingUp, Package, Calendar,
  Navigation, Radio, ExternalLink, BarChart3, WifiOff,
  Route, Wallet, FileText, Download, AlertTriangle, Brain, Lock,
} from 'lucide-react';

interface MfyStat {
  name: string;
  count: number;
  total: number;
}

export default function DriverDashboard() {
  const [user, setUser] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMfy, setSelectedMfy] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mfyStats, setMfyStats] = useState<MfyStat[]>([]);
  const [driverStats, setDriverStats] = useState({
    totalDelivered: 0,
    totalRevenue: 0,
    thisMonth: 0,
  });
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [shiftStatus, setShiftStatus] = useState<'free' | 'busy' | 'offline'>('free');
  const [loadedFull, setLoadedFull] = useState(0);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [startQty, setStartQty] = useState('');
  const [route, setRoute] = useState<RouteResult | null>(null);

  // 🔐 PIN kiritish modali
  const [pinOrder, setPinOrder] = useState<Order | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [assignedDistrict, setAssignedDistrict] = useState<string>('');
  const districtRef = useRef<string>('');
  const userRef = useRef<string | null>(null);

  const [report, setReport] = useState<DriverReport | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('driver_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const n = payload.new as any;
          if (n.status === 'new' && (n.district === districtRef.current || n.driver_id === userRef.current)) {
            sendPush('GazExpress — Yangi buyurtma', `#${n.id} · ${n.mfy || n.district || 'Yangi'} MFY`);
          }
          loadOrders();
          loadMfyStats();
          loadMyReport();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          loadOrders();
          loadMfyStats();
          loadMyReport();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (liveMode) {
      updateMyLocation();
      intervalRef.current = setInterval(updateMyLocation, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveMode, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'driver') {
      router.push('/dashboard/customer');
      return;
    }

    setUser(profile);
    userRef.current = profile.id;
    setShiftStatus((profile.shift_status as 'free' | 'busy' | 'offline') || 'free');
    setLoadedFull(profile.loaded_full || 0);
    if (profile.latitude && profile.longitude) {
      setMyPos([profile.latitude, profile.longitude]);
    }

    if (profile.home_district) {
      setAssignedDistrict(profile.home_district);
      districtRef.current = profile.home_district;
    }

    setLoading(false);
    loadOrders();
    loadMfyStats();
    loadDriverStats(profile.id);
    loadMyReport();
  };

  const updateMyLocation = async () => {
    if (!user) return;
    if (!('geolocation' in navigator)) {
      toast("Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi", 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyPos([lat, lng]);
        await supabase
          .from('profiles')
          .update({ latitude: lat, longitude: lng })
          .eq('id', user.id);
        if (!liveMode) toast('Joylashuv yangilandi 📍', 'success');
      },
      () => {
        setLiveMode(false);
        if (!liveMode) toast('Joylashuvga ruxsat berilmadi', 'error');
      }
    );
  };

  const loadOrders = async () => {
    if (!user) return;
    let q = supabase
      .from('orders')
      .select(`*, profiles:customer_id (full_name, phone), cylinder_types:cylinder_type_id (name)`)
      .in('status', ['new', 'accepted', 'confirmed', 'on_the_way', 'delivered', 'completed']);
    if (districtRef.current) {
      q = q.or(`district.eq.${districtRef.current},driver_id.eq.${user.id}`);
    } else {
      q = q.eq('driver_id', user.id);
    }
    const { data, error } = await q.order('created_at', { ascending: false });
    if (!error && data) setOrders(data as Order[]);
  };

  const loadMyReport = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`*,
        profiles:customer_id (full_name, phone, address),
        driver_profile:profiles!driver_id (full_name, phone, car_plate, car_model, driver_phone),
        cylinder_types:cylinder_type_id (name, weight_kg, price)`)
      .eq('driver_id', user.id)
      .in('status', ['delivered', 'completed'])
      .order('created_at', { ascending: false });
    if (!error && data) setReport(buildDriverReport(data as Order[]));
  };

  const loadMfyStats = async () => {
    if (!user) return;
    let q = supabase
      .from('orders')
      .select('mfy, total_price, status')
      .in('status', ['new', 'accepted', 'confirmed', 'on_the_way', 'delivered', 'completed']);
    if (districtRef.current) {
      q = q.or(`district.eq.${districtRef.current},driver_id.eq.${user.id}`);
    } else {
      q = q.eq('driver_id', user.id);
    }
    const { data, error } = await q;
    if (!error && data) {
      const stats: Record<string, MfyStat> = {};
      data.forEach((o: any) => {
        if (!o.mfy) return;
        if (!stats[o.mfy]) stats[o.mfy] = { name: o.mfy, count: 0, total: 0 };
        stats[o.mfy].count++;
        stats[o.mfy].total += Number(o.total_price);
      });
      setMfyStats(Object.values(stats).sort((a, b) => b.count - a.count));
    }
  };

  const loadDriverStats = async (driverId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('total_price, created_at')
      .eq('driver_id', driverId)
      .in('status', ['delivered', 'completed']);
    if (!error && data) {
      const now = new Date();
      const thisMonth = data.filter((o: any) => {
        const d = new Date(o.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      setDriverStats({
        totalDelivered: data.length,
        totalRevenue: data.reduce((s: number, o: any) => s + Number(o.total_price), 0),
        thisMonth: thisMonth.length,
      });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const nextOf = (s: OrderStatus): OrderStatus | null => {
    const map: Record<OrderStatus, OrderStatus | null> = {
      new: 'accepted',
      accepted: 'confirmed',
      confirmed: 'on_the_way',
      on_the_way: 'delivered',
      delivered: null,
      completed: null,
      cancelled: null,
    };
    return map[s];
  };

  const bulkAdvance = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    let moved = 0;
    for (const id of ids) {
      const ord = orders.find((o) => o.id === id);
      if (!ord) continue;
      const next = nextOf(ord.status);
      if (!next) continue;
      // 🔐 delivered — PIN talab qiladi, bulk'da o'tkazib yuboramiz (bittalab qilinadi)
      if (next === 'delivered') continue;
      const updateData: Record<string, unknown> = {
        status: next,
        updated_at: new Date().toISOString(),
      };
      if (next === 'confirmed') updateData.driver_id = user!.id;
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id);
      if (error) continue;
      moved++;
      if (next === 'confirmed') notifyConfirmed(ord.profiles?.phone, id);
      else if (next === 'on_the_way') notifyOutForDelivery(ord.profiles?.phone, id);
    }
    toast(`${moved} ta buyurtma keyingi bosqichga o'tdi ⏭️`, 'success');
    setSelectedIds([]);
    loadOrders();
    loadMfyStats();
    if (user) {
      loadDriverStats(user.id);
      loadMyReport();
    }
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    // 🔐 DELIVERED — PIN modali ochiladi (darhol qilmaydi)
    if (status === 'delivered') {
      const ord = orders.find((o) => o.id === orderId);
      if (!ord?.delivery_pin) {
        toast('Bu buyurtmada PIN yo\'q — admin orqali belgilang', 'error');
        return;
      }
      setPinOrder(ord);
      setPinInput('');
      setPinError('');
      return;
    }
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'confirmed') updateData.driver_id = user!.id;
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    if (!error) {
      if (status === 'confirmed' || status === 'on_the_way') {
        const ord = orders.find((o) => o.id === orderId);
        if (status === 'confirmed') notifyConfirmed(ord?.profiles?.phone, orderId);
        else notifyOutForDelivery(ord?.profiles?.phone, orderId);
      }
      if ('speechSynthesis' in window) {
        const t: Record<string, string> = {
          accepted: 'Buyurtma qabul qilindi',
          confirmed: 'Buyurtma tasdiqlandi',
          on_the_way: "Buyurtma yo'lda",
        };
        const u = new SpeechSynthesisUtterance(t[status] || '');
        u.lang = 'uz-UZ';
        speechSynthesis.speak(u);
      }
      loadOrders();
      loadMfyStats();
    }
  };

  // 🔐 PIN tasdiqlash — kod to'g'ri bo'lsagina delivered
  const confirmPin = async () => {
    if (!pinOrder) return;
    if (pinInput.trim() !== pinOrder.delivery_pin) {
      setPinError('Kod noto\'g\'ri — mijozdan so\'rang');
      return;
    }
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pinOrder.id);
    if (error) {
      toast('Xatolik: ' + error.message, 'error');
      return;
    }
    toast('Buyurtma yetkazildi — kod tasdiqlandi 💰', 'success');
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('Buyurtma yetkazildi');
      u.lang = 'uz-UZ';
      speechSynthesis.speak(u);
    }
    setPinOrder(null);
    setPinInput('');
    setPinError('');
    loadOrders();
    loadMfyStats();
    if (user) {
      loadDriverStats(user.id);
      loadMyReport();
    }
  };

  // 🧠 Optimal marshrut (Nearest Neighbor)
  const computeRoute = () => {
    if (!myPos) { toast('Avval joylashuvingizni yangilang 📍', 'error'); return; }
    const stops = orders
      .filter((o) => ['new', 'accepted', 'confirmed', 'on_the_way'].includes(o.status) && o.latitude && o.longitude)
      .map((o) => ({ id: o.id, lat: o.latitude!, lng: o.longitude!, label: `#${o.id}` }));
    if (stops.length === 0) { toast('Faol buyurtmalar yo\'q', 'info'); return; }
    const r = buildOptimalRoute(myPos, stops);
    setRoute(r);
    toast(`Optimal marshrut tuzildi: jami ${r.totalKm} km (${r.savedKm} km tejaldi) 🧠`, 'success');
  };

  const clearRoute = () => setRoute(null);


  const saveShift = async (s: 'free' | 'busy' | 'offline') => {
    setShiftStatus(s);
    if (user) {
      await supabase.from('profiles').update({ shift_status: s }).eq('id', user.id);
    }
  };

  const startShift = async () => {
    const n = Number(startQty);
    if (!n || n <= 0) { toast('Yuklangan ballonlar sonini kiriting', 'error'); return; }
    setLoadedFull(n);
    if (user) await supabase.from('profiles').update({ loaded_full: n, shift_status: 'busy' }).eq('id', user.id);
    setShiftStatus('busy');
    setShowStartModal(false);
    setStartQty('');
    toast(`Smena boshlandi — ${n} ta to'la ballon yuklandi 📦`, 'success');
  };

  const closeShift = async () => {
    if (user) await supabase.from('profiles').update({ loaded_full: 0, shift_status: 'offline' }).eq('id', user.id);
    setLoadedFull(0);
    setShiftStatus('offline');
    setShowCloseModal(false);
    toast('Smena yakunlandi — omborga topshirildi ✓', 'success');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Yuklanmoqda...
      </div>
    );
  }

  const filteredOrders = selectedMfy ? orders.filter((o) => o.mfy === selectedMfy) : orders;
  const mapMarkers = filteredOrders
    .filter((o) => o.latitude && o.longitude)
    .map((o) => ({
      position: [o.latitude!, o.longitude!] as [number, number],
      title: `Buyurtma #${o.id}`,
      description: `${o.mfy || ''} ${o.delivery_address}`,
    }));
  if (myPos) {
    mapMarkers.push({
      position: myPos,
      title: 'Siz (haydovchi)',
      description: 'Sizning joylashuvingiz',
    });
  }
  const topMfy = mfyStats[0];

  // 🏷️ Bulk tugma matni — delivered chiqarib tashlanadi (PIN bilan bittalab)
  const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
  const nexts = selectedOrders
    .map((o) => nextOf(o.status))
    .filter((n): n is OrderStatus => !!n && n !== 'delivered');
  const uniqueNexts = Array.from(new Set(nexts));
  const nextLabel: Record<string, string> = {
    accepted: 'Qabul qilish ✅',
    confirmed: 'Tasdiqlash ✔️',
    on_the_way: "Yo'lga chiqarish 🚚",
  };
  const bulkLabel =
    uniqueNexts.length === 1
      ? nextLabel[uniqueNexts[0]]
      : '⏭️ Keyingi bosqichga o\'tkazish';
  const maxMonth = report && report.byMonth.length
    ? Math.max(...report.byMonth.map((m) => m.revenue), 1)
    : 1;

  // 📦 BORT BALANSI
  const todayStr = new Date().toDateString();
  const todayDelivered = orders.filter(
    (o) =>
      (o.status === 'delivered' || o.status === 'completed') &&
      o.driver_id === user?.id &&
      o.delivered_at &&
      new Date(o.delivered_at).toDateString() === todayStr
  );
  const deliveredCount = todayDelivered.reduce((s, o) => s + (o.quantity || 0), 0);
  const collectedEmpty = todayDelivered.reduce((s, o) => s + (o.empty_balloons || 0), 0);
  const cashDue = todayDelivered
    .filter((o) => o.payment_method === 'cash')
    .reduce((s, o) => s + Number(o.total_price || 0), 0);
  const remainingFull = Math.max(0, loadedFull - deliveredCount);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Haydovchi paneli
          </h1>
          <div className="flex items-center gap-3">
            <NotificationBell role="driver" district={assignedDistrict} />
            {user && <ProfileButton profile={user} onUpdated={checkUser} />}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="w-5 h-5" />
              Chiqish
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* 🗺️ XIZMAT HUDUDI */}
        {assignedDistrict ? (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-5 rounded-2xl mb-6 flex items-center gap-3">
            <MapPin className="w-6 h-6 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold text-gray-800">Mening xizmat hududim</p>
              <p className="text-sm text-indigo-700">
                Faqat <b>{assignedDistrict}</b> buyurtmalari ko'rsatilmoqda (admin tomonidan tayinlangan)
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800">Sizga hali tuman tayinlanmagan</p>
              <p className="text-sm text-amber-700">
                Hozircha buyurtmalar ko'rsatilmaydi. Admin tumaningizni biriktirgach, faqat o'z hududingizdagi buyurtmalar chiqadi.
              </p>
            </div>
          </div>
        )}

        {/* 📊 HISOBOTIM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Mening hisobotim
            </h3>
            {report && report.totalDelivered > 0 && (
              <button
                onClick={() => exportDriverCSV(report)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Excel (CSV)
              </button>
            )}
          </div>

          {!report || report.totalDelivered === 0 ? (
            <p className="text-gray-500 text-center py-6">
              Hali yetkazilgan buyurtmalar yo'q — hisobot shu yerda paydo bo'ladi.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Yetkazilgan
                  </p>
                  <p className="text-2xl font-bold text-blue-700">{report.totalDelivered}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    Yo'l (km)
                  </p>
                  <p className="text-2xl font-bold text-purple-700">{report.totalDistanceKm}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Kompaniya daromadi
                  </p>
                  <p className="text-lg font-bold text-gray-700">
                    {report.companyRevenue.toLocaleString()} so'm
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Mening ish haqim
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {report.myEarnings.toLocaleString()} so'm
                  </p>
                </div>
              </div>

              <p className="text-sm font-semibold text-gray-600 mb-2">Oy bo'yicha daromad</p>
              <div className="space-y-2 mb-5">
                {report.byMonth.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{m.month}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${(m.revenue / maxMonth) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-28 text-right">
                      {m.revenue.toLocaleString()} so'm
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-sm font-semibold text-gray-600 mb-2">
                Safarlarim (har bir ballon)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                      <th className="py-2">#</th>
                      <th className="py-2">Buyurtma</th>
                      <th className="py-2">Yetkazildi</th>
                      <th className="py-2">MFY / Tuman</th>
                      <th className="py-2">Mijoz</th>
                      <th className="py-2">Mahsulot</th>
                      <th className="py-2 text-right">Summa</th>
                      <th className="py-2 text-right">Yo'l</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.trips.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 font-mono text-gray-400">{t.id}</td>
                        <td className="py-2 text-gray-600 whitespace-nowrap">{t.date}</td>
                        <td className="py-2 text-green-700 whitespace-nowrap">{t.deliveredAt}</td>
                        <td className="py-2">
                          <span className="font-medium">{t.mfy}</span>
                          <span className="text-xs text-gray-400 block">{t.district}</span>
                        </td>
                        <td className="py-2">{t.customer}</td>
                        <td className="py-2 text-gray-600">{t.product} ×{t.qty}</td>
                        <td className="py-2 text-right font-semibold text-green-700">
                          {t.price.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-purple-600">{t.distanceKm} km</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => {
                              const o = report.orders.find((x) => x.id === t.id);
                              if (o) setReceiptOrder(o);
                            }}
                            className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            Chek
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Ish haqi = har bir yetkazish uchun {DRIVER_FEE_PER_DELIVERY.toLocaleString()} so'm.
                Yo'l masofasi Depo → manzillar ketma-ketligida hisoblanadi.
              </p>
            </>
          )}
        </div>

        {/* 🕐 SMENA HOLATI */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              shiftStatus === 'free' ? 'bg-green-100' :
              shiftStatus === 'busy' ? 'bg-amber-100' : 'bg-gray-100'
            }`}>
              {shiftStatus === 'offline'
                ? <WifiOff className="w-6 h-6 text-gray-500" />
                : <Navigation className={`w-6 h-6 ${shiftStatus === 'free' ? 'text-green-600' : 'text-amber-600'}`} />}
            </div>
            <div>
              <p className="font-bold text-gray-800">Smena holati</p>
              <p className="text-sm text-gray-500">
                {shiftStatus === 'free' ? 'Bo\'sh — buyurtma olaman' :
                 shiftStatus === 'busy' ? 'Band — hozircha yo\'lga chiqolmayman' :
                 'Oflayn — tizimdan tashqariman'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {([
              { v: 'free', l: 'Bo\'sh' },
              { v: 'busy', l: 'Band' },
              { v: 'offline', l: 'Oflayn' },
            ] as const).map((o) => (
              <button
                key={o.v}
                onClick={() => saveShift(o.v)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                  shiftStatus === o.v
                    ? o.v === 'free' ? 'bg-green-600 text-white border-green-600'
                    : o.v === 'busy' ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-gray-600 text-white border-gray-600'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* 📦 BORT BALANSI */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Bortdagi ballon balansi
            </h3>
            <div className="flex gap-2">
              {loadedFull === 0 ? (
                <button onClick={() => setShowStartModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1">
                  <Package className="w-4 h-4" /> Smenani boshlash
                </button>
              ) : (
                <button onClick={() => setShowCloseModal(true)}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Smenani yopish aktsi
                </button>
              )}
            </div>
          </div>
          {loadedFull === 0 ? (
            <p className="text-sm text-gray-500">Smena boshlanmagan — ombordan ballon yuklang.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-xs text-gray-500">Yuklangan (to'la)</p>
                <p className="text-xl font-bold text-blue-700">{loadedFull}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <p className="text-xs text-gray-500">Yetkazilgan (bugun)</p>
                <p className="text-xl font-bold text-green-700">{deliveredCount}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl">
                <p className="text-xs text-gray-500">Bo'sh idish yig'ildi</p>
                <p className="text-xl font-bold text-purple-700">{collectedEmpty}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl">
                <p className="text-xs text-gray-500">Qoldiq (to'la)</p>
                <p className={`text-xl font-bold ${remainingFull > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{remainingFull}</p>
              </div>
            </div>
          )}
        </div>

        {/* JOYLASHUV */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Navigation className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-800">Jonli joylashuv</p>
              <p className="text-sm text-gray-500">
                {myPos
                  ? `📍 ${myPos[0].toFixed(4)}, ${myPos[1].toFixed(4)}`
                  : 'Joylashuv hali belgilanmagan'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={updateMyLocation}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Yangilash
            </button>
            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition flex items-center gap-2 ${
                liveMode ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Radio className="w-4 h-4" />
              {liveMode ? 'Jonli: YOQIQ' : 'Jonli rejim'}
            </button>
          </div>
        </div>

        {/* STATISTIKA */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Jami yetkazilgan
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-600">{driverStats.totalDelivered}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Umumiy daromad
            </p>
            <p className="text-2xl font-bold mt-2 text-green-600">
              {driverStats.totalRevenue.toLocaleString()} so'm
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-5 rounded-2xl shadow-lg text-white">
            <p className="text-blue-100 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bu oy
            </p>
            <p className="text-3xl font-bold mt-2">{driverStats.thisMonth} ta</p>
          </div>
        </div>

        {topMfy && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl mb-6 flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-xl">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-700 font-medium">💡 Tavsiya</p>
              <p className="text-lg font-bold text-gray-800">
                Eng ko'p buyurtma:{' '}
                <span className="text-amber-600">{topMfy.name}</span> MFY
              </p>
              <p className="text-sm text-gray-600">
                {topMfy.count} ta faol buyurtma · Jami {topMfy.total.toLocaleString()} so'm
              </p>
            </div>
          </div>
        )}

        {mfyStats.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              MFY bo'yicha filtrlash
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedMfy('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !selectedMfy ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Barchasi ({orders.length})
              </button>
              {mfyStats.map((stat) => (
                <button
                  key={stat.name}
                  onClick={() => setSelectedMfy(stat.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    selectedMfy === stat.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {stat.name}
                  <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{stat.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mapMarkers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Buyurtmalar va joylashuvingiz
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={computeRoute}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition flex items-center gap-1"
                >
                  <Brain className="w-4 h-4" /> 🧠 Optimal marshrutni hisoblash
                </button>
                {route && (
                  <button
                    onClick={clearRoute}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                  >
                    Bekor
                  </button>
                )}
              </div>
            </div>
            {route && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3 text-sm text-purple-800">
                <b>Jami masofa: {route.totalKm} km</b> · oddiy tartibda {route.naiveKm} km ·
                <b> {route.savedKm} km</b> yo'l va yoqilg'i tejaldi 🚚
              </div>
            )}
            <Map
              markers={mapMarkers}
              numberedMarkers={
                route
                  ? route.order.map((s, i) => ({
                      position: [s.lat, s.lng] as [number, number],
                      label: String(i + 1),
                    }))
                  : []
              }
              polyline={
                route && myPos
                  ? [myPos, ...route.order.map((s) => [s.lat, s.lng] as [number, number])]
                  : []
              }
              center={myPos || [41.37, 64.58]}
              zoom={13}
              height="350px"
            />
          </div>
        )}

        {/* ✅ Tanlanganlar paneli */}
        {selectedIds.length > 0 && (
          <div className="sticky top-16 z-10 bg-blue-600 text-white px-4 py-3 rounded-xl mb-4 flex items-center justify-between shadow-lg">
            <span className="font-semibold">{selectedIds.length} ta tanlandi</span>
            <div className="flex gap-2 items-center">
              <button
                onClick={clearSelection}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
              >
                Bekor
              </button>
              {uniqueNexts.length === 0 ? (
                <span className="text-xs bg-white/20 px-3 py-1.5 rounded-lg font-medium">
                  Yetkazish uchun bittalab tanlang (PIN talab qilinadi) 🔐
                </span>
              ) : (
                <button
                  onClick={bulkAdvance}
                  className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-lg text-sm font-bold transition"
                >
                  {bulkLabel}
                </button>
              )}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Buyurtmalar
          {assignedDistrict && (
            <span className="text-sm font-normal text-gray-500">({assignedDistrict})</span>
          )}
          {selectedMfy && (
            <span className="text-sm font-normal text-gray-500">· {selectedMfy}</span>
          )}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-12 col-span-2 bg-white rounded-2xl">
              {assignedDistrict
                ? `${assignedDistrict} bo'yicha faol buyurtmalar yo'q`
                : "Hali faol buyurtmalar yo'q"}
            </p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id}>
                <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(order.id)}
                    onChange={() => toggleSelect(order.id)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Buyurtma #{order.id} ni tanlash
                  </span>
                </label>
                <OrderCard
                  order={order}
                  showActions={true}
                  onUpdateStatus={handleUpdateStatus}
                />
                {order.latitude && order.longitude && (
                  <div className="flex gap-2 mt-2">
                    <a
                      href={getNavUrl(myPos?.[0], myPos?.[1], order.latitude, order.longitude, 'google')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-green-700 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Google Maps
                    </a>
                    <a
                      href={getNavUrl(myPos?.[0], myPos?.[1], order.latitude, order.longitude, 'yandex')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-red-700 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Yandex
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {receiptOrder && (
        <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}

      {/* 🔐 PIN KIRITISH MODALI */}
      {pinOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setPinOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" /> Yetkazishni tasdiqlash
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Buyurtma #{pinOrder.id} · {pinOrder.profiles?.full_name || 'Mijoz'}
            </p>
            <p className="text-xs text-gray-500 mb-2">Mijoz ekranida ko'rsatilgan 4 xonali kodni kiriting:</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
              placeholder="••••"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center text-2xl font-mono tracking-[0.5em] mb-2"
            />
            {pinError && (
              <p className="text-sm text-red-600 font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {pinError}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <button onClick={() => setPinOrder(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition">
                Bekor
              </button>
              <button onClick={confirmPin} disabled={pinInput.length !== 4}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                Tasdiqlash 💰
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📦 SMENANI BOSHLASH MODALI */}
      {showStartModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowStartModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Smenani boshlash
            </h3>
            <p className="text-sm text-gray-500 mb-4">Ombordan yuklangan to'la ballonlar sonini kiriting.</p>
            <input type="number" min="1" value={startQty} onChange={(e) => setStartQty(e.target.value)}
              placeholder="Masalan: 10"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowStartModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition">
                Bekor
              </button>
              <button onClick={startShift}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition">
                Yuklashni tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 SMENANI YOPISH AKTSI MODALI */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCloseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" /> Smenani yopish aktsi
            </h3>
            <p className="text-sm text-gray-500 mb-4">Omborga topshiriladigan jamlovchi:</p>
            <div className="space-y-2 mb-5">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Qolgan to'la ballonlar (qaytariladi)</span>
                <span className="font-bold text-amber-700">{remainingFull} ta</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Yig'ilgan bo'sh idishlar (tara)</span>
                <span className="font-bold text-purple-700">{collectedEmpty} ta</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Topshiriladigan naqd pul</span>
                <span className="font-bold text-green-700">{cashDue.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between py-2 bg-gray-50 rounded-lg px-3">
                <span className="font-semibold text-gray-800">Jami yetkazilgan (bugun)</span>
                <span className="font-bold text-blue-700">{deliveredCount} ta</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCloseModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition">
                Bekor
              </button>
              <button onClick={closeShift}
                className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-700 transition">
                Tasdiqlash va yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
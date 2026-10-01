'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Profile } from '@/types';
import OrderCard from '@/components/OrderCard';
import Map from '@/components/Map';
import { toast } from '@/components/Toast';
import { requestNotifPermission, hasNotifPermission, sendPush } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import {
  LogOut, Truck, MapPin, Star, Filter, TrendingUp, Package, Calendar, Navigation, Radio, Bell, BellRing,
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
  const [mfyStats, setMfyStats] = useState<MfyStat[]>([]);
  const [driverStats, setDriverStats] = useState({
    totalDelivered: 0,
    totalRevenue: 0,
    thisMonth: 0,
  });
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    setNotifOn(hasNotifPermission());
    checkUser();
  }, []);

  // Real-time: yangi buyurtma (INSERT) kelganda push + UPDATE da ro'yxatni yangilash
  useEffect(() => {
    const channel = supabase
      .channel('driver_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const n = payload.new as any;
        if (n.status === 'new') {
          sendPush('GazExpress — Yangi buyurtma', `#${n.id} · ${n.mfy || n.district || 'Yangi'} MFY`);
        }
        loadOrders();
        loadMfyStats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        loadOrders();
        loadMfyStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Jonli rejim: har 30 sekundda joylashuvni yangilash
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
    if (profile.latitude && profile.longitude) {
      setMyPos([profile.latitude, profile.longitude]);
    }
    setLoading(false);
    loadOrders();
    loadMfyStats();
    loadDriverStats(profile.id);
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
        await supabase.from('profiles').update({ latitude: lat, longitude: lng }).eq('id', user.id);
        if (!liveMode) toast('Joylashuv yangilandi 📍', 'success');
      },
      () => {
        if (!liveMode) toast('Joylashuvga ruxsat berilmadi', 'error');
      }
    );
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, profiles:customer_id (full_name, phone), cylinder_types:cylinder_type_id (name)`)
      .in('status', ['new', 'confirmed', 'on_the_way'])
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data as Order[]);
  };

  const loadMfyStats = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('mfy, total_price, status')
      .in('status', ['new', 'confirmed']);

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
      .eq('status', 'delivered');

    if (!error && data) {
      const now = new Date();
      const thisMonth = data.filter((o: any) => {
        const date = new Date(o.created_at);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });

      setDriverStats({
        totalDelivered: data.length,
        totalRevenue: data.reduce((sum: number, o: any) => sum + Number(o.total_price), 0),
        thisMonth: thisMonth.length,
      });
    }
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'confirmed') updateData.driver_id = user!.id;

    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);

    if (!error) {
      if ('speechSynthesis' in window) {
        const statusText: Record<string, string> = {
          confirmed: 'Buyurtma tasdiqlandi',
          on_the_way: "Buyurtma yo'lda",
          delivered: 'Buyurtma yetkazildi',
        };
        const utterance = new SpeechSynthesisUtterance(statusText[status] || '');
        utterance.lang = 'uz-UZ';
        speechSynthesis.speak(utterance);
      }
      loadOrders();
      loadMfyStats();
      if (status === 'delivered' && user) loadDriverStats(user.id);
    }
  };

  const handleEnableNotif = async () => {
    const ok = await requestNotifPermission();
    setNotifOn(ok);
    if (ok) toast('Bildirishnomalar yoqildi 🔔', 'success');
    else toast('Ruxsat berilmadi', 'error');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" />
            Haydovchi paneli
          </h1>
          <div className="flex items-center gap-3">
            {!notifOn ? (
              <button
                onClick={handleEnableNotif}
                className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition text-sm font-semibold"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Bildirishnoma</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                <BellRing className="w-4 h-4" />
                <span className="hidden sm:inline">Yoqilgan</span>
              </span>
            )}
            <span className="text-gray-600">{user?.full_name}</span>
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
        {/* JOYLASHUV BOSHQARUVI */}
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
                liveMode
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Radio className="w-4 h-4" />
              {liveMode ? 'Jonli: YOQIQ' : 'Jonli rejim'}
            </button>
          </div>
        </div>

        {/* HAYDOVCHI STATISTIKASI */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> Jami yetkazilgan
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-600">{driverStats.totalDelivered}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Umumiy daromad
            </p>
            <p className="text-2xl font-bold mt-2 text-green-600">
              {driverStats.totalRevenue.toLocaleString()} so'm
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-5 rounded-2xl shadow-lg text-white">
            <p className="text-blue-100 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Bu oy
            </p>
            <p className="text-3xl font-bold mt-2">{driverStats.thisMonth} ta</p>
          </div>
        </div>

        {/* TAVSIYA KARTASI */}
        {topMfy && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl mb-6 flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-xl">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-700 font-medium">💡 Tavsiya</p>
              <p className="text-lg font-bold text-gray-800">
                Eng ko'p buyurtma: <span className="text-amber-600">{topMfy.name}</span> MFY
              </p>
              <p className="text-sm text-gray-600">
                {topMfy.count} ta faol buyurtma · Jami {topMfy.total.toLocaleString()} so'm
              </p>
            </div>
          </div>
        )}

        {/* MFY FILTRI */}
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
                  !selectedMfy
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Barchasi ({orders.length})
              </button>
              {mfyStats.map((stat) => (
                <button
                  key={stat.name}
                  onClick={() => setSelectedMfy(stat.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    selectedMfy === stat.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {stat.name}
                  <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
                    {stat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* XARITA */}
        {mapMarkers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Buyurtmalar va joylashuvingiz
            </h2>
            <Map markers={mapMarkers} height="350px" />
          </div>
        )}

        {/* BUYURTMALAR */}
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" />
          Faol buyurtmalar
          {selectedMfy && (
            <span className="text-sm font-normal text-gray-500">({selectedMfy})</span>
          )}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-12 col-span-2 bg-white rounded-2xl">
              {selectedMfy
                ? `${selectedMfy} MFY'da faol buyurtmalar yo'q`
                : "Hali faol buyurtmalar yo'q"}
            </p>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showActions={true}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
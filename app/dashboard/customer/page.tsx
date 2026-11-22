'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Profile } from '@/types';
import OrderForm from '@/components/OrderForm';
import OrderCard from '@/components/OrderCard';
import TrackingPanel from '@/components/TrackingPanel';
import Receipt from '@/components/Receipt';
import ProfileButton from '@/components/ProfileButton';
import OrderTimeline from '@/components/OrderTimeline';
import RatingModal from '@/components/RatingModal';
import NotificationBell from '@/components/NotificationBell';
import { sendPush } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import {
  LogOut, Package, History, XCircle, FileText,
  RefreshCw, Star, CircleCheckBig, Lock, Droplets,
} from 'lucide-react';
import { toast } from '@/components/Toast';

const statusPushText: Record<string, string> = {
  accepted: 'Buyurtmangiz qabul qilindi 📥',
  confirmed: 'Buyurtmangiz tasdiqlandi ✅',
  on_the_way: "Haydovchi yo'lga chiqdi 🚚",
  delivered: 'Buyurtmangiz yetkazildi — tasdiqlang ✅',
  completed: 'Buyurtmangiz yakunlandi, chek tayyor 📄',
  cancelled: 'Buyurtmangiz bekor qilindi ❌',
};

export default function CustomerDashboard() {
  const [user, setUser] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [rateOrderId, setRateOrderId] = useState<number | null>(null);
  const [recurringAlert, setRecurringAlert] = useState<Order | null>(null);
  const userIdRef = useRef<string>('');
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  // Real-time: holat o'zgarsa mijozga push
  useEffect(() => {
    const channel = supabase
      .channel('customer_orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (newRow.customer_id === userIdRef.current && newRow.status !== oldRow?.status) {
            const txt = statusPushText[newRow.status];
            if (txt) sendPush('GazExpress', `Buyurtma #${newRow.id}: ${txt}`);
          }
          loadOrders();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    userIdRef.current = user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profile) setUser(profile);
    setLoading(false);
    loadOrders();
  };

  const loadOrders = async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { data, error } = await supabase
      .from('orders')
      .select(`*, profiles:customer_id (full_name, phone, address), driver_profile:profiles!driver_id (full_name, phone, car_plate, car_model, driver_phone), cylinder_types:cylinder_type_id (name, weight_kg, price)`)
      .eq('customer_id', uid)
      .order('created_at', { ascending: false });
    if (!error && data) {
      const typed = data as Order[];
      setOrders(typed);
      checkRecurring(typed);
    }
  };

  const checkRecurring = (list: Order[]) => {
    const recurring = list.filter((o) => o.is_recurring);
    if (recurring.length === 0) return;
    const last = recurring[0];
    const days = (Date.now() - new Date(last.created_at).getTime()) / 86400000;
    if (days >= 30) {
      setRecurringAlert(last);
      sendPush('GazExpress — Oylik eslatma', 'Gazingiz tugashiga yaqin! Takroriy buyurtma vaqti keldi ♻');
    }
  };

  const simulateRecurring = () => {
    const recurring = orders.filter((o) => o.is_recurring);
    if (recurring.length === 0) {
      toast('Avval "takroriy buyurtma" belgilab buyurtma bering', 'info');
      return;
    }
    setRecurringAlert(recurring[0]);
    sendPush('GazExpress — Oylik eslatma', 'Gazingiz tugashiga yaqin! Takroriy buyurtma vaqti keldi ♻');
    toast('Oylik eslatma yuborildi (demo) 🔔', 'success');
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Rostdan ham bu buyurtmani bekor qilmoqchimisiz?')) return;
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (!error) {
      toast('Buyurtma bekor qilindi', 'success');
      loadOrders();
    } else toast('Xatolik: ' + error.message, 'error');
  };

  const handleConfirmReceived = async (orderId: number) => {
    if (!confirm('Ballonni olganligingizni tasdiqlaysizmi? Chek shakllanadi.')) return;
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    if (!error) {
      toast('Tasdiqlandi! Chek tayyor 📄', 'success');
      loadOrders();
    } else toast('Xatolik: ' + error.message, 'error');
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

  const activeOrders = orders.filter((o) => ['new', 'accepted', 'confirmed', 'on_the_way'].includes(o.status));
  const historyOrders = orders.filter((o) => ['delivered', 'completed', 'cancelled'].includes(o.status));
  const displayOrders = activeTab === 'active' ? activeOrders : historyOrders;

  // 📊 KVOTA VIDJETI (mijoz iste'mol sikli)
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'delivered');
  const lastPurchase = completedOrders[0];
  const daysSinceLast = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase.created_at).getTime()) / 86400000)
    : null;
  // O'rtacha sikl: oxirgi 3 buyurtma orasidagi o'rtacha kun (bo'lmasa 30 kun default)
  let avgCycle = 30;
  if (completedOrders.length >= 3) {
    const gaps: number[] = [];
    for (let i = 0; i < completedOrders.length - 1 && gaps.length < 3; i++) {
      const g = Math.floor(
        (new Date(completedOrders[i].created_at).getTime() -
          new Date(completedOrders[i + 1].created_at).getTime()) / 86400000
      );
      if (g > 0) gaps.push(g);
    }
    if (gaps.length > 0) avgCycle = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }
  const remainingPct = daysSinceLast != null
    ? Math.max(0, Math.min(100, Math.round(100 - (daysSinceLast / avgCycle) * 100)))
    : null;
  const daysLeft = daysSinceLast != null
    ? Math.max(0, avgCycle - daysSinceLast)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Mijoz paneli</h1>
          <div className="flex items-center gap-3">
            <NotificationBell role="customer" customerId={user?.id} />
            {user && <ProfileButton profile={user} onUpdated={checkUser} />}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 px-4 py-2 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Chiqish</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 print:hidden">
        {/* 📊 KVOTA VIDJETI */}
        {lastPurchase && (
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-5 mb-6 flex items-center gap-4 animate-fade-in-up">
            <div className="bg-cyan-600 p-3 rounded-xl shrink-0">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800">Iste'mol prognozi</p>
              <p className="text-sm text-gray-600">
                Oxirgi xarid: <b>{daysSinceLast} kun</b> oldin · O'rtacha sikl: ~{avgCycle} kun
              </p>
              {remainingPct != null && (
                <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden max-w-xs">
                  <div
                    className={`h-full transition-all ${
                      remainingPct > 50 ? 'bg-green-500' : remainingPct > 20 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${remainingPct}%` }}
                  />
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-cyan-700">{remainingPct ?? '—'}%</p>
              <p className="text-xs text-gray-500">taxminiy qoldiq</p>
              {daysLeft != null && daysLeft > 0 && (
                <p className="text-xs text-cyan-600 font-semibold mt-0.5">~{daysLeft} kunga yetadi</p>
              )}
            </div>
          </div>
        )}

        {/* TAKRORIY ESLATMA */}
        {recurringAlert && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 mb-6 flex items-center gap-4 animate-fade-in-up">
            <div className="bg-purple-600 p-3 rounded-xl">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">Oylik takroriy buyurtma vaqti keldi! ♻</p>
              <p className="text-sm text-gray-600">
                Oxirgi marta {new Date(recurringAlert.created_at).toLocaleDateString('uz-UZ')} da{' '}
                {recurringAlert.cylinder_types?.name} olgan edingiz.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('active');
                setRecurringAlert(null);
              }}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition whitespace-nowrap"
            >
              Yana buyurtma berish
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <OrderForm customerId={user!.id} onSuccess={loadOrders} />
            <button
              onClick={simulateRecurring}
              className="mt-3 w-full bg-white border border-purple-200 text-purple-700 py-2.5 rounded-xl font-semibold hover:bg-purple-50 transition flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Demo: oylik eslatmani ko'rish
            </button>
          </div>

          <div className="lg:col-span-3">
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border w-fit">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition ${
                  activeTab === 'active'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Package className="w-5 h-5" />
                Faol ({activeOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <History className="w-5 h-5" />
                Tarix ({historyOrders.length})
              </button>
            </div>

            <div className="space-y-4">
              {displayOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>
                    {activeTab === 'active'
                      ? "Hozircha faol buyurtmalar yo'q"
                      : "Hali buyurtma tarixi yo'q"}
                  </p>
                </div>
              ) : (
                displayOrders.map((order) => (
                  <div key={order.id} className="relative">
                    <OrderCard order={order} />

                    {/* 🔐 PIN — faol buyurtmada ko'rsatiladi (haydovchi kiritadi) */}
                    {order.delivery_pin && ['new', 'accepted', 'confirmed', 'on_the_way'].includes(order.status) && (
                      <div className="mt-2 bg-slate-800 text-white rounded-xl px-4 py-3 flex items-center justify-between">
                        <span className="text-sm flex items-center gap-2 text-slate-300">
                          <Lock className="w-4 h-4" /> Yetkazish tasdiq kodi
                        </span>
                        <span className="text-2xl font-mono font-bold tracking-[0.3em] text-amber-300">
                          {order.delivery_pin}
                        </span>
                      </div>
                    )}

                    {order.status === 'new' && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="absolute top-4 right-4 bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition"
                        title="Bekor qilish"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}

                    {order.status === 'on_the_way' && <TrackingPanel order={order} />}

                    <OrderTimeline order={order} />

                    {order.status === 'delivered' && (
                      <button
                        onClick={() => handleConfirmReceived(order.id)}
                        className="mt-2 w-full bg-emerald-600 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                      >
                        <CircleCheckBig className="w-5 h-5" />
                        Olganligimni tasdiqlash (chek shakllanadi)
                      </button>
                    )}

                    {order.status === 'completed' && !order.rating && (
                      <button
                        onClick={() => setRateOrderId(order.id)}
                        className="mt-2 w-full bg-yellow-50 border border-yellow-200 text-yellow-700 py-2.5 rounded-xl font-semibold hover:bg-yellow-100 transition flex items-center justify-center gap-2"
                      >
                        <Star className="w-5 h-5 fill-current" />
                        Haydovchini baholang
                      </button>
                    )}

                    {order.rating && (
                      <div className="mt-2 flex items-center gap-1 text-yellow-500">
                        {'★'.repeat(order.rating)}
                        {'☆'.repeat(5 - order.rating)}
                        <span className="text-xs text-gray-500 ml-2">Sizning bahoyingiz</span>
                      </div>
                    )}

                    {order.status === 'completed' && (
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="mt-2 w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Kvitansiya (PDF)
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {receiptOrder && (
        <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
      {rateOrderId && (
        <RatingModal
          orderId={rateOrderId}
          onClose={() => {
            setRateOrderId(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}
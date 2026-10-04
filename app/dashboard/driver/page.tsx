'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { REGIONS } from '@/lib/regions';
import { Order, OrderStatus, Profile } from '@/types';
import OrderCard from '@/components/OrderCard';
import Map from '@/components/Map';
import Receipt from '@/components/Receipt';
import { toast } from '@/components/Toast';
import { requestNotifPermission, hasNotifPermission, sendPush } from '@/lib/notifications';
import ProfileEditor from '@/components/ProfileEditor';
import { getNavUrl } from '@/lib/navigation';
import { buildDriverReport, exportDriverCSV, DriverReport, DRIVER_FEE_PER_DELIVERY } from '@/lib/reporting';
import { useRouter } from 'next/navigation';
import {
  LogOut, Truck, MapPin, Star, Filter, TrendingUp, Package, Calendar, Navigation, Radio,
  Bell, BellRing, User, ExternalLink, Home, BarChart3, Route, Wallet, FileText, Download,
} from 'lucide-react';

interface MfyStat { name: string; count: number; total: number; }

export default function DriverDashboard() {
  const [user, setUser] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMfy, setSelectedMfy] = useState<string>('');
  const [mfyStats, setMfyStats] = useState<MfyStat[]>([]);
  const [driverStats, setDriverStats] = useState({ totalDelivered: 0, totalRevenue: 0, thisMonth: 0 });
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [notifOn, setNotifOn] = useState(false);

  const [homeRegion, setHomeRegion] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const districtRef = useRef<string>('');

  const [report, setReport] = useState<DriverReport | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => { setNotifOn(hasNotifPermission()); checkUser(); }, []);

  useEffect(() => {
    const channel = supabase.channel('driver_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const n = payload.new as any;
        if (n.status === 'new' && (!districtRef.current || n.district === districtRef.current)) {
          sendPush('GazExpress — Yangi buyurtma', `#${n.id} · ${n.mfy || n.district || 'Yangi'} MFY`);
        }
        loadOrders(); loadMfyStats(); loadMyReport();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        loadOrders(); loadMfyStats(); loadMyReport();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (liveMode) {
      updateMyLocation();
      intervalRef.current = setInterval(updateMyLocation, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current); intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [liveMode, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile?.role !== 'driver') { router.push('/dashboard/customer'); return; }
    setUser(profile);
    if (profile.latitude && profile.longitude) setMyPos([profile.latitude, profile.longitude]);
    if (profile.home_district) {
      const r = REGIONS.find((rg) => rg.districts.some((d) => d.name === profile.home_district));
      setHomeRegion(r?.name || ''); setHomeDistrict(profile.home_district); districtRef.current = profile.home_district;
    }
    setLoading(false);
    loadOrders(); loadMfyStats(); loadDriverStats(profile.id); loadMyReport();
  };

  const updateMyLocation = async () => {
    if (!user) return;
    if (!('geolocation' in navigator)) { toast("Qurilmangiz geolokatsiyani qo'llab-quvvatlamaydi", 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setMyPos([lat, lng]);
        await supabase.from('profiles').update({ latitude: lat, longitude: lng }).eq('id', user.id);
        if (!liveMode) toast('Joylashuv yangilandi 📍', 'success');
      },
      () => { if (!liveMode) toast('Joylashuvga ruxsat berilmadi', 'error'); }
    );
  };

  const handleHomeRegionChange = (v: string) => { setHomeRegion(v); setHomeDistrict(''); districtRef.current = ''; saveHomeDistrict(''); };
  const handleHomeDistrictChange = (v: string) => { setHomeDistrict(v); districtRef.current = v; saveHomeDistrict(v); setSelectedMfy(''); loadOrders(); loadMfyStats(); };
  const saveHomeDistrict = async (d: string) => { if (!user) return; await supabase.from('profiles').update({ home_district: d || null }).eq('id', user.id); };

  const loadOrders = async () => {
    let q = supabase.from('orders')
      .select(`*, profiles:customer_id (full_name, phone), cylinder_types:cylinder_type_id (name)`)
      .in('status', ['new', 'confirmed', 'on_the_way']);
    if (districtRef.current) q = q.eq('district', districtRef.current);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (!error && data) setOrders(data as Order[]);
  };

  // 📊 Mening yetkazilganlarim — TO'LIQ join (chek uchun)
  const loadMyReport = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('orders')
      .select(`*,
        profiles:customer_id (full_name, phone, address),
        driver_profile:profiles!driver_id (full_name, phone, car_plate, car_model, driver_phone),
        cylinder_types:cylinder_type_id (name, weight_kg, price)`)
      .eq('driver_id', user.id).eq('status', 'delivered')
      .order('created_at', { ascending: false });
    if (!error && data) setReport(buildDriverReport(data as Order[]));
  };

  const loadMfyStats = async () => {
    let q = supabase.from('orders').select('mfy, total_price, status').in('status', ['new', 'confirmed']);
    if (districtRef.current) q = q.eq('district', districtRef.current);
    const { data, error } = await q;
    if (!error && data) {
      const stats: Record<string, MfyStat> = {};
      data.forEach((o: any) => {
        if (!o.mfy) return;
        if (!stats[o.mfy]) stats[o.mfy] = { name: o.mfy, count: 0, total: 0 };
        stats[o.mfy].count++; stats[o.mfy].total += Number(o.total_price);
      });
      setMfyStats(Object.values(stats).sort((a, b) => b.count - a.count));
    }
  };

  const loadDriverStats = async (driverId: string) => {
    const { data, error } = await supabase.from('orders')
      .select('total_price, created_at').eq('driver_id', driverId).eq('status', 'delivered');
    if (!error && data) {
      const now = new Date();
      const thisMonth = data.filter((o: any) => { const d = new Date(o.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      setDriverStats({
        totalDelivered: data.length,
        totalRevenue: data.reduce((s: number, o: any) => s + Number(o.total_price), 0),
        thisMonth: thisMonth.length,
      });
    }
  };

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'confirmed') updateData.driver_id = user!.id;
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString(); // ✅ aniq vaqt
    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
    if (!error) {
      if ('speechSynthesis' in window) {
        const t: Record<string, string> = { confirmed: 'Buyurtma tasdiqlandi', on_the_way: "Buyurtma yo'lda", delivered: 'Buyurtma yetkazildi' };
        const u = new SpeechSynthesisUtterance(t[status] || ''); u.lang = 'uz-UZ'; speechSynthesis.speak(u);
      }
      loadOrders(); loadMfyStats();
      if (status === 'delivered' && user) { loadDriverStats(user.id); loadMyReport(); }
    }
  };

  const handleEnableNotif = async () => { const ok = await requestNotifPermission(); setNotifOn(ok); if (ok) toast('Bildirishnomalar yoqildi 🔔', 'success'); else toast('Ruxsat berilmadi', 'error'); };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;

  const filteredOrders = selectedMfy ? orders.filter((o) => o.mfy === selectedMfy) : orders;
  const mapMarkers = filteredOrders.filter((o) => o.latitude && o.longitude)
    .map((o) => ({ position: [o.latitude!, o.longitude!] as [number, number], title: `Buyurtma #${o.id}`, description: `${o.mfy || ''} ${o.delivery_address}` }));
  if (myPos) mapMarkers.push({ position: myPos, title: 'Siz (haydovchi)', description: 'Sizning joylashuvingiz' });
  const topMfy = mfyStats[0];
  const homeDistricts = homeRegion ? REGIONS.find((r) => r.name === homeRegion)?.districts || [] : [];
  const homeCities = homeDistricts.filter((d) => d.name.includes('shahri'));
  const homeTowns = homeDistricts.filter((d) => !d.name.includes('shahri'));
  const maxMonth = report && report.byMonth.length ? Math.max(...report.byMonth.map(m => m.revenue), 1) : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="w-7 h-7 text-blue-600" /> Haydovchi paneli</h1>
          <div className="flex items-center gap-3">
            {!notifOn ? (
              <button onClick={handleEnableNotif} className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition text-sm font-semibold"><Bell className="w-4 h-4" /><span className="hidden sm:inline">Bildirishnoma</span></button>
            ) : (
              <span className="flex items-center gap-1 text-green-600 text-sm font-semibold"><BellRing className="w-4 h-4" /><span className="hidden sm:inline">Yoqilgan</span></span>
            )}
            <span className="text-gray-600">{user?.full_name}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-700"><LogOut className="w-5 h-5" /> Chiqish</button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* PROFIL */}
        <div className="mb-6">
          <details className="group">
            <summary className="cursor-pointer list-none bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between hover:bg-gray-50 transition">
              <span className="font-semibold text-gray-800 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Profilimni tahrirlash</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3"><ProfileEditor profile={user!} onSaved={() => checkUser()} /></div>
          </details>
        </div>

        {/* 🗺️ MENING HUDUDIM */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 p-5 rounded-2xl mb-6">
          <p className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Home className="w-5 h-5 text-indigo-600" /> Mening xizmat hududim</p>
          <div className="grid grid-cols-2 gap-3">
            <select value={homeRegion} onChange={(e) => handleHomeRegionChange(e.target.value)} className="px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="">Viloyat...</option>
              {REGIONS.map((r) => (<option key={r.name} value={r.name}>{r.name}</option>))}
            </select>
            <select value={homeDistrict} onChange={(e) => handleHomeDistrictChange(e.target.value)} disabled={!homeRegion} className="px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-gray-100">
              <option value="">Tanlang...</option>
              {homeCities.length > 0 && (<optgroup label="🏙️ Shaharlar">{homeCities.map((d) => (<option key={d.name} value={d.name}>{d.name}</option>))}</optgroup>)}
              {homeTowns.length > 0 && (<optgroup label="🏘️ Tumanlar">{homeTowns.map((d) => (<option key={d.name} value={d.name}>{d.name}</option>))}</optgroup>)}
            </select>
          </div>
          {homeDistrict ? (
            <p className="text-sm text-indigo-700 mt-3 font-medium">✓ Faqat <b>{homeDistrict}</b> buyurtmalari ko'rsatilmoqda</p>
          ) : (
            <p className="text-sm text-amber-700 mt-3 font-medium flex items-center gap-1">⚠ Hududingizni tanlang — shunda faqat sizning tumani/shahringiz buyurtmalari chiqadi</p>
          )}
        </div>

        {/* 📊 HISOBOTIM */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" /> Mening hisobotim</h3>
            {report && report.totalDelivered > 0 && (
              <button onClick={() => exportDriverCSV(report)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Excel (CSV)
              </button>
            )}
          </div>

          {!report || report.totalDelivered === 0 ? (
            <p className="text-gray-500 text-center py-6">Hali yetkazilgan buyurtmalar yo'q — hisobot shu yerda paydo bo'ladi.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-blue-50 p-4 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><Package className="w-3 h-3" /> Yetkazilgan</p><p className="text-2xl font-bold text-blue-700">{report.totalDelivered}</p></div>
                <div className="bg-purple-50 p-4 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><Route className="w-3 h-3" /> Yo'l (km)</p><p className="text-2xl font-bold text-purple-700">{report.totalDistanceKm}</p></div>
                <div className="bg-gray-50 p-4 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Kompaniya daromadi</p><p className="text-lg font-bold text-gray-700">{report.companyRevenue.toLocaleString()} so'm</p></div>
                <div className="bg-green-50 p-4 rounded-xl"><p className="text-xs text-gray-500 flex items-center gap-1"><Wallet className="w-3 h-3" /> Mening ish haqim</p><p className="text-lg font-bold text-green-700">{report.myEarnings.toLocaleString()} so'm</p></div>
              </div>

              <p className="text-sm font-semibold text-gray-600 mb-2">Oy bo'yicha daromad</p>
              <div className="space-y-2 mb-5">
                {report.byMonth.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{m.month}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${(m.revenue / maxMonth) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-28 text-right">{m.revenue.toLocaleString()} so'm</span>
                  </div>
                ))}
              </div>

              <p className="text-sm font-semibold text-gray-600 mb-2">Safarlarim (har bir ballon)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b-2 border-gray-200 text-left text-gray-500">
                    <th className="py-2">#</th><th className="py-2">Buyurtma</th><th className="py-2">Yetkazildi</th><th className="py-2">MFY / Tuman</th><th className="py-2">Mijoz</th><th className="py-2">Mahsulot</th><th className="py-2 text-right">Summa</th><th className="py-2 text-right">Yo'l</th><th className="py-2"></th>
                  </tr></thead>
                  <tbody>
                    {report.trips.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 font-mono text-gray-400">{t.id}</td>
                        <td className="py-2 text-gray-600 whitespace-nowrap">{t.date}</td>
                        <td className="py-2 text-green-700 whitespace-nowrap">{t.deliveredAt}</td>
                        <td className="py-2"><span className="font-medium">{t.mfy}</span><span className="text-xs text-gray-400 block">{t.district}</span></td>
                        <td className="py-2">{t.customer}</td>
                        <td className="py-2 text-gray-600">{t.product} ×{t.qty}</td>
                        <td className="py-2 text-right font-semibold text-green-700">{t.price.toLocaleString()}</td>
                        <td className="py-2 text-right text-purple-600">{t.distanceKm} km</td>
                        <td className="py-2 text-right">
                          <button onClick={() => { const o = report.orders.find(x => x.id === t.id); if (o) setReceiptOrder(o); }} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 text-xs"><FileText className="w-3 h-3" /> Chek</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">💡 Ish haqi = har bir yetkazish uchun {DRIVER_FEE_PER_DELIVERY.toLocaleString()} so'm. Yo'l masofasi Depo → manzillar ketma-ketligida hisoblanadi.</p>
            </>
          )}
        </div>

        {/* JOYLASHUV */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-xl"><Navigation className="w-6 h-6 text-blue-600" /></div>
            <div><p className="font-bold text-gray-800">Jonli joylashuv</p><p className="text-sm text-gray-500">{myPos ? `📍 ${myPos[0].toFixed(4)}, ${myPos[1].toFixed(4)}` : 'Joylashuv hali belgilanmagan'}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={updateMyLocation} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"><MapPin className="w-4 h-4" /> Yangilash</button>
            <button onClick={() => setLiveMode(!liveMode)} className={`px-5 py-2.5 rounded-xl font-semibold transition flex items-center gap-2 ${liveMode ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Radio className="w-4 h-4" /> {liveMode ? 'Jonli: YOQIQ' : 'Jonli rejim'}</button>
          </div>
        </div>

        {/* STATISTIKA */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border"><p className="text-gray-600 text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Jami yetkazilgan</p><p className="text-3xl font-bold mt-2 text-blue-600">{driverStats.totalDelivered}</p></div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border"><p className="text-gray-600 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Umumiy daromad</p><p className="text-2xl font-bold mt-2 text-green-600">{driverStats.totalRevenue.toLocaleString()} so'm</p></div>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-5 rounded-2xl shadow-lg text-white"><p className="text-blue-100 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Bu oy</p><p className="text-3xl font-bold mt-2">{driverStats.thisMonth} ta</p></div>
        </div>

        {topMfy && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl mb-6 flex items-center gap-4">
            <div className="bg-amber-500 p-3 rounded-xl"><Star className="w-6 h-6 text-white" /></div>
            <div className="flex-1"><p className="text-sm text-amber-700 font-medium">💡 Tavsiya</p><p className="text-lg font-bold text-gray-800">Eng ko'p buyurtma: <span className="text-amber-600">{topMfy.name}</span> MFY</p><p className="text-sm text-gray-600">{topMfy.count} ta faol buyurtma · Jami {topMfy.total.toLocaleString()} so'm</p></div>
          </div>
        )}

        {mfyStats.length > 0 && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Filter className="w-5 h-5" /> MFY bo'yicha filtrlash</h3>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedMfy('')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selectedMfy ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Barchasi ({orders.length})</button>
              {mfyStats.map((stat) => (
                <button key={stat.name} onClick={() => setSelectedMfy(stat.name)} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedMfy === stat.name ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{stat.name}<span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{stat.count}</span></button>
              ))}
            </div>
          </div>
        )}

        {mapMarkers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /> Buyurtmalar va joylashuvingiz</h2>
            <Map markers={mapMarkers} height="350px" />
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6" /> Faol buyurtmalar
          {homeDistrict && <span className="text-sm font-normal text-gray-500">({homeDistrict})</span>}
          {selectedMfy && <span className="text-sm font-normal text-gray-500">· {selectedMfy}</span>}
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-12 col-span-2 bg-white rounded-2xl">{homeDistrict ? `${homeDistrict} bo'yicha faol buyurtmalar yo'q` : "Hali faol buyurtmalar yo'q"}</p>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id}>
                <OrderCard order={order} showActions={true} onUpdateStatus={handleUpdateStatus} />
                {myPos && order.latitude && order.longitude && (
                  <div className="flex gap-2 mt-2">
                    <a href={getNavUrl(myPos[0], myPos[1], order.latitude, order.longitude, 'google')} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-green-700 transition"><ExternalLink className="w-4 h-4" /> Google Maps</a>
                    <a href={getNavUrl(myPos[0], myPos[1], order.latitude, order.longitude, 'yandex')} target="_blank" rel="noopener noreferrer" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 hover:bg-red-700 transition"><ExternalLink className="w-4 h-4" /> Yandex</a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {receiptOrder && <Receipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </div>
  );
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, Profile, CylinderType } from '@/types';
import OrderCard from '@/components/OrderCard';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import {
  LogOut, Shield, TrendingUp, Package, Users, MapPin, Home, Calendar,
  ArrowUpRight, Download, Search, Filter, Warehouse, Save, Trophy, DollarSign,
} from 'lucide-react';

interface MfyReport { name: string; count: number; revenue: number; delivered: number; }
interface RegionReport { name: string; count: number; revenue: number; }
interface DriverPerf { id: string; name: string; delivered: number; revenue: number; avgRating: number; }

const statusLabels: Record<OrderStatus, string> = {
  new: 'Yangi', confirmed: 'Tasdiqlangan', on_the_way: "Yo'lda",
  delivered: 'Yetkazildi', cancelled: 'Bekor qilindi',
};

export default function AdminDashboard() {
  const [user, setUser] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, delivered: 0, revenue: 0 });
  const [mfyReports, setMfyReports] = useState<MfyReport[]>([]);
  const [regionReports, setRegionReports] = useState<RegionReport[]>([]);
  const [driverPerf, setDriverPerf] = useState<DriverPerf[]>([]);
  const [stockItems, setStockItems] = useState<CylinderType[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'mfy' | 'regions' | 'drivers' | 'stock'>('overview');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const router = useRouter();

  useEffect(() => {
    checkUser();
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadAll())
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/dashboard/customer'); return; }
    setUser(profile);
    setLoading(false);
    loadAll();
  };

  const loadAll = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, profiles:customer_id (full_name, phone, address), driver_profile:profiles!driver_id (full_name, phone, car_plate, car_model, driver_phone), cylinder_types:cylinder_type_id (name, weight_kg, price)`)      .order('created_at', { ascending: false });

    if (!error && data) {
      const typed = data as Order[];
      setOrders(typed);
      setStats({
        total: typed.length,
        new: typed.filter((o) => o.status === 'new').length,
        delivered: typed.filter((o) => o.status === 'delivered').length,
        revenue: typed.filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total_price), 0),
      });

      // MFY hisoboti
      const mfyMap: Record<string, MfyReport> = {};
      typed.forEach((o) => {
        if (!o.mfy) return;
        if (!mfyMap[o.mfy]) mfyMap[o.mfy] = { name: o.mfy, count: 0, revenue: 0, delivered: 0 };
        mfyMap[o.mfy].count++;
        mfyMap[o.mfy].revenue += Number(o.total_price);
        if (o.status === 'delivered') mfyMap[o.mfy].delivered++;
      });
      setMfyReports(Object.values(mfyMap).sort((a, b) => b.count - a.count));

      // Hudud hisoboti
      const regionMap: Record<string, RegionReport> = {};
      typed.forEach((o) => {
        const key = o.region || "Noma'lum";
        if (!regionMap[key]) regionMap[key] = { name: key, count: 0, revenue: 0 };
        regionMap[key].count++;
        regionMap[key].revenue += Number(o.total_price);
      });
      setRegionReports(Object.values(regionMap).sort((a, b) => b.count - a.count));

      // Haydovchilar samaradorligi (baho bilan)
      const drvMap: Record<string, DriverPerf & { ratings: number[] }> = {};
      typed.forEach((o) => {
        if (!o.driver_id || o.status !== 'delivered') return;
        if (!drvMap[o.driver_id]) drvMap[o.driver_id] = { id: o.driver_id, name: 'Haydovchi', delivered: 0, revenue: 0, avgRating: 0, ratings: [] };
        drvMap[o.driver_id].delivered++;
        drvMap[o.driver_id].revenue += Number(o.total_price);
        if (o.rating) drvMap[o.driver_id].ratings.push(o.rating);
      });
      const drvIds = Object.keys(drvMap);
      if (drvIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', drvIds);
        profs?.forEach((p) => { if (drvMap[p.id]) drvMap[p.id].name = p.full_name; });
      }
      const perfList = Object.values(drvMap).map((d) => ({
        ...d,
        avgRating: d.ratings.length > 0 ? +(d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1) : 0,
      })).sort((a, b) => b.delivered - a.delivered);
      setDriverPerf(perfList);

      // Haftalik daromad grafigi (oxirgi 7 kun)
      const days: { day: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('uz-UZ', { weekday: 'short' });
        const rev = typed
          .filter((o) => o.status === 'delivered' && new Date(o.created_at).toDateString() === d.toDateString())
          .reduce((s, o) => s + Number(o.total_price), 0);
        days.push({ day: label, revenue: rev });
      }
      setWeeklyData(days);
    }

    // Ombor
    const { data: stock } = await supabase.from('cylinder_types').select('*').order('weight_kg');
    if (stock) setStockItems(stock as CylinderType[]);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (dateFilter !== 'all') {
        const d = new Date(o.created_at);
        const now = new Date();
        if (dateFilter === 'today' && d.toDateString() !== now.toDateString()) return false;
        if (dateFilter === 'week') {
          const diff = (now.getTime() - d.getTime()) / 86400000;
          if (diff > 7) return false;
        }
        if (dateFilter === 'month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          o.profiles?.full_name, o.mfy, o.delivery_address, o.district, o.region,
          o.receipt_no, String(o.id),
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, dateFilter]);

  const handleUpdateStatus = async (orderId: number, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (!error) { toast('Holat yangilandi', 'success'); loadAll(); }
  };

  const handleSaveStock = async (item: CylinderType) => {
    const { error } = await supabase
      .from('cylinder_types')
      .update({ stock: item.stock, price: item.price })
      .eq('id', item.id);
    if (!error) toast(`${item.name} saqlandi ✓`, 'success');
    else toast('Saqlashda xatolik', 'error');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Sana', 'Mijoz', 'Telefon', 'Viloyat', 'Tuman', 'MFY', 'Manzil', 'Mahsulot', 'Miqdor', "To'lov", 'Status', 'Narx'];
    const rows = filteredOrders.map((o) => [
      o.id, new Date(o.created_at).toLocaleString('uz-UZ'),
      o.profiles?.full_name || '-', o.profiles?.phone || '-',
      o.region || '-', o.district || '-', o.mfy || '-', o.delivery_address,
      o.cylinder_types?.name || '-', o.quantity, o.payment_method || 'cash', o.status, o.total_price,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gazexpress-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast('Hisobot yuklandi!', 'success');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;

  const maxMfy = Math.max(...mfyReports.map((m) => m.count), 1);
  const maxRegion = Math.max(...regionReports.map((r) => r.count), 1);
  const maxDrv = Math.max(...driverPerf.map((d) => d.delivered), 1);
  const maxRev = Math.max(...weeklyData.map((d) => d.revenue), 1);

  const tabs = [
    { k: 'overview', l: '📋 Buyurtmalar' },
    { k: 'mfy', l: '🏘️ MFY' },
    { k: 'regions', l: '🗺️ Hududlar' },
    { k: 'drivers', l: '🚚 Haydovchilar' },
    { k: 'stock', l: '📦 Ombor' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" /> Admin paneli
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.full_name}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 hover:text-red-700">
              <LogOut className="w-5 h-5" /> Chiqish
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 print:hidden">
        {/* STATISTIKA */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Jami</p>
            <p className="text-3xl font-bold mt-2">{stats.total}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Yangi</p>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{stats.new}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-600 text-sm flex items-center gap-2"><ArrowUpRight className="w-4 h-4" /> Yetkazilgan</p>
            <p className="text-3xl font-bold mt-2 text-green-600">{stats.delivered}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-blue-100 text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Daromad</p>
            <p className="text-2xl font-bold mt-2">{stats.revenue.toLocaleString()} so'm</p>
          </div>
        </div>

        {/* HAFTALIK GRAFIK */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" /> So'nggi 7 kun daromadi
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} so'm`, 'Daromad']} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {weeklyData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.revenue === maxRev ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TABLAR */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => setActiveTab(t.k)}
                className={`px-5 py-4 font-semibold whitespace-nowrap transition ${
                  activeTab === t.k ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <div className="flex flex-col md:flex-row gap-3 mb-5">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Qidiruv: mijoz, MFY, manzil, kvitansiya №..."
                      className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Barcha holatlar</option>
                    {Object.entries(statusLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="all">Barcha sanalar</option>
                    <option value="today">Bugun</option>
                    <option value="week">So'nggi 7 kun</option>
                    <option value="month">Shu oy</option>
                  </select>
                  <button onClick={handleExportCSV}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 whitespace-nowrap">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                  <Filter className="w-4 h-4" /> {filteredOrders.length} ta natija topildi
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  {filteredOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-12 col-span-2">Hech narsa topilmadi</p>
                  ) : (
                    filteredOrders.map((order) => (
                      <OrderCard key={order.id} order={order} showActions onUpdateStatus={handleUpdateStatus} />
                    ))
                  )}
                </div>
              </>
            )}

            {/* MFY */}
            {activeTab === 'mfy' && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Home className="w-5 h-5 text-blue-600" /> MFY bo'yicha tahlil</h3>
                {mfyReports.length === 0 ? <p className="text-gray-500 text-center py-12">Ma'lumot yo'q</p> : (
                  <div className="space-y-3">
                    {mfyReports.map((m, i) => (
                      <div key={m.name} className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">{i + 1}</span>
                            <div>
                              <p className="font-bold text-gray-800">{m.name}</p>
                              <p className="text-xs text-gray-500">{m.delivered} yetkazilgan / {m.count} jami</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-600">{m.revenue.toLocaleString()} so'm</p>
                            <p className="text-xs text-gray-500">{m.count} buyurtma</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${(m.count / maxMfy) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HUDUDLAR */}
            {activeTab === 'regions' && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /> Hududlar bo'yicha tahlil</h3>
                {regionReports.length === 0 ? <p className="text-gray-500 text-center py-12">Ma'lumot yo'q</p> : (
                  <div className="space-y-3">
                    {regionReports.map((r, i) => (
                      <div key={r.name} className="bg-gray-50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-3">
                            <span className="bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">{i + 1}</span>
                            <div>
                              <p className="font-bold text-gray-800">{r.name}</p>
                              <p className="text-xs text-gray-500">{Math.round((r.count / stats.total) * 100)}% umumiydan</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{r.revenue.toLocaleString()} so'm</p>
                            <p className="text-xs text-gray-500">{r.count} buyurtma</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${(r.count / maxRegion) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HAYDOVCHILAR SAMARADORLIGI (BAHO BILAN) */}
            {activeTab === 'drivers' && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Haydovchilar samaradorligi</h3>
                {driverPerf.length === 0 ? <p className="text-gray-500 text-center py-12">Hali yetkazilgan buyurtmalar yo'q</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                          <th className="py-3">#</th>
                          <th className="py-3">Haydovchi</th>
                          <th className="py-3 text-center">Yetkazilgan</th>
                          <th className="py-3 text-center">O'rtacha ⭐</th>
                          <th className="py-3 text-right">Daromad</th>
                          <th className="py-3 w-1/4">Samara</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverPerf.map((d, i) => (
                          <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3">
                              <span className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-white text-xs ${
                                i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-blue-500'
                              }`}>{i + 1}</span>
                            </td>
                            <td className="py-3 font-semibold text-gray-800">{d.name}</td>
                            <td className="py-3 text-center font-bold text-blue-600">{d.delivered}</td>
                            <td className="py-3 text-center">
                              {d.avgRating > 0 ? (
                                <span className="text-yellow-500 font-bold">⭐ {d.avgRating}</span>
                              ) : (
                                <span className="text-gray-400 text-xs">baholanmagan</span>
                              )}
                            </td>
                            <td className="py-3 text-right font-semibold text-green-600">
                              <span className="flex items-center justify-end gap-1"><DollarSign className="w-3 h-3" />{d.revenue.toLocaleString()}</span>
                            </td>
                            <td className="py-3">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${(d.delivered / maxDrv) * 100}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* OMBOR BOSHQARUVI */}
            {activeTab === 'stock' && (
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Warehouse className="w-5 h-5 text-blue-600" /> Ombor va narx boshqaruvi</h3>
                <p className="text-sm text-gray-500 mb-4">Ballon turlari qoldig'i va narxlarini shu yerdan tahrirlang (CRUD).</p>
                <div className="space-y-3">
                  {stockItems.map((item) => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.weight_kg} kg</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-12">Narx:</label>
                        <input type="number" value={item.price}
                          onChange={(e) => setStockItems((prev) => prev.map((s) => s.id === item.id ? { ...s, price: Number(e.target.value) } : s))}
                          className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                        <span className="text-xs text-gray-500">so'm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-14">Qoldiq:</label>
                        <input type="number" min="0" value={item.stock}
                          onChange={(e) => setStockItems((prev) => prev.map((s) => s.id === item.id ? { ...s, stock: Number(e.target.value) } : s))}
                          className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                        <span className="text-xs text-gray-500">ta</span>
                      </div>
                      <button onClick={() => handleSaveStock(item)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-1 text-sm">
                        <Save className="w-4 h-4" /> Saqlash
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
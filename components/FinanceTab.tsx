'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Expense, Profile } from '@/types';
import { buildAdminReport, exportAdminCSV, AdminReport } from '@/lib/reporting';
import { toast } from './Toast';
import {
  DollarSign, TrendingUp, Wallet, Trash2, Plus, Download, PiggyBank,
  ArrowDownRight, Receipt, Route, Package,
} from 'lucide-react';

const EXPENSE_CATEGORIES = ['Benzin', "Ta'mirlash", 'Ijara', 'Maosh', 'Boshqa'];

export default function FinanceTab() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // yangi chiqim formasi
  const [cat, setCat] = useState(EXPENSE_CATEGORIES[0]);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null));
    loadAll();
  }, []);

  const loadAll = async () => {
    // 1) yetkazilgan buyurtmalar (hisobot uchun minimal maydonlar)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, driver_id, total_price, rating, district, created_at, latitude, longitude, status')
      .eq('status', 'delivered');

    // 2) chiqimlar
    const { data: exps } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    // 3) haydovchi nomlari
    const driverIds = [...new Set((orders || []).map((o: any) => o.driver_id).filter(Boolean))] as string[];
    let profiles: Profile[] = [];
    if (driverIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', driverIds);
      profiles = (profs || []) as Profile[];
    }

    setExpenses((exps || []) as Expense[]);
    setReport(buildAdminReport((orders || []) as Order[], (exps || []) as Expense[], profiles));
    setLoading(false);
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amt);
    if (!amount || amount <= 0) { toast("Summani to'g'ri kiriting", 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      category: cat,
      amount,
      note: note.trim() || null,
      expense_date: date,
      created_by: userId,
    });
    if (error) {
      toast('Xatolik: ' + error.message, 'error');
    } else {
      toast('Chiqim qo\'shildi ✓', 'success');
      setAmt('');
      setNote('');
      loadAll();
    }
    setSaving(false);
  };

  const delExpense = async (id: number) => {
    if (!confirm('Ushbu chiqim o\'chirilsinmi?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) { toast('O\'chirildi', 'success'); loadAll(); }
    else toast('Xatolik', 'error');
  };

  if (loading) return <p className="text-gray-500 py-10 text-center">Moliya yuklanmoqda...</p>;
  if (!report) return null;

  const maxCat = Math.max(...report.expensesByCategory.map((c) => c.amount), 1);
  const profitPositive = report.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* SARLAVHA + EXCEL */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <PiggyBank className="w-6 h-6 text-blue-600" /> Umumiy moliyaviy hisobot
        </h3>
        <button onClick={() => exportAdminCSV(report)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Excel (CSV)
        </button>
      </div>

      {/* 4 ASOSIY KO'RSATKICH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Jami KIRIM</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{report.totalRevenue.toLocaleString()} so'm</p>
          <p className="text-xs text-gray-400">{report.totalDelivered} ta yetkazilgan</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Wallet className="w-3 h-3" /> Haydovchi haqlari</p>
          <p className="text-xl font-bold text-purple-700 mt-1">−{report.totalDriverFees.toLocaleString()} so'm</p>
          <p className="text-xs text-gray-400">har bir yetkazish uchun</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-xs text-gray-500 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Jami CHIQIM</p>
          <p className="text-xl font-bold text-red-600 mt-1">−{report.totalExpenses.toLocaleString()} so'm</p>
          <p className="text-xs text-gray-400">{expenses.length} ta yozuv</p>
        </div>
        <div className={`p-4 rounded-xl text-white shadow-lg bg-gradient-to-br ${profitPositive ? 'from-emerald-600 to-green-600' : 'from-red-600 to-rose-600'}`}>
          <p className="text-xs text-white/80 flex items-center gap-1"><DollarSign className="w-3 h-3" /> SOF FOYDA</p>
          <p className="text-xl font-extrabold mt-1">{report.netProfit.toLocaleString()} so'm</p>
          <p className="text-xs text-white/80">{profitPositive ? '✓ foyda' : '⚠ zarar'}</p>
        </div>
      </div>

      {/* QO'SHIMCHA KO'RSATKICHLAR */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
          <Route className="w-4 h-4 text-purple-500" />
          <span className="text-sm text-gray-600">Umumiy yo'l:</span>
          <span className="font-bold text-purple-700">{report.totalDistanceKm} km</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-600">O'rtacha chek:</span>
          <span className="font-bold text-blue-700">
            {report.totalDelivered ? Math.round(report.totalRevenue / report.totalDelivered).toLocaleString() : 0} so'm
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* CHAP: CHIQIM QO'SHISH + RO'YXAT */}
        <div>
          <p className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> Yangi chiqim kiritish</p>
          <form onSubmit={addExpense} className="bg-white p-4 rounded-xl border space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Toifa</label>
                <select value={cat} onChange={(e) => setCat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  {EXPENSE_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sana</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Summa (so'm)</label>
              <input type="number" min="1" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Masalan: 150000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Izoh (ixtiyoriy)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: 76-A055AA uchun benzin"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              <Plus className="w-4 h-4" /> {saving ? 'Qo\'shilmoqda...' : 'Chiqim qo\'shish'}
            </button>
          </form>

          <p className="font-bold text-gray-800 mt-5 mb-2 flex items-center gap-2"><Receipt className="w-4 h-4 text-gray-500" /> Chiqimlar tarixi</p>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {expenses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 bg-gray-50 rounded-xl">Hali chiqim kiritilmagan</p>
            ) : (
              expenses.map((ex) => (
                <div key={ex.id} className="bg-white border rounded-lg p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ex.category}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ex.expense_date).toLocaleDateString('uz-UZ')}
                      {ex.note ? ` · ${ex.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-red-600">−{Number(ex.amount).toLocaleString()}</span>
                    <button onClick={() => delExpense(ex.id)} className="text-gray-300 hover:text-red-500 transition" title="O'chirish">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* O'NG: TAHLIL */}
        <div className="space-y-5">
          <div>
            <p className="font-bold text-gray-800 mb-3">Chiqimlar toifasi bo'yicha</p>
            {report.expensesByCategory.length === 0 ? (
              <p className="text-sm text-gray-400 bg-gray-50 rounded-xl py-6 text-center">Ma'lumot yo'q</p>
            ) : (
              <div className="space-y-2">
                {report.expensesByCategory.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{c.name}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-400 to-rose-500" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-24 text-right">{c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-bold text-gray-800 mb-3">Oy bo'yicha</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                    <th className="py-2">Oy</th>
                    <th className="py-2 text-center">Yetkazilgan</th>
                    <th className="py-2 text-right">Daromad</th>
                    <th className="py-2 text-right">Yo'l (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byMonth.map((m) => (
                    <tr key={m.month} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-700">{m.month}</td>
                      <td className="py-2 text-center text-blue-600 font-bold">{m.delivered}</td>
                      <td className="py-2 text-right text-green-700 font-semibold">{m.revenue.toLocaleString()}</td>
                      <td className="py-2 text-right text-purple-600">{m.distanceKm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="font-bold text-gray-800 mb-3">Haydovchilar bo'yicha</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                    <th className="py-2">Haydovchi</th>
                    <th className="py-2 text-center">Yetkaz.</th>
                    <th className="py-2 text-right">Daromad</th>
                    <th className="py-2 text-right">Ish haqi</th>
                    <th className="py-2 text-center">⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {report.perDriver.map((d) => (
                    <tr key={d.name} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-700">{d.name}</td>
                      <td className="py-2 text-center text-blue-600 font-bold">{d.delivered}</td>
                      <td className="py-2 text-right text-green-700">{d.revenue.toLocaleString()}</td>
                      <td className="py-2 text-right text-purple-600">{d.fee.toLocaleString()}</td>
                      <td className="py-2 text-center">{d.avgRating ? `⭐ ${d.avgRating}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 pt-2 border-t">
        💡 Sof foyda = Kirim − Haydovchi haqlari − Chiqimlar. Yo'l masofasi Depo → manzillar ketma-ketligida (Haversine) hisoblanadi.
      </p>
    </div>
  );
}
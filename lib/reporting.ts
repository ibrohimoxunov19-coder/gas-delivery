import { getDistanceKm } from './distance';
import { Order, Expense, Profile } from '@/types';

export const DEPOT: [number, number] = [40.99, 71.67];
export const DRIVER_FEE_PER_DELIVERY = 5000;

export interface TripRow {
  id: number; date: string; deliveredAt: string; mfy: string; district: string; address: string;
  customer: string; product: string; qty: number; price: number; distanceKm: number;
}
export interface MonthRow { month: string; delivered: number; revenue: number; distanceKm: number; }
export interface DriverReport {
  totalDelivered: number; totalDistanceKm: number; companyRevenue: number;
  myEarnings: number; trips: TripRow[]; byMonth: MonthRow[];
  orders: Order[]; // ✅ to'liq obyektlar — chek uchun
}
export interface PerDriverRow {
  name: string; delivered: number; revenue: number; distanceKm: number; fee: number; avgRating: number;
}
export interface AdminReport {
  totalRevenue: number; totalExpenses: number; totalDriverFees: number; netProfit: number;
  totalDelivered: number; totalDistanceKm: number;
  perDriver: PerDriverRow[]; byMonth: MonthRow[];
  byDistrict: { name: string; count: number; revenue: number }[];
  expensesByCategory: { name: string; amount: number }[];
}

function monthKey(d: Date): string { return d.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' }); }
function fmt(d?: string | null): string { return d ? new Date(d).toLocaleString('uz-UZ') : '—'; }
function pos(o: Order): [number, number] | null {
  return o.latitude != null && o.longitude != null ? [o.latitude, o.longitude] : null;
}

export function buildDriverReport(delivered: Order[]): DriverReport {
  const sorted = [...delivered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let prev: [number, number] = DEPOT;
  let totalDist = 0;
  const trips: TripRow[] = [];
  const monthMap: Record<string, MonthRow> = {};

  for (const o of sorted) {
    const p = pos(o);
    const dist = p ? getDistanceKm(prev[0], prev[1], p[0], p[1]) : 0;
    if (p) { totalDist += dist; prev = p; }
    const price = Number(o.total_price) || 0;
    const mk = monthKey(new Date(o.created_at));
    if (!monthMap[mk]) monthMap[mk] = { month: mk, delivered: 0, revenue: 0, distanceKm: 0 };
    monthMap[mk].delivered++; monthMap[mk].revenue += price; monthMap[mk].distanceKm += dist;
    trips.push({
      id: o.id, date: fmt(o.created_at), deliveredAt: fmt(o.delivered_at),
      mfy: o.mfy || '-', district: o.district || '-', address: o.delivery_address || '-',
      customer: o.profiles?.full_name || '-', product: o.cylinder_types?.name || '-',
      qty: o.quantity, price, distanceKm: +dist.toFixed(2),
    });
  }
  const companyRevenue = trips.reduce((s, t) => s + t.price, 0);
  return {
    totalDelivered: trips.length,
    totalDistanceKm: +totalDist.toFixed(1),
    companyRevenue,
    myEarnings: trips.length * DRIVER_FEE_PER_DELIVERY,
    trips: trips.reverse(),
    byMonth: Object.values(monthMap).map(m => ({ ...m, distanceKm: +m.distanceKm.toFixed(1) })),
    orders: sorted, // ✅
  };
}

export function buildAdminReport(delivered: Order[], expenses: Expense[], profiles: Profile[]): AdminReport {
  const byDriver: Record<string, Order[]> = {};
  for (const o of delivered) { if (o.driver_id) (byDriver[o.driver_id] ||= []).push(o); }
  const perDriver: PerDriverRow[] = Object.entries(byDriver).map(([did, list]) => {
    const rep = buildDriverReport(list);
    const prof = profiles.find(p => p.id === did);
    const ratings = list.map(o => o.rating).filter((r): r is number => !!r);
    return {
      name: prof?.full_name || 'Haydovchi', delivered: rep.totalDelivered,
      revenue: rep.companyRevenue, distanceKm: rep.totalDistanceKm, fee: rep.myEarnings,
      avgRating: ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0,
    };
  }).sort((a, b) => b.delivered - a.delivered);

  const totalRevenue = delivered.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
  const totalDriverFees = perDriver.reduce((s, d) => s + d.fee, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalDriverFees - totalExpenses;

  const monthMap: Record<string, MonthRow> = {};
  const distMap: Record<string, { count: number; revenue: number }> = {};
  const sortedAll = [...delivered].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let prev: [number, number] = DEPOT, totalDist = 0;
  for (const o of sortedAll) {
    const p = pos(o);
    const dist = p ? getDistanceKm(prev[0], prev[1], p[0], p[1]) : 0;
    if (p) { totalDist += dist; prev = p; }
    const price = Number(o.total_price) || 0;
    const mk = monthKey(new Date(o.created_at));
    if (!monthMap[mk]) monthMap[mk] = { month: mk, delivered: 0, revenue: 0, distanceKm: 0 };
    monthMap[mk].delivered++; monthMap[mk].revenue += price; monthMap[mk].distanceKm += dist;
    const dk = o.district || "Noma'lum";
    if (!distMap[dk]) distMap[dk] = { count: 0, revenue: 0 };
    distMap[dk].count++; distMap[dk].revenue += price;
  }
  const expCat: Record<string, number> = {};
  for (const e of expenses) expCat[e.category] = (expCat[e.category] || 0) + (Number(e.amount) || 0);

  return {
    totalRevenue, totalExpenses, totalDriverFees, netProfit,
    totalDelivered: delivered.length, totalDistanceKm: +totalDist.toFixed(1),
    perDriver,
    byMonth: Object.values(monthMap).map(m => ({ ...m, distanceKm: +m.distanceKm.toFixed(1) })),
    byDistrict: Object.entries(distMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count),
    expensesByCategory: Object.entries(expCat).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
  };
}

function esc(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(headers: string[], rows: (string | number)[][]): string {
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}
export function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportDriverCSV(rep: DriverReport) {
  const s: string[] = [];
  s.push('GAZEKSPRESS — HAYDOVCHI HISOBOTI');
  s.push(`Jami yetkazilgan,${rep.totalDelivered}`);
  s.push(`Bosib o'tgan yo'l (km),${rep.totalDistanceKm}`);
  s.push(`Kompaniya daromadi (so'm),${rep.companyRevenue}`);
  s.push(`Sizning ish haqingiz (so'm),${rep.myEarnings}`);
  s.push('');
  s.push('OY BO\'YICHA');
  s.push(toCSV(['Oy', 'Yetkazilgan', "Daromad (so'm)", "Yo'l (km)"], rep.byMonth.map(m => [m.month, m.delivered, m.revenue, m.distanceKm])));
  s.push('');
  s.push('SAFARLAR (har bir yetkazilgan ballon)');
  s.push(toCSV(['#', 'Buyurtma sanasi', 'Yetkazilgan vaqt', 'MFY', 'Tuman', 'Manzil', 'Mijoz', 'Mahsulot', 'Miqdor', 'Summa', "Yo'l (km)"],
    rep.trips.map(t => [t.id, t.date, t.deliveredAt, t.mfy, t.district, t.address, t.customer, t.product, t.qty, t.price, t.distanceKm])));
  downloadCSV(`haydovchi-hisobot-${new Date().toISOString().slice(0, 10)}.csv`, s.join('\r\n'));
}

export function exportAdminCSV(rep: AdminReport) {
  const s: string[] = [];
  s.push('GAZEKSPRESS — UMUMIY HISOBOT');
  s.push(`Jami kirim (so'm),${rep.totalRevenue}`);
  s.push(`Haydovchi haqlari (so'm),${rep.totalDriverFees}`);
  s.push(`Jami chiqim (so'm),${rep.totalExpenses}`);
  s.push(`SOF FOYDA (so'm),${rep.netProfit}`);
  s.push(`Yetkazilgan,${rep.totalDelivered}`);
  s.push(`Umumiy yo'l (km),${rep.totalDistanceKm}`);
  s.push('');
  s.push('HAYDOVCHILAR BO\'YICHA');
  s.push(toCSV(['Haydovchi', 'Yetkazilgan', "Daromad (so'm)", "Yo'l (km)", 'Ish haqi (so\'m)', 'O\'rtacha ⭐'],
    rep.perDriver.map(d => [d.name, d.delivered, d.revenue, d.distanceKm, d.fee, d.avgRating || '-'])));
  s.push('');
  s.push('OY BO\'YICHA');
  s.push(toCSV(['Oy', 'Yetkazilgan', "Daromad (so'm)", "Yo'l (km)"], rep.byMonth.map(m => [m.month, m.delivered, m.revenue, m.distanceKm])));
  s.push('');
  s.push('TUMAN BO\'YICHA');
  s.push(toCSV(['Tuman', 'Buyurtma', "Daromad (so'm)"], rep.byDistrict.map(d => [d.name, d.count, d.revenue])));
  s.push('');
  s.push('CHIQIMLAR TOIFASI BO\'YICHA');
  s.push(toCSV(['Toifa', "Summa (so'm)"], rep.expensesByCategory.map(e => [e.name, e.amount])));
  downloadCSV(`admin-hisobot-${new Date().toISOString().slice(0, 10)}.csv`, s.join('\r\n'));
}
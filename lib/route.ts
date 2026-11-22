// 🧠 Smart Route — Nearest Neighbor algoritmi
import { getDistanceKm } from './distance';

export interface RouteStop {
  id: number;
  lat: number;
  lng: number;
  label?: string;
}

export interface RouteResult {
  order: RouteStop[];   // tartiblangan (1→2→3...)
  totalKm: number;      // optimal jami masofa
  naiveKm: number;      // oddiy (kiritilgan) tartibda masofa
  savedKm: number;      // tejash
}

// Boshlang'ich nuqtadan boshlab har doim eng yaqin qo'shnini tanlaydi
export function buildOptimalRoute(
  start: [number, number],
  stops: RouteStop[]
): RouteResult {
  if (stops.length === 0) {
    return { order: [], totalKm: 0, naiveKm: 0, savedKm: 0 };
  }

  const remaining = [...stops];
  const order: RouteStop[] = [];
  let cur = start;
  let totalKm = 0;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = getDistanceKm(cur[0], cur[1], remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    order.push(next);
    totalKm += bestDist;
    cur = [next.lat, next.lng];
  }

  // Naive: foydalanuvchi kiritgan tartibda (solishtirish uchun)
  let naiveKm = 0;
  let nc = start;
  for (const s of stops) {
    naiveKm += getDistanceKm(nc[0], nc[1], s.lat, s.lng);
    nc = [s.lat, s.lng];
  }

  return {
    order,
    totalKm: +totalKm.toFixed(1),
    naiveKm: +naiveKm.toFixed(1),
    savedKm: +Math.max(0, naiveKm - totalKm).toFixed(1),
  };
}
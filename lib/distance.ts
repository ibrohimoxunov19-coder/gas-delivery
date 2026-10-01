// Haversina formulasi — ikki koordinata orasidagi haqiqiy masofa (km)
export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Yer radiusi (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ETA — o'rtacha tezlik 30 km/soat (shahar ichi, yuk mashinasi)
export function getEtaMinutes(distanceKm: number, avgSpeedKmh = 30): number {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

export function formatEta(minutes: number): string {
  if (minutes < 1) return 'hozir yetib boradi';
  if (minutes < 60) return `${minutes} daqiqa`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} soat ${m} daqiqa` : `${h} soat`;
}
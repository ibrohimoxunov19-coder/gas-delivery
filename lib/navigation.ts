// Marshrut havolasini yaratish (origin ixtiyoriy — myPos bo'lmasa ham ishlaydi)
export function getNavUrl(
  fromLat: number | null | undefined,
  fromLng: number | null | undefined,
  toLat: number,
  toLng: number,
  provider: 'google' | 'yandex' = 'google'
): string {
  const hasOrigin = fromLat != null && fromLng != null;
  if (provider === 'google') {
    const origin = hasOrigin ? `&origin=${fromLat},${fromLng}` : '';
    return `https://www.google.com/maps/dir/?api=1${origin}&destination=${toLat},${toLng}&travelmode=driving`;
  }
  // Yandex: origin bo'lmasa "~" bilan faqat manzil
  const rtext = hasOrigin ? `${fromLat},${fromLng}~${toLat},${toLng}` : `~${toLat},${toLng}`;
  return `https://yandex.uz/maps/?rtext=${rtext}&rtt=auto`;
}
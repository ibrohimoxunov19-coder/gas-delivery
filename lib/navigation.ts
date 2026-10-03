// Marshrut havolasini yaratish (yonilishuvdan manzilgacha)
export function getNavUrl(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  provider: 'google' | 'yandex' = 'google'
): string {
  if (provider === 'google') {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
  }
  // Yandex Maps routelashuvi
  return `https://yandex.uz/maps/?rtext=${fromLat},${fromLng}~${toLat},${toLng}&rtt=auto`;
}